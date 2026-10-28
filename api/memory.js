import {createMemoryService} from '../server/memory-service.js';
const base=()=>process.env.SUPABASE_URL||'https://uoifrqehkfvpzqojaazh.supabase.co';
const publicKey=()=>process.env.SUPABASE_ANON_KEY||'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');const serviceKey=process.env.MEMORY_SERVICE_KEY,enabled=process.env.MEMORY_ENABLED==='true'&&process.env.MEMORY_VERIFIED_SCHEMA==='memory-v1'&&Boolean(serviceKey);
 if(req.method==='GET')return res.status(200).json({enabled,algorithm:'ts-fsrs@5.4.2/FSRS-6'});
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 const token=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();if(!token)return res.status(401).json({error:'请先登录。'});
 if(!enabled)return res.status(503).json({error:'语境记忆服务尚未通过验收，原回顾仍可使用。'});
 try{
  const identity=await fetch(base()+'/auth/v1/user',{headers:{apikey:publicKey(),Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)});if(!identity.ok)return res.status(identity.status===403?403:401).json({error:'登录已失效，请重新登录。'});
  const user=await identity.json();if(!/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(user.id||''))return res.status(401).json({error:'登录身份无效。'});
  const repository=async(account,action,args)=>{const response=await fetch(base()+'/rest/v1/rpc/lexi_memory_service',{method:'POST',headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},body:JSON.stringify({owner_id:account,action,args}),signal:AbortSignal.timeout(15000)}),data=await response.json();if(!response.ok)throw Object.assign(Error('记忆状态未保存，请重新核对。'),{status:data.code==='40001'||data.code==='23505'?409:response.status===404?503:502});return data};
  const {action,args={}}=req.body||{},result=await createMemoryService(repository)(user.id,action,args);return res.status(200).json({data:result});
 }catch(error){return res.status(error.status||400).json({error:error.status===409?error.message:error.status?'记忆服务暂不可用，评分仍保留在本机。':'记忆请求无效，请核对内容后重试。'})}
}
