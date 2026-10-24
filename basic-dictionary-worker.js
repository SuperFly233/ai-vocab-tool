const root='/vendor/basic-dictionaries/',loaded=new Map(),pending=new Map();let manifestPromise;
const norm=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase();
async function response(path){
 let cache;try{cache=await caches.open('lexi-basic-dictionaries-v1');const saved=await cache.match(path);if(saved)return saved}catch{}
 const value=await fetch(path,{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(12000)});if(!value.ok)throw Error('词库下载失败');
 return value;
}
async function bounded(value,limit){const reader=value.body.getReader(),chunks=[];let size=0;try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>limit)throw Error('词库文件超过大小限制');chunks.push(next.value)}}finally{await reader.cancel().catch(()=>{})}const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return bytes}
let cacheWrites=Promise.resolve();
function remember(path,bytes){cacheWrites=cacheWrites.then(async()=>{try{const cache=await caches.open('lexi-basic-dictionaries-v1'),keys=await cache.keys();if(keys.length>=10){const oldest=keys.find(key=>!key.url.includes('/manifest.json'));if(oldest)await cache.delete(oldest)}await cache.put(path,new Response(bytes,{headers:{'Content-Type':'application/json'}}))}catch{}});return cacheWrites}
async function manifest(){
 if(!manifestPromise)manifestPromise=(async()=>{const path=root+'manifest.json?v=0.41.0',bytes=await bounded(await response(path),131072),value=JSON.parse(new TextDecoder().decode(bytes));if(value.version!==1||!value.sources?.en||!value.sources?.ja||!value.sources?.zh)throw Error('词库索引无效');await remember(path,bytes);return value})().catch(error=>{manifestPromise=null;throw error});return manifestPromise;
}
async function shard(language,key){
 const id=language+':'+key;if(loaded.has(id)){const value=loaded.get(id);loaded.delete(id);loaded.set(id,value);return value}if(pending.has(id))return pending.get(id);
 const task=(async()=>{
  const source=(await manifest()).sources[language],info=source.shards[key];if(!info)return {rows:[],source};
  if(!/^(en|ja|zh)-[0-9]{2}\.json$/.test(info.file)||!info.file.startsWith(language+'-')||info.bytes>2500000||!/^[a-f0-9]{64}$/.test(info.sha256))throw Error('词库分片无效');
  const path=root+info.file+'?sha='+info.sha256;const bytes=await bounded(await response(path),info.bytes);
  const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
  if(bytes.byteLength!==info.bytes||hash!==info.sha256){try{await(await caches.open('lexi-basic-dictionaries-v1')).delete(path)}catch{}throw Error('词库校验失败，请重试')}
  const rows=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(rows)||rows.length>40000||rows.some(row=>typeof row.match!=='string'||typeof row.value!=='string'||typeof row.meaning!=='string'||row.meaning.length>4000||row.value.length>160))throw Error('词库格式无效');
  await remember(path,bytes);
  const value={rows,source};loaded.set(id,value);while(loaded.size>4)loaded.delete(loaded.keys().next().value);return value;
 })().finally(()=>pending.delete(id));pending.set(id,task);return task;
}
async function lookup(text,exact){
 const query=norm(text);if(!query||query.length>80)return {items:[]};
 const languages=/^[a-zA-Z '-]+$/.test(query)?['en']:/[\u3040-\u30ff]/.test(query)?['ja']:/\p{Script=Han}/u.test(query)?['zh','ja']:[];
 const key=String(query.codePointAt(0)%32).padStart(2,'0'),results=await Promise.allSettled(languages.map(language=>shard(language,key).then(({rows,source})=>rows.filter(row=>exact?row.match===query:row.match.startsWith(query)).map(row=>({...row,kind:'dictionary',language,source:source.name,sourceUrl:source.url,license:source.license,pair:source.pair,coverage:source.entries})))));
 const items=results.flatMap(result=>result.status==='fulfilled'?result.value:[]);if(languages.length&&results.every(value=>value.status==='rejected'))throw Error('基础词库暂不可用：'+String(results[0].reason?.message||'读取失败').slice(0,120));
 const seen=new Set();items.sort((a,b)=>Number(b.match===query)-Number(a.match===query)||a.match.length-b.match.length||(a.rank||0)-(b.rank||0)||a.value.localeCompare(b.value));
 return {items:items.filter(item=>{const key=item.language+item.value+item.reading+item.meaning;if(seen.has(key))return false;seen.add(key);return true}).slice(0,exact?12:8),partial:results.some(value=>value.status==='rejected'),unsupported:!languages.length};
}
self.onmessage=async({data})=>{const {id,text,kind}=data||{};try{postMessage({id,...await lookup(text,kind==='exact')})}catch(error){postMessage({id,error:String(error.message).slice(0,200)})}};
