const assert=require('node:assert/strict');
(async()=>{const {default:handler}=await import('../api/sources.js');const original=global.fetch;
 const invoke=async(body,token='fixture')=>{const r={code:200,setHeader(){},status(n){this.code=n;return this},json(v){this.body=v;return this}};await handler({method:'POST',headers:{authorization:token?'Bearer '+token:''},body},r);return r};
 try{
  assert.equal((await invoke({action:'list'},'')).code,401);assert.equal((await invoke({action:'arbitrary'})).code,400);assert.equal((await invoke({action:'save',args:[]})).code,400);assert.equal((await invoke({action:'save',args:{x:'x'.repeat(20001)}})).code,400);
  let forwarded;global.fetch=async(url,options)=>{forwarded=JSON.parse(options.body);return new Response(JSON.stringify([]),{status:200})};assert.equal((await invoke({action:'list',args:{userId:'foreign',user_id:'foreign'}})).code,200);assert.equal(forwarded.args.userId,undefined);assert.equal(forwarded.args.user_id,undefined);
  for(const [code,http,expected] of [['40001',400,409],['23505',409,409],['PGRST202',404,503],['42501',403,403]]){global.fetch=async()=>new Response(JSON.stringify({code}),{status:http});assert.equal((await invoke({action:'save'})).code,expected)}
  process.env.SOURCES_ENABLED='false';assert.equal((await invoke({action:'list'})).code,503);delete process.env.SOURCES_ENABLED;
  console.log('Sources API: authentication, bounded allowlist, owner-field stripping, conflict/auth/unavailable responses and server switch passed.');
 }finally{global.fetch=original;delete process.env.SOURCES_ENABLED}
})().catch(e=>{console.error(e);process.exitCode=1});
