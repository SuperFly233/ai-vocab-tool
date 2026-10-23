(function(root){
  const key='ai_vocab_tool_logs_v1';
  let db=null,raw='[]',tail=Promise.resolve(),lastError=null,available=false,hydrated=false,revision=0;
  const channel=root.BroadcastChannel?new BroadcastChannel('lexi-diagnostics'):null;
  const locked=work=>root.navigator?.locks?root.navigator.locks.request('lexi-diagnostics-write',work):work();
  function transaction(mode,operation){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('values',mode),store=tx.objectStore('values');let value;
      const request=operation(store);
      request.onsuccess=()=>{value=request.result};
      tx.oncomplete=()=>resolve(value);
      tx.onerror=tx.onabort=()=>reject(tx.error||request.error||new Error('诊断日志归档失败。'));
    });
  }
  async function init(){
    if(!root.indexedDB)throw new Error('当前浏览器不支持日志归档，旧日志保持原样。');
    db=await new Promise((resolve,reject)=>{
      const request=root.indexedDB.open('lexi-diagnostics',1);
      let abandoned=false;
      request.onupgradeneeded=()=>request.result.createObjectStore('values');
      request.onsuccess=()=>{if(abandoned){request.result.close();return}resolve(request.result)};
      request.onerror=()=>reject(request.error||new Error('无法打开日志归档。'));
      request.onblocked=()=>{abandoned=true;reject(new Error('日志归档被其他页面阻塞，请关闭旧页面后重试。'))};
    });
    db.onversionchange=()=>{available=false;db.close()};
    const legacy=root.localStorage.getItem(key);
    if(legacy!==null){
      const incoming=JSON.parse(legacy);
      if(!Array.isArray(incoming))throw new Error('旧日志格式异常，已保留原始数据。');
      const existing=JSON.parse(await transaction('readonly',store=>store.get(key))||'[]');
      if(!Array.isArray(existing))throw new Error('日志归档格式异常，已保留旧数据。');
      const migrated=existing.length?JSON.stringify(merge(existing,incoming,Infinity)):legacy;
      await transaction('readwrite',store=>store.put(migrated,key));
      const verified=await transaction('readonly',store=>store.get(key));
      if(verified!==migrated)throw new Error('日志归档校验失败，已保留旧数据。');
      if(root.localStorage.getItem(key)!==legacy)throw new Error('迁移期间日志发生变化，已保留旧数据，请重新打开页面。');
      root.localStorage.removeItem(key);
      raw=verified;
    }else{
      raw=await transaction('readonly',store=>store.get(key))||'[]';
      if(!Array.isArray(JSON.parse(raw)))throw new Error('日志归档格式异常。');
    }
    available=true;hydrated=true;
  }
  function merge(existing,incoming,limit=80){
    const found=new Map();
    [...incoming,...existing].forEach(row=>{const id=String(row.id||`${row.time}|${row.title}|${row.message}`);if(!found.has(id))found.set(id,row)});
    return [...found.values()].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,limit);
  }
  function persist(next){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('values','readwrite'),store=tx.objectStore('values'),read=store.get(key);let value=next;
      read.onsuccess=()=>{try{const incoming=JSON.parse(next),existing=JSON.parse(read.result||'[]');value=JSON.stringify(incoming.length?merge(existing,incoming):[]);store.put(value,key)}catch{tx.abort()}};
      tx.oncomplete=()=>resolve(value);
      tx.onerror=tx.onabort=()=>reject(tx.error||read.error||new Error('日志归档写入失败。'));
    });
  }
  function write(value){
    const next=value===null?'[]':String(value);
    if(!Array.isArray(JSON.parse(next)))throw new Error('日志格式异常。');
    raw=next;const version=++revision;
    tail=tail.catch(()=>{}).then(()=>locked(()=>persist(next)));
    tail.then(saved=>{lastError=null;if(revision===version)raw=saved;channel?.postMessage({changed:true})},error=>{
      lastError=error;
      root.dispatchEvent(new CustomEvent('diagnostic-storage-error',{detail:{message:'诊断日志暂未写入归档，当前页面仍保留日志。历史和场景不受影响。'}}));
    });
  }
  const api={
    get available(){return available},
    ready:null,
    storage(base){return {
      getItem:name=>name===key&&hydrated?raw:base.getItem(name),
      setItem(name,value){if(name===key&&hydrated)write(value);else base.setItem(name,value)},
      removeItem(name){if(name===key&&hydrated)write(null);else base.removeItem(name)},
    }},
    async flush(){await tail;if(lastError)throw lastError},
    preview(value){const text=String(value||'');if(/<html|<!doctype|data:image\//i.test(text))return '历史接口错误包含网页或内嵌图片数据，完整诊断保留于日志归档。';return text.length>1200?text.slice(0,1200)+'…（完整诊断已归档）':text},
  };
  if(channel)channel.onmessage=async()=>{const version=revision;try{await tail;const latest=await transaction('readonly',store=>store.get(key));if(version===revision&&latest){raw=latest;root.dispatchEvent(new Event('diagnostic-storage-update'))}}catch{}};
  api.ready=locked(init).catch(error=>{available=false;db?.close();db=null;console.warn('日志归档不可用，保留旧存储。',error);return {error}});
  root.DiagnosticStore=api;
})(globalThis);
