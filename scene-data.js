(function attachSceneData(root){
  const MAX_FILE_SIZE=20*1024*1024;
  const MAX_FILES=6;
  const text=(value,max=12000)=>String(value??'').slice(0,max).trim();
  const time=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
  const hashId=value=>/^[a-f0-9]{64}$/.test(String(value||''));
  const mimeTypes=new Set(['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm']);
  function highlights(value){
    const items=Array.isArray(value)?value:String(value||'').split(/[\n,，、;；]+/);
    return [...new Set(items.filter(item=>typeof item==='string').map(item=>text(item,4000)).filter(Boolean))].slice(0,40);
  }
  function sourceUrl(value){
    try{const url=new URL(text(value,2048));return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:''}catch{return ''}
  }
  function normalizeMedia(items=[]){
    const found=new Set();
    return (Array.isArray(items)?items:[]).flatMap(item=>{
      if(!hashId(item?.id)||!mimeTypes.has(item.mime)||!Number.isInteger(item.size)||item.size<=0||item.size>MAX_FILE_SIZE||found.has(item.id))return [];
      found.add(item.id);
      return [{id:item.id,name:text(item.name,180)||'素材',mime:item.mime,size:item.size}];
    }).slice(0,MAX_FILES);
  }
  function normalizeScene(item={}){
    const id=text(item.id,100);
    if(!/^[\w-]{1,100}$/.test(id))return null;
    const fields=['title','quote','translation','note','sourceTitle','chapter','timeRange','targetLabel'];
    const media=normalizeMedia(item.media);
    const heroMedia=Array.isArray(item.heroMedia)?item.heroMedia.filter(id=>media.some(ref=>ref.id===id)):media.slice(0,1).map(ref=>ref.id);
    const groupId=/^[\w-]{1,100}$/.test(String(item.groupId||''))?String(item.groupId):id;
    return {id,groupId,...Object.fromEntries(fields.map(key=>[key,text(item[key],key==='note'?12000:4000)])),
      exampleHighlights:highlights(item.exampleHighlights),translationHighlights:highlights(item.translationHighlights),
      order:Number.isFinite(item.order)?item.order:time(item.createdAt),featured:typeof item.featured==='boolean'?item.featured:!item.targetKey,heroMedia:[...new Set(heroMedia)],
      sourceUrl:sourceUrl(item.sourceUrl),targetKey:text(item.targetKey,120),media:normalizeMedia(item.media),
      createdAt:time(item.createdAt)?item.createdAt:'',updatedAt:time(item.updatedAt)?item.updatedAt:time(item.createdAt)?item.createdAt:''};
  }
  function reconcile(items=[],tombstones=[]){
    const deleted=new Map();
    for(const row of Array.isArray(tombstones)?tombstones:[]){
      if(!/^[\w-]{1,100}$/.test(String(row?.key||''))||!time(row.deletedAt))continue;
      if(time(row.deletedAt)>time(deleted.get(row.key)?.deletedAt))deleted.set(row.key,{key:row.key,deletedAt:row.deletedAt});
    }
    const found=new Map();
    for(const raw of Array.isArray(items)?items:[]){
      const item=normalizeScene(raw);if(!item)continue;
      const previous=found.get(item.id);
      if(!previous||time(item.updatedAt)>time(previous.updatedAt)||(time(item.updatedAt)===time(previous.updatedAt)&&JSON.stringify(item)>JSON.stringify(previous)))found.set(item.id,item);
    }
    const kept=[];
    for(const item of found.values()){
      const tombstone=deleted.get(item.id);
      if(tombstone&&time(item.updatedAt)<=time(tombstone.deletedAt))continue;
      if(tombstone)deleted.delete(item.id);
      kept.push(item);
    }
    return {items:kept.sort((a,b)=>a.order-b.order||time(a.createdAt)-time(b.createdAt)||a.id.localeCompare(b.id)),tombstones:[...deleted.values()].sort((a,b)=>a.key.localeCompare(b.key))};
  }
  function detectMime(bytes){
    const ascii=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
    if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index]===byte))return 'image/png';
    if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
    if(['GIF87a','GIF89a'].includes(ascii(0,6)))return 'image/gif';
    if(ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP')return 'image/webp';
    if(bytes.length>=12&&ascii(4,8)==='ftyp'&&/^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)/.test(ascii(8,12)))return 'video/mp4';
    if(bytes.length>=4&&bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163&&ascii(0,4096).includes('webm'))return 'video/webm';
    return '';
  }
  async function inspectFile(file){
    if(!file||!file.size)throw new Error('文件为空。');
    if(file.size>MAX_FILE_SIZE)throw new Error('单个素材不能超过 20 MB，请先裁剪视频或压缩图片。');
    const mime=detectMime(new Uint8Array(await file.slice(0,4096).arrayBuffer()));
    if(!mime)throw new Error('支持 PNG、JPEG、GIF、WebP、MP4 和 WebM；不支持 SVG、网页或其他文件。');
    const bytes=await file.arrayBuffer();
    const digest=await root.crypto.subtle.digest('SHA-256',bytes);
    const id=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
    return {ref:{id,name:text(file.name,180)||'素材',mime,size:file.size},blob:new Blob([bytes],{type:mime})};
  }
  let database=null;
  function openDatabase(){
    if(database)return database;
    database=new Promise((resolve,reject)=>{
      if(!root.indexedDB){reject(new Error('当前浏览器不能保存素材文件。'));return}
      const request=root.indexedDB.open('lexi-scene-media',1);
      request.onupgradeneeded=()=>{for(const name of ['files','drafts'])if(!request.result.objectStoreNames.contains(name))request.result.createObjectStore(name)};
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null};resolve(db)};
      request.onerror=()=>reject(request.error||new Error('无法打开素材存储。'));
      request.onblocked=()=>reject(new Error('请关闭其他旧页面后重试保存素材。'));
    }).catch(error=>{database=null;throw error});
    return database;
  }
  async function transaction(store,mode,action){
    const db=await openDatabase();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction(store,mode);let request;
      try{request=action(tx.objectStore(store))}catch(error){tx.abort();reject(error);return}
      tx.oncomplete=()=>resolve(request?.result);
      tx.onerror=()=>reject(tx.error||new Error('素材保存失败，请检查浏览器空间。'));
      tx.onabort=()=>reject(tx.error||new Error('素材保存中断。'));
    });
  }
  const getFile=id=>transaction('files','readonly',store=>store.get(id));
  async function putFile(file){
    const {ref,blob}=await inspectFile(file);
    const previous=await getFile(ref.id);
    if(!previous)await transaction('files','readwrite',store=>store.put({ref,blob,uploadedFor:[]},ref.id));
    return ref;
  }
  const putRecord=(id,value)=>transaction('files','readwrite',store=>store.put(value,id));
  const getDraft=key=>transaction('drafts','readonly',store=>store.get(key));
  const putDraft=(key,value)=>transaction('drafts','readwrite',store=>store.put(value,key));
  const deleteDraft=key=>transaction('drafts','readwrite',store=>store.delete(key));
  root.SceneData={MAX_FILE_SIZE,MAX_FILES,hashId,mimeTypes,sourceUrl,normalizeMedia,normalizeScene,reconcile,detectMime,inspectFile,getFile,putFile,putRecord,getDraft,putDraft,deleteDraft};
})(globalThis);
