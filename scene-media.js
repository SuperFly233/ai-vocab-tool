(function attachSceneMedia(root){
  const SIZE=512*1024;
  const uploading=new Map(),downloading=new Map();
  async function request(action,payload){
    const token=await cloudAccessToken();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch('/api/media',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,...payload})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`素材同步失败：HTTP ${response.status}`);
      return data;
    }catch(error){if(controller.signal.aborted)throw new Error('素材同步超时，本机原文件未受影响，可以重试。');throw error}
    finally{clearTimeout(timer)}
  }
  const base64=bytes=>{
    let raw='';for(let start=0;start<bytes.length;start+=8192)raw+=String.fromCharCode(...bytes.subarray(start,start+8192));
    return btoa(raw);
  };
  async function upload(ref,onProgress=()=>{}){
    if(!cloudUser)throw new Error('素材已保存在本机；登录后可同步。');
    const owner=cloudUser.id,key=`${owner}:${ref.id}`;
    if(uploading.has(key))return uploading.get(key);
    const work=(async()=>{
      const record=await SceneData.getFile(ref.id);
      if(record?.uploadedFor?.includes(owner))return;
      const info=await request('manifest',{id:ref.id});
      if(info.manifest&&(info.manifest.size!==ref.size||info.manifest.mime!==ref.mime))throw new Error('云端素材元信息不一致，已停止同步。');
      if(info.manifest&&!record?.blob)return;
      if(!record?.blob)throw new Error('本机缺少原始素材，无法上传。');
      if(!info.manifest){
        const count=Math.ceil(ref.size/SIZE);
        for(let index=0;index<count;index+=2){
          if(cloudUser?.id!==owner)throw new Error('账号已切换，素材同步已停止。');
          const chunks=[];
          for(let offset=index;offset<Math.min(count,index+2);offset++)chunks.push({index:offset,data:base64(new Uint8Array(await record.blob.slice(offset*SIZE,(offset+1)*SIZE).arrayBuffer()))});
          await request('put',{...ref,chunks});onProgress(Math.round(Math.min(count,index+2)/count*100));
        }
        await request('complete',ref);
      }
      await SceneData.putRecord(ref.id,{...record,uploadedFor:[...new Set([...(record.uploadedFor||[]),owner])]});
    })();
    uploading.set(key,work);
    try{return await work}finally{uploading.delete(key)}
  }
  async function resolve(ref,{refresh=false}={}){
    const cached=await SceneData.getFile(ref.id);if(cached?.blob&&!refresh)return cached;
    if(!cloudUser)throw new Error('本机没有此素材，请登录原账号后加载。');
    const owner=cloudUser.id,key=`${owner}:${ref.id}`;
    if(downloading.has(key))return downloading.get(key);
    const work=(async()=>{
      const {manifest}=await request('manifest',{id:ref.id});
      if(!manifest||manifest.size!==ref.size||manifest.mime!==ref.mime||manifest.chunks!==Math.ceil(ref.size/SIZE))throw new Error('素材尚未同步完整，请在原设备重试上传。');
      const parts=[];
      for(let index=0;index<manifest.chunks;index+=2){
        if(cloudUser?.id!==owner)throw new Error('账号已切换，素材下载已停止。');
        const indexes=Array.from({length:Math.min(2,manifest.chunks-index)},(_,offset)=>index+offset);
        const {chunks}=await request('get',{id:ref.id,indexes});
        for(const expected of indexes){
          const chunk=chunks?.find(item=>item.index===expected);if(!chunk)throw new Error('素材分片缺失，请重试同步。');
          const raw=atob(chunk.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
          parts.push(bytes);
        }
      }
      const blob=new Blob(parts,{type:ref.mime});
      const inspected=await SceneData.inspectFile(blob);
      if(inspected.ref.id!==ref.id||blob.size!==ref.size)throw new Error('素材完整性校验失败，未写入本机。');
      const record={ref,blob,uploadedFor:[owner]};await SceneData.putRecord(ref.id,record);return record;
    })();
    downloading.set(key,work);
    try{return await work}finally{downloading.delete(key)}
  }
  root.SceneMedia={upload,resolve};
})(globalThis);
