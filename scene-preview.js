(function(root){
  const pending=new Map(),cache=new Map();
  const key=id=>`thumbnail-v1:${id}`;
  async function capture(media){
    const width=media.videoWidth||media.naturalWidth,height=media.videoHeight||media.naturalHeight;
    if(!width||!height)throw new Error('素材尚未解码');
    const canvas=document.createElement('canvas'),scale=Math.min(1,240/Math.max(width,height));canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    canvas.getContext('2d').drawImage(media,0,0,canvas.width,canvas.height);
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('无法生成缩略图')),'image/jpeg',.72));
  }
  async function remember(id,media){
    if(cache.has(id))return cache.get(id);
    const blob=await capture(media);cache.set(id,blob);try{await SceneData.putDraft(key(id),blob)}catch{}return blob;
  }
  async function generate(ref){
    if(cache.has(ref.id))return cache.get(ref.id);
    try{const saved=await SceneData.getDraft(key(ref.id));if(saved instanceof Blob&&saved.type==='image/jpeg'){cache.set(ref.id,saved);return saved}}catch{}
    const file=await SceneMedia.resolve(ref),url=URL.createObjectURL(file.blob),video=ref.mime.startsWith('video/'),media=document.createElement(video?'video':'img');
    try{
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>finish(new Error('预览暂不可用')),10000);
        let settled=false;const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve()};
        media.onerror=()=>finish(new Error('此编码暂不支持缩略图'));
        if(video){
          media.muted=true;media.playsInline=true;media.preload='auto';media.setAttribute('playsinline','');
          media.style.cssText='position:fixed;left:-10000px;top:0;width:160px;height:90px;pointer-events:none';document.body.append(media);
          media.onloadedmetadata=()=>{try{media.currentTime=Math.min(.1,Math.max(.001,(media.duration||1)/2))}catch{}};
          media.onseeked=()=>{if(media.readyState>=2)finish()};
          media.onloadeddata=()=>{if(media.currentTime>.001&&media.readyState>=2)finish()};
        }else media.onload=()=>finish();
        media.src=url;
      });
      return await remember(ref.id,media);
    }finally{if(video){media.pause();media.removeAttribute('src');media.load();media.remove()}URL.revokeObjectURL(url)}
  }
  function get(ref){
    if(pending.has(ref.id))return pending.get(ref.id);
    const job=generate(ref).finally(()=>pending.delete(ref.id));pending.set(ref.id,job);return job;
  }
  function fromLoaded(id,media){
    if(cache.has(id))return;
    const ready=()=>remember(id,media).catch(()=>{});
    if(media.tagName==='VIDEO'){if(media.readyState>=2&&media.currentTime>.05)ready();else media.addEventListener('timeupdate',function onFrame(){if(media.readyState>=2&&media.currentTime>.05){media.removeEventListener('timeupdate',onFrame);ready()}})}
    else if(media.complete&&media.naturalWidth)ready();else media.addEventListener('load',ready,{once:true});
  }
  root.ScenePreview={get,fromLoaded,clear:async()=>{await Promise.allSettled([...pending.values()]);cache.clear()}};
})(globalThis);
