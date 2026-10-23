import '../learning-content.js';
const contentActions=new Set(['content_save','content_get']);
const reviewActions=new Set(['review_get','review_publish','review_target','review_approve']);
const deviceActions=new Set(['device_request','device_poll','device_status','device_result','device_heartbeat']);
const dictionaryActions=new Set(['dictionary_list','dictionary_get','dictionary_save']);
const actions=new Set(['health','devices','register','submit','list','results','cancel','retry','claim','heartbeat','start','ack','finish','undo','next_job',...reviewActions,...deviceActions,...dictionaryActions,...contentActions]);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const fail=(status,message)=>Object.assign(new Error(message),{status});
export function validatePayload(value){
 if(!value||![1,2,3,4].includes(value.version)||!Array.isArray(value.cards)||!value.cards.length||value.cards.length>20)throw fail(400,'每批选择 1–20 个关联词条。');
 const seen=new Set();
 const cards=value.cards.map(card=>{
  if(!card||typeof card.key!=='string'||!card.key.length||card.key.length>160||seen.has(card.key))throw fail(400,'词条来源标识无效或重复。');seen.add(card.key);
  if(value.version>=2&&(!['lexi','fushi'].includes(card.sourceType)||typeof card.sourceId!=='string'||!card.sourceId||card.sourceId.length>160))throw fail(400,'来源身份无效。');
  const output={key:card.key,sourceType:value.version>=2?card.sourceType:'lexi',...(value.version>=2?{sourceId:card.sourceId}:{})};
  if(value.version>=3&&card.dictionaryRef){if(!uuid.test(card.dictionaryRef.id)||!/^[a-f0-9]{64}$/.test(card.dictionaryRef.hash))throw fail(400,'词典快照引用无效。');output.dictionaryRef={id:card.dictionaryRef.id,hash:card.dictionaryRef.hash}}
  if(value.version===4){if(!['entry','scene'].includes(card.sourceKind)||!uuid.test(card.contentRef?.id)||!/^[a-f0-9]{64}$/.test(card.contentRef?.hash))throw fail(400,'完整内容引用无效。');output.sourceKind=card.sourceKind;output.contentRef={id:card.contentRef.id,hash:card.contentRef.hash}}
  for(const [key,max] of Object.entries({sceneId:100,entryId:100,title:400,origin:400,quote:4000,translation:4000,meaning:12000,note:12000,sourceTitle:400,sourceUrl:2048})){
   if(typeof card[key]!=='string'||card[key].length>max)throw fail(400,'卡片字段过长或格式无效。');output[key]=card[key];
  }
  if(!output.title.trim()||!output.entryId||(!output.sceneId&&!(value.version===4&&output.sourceKind==='entry')))throw fail(400,'词条缺少标题或来源。');
  if(output.sourceUrl){try{const url=new URL(output.sourceUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error()}catch{throw fail(400,'来源链接无效。')}}
  for(const field of ['exampleHighlights','translationHighlights']){if(!Array.isArray(card[field])||card[field].length>30||card[field].some(text=>typeof text!=='string'||text.length>400))throw fail(400,'高亮格式无效。');output[field]=card[field]}
  if(!Array.isArray(card.media)||card.media.length>10)throw fail(400,'素材引用过多。');
  output.media=card.media.map(ref=>{if(!ref||!/^[a-f0-9]{64}$/.test(ref.id)||!['image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm',...(value.version>=2?['audio/mpeg','audio/ogg','audio/wav']:[])].includes(ref.mime)||!Number.isInteger(ref.size)||ref.size<1||ref.size>20*1024*1024)throw fail(400,'素材引用无效。');return {id:ref.id,mime:ref.mime,size:ref.size,name:String(ref.name||'media').slice(0,200)}});
  return output;
 });const refs=new Map(cards.flatMap(card=>card.media).map(ref=>[ref.id,ref]));if([...refs.values()].reduce((sum,ref)=>sum+ref.size,0)>50*1024*1024)throw fail(400,'单批素材最多 50 MB。');const output={version:value.version,cards};if(new TextEncoder().encode(JSON.stringify(output)).length>262144)throw fail(400,'卡片文字总量过大，请拆分批次。');return output;
}
export default async function handler(request,response){
 response.setHeader('Cache-Control','no-store');
 if(request.method!=='POST')return response.status(405).json({error:'Method not allowed'});
 if(process.env.ANKI_BRIDGE_ENABLED!=='true')return response.status(503).json({enabled:false,error:'Anki 联动尚未启用，数据库与本地程序验收通过后开放。'});
 const token=String(request.headers.authorization||'').replace(/^Bearer\s+/i,'').trim();
 if(!token)return response.status(401).json({error:'请先登录。'});
 try{
  const {action,args:raw={}}=request.body||{};if(!actions.has(action)||!raw||typeof raw!=='object'||Array.isArray(raw))throw fail(400,'无效操作。');
  if(JSON.stringify(raw).length>270000)throw fail(413,'批次过大。');
  const args={...raw};
  for(const key of ['jobId','deviceId','leaseToken','revision','requestId','snapshotId','clientRequestId'])if(args[key]!==undefined&&!uuid.test(args[key]))throw fail(400,'无效标识。');
  delete args.userId;delete args.user_id;
  if(action==='content_save'){try{args.payload=globalThis.LearningContent.normalize(args.payload)}catch(e){throw fail(400,e.message)}}
  if(action==='submit'){
   args.payload=validatePayload(args.payload);
   args.payload.confirmationMode='web';
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(args.payload)));
   args.dedupe=[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  }
  const base=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||'https://uoifrqehkfvpzqojaazh.supabase.co';
  const key=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
  const result=await fetch(`${base}/rest/v1/rpc/${action==='next_job'?'anki_next_job':contentActions.has(action)?'anki_learning':dictionaryActions.has(action)?'anki_dictionary':reviewActions.has(action)?'anki_review':deviceActions.has(action)?'anki_device_command':'anki_bridge'}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(action==='next_job'?{args}:{action,args}),signal:AbortSignal.timeout(15000)});
  const data=await result.json().catch(()=>null);
  if(!result.ok){const status=result.status===401?401:data?.code==='42501'?403:data?.code==='40001'?409:result.status===404?503:400;throw fail(status,status===503?'Anki 任务数据库尚未完成迁移。':data?.message||'Anki 任务请求失败。')}
  return response.status(200).json({enabled:true,data});
 }catch(error){return response.status(error.status||502).json({error:error.status?error.message:'Anki 服务暂不可用，请稍后重试。'})}
}
