const calls=[];
const responses=[];

globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),options});
  const body=String(url).includes('/auth/v1/user')
    ? {id:'qa-user'}
    : String(url).includes('select=key%2Cupdated_at')||String(url).includes('select=key,updated_at')
      ? [{key:'ai_vocab_tool_history',updated_at:'2026-07-26T00:00:00Z'}]
      : [];
  return new Response(JSON.stringify(body),{
    status:200,
    headers:{'Content-Type':'application/json'},
  });
};

const {default:handler}=await import('../api/sync.js');
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};
const response=()=>({
  statusCode:200,
  body:null,
  status(code){this.statusCode=code;return this},
  json(body){this.body=body;responses.push({status:this.statusCode,body})},
});
const request=body=>({method:'POST',headers:{authorization:'Bearer qa-token'},body});

await handler(request({
  action:'select',
  metadata:true,
  keys:['ai_vocab_tool_history'],
}),response());

const metadataCall=calls.find(call=>call.url.includes('/rest/v1/study_store'));
expect(metadataCall?.url.includes('select=key,updated_at'),'Metadata select must omit the value payload');
expect(!metadataCall?.url.includes('key,value'),'Metadata select must not download cloud values');
expect(responses[0]?.body?.rows?.[0]?.updated_at,'Metadata select must return row versions');

calls.length=0;
responses.length=0;
await handler(request({
  action:'upsert',
  rows:[
    {key:'ai_vocab_tool_history',value:{raw:'[]'}},
    {key:'not_allowed',value:{raw:'secret'}},
  ],
}),response());

const upsertCall=calls.find(call=>call.url.includes('/rest/v1/study_store'));
const uploadedRows=JSON.parse(upsertCall?.options?.body||'[]');
expect(upsertCall?.url.includes('select=key,updated_at'),'Upsert must request the resulting row versions');
expect(upsertCall?.options?.headers?.Prefer?.includes('return=representation'),'Upsert must return version metadata');
expect(uploadedRows.length===1&&uploadedRows[0].key==='ai_vocab_tool_history','Upsert must keep filtering non-ai-vocab keys');
expect(responses[0]?.body?.count===1,'Upsert response must report the filtered row count');
expect(Array.isArray(responses[0]?.body?.rows),'Upsert response must expose updated row versions');

if(failures.length){
  console.error(`Sync API check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Sync API check passed: metadata-only reads, represented upserts, and key filtering.');
}
