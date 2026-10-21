const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const {PGlite}=await import('../tmp/anki-bridge-qa/node_modules/@electric-sql/pglite/dist/index.js');
 const db=new PGlite();
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;");
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',device='33333333-3333-4333-8333-333333333333';
 await db.query('insert into auth.users values($1),($2)',[a,b]);await db.exec(fs.readFileSync('integrations/anki-bridge/migration.sql','utf8'));
 async function owner(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 async function rpc(action,args={}){return (await db.query('select public.anki_bridge($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value}
 await owner(a);assert.equal((await rpc('health')).schema,1);await rpc('register',{deviceId:device,name:'Test device'});
 const card={key:'one',title:'clock',quote:'I clocked it.',translation:'注意到了',meaning:'注意到',note:'',media:[]},payload={version:1,cards:[card,{...card,key:'two'}]},dedupe='a'.repeat(64);
 const job=await rpc('submit',{deviceId:device,payload,dedupe});assert.equal((await rpc('submit',{deviceId:device,payload,dedupe})).id,job.id,'Atomic submission dedupe');
 await owner(b);assert.deepEqual(await rpc('devices'),[]);assert.deepEqual(await rpc('list'),[]);await assert.rejects(rpc('claim',{jobId:job.id,deviceId:device}));await assert.rejects(rpc('submit',{deviceId:device,payload,dedupe}));await assert.rejects(db.query('update public.anki_jobs set status=$1',['complete']),'Direct mutation denied');
 await owner(a);const lease=await rpc('claim',{jobId:job.id,deviceId:device});assert.equal(lease.status,'awaiting_confirmation');await assert.rejects(rpc('claim',{jobId:job.id,deviceId:device}));
 const args={jobId:job.id,deviceId:device,leaseToken:lease.lease_token};await rpc('start',args);await rpc('ack',{...args,cardKey:'one',status:'complete',noteId:'1'});await rpc('ack',{...args,cardKey:'two',status:'error',message:'fixture'});assert.equal((await rpc('finish',args)).status,'partial');
 await rpc('retry',{jobId:job.id});assert.equal((await rpc('results',{jobId:job.id})).filter(row=>row.status==='complete').length,1,'Retry preserves completed receipts');
 const next=await rpc('claim',{jobId:job.id,deviceId:device});const nextArgs={...args,leaseToken:next.lease_token};await assert.rejects(rpc('heartbeat',args),'Old lease rejected');await rpc('start',nextArgs);await rpc('ack',{...nextArgs,cardKey:'two',status:'complete',noteId:'2'});assert.equal((await rpc('finish',nextArgs)).status,'complete');
 await rpc('undo',{jobId:job.id,deviceId:device,cardKey:'two'});assert.equal((await rpc('results',{jobId:job.id})).find(row=>row.card_key==='two').status,'undone');
 const cancelled=await rpc('submit',{deviceId:device,payload,dedupe:'b'.repeat(64)}),cancelLease=await rpc('claim',{jobId:cancelled.id,deviceId:device});const ca={jobId:cancelled.id,deviceId:device,leaseToken:cancelLease.lease_token};await rpc('start',ca);await rpc('cancel',{jobId:cancelled.id});assert.equal((await rpc('heartbeat',ca)).cancelRequested,true);assert.equal((await rpc('finish',ca)).status,'cancelled');
 await rpc('retry',{jobId:cancelled.id});assert.equal((await rpc('list')).find(row=>row.id===cancelled.id).status,'awaiting_device','Cancelled task can be explicitly resumed');
 const stale=await rpc('submit',{deviceId:device,payload,dedupe:'c'.repeat(64)}),sl=await rpc('claim',{jobId:stale.id,deviceId:device});await db.exec('reset role');await db.query("update public.anki_jobs set lease_until=now()-interval '1 second' where id=$1",[stale.id]);await owner(a);await assert.rejects(rpc('start',{jobId:stale.id,deviceId:device,leaseToken:sl.lease_token}));assert.equal((await rpc('claim',{jobId:stale.id,deviceId:device})).status,'awaiting_confirmation');
 await db.close();console.log('Anki SQL passed: actual PostgreSQL migration, RLS/owner isolation, atomic dedupe/lease, expiry, partial retry, cancellation and undo receipts.');
 const {default:handler,validatePayload}=await import('../api/anki-jobs.js');
 const valid={...card,key:'key',sceneId:'scene',entryId:'entry',origin:'clock',sourceTitle:'',sourceUrl:'',exampleHighlights:[],translationHighlights:[]};
 assert.equal(validatePayload({version:1,cards:[valid]}).cards[0].sourceType,'lexi');assert.throws(()=>validatePayload({version:1,cards:[{...valid,sourceUrl:'javascript:alert(1)'}]}));assert.throws(()=>validatePayload({version:1,cards:[valid,valid]}));
 function response(){return {code:200,status(n){this.code=n;return this},setHeader(){},json(data){this.data=data;return this}}}
 const req={method:'POST',headers:{},body:{action:'health'}};delete process.env.ANKI_BRIDGE_ENABLED;let res=response();await handler(req,res);assert.equal(res.code,503);process.env.ANKI_BRIDGE_ENABLED='true';res=response();await handler(req,res);assert.equal(res.code,401);
 const original=global.fetch;try{global.fetch=async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.args.userId,undefined);return {ok:true,json:async()=>({schema:1})}};res=response();await handler({...req,headers:{authorization:'Bearer fixture'},body:{action:'health',args:{userId:b}}},res);assert.equal(res.code,200)}finally{global.fetch=original;delete process.env.ANKI_BRIDGE_ENABLED}
 console.log('Anki API passed: default closed gate, authentication, payload safety, dedupe and server-owned identity.');
})().catch(error=>{console.error(error);process.exitCode=1});
