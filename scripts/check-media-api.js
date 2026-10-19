import assert from 'node:assert/strict';
import handler from '../api/media.js';
const rows=new Map(),calls=[];
globalThis.fetch=async(url,options={})=>{
 const owner=options.headers.Authorization==='Bearer user-two'?'two':'one';
 calls.push({url,options});
 if(url.endsWith('/auth/v1/user'))return Response.json({id:owner});
 if(options.method==='POST'){
  for(const row of JSON.parse(options.body)){assert.equal(row.user_id,owner);assert.match(row.key,/^ai_vocab_tool_media_[a-f0-9]{64}_(\d+|manifest)$/);rows.set(`${owner}:${row.key}`,row)}
  return new Response(null,{status:204});
 }
 const parsed=new URL(url);assert.equal(parsed.searchParams.get('user_id'),`eq.${owner}`);
 const keys=decodeURIComponent(parsed.searchParams.get('key')).slice(4,-1).split(',').map(key=>key.replaceAll('"',''));
 return Response.json(keys.map(key=>rows.get(`${owner}:${key}`)).filter(Boolean));
};
async function run(body,token='user-one'){
 const response={code:0,body:null,status(code){this.code=code;return this},json(value){this.body=value}};
 await handler({method:'POST',headers:{authorization:token?`Bearer ${token}`:''},body},response);return response;
}
const id='a'.repeat(64),ref={id,mime:'image/png',size:4};
assert.equal((await run({action:'manifest',id},'')).code,401);
assert.equal((await run({action:'put',...ref,chunks:[{index:0,data:'AQIDBA=='}],user_id:'two'})).code,200);
assert.equal((await run({action:'complete',...ref})).code,200);
assert.equal((await run({action:'manifest',id})).body.manifest.id,id);
assert.equal((await run({action:'manifest',id},'user-two')).body.manifest,null,'Other users cannot read manifest');
assert.equal((await run({action:'get',id,indexes:[0]},'user-two')).body.chunks.length,0);
assert.equal((await run({action:'get',id,indexes:[0]})).body.chunks[0].data,'AQIDBA==');
assert.equal((await run({action:'put',...ref,chunks:[{index:-1,data:'AQIDBA=='}]})).code,400);
assert.equal((await run({action:'put',...ref,chunks:[{index:0,data:'malicious'}]})).code,400);
assert.equal((await run({action:'put',...ref,mime:'image/svg+xml',chunks:[{index:0,data:'AQIDBA=='}]})).code,400);
assert.equal((await run({action:'manifest',id:'ai_vocab_tool_history'})).code,400);
assert.equal((await run({action:'get',id,indexes:Array.from({length:10},(_,i)=>i)})).code,400);
assert.equal((await run({action:'complete',...ref,id:'b'.repeat(64)})).code,409);
assert.equal((await run({action:'put',...ref,size:21*1024*1024,chunks:[]})).code,400);
const large={id:'c'.repeat(64),mime:'video/webm',size:512*1024+1};
assert.equal((await run({action:'put',...large,chunks:[{index:0,data:Buffer.alloc(512*1024).toString('base64')},{index:1,data:'AQ=='}]})).code,200);
assert.equal((await run({action:'complete',...large})).code,200);
assert.equal((await run({action:'get',id:large.id,indexes:[0,1]})).body.chunks.length,2);
assert.equal((await run({action:'put',...ref,chunks:[{index:0,data:'AQIDBAAA'}]})).code,400,'Encoded length must match the exact decoded size');
console.log('Media API passed: auth, server-owned identity, private namespace, bounded payloads, validation, chunk completion and cross-user isolation.');
