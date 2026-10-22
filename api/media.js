const CHUNK_SIZE=512*1024;
const MAX_SIZE=20*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/wav']);
const fail=(status,message)=>Object.assign(new Error(message),{status});

export default async function handler(request,response){
  if(request.method!=='POST'){response.status(405).json({error:'Method not allowed'});return}
  const token=String(request.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(!token){response.status(401).json({error:'请登录后同步素材。'});return}
  try{
    const base=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://uoifrqehkfvpzqojaazh.supabase.co';
    const key=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
    async function call(path,options={}){
      const result=await fetch(`${base}${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
      const data=await result.json().catch(()=>null);
      if(!result.ok)throw fail(result.status,result.status===401?'登录已失效，请重新登录。':data?.message||'素材云端请求失败。');
      return data;
    }
    const user=await call('/auth/v1/user');
    if(!user?.id)throw fail(401,'登录已失效。');
    const payload=request.body||{},id=String(payload.id||'');
    if(!/^[a-f0-9]{64}$/.test(id))throw fail(400,'无效素材标识。');
    const prefix=`ai_vocab_tool_media_${id}`;
    const own=`user_id=eq.${encodeURIComponent(user.id)}`;
    const get=keys=>call(`/rest/v1/study_store?select=key,value&${own}&key=in.(${keys.map(value=>encodeURIComponent(`"${value}"`)).join(',')})`);
    const put=rows=>call('/rest/v1/study_store?on_conflict=user_id,key',{
      method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},
      body:JSON.stringify(rows.map(row=>({...row,user_id:user.id}))),
    });
    if(payload.action==='manifest'){
      const rows=await get([`${prefix}_manifest`]);
      response.status(200).json({manifest:rows?.[0]?.value||null});return;
    }
    if(payload.action==='get'){
      const indexes=payload.indexes;
      if(!Array.isArray(indexes)||!indexes.length||indexes.length>2||indexes.some(index=>!Number.isInteger(index)||index<0||index>=40))throw fail(400,'无效素材分片请求。');
      const rows=await get([...new Set(indexes)].map(index=>`${prefix}_${index}`));
      response.status(200).json({chunks:(rows||[]).map(row=>({index:Number(row.key.slice(prefix.length+1)),data:row.value?.data||''}))});return;
    }
    if(!Number.isInteger(payload.size)||payload.size<=0||payload.size>MAX_SIZE||!TYPES.has(payload.mime))throw fail(400,'无效素材大小或格式。');
    const count=Math.ceil(payload.size/CHUNK_SIZE);
    if(payload.action==='put'){
      if(!Array.isArray(payload.chunks)||!payload.chunks.length||payload.chunks.length>2)throw fail(400,'每次最多同步两个素材分片。');
      const rows=payload.chunks.map(chunk=>{
        if(!Number.isInteger(chunk.index)||chunk.index<0||chunk.index>=count)throw fail(400,'无效分片序号。');
        const expected=Math.min(CHUNK_SIZE,payload.size-chunk.index*CHUNK_SIZE);
        if(typeof chunk.data!=='string'||chunk.data.length!==Math.ceil(expected/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(chunk.data)||chunk.data.length/4*3-(chunk.data.endsWith('==')?2:chunk.data.endsWith('=')?1:0)!==expected)throw fail(400,'无效分片数据。');
        return {key:`${prefix}_${chunk.index}`,value:{data:chunk.data}};
      });
      if(new Set(rows.map(row=>row.key)).size!==rows.length)throw fail(400,'重复分片。');
      await put(rows);response.status(200).json({count:rows.length});return;
    }
    if(payload.action==='complete'){
      // Only publish the manifest when every expected chunk exists.
      const indexes=Array.from({length:count},(_,index)=>`${prefix}_${index}`);
      const rows=await call(`/rest/v1/study_store?select=key&${own}&key=in.(${indexes.map(value=>encodeURIComponent(`"${value}"`)).join(',')})`);
      if(rows?.length!==count)throw fail(409,'素材尚未上传完整，请重试。');
      await put([{key:`${prefix}_manifest`,value:{version:1,id,size:payload.size,mime:payload.mime,chunks:count}}]);
      response.status(200).json({complete:true});return;
    }
    throw fail(400,'Unknown media action');
  }catch(error){response.status(error.status||500).json({error:error.message||'素材同步失败。'})}
}
