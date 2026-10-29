(function attachSceneData(root){
  const MAX_FILE_SIZE=20*1024*1024;
  const MAX_FILES=6;
  const text=(value,max=12000)=>String(value??'').slice(0,max).trim();
  const time=value=>Number.isFinite(Date.parse(value))?Date.parse(value):0;
  const hashId=value=>/^[a-f0-9]{64}$/.test(String(value||''));
  const mimeTypes=new Set(['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm']);
  function mergeOrganization(...sources){
    const merged=Object.create(null);
    for(const source of sources)for(const [id,record] of Object.entries(source&&typeof source==='object'&&!Array.isArray(source)?source:{})){
      if(!id||id.length>400||['__proto__','constructor','prototype'].includes(id)||!record||typeof record!=='object')continue;
      const target=merged[id]||(merged[id]={});
      for(const field of ['favorite','pinned','folders','state']){
        const input=record[field];if(!input||!time(input.updatedAt))continue;
        let value;
        if(field==='folders'){if(!Array.isArray(input.value))continue;value=[...new Set(input.value.filter(v=>typeof v==='string'&&v&&v.length<=400))].sort()}
        else if(field==='state'){if(!['new','review','mastered'].includes(input.value))continue;value=input.value}
        else{if(typeof input.value!=='boolean')continue;value=input.value}
        const next={value,updatedAt:new Date(time(input.updatedAt)).toISOString()},old=target[field];
        if(!old||time(next.updatedAt)>time(old.updatedAt)||(time(next.updatedAt)===time(old.updatedAt)&&JSON.stringify(next.value)>JSON.stringify(old.value)))target[field]=next;
      }
    }
    return merged;
  }
  function highlights(value){
    const items=Array.isArray(value)?value:String(value||'').split(/[\n,，、;；]+/);
    return [...new Set(items.filter(item=>typeof item==='string').map(item=>text(item,4000)).filter(Boolean))].slice(0,40);
  }
  function sourceUrl(value){
    try{const url=new URL(text(value,2048));return ['https:','http:'].includes(url.protocol)&&!url.username&&!url.password?url.href:''}catch{return ''}
  }
  function sameMediaScene(a,b,{ignoreTitle=false}={}){
    if(!a?.media?.length||!b?.media?.length)return false;
    const shape=scene=>({title:ignoreTitle?'':scene.title||'',...Object.fromEntries(['quote','translation','note','sourceTitle','chapter','timeRange','sourceUrl','targetKey'].map(key=>[key,scene[key]||''])),exampleHighlights:highlights(scene.exampleHighlights),translationHighlights:highlights(scene.translationHighlights),media:normalizeMedia(scene.media).map(ref=>ref.id),heroMedia:scene.heroMedia||[],mediaEdits:scene.mediaEdits||[],highlightPairs:root.HighlightPairsData?HighlightPairsData.fromScene(scene).map(({original,translation})=>({original,translation})):[],externalSource:scene.externalSource||null});
    const targets=scene=>(scene.learningTargets||[]).map(row=>[row.phrase,row.meaning,row.kind]);
    return JSON.stringify([shape(a),targets(a)])===JSON.stringify([shape(b),targets(b)]);
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
    const origin=item.externalSource,externalSource=origin?.type==='fushi'&&hashId(origin.key)&&typeof origin.id==='string'&&origin.id.length>0&&origin.id.length<=160?{type:'fushi',id:origin.id,key:origin.key,queued:origin.queued===true,
      ...Object.fromEntries(['deviceId','requestId'].filter(key=>/^[a-f0-9-]{36}$/i.test(origin[key]||'')).map(key=>[key,origin[key]])),
      ...(['favorites','pending','staged'].includes(origin.scope)?{scope:origin.scope}:{}),
      ...Object.fromEntries(['capturedAt','importedAt','sourceCreatedAt'].filter(key=>time(origin[key])).map(key=>[key,origin[key]]))}:null;
    const captured=item.capture, capture=captured&&hashId(captured.assetId)?{assetId:captured.assetId,model:text(captured.model,200),profileId:text(captured.profileId,100),userInstruction:text(captured.userInstruction,2000),recognizedAt:time(captured.recognizedAt)?captured.recognizedAt:'',translationOrigin:['visible','machine','manual','none'].includes(captured.translationOrigin)?captured.translationOrigin:'none',sourceEvidence:(Array.isArray(captured.sourceEvidence)?captured.sourceEvidence:[]).slice(0,6).map(value=>text(value,300))}:null;
    const learningTargets=Array.isArray(item.learningTargets)?item.learningTargets.filter(row=>row&&/^[\w-]{1,100}$/.test(row.id||'')&&typeof row.phrase==='string'&&row.phrase.trim()&&row.phrase.length<=200&&typeof row.meaning==='string'&&row.meaning.length<=2000).slice(0,20).map(row=>({id:row.id,phrase:row.phrase.trim(),meaning:row.meaning.trim(),kind:row.kind==='sentence'?'sentence':'phrase',provenance:['ai','entry'].includes(row.provenance)?row.provenance:'manual',...(typeof row.entryId==='string'&&row.entryId.length<=100?{entryId:row.entryId}:{})})):[];
    const analysis=item.aiAnalysis&&typeof item.aiAnalysis==='object'?{model:text(item.aiAnalysis.model,200),generatedAt:time(item.aiAnalysis.generatedAt)?item.aiAnalysis.generatedAt:'',translationOrigin:['visible','machine','manual','none'].includes(item.aiAnalysis.translationOrigin)?item.aiAnalysis.translationOrigin:'none',sourceEvidence:highlights(item.aiAnalysis.sourceEvidence),sourceCandidates:Array.isArray(item.aiAnalysis.sourceCandidates)?[...new Set(item.aiAnalysis.sourceCandidates.filter(v=>typeof v==='string'&&v.trim()&&v.length<=100).map(v=>v.trim()))].slice(0,20):[],sourceBasis:['text','visual','unknown'].includes(item.aiAnalysis.sourceBasis)?item.aiAnalysis.sourceBasis:'unknown',warnings:highlights(item.aiAnalysis.warnings)}:null;
    let sourceRef;try{if(Object.hasOwn(item,'sourceRef')&&root.SourceData)sourceRef=root.SourceData.reference(item.sourceRef)}catch{}
    const paired=Object.hasOwn(item,'highlightPairs')&&root.HighlightPairsData?HighlightPairsData.normalize(HighlightPairsData.normalize(item.highlightPairs,item).map(row=>({...row,...Object.fromEntries([['original','quote'],['translation','translation']].map(([side,key])=>{const value=row[side],offset=String(item[key]||'').length-String(item[key]||'').trimStart().length;return [side,value&&value.start!==null?{...value,start:value.start-offset,end:value.end-offset}:value]}))})),{quote:text(item.quote,4000),translation:text(item.translation,4000)}):undefined,compat=paired?HighlightPairsData.compatibility(paired):null;
    return {id,groupId,...(paired!==undefined?{highlightPairs:paired}:{}),...(Object.hasOwn(item,'mediaEdits')&&root.MediaEditorData?{mediaEdits:root.MediaEditorData.edits(item.mediaEdits)}:{}),...(sourceRef!==undefined?{sourceRef}:{}),...(Object.hasOwn(item,'learningTargets')?{learningTargets}:{}),...(Object.hasOwn(item,'aiAnalysis')?{aiAnalysis:analysis}:{}),...(externalSource?{externalSource}:{}),...(capture?{capture}:{}),...Object.fromEntries(fields.map(key=>[key,text(item[key],key==='note'?12000:4000)])),
      exampleHighlights:compat?.exampleHighlights||highlights(item.exampleHighlights),translationHighlights:compat?.translationHighlights||highlights(item.translationHighlights),

      studyState:['new','review','mastered'].includes(item.studyState)?item.studyState:'new',studyUpdatedAt:time(item.studyUpdatedAt)?item.studyUpdatedAt:'',
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
      const preferred=!previous||time(item.updatedAt)>time(previous.updatedAt)||(time(item.updatedAt)===time(previous.updatedAt)&&JSON.stringify(item)>JSON.stringify(previous))?item:previous;
      const study=!previous||time(item.studyUpdatedAt)>time(previous.studyUpdatedAt)||(time(item.studyUpdatedAt)===time(previous.studyUpdatedAt)&&item.studyState>previous.studyState)?item:previous;
      const capture=preferred.capture||[item.capture,previous?.capture].find(value=>value&&preferred.media.some(ref=>ref.id===value.assetId));
      const preserve={};for(const key of ['learningTargets','aiAnalysis','sourceRef','mediaEdits','highlightPairs'])if(!Object.hasOwn(preferred,key)){const fallback=Object.hasOwn(item,key)?item:previous;if(fallback&&Object.hasOwn(fallback,key))preserve[key]=fallback[key]}
      if(previous&&preferred.mediaEdits){const other=preferred===item?previous:item;preserve.mediaEdits=preferred.mediaEdits.map(row=>{const old=other.mediaEdits?.find(v=>v.id===row.id&&v.original.id===row.original.id);return old?.params.annotations&&!Object.hasOwn(row.params,'annotations')?{...row,params:{...row.params,annotations:old.params.annotations},...(old.privateOriginal?{privateOriginal:true}:{})}:row})}
      found.set(item.id,{...preferred,...preserve,...(capture?{capture}:{}),studyState:study.studyState,studyUpdatedAt:study.studyUpdatedAt});
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
  const clearPreviews=()=>transaction('drafts','readwrite',store=>{const request=store.openCursor();request.onsuccess=()=>{const cursor=request.result;if(!cursor)return;if(String(cursor.key).startsWith('thumbnail-v1:'))cursor.delete();cursor.continue()};return null});
  const mediaReferences=scene=>[...new Map([...(scene.media||[]),...(scene.mediaEdits||[]).filter(row=>!row.privateOriginal&&!root.AnnotationData?.privateOriginal(row.params?.annotations)).map(row=>row.original)].filter(Boolean).map(ref=>[ref.id,ref])).values()];
  root.SceneData={MAX_FILE_SIZE,MAX_FILES,hashId,mimeTypes,sourceUrl,highlights,sameMediaScene,normalizeMedia,normalizeScene,mediaReferences,reconcile,mergeOrganization,detectMime,inspectFile,getFile,putFile,putRecord,getDraft,putDraft,deleteDraft,clearPreviews};
})(globalThis);
