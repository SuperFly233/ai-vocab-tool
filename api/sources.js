const base=()=>process.env.SUPABASE_URL||'https://uoifrqehkfvpzqojaazh.supabase.co';
const key=()=>process.env.SUPABASE_ANON_KEY||'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
  if(!token)return res.status(401).json({error:'请先登录后核对来源。'});
  if(process.env.SOURCES_ENABLED==='false')return res.status(503).json({error:'来源服务暂未开放，原内容保持不变。'});
  const {action,args={}}=req.body||{};
  if(!['list','save','search','coverage'].includes(action)||!args||typeof args!=='object'||Array.isArray(args)||JSON.stringify(args).length>20000)return res.status(400).json({error:'来源请求格式无效。'});
  const safe={...args};delete safe.userId;delete safe.user_id;
  try{
    const response=await fetch(base()+'/rest/v1/rpc/lexi_sources',{method:'POST',headers:{apikey:key(),Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,args:safe}),signal:AbortSignal.timeout(15000)});
    const data=await response.json();
    if(!response.ok)return res.status(['40001','23505'].includes(data.code)?409:[401,403].includes(response.status)?response.status:response.status===404?503:400).json({error:data.code==='40001'?'来源已有更新，请重新检查。':data.code==='23505'?'名称或别名与已有来源冲突，请选择已有来源。':response.status===404?'来源服务尚未开放。':'来源请求未完成，请检查登录或输入后重试。'});
    res.status(200).json({data});
  }catch{return res.status(502).json({error:'来源服务暂不可达，输入仍保留。'})}
}
