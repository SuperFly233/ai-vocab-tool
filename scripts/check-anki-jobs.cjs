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
 await assert.rejects(rpc('submit',{deviceId:device,payload:{version:2,cards:[{...card,sourceType:'other',sourceId:'1'}]},dedupe:'f'.repeat(64)}));
 await assert.rejects(rpc('submit',{deviceId:device,payload:{version:2,cards:[{...card,sourceType:'fushi',sourceId:'1',media:[{id:'z',mime:'audio/mpeg',size:10}]}]},dedupe:'f'.repeat(64)}));
 assert.equal((await rpc('submit',{deviceId:device,payload:{version:2,cards:[{...card,sourceType:'fushi',sourceId:'favorite:1'}]},dedupe:'e'.repeat(64)})).payload.version,2);
 await owner(b);assert.deepEqual(await rpc('devices'),[]);assert.deepEqual(await rpc('list'),[]);await assert.rejects(rpc('claim',{jobId:job.id,deviceId:device}));await assert.rejects(rpc('submit',{deviceId:device,payload,dedupe}));await assert.rejects(db.query('update public.anki_jobs set status=$1',['complete']),'Direct mutation denied');
 await owner(a);const lease=await rpc('claim',{jobId:job.id,deviceId:device});assert.equal(lease.status,'awaiting_confirmation');await assert.rejects(rpc('claim',{jobId:job.id,deviceId:device}));
 const args={jobId:job.id,deviceId:device,leaseToken:lease.lease_token};await rpc('start',args);await rpc('ack',{...args,cardKey:'one',status:'complete',noteId:'1'});await rpc('ack',{...args,cardKey:'two',status:'error',message:'fixture'});assert.equal((await rpc('finish',args)).status,'partial');
 await rpc('retry',{jobId:job.id});assert.equal((await rpc('results',{jobId:job.id})).filter(row=>row.status==='complete').length,1,'Retry preserves completed receipts');
 const next=await rpc('claim',{jobId:job.id,deviceId:device});const nextArgs={...args,leaseToken:next.lease_token};await assert.rejects(rpc('heartbeat',args),'Old lease rejected');await rpc('start',nextArgs);await rpc('ack',{...nextArgs,cardKey:'two',status:'complete',noteId:'2'});assert.equal((await rpc('finish',nextArgs)).status,'complete');
 await rpc('undo',{jobId:job.id,deviceId:device,cardKey:'two'});assert.equal((await rpc('results',{jobId:job.id})).find(row=>row.card_key==='two').status,'undone');
 const cancelled=await rpc('submit',{deviceId:device,payload,dedupe:'b'.repeat(64)}),cancelLease=await rpc('claim',{jobId:cancelled.id,deviceId:device});const ca={jobId:cancelled.id,deviceId:device,leaseToken:cancelLease.lease_token};await rpc('start',ca);await rpc('cancel',{jobId:cancelled.id});assert.equal((await rpc('heartbeat',ca)).cancelRequested,true);assert.equal((await rpc('finish',ca)).status,'cancelled');
 await rpc('retry',{jobId:cancelled.id});assert.equal((await rpc('list')).find(row=>row.id===cancelled.id).status,'awaiting_device','Cancelled task can be explicitly resumed');
 const stale=await rpc('submit',{deviceId:device,payload,dedupe:'c'.repeat(64)}),sl=await rpc('claim',{jobId:stale.id,deviceId:device});await db.exec('reset role');await db.query("update public.anki_jobs set lease_until=now()-interval '1 second' where id=$1",[stale.id]);await owner(a);await assert.rejects(rpc('start',{jobId:stale.id,deviceId:device,leaseToken:sl.lease_token}));assert.equal((await rpc('claim',{jobId:stale.id,deviceId:device})).status,'awaiting_confirmation');
 await db.exec('reset role');await db.exec(fs.readFileSync('integrations/anki-bridge/migration-web-review.sql','utf8'));await owner(a);
 async function review(action,args={}){return (await db.query('select public.anki_review($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value}
 const web=await rpc('submit',{deviceId:device,payload:{...payload,confirmationMode:'web'},dedupe:'d'.repeat(64)});
 const wl=await rpc('claim',{jobId:web.id,deviceId:device}),wa={jobId:web.id,deviceId:device,leaseToken:wl.lease_token};
 await assert.rejects(rpc('start',wa),'Direct legacy RPC cannot bypass web confirmation');
 await assert.rejects(review('review_approve',{jobId:web.id,revision:device}),'No preview means no approval');
 const snapshot={deck:'Lexi 验收',profile:'test',binding:'a'.repeat(64),decks:['Lexi 验收','Other'],rows:[{key:'one',operation:'create',previous:{}},{key:'two',operation:'update',previous:{Meaning:'Old text'}}]};
 let rev=await review('review_publish',{...wa,snapshot});assert.equal((await review('review_get',{jobId:web.id})).valid,true);
 await owner(b);await assert.rejects(review('review_get',{jobId:web.id}));await assert.rejects(review('review_approve',{jobId:web.id,revision:rev.revision}));await owner(a);
 await assert.rejects(db.query('select * from public.anki_job_reviews'),'No direct preview-table access');
 await assert.rejects(review('review_publish',{...wa,snapshot:{...snapshot,rows:[snapshot.rows[0],snapshot.rows[0]]}}),'No duplicate/missing preview cards');
 await assert.rejects(review('review_publish',{...wa,snapshot:{...snapshot,rows:[snapshot.rows[0],{...snapshot.rows[1],previous:{secret:'not-owned'}}]}}),'No unrelated Anki fields uploaded');
 await review('review_approve',{jobId:web.id,revision:rev.revision});
 await review('review_target',{jobId:web.id,revision:rev.revision,deck:'Other'});
 await assert.rejects(rpc('start',wa),'Changing target invalidates approval');
 await assert.rejects(review('review_publish',{...wa,snapshot}),'Old target cannot be republished');
 const old=rev;rev=await review('review_publish',{...wa,snapshot:{...snapshot,deck:'Other'}});
 await assert.rejects(review('review_approve',{jobId:web.id,revision:old.revision}),'Old preview confirmation rejected');
 await review('review_approve',{jobId:web.id,revision:rev.revision});await rpc('start',wa);
 await rpc('finish',wa);await rpc('retry',{jobId:web.id});const renewed=await rpc('claim',{jobId:web.id,deviceId:device});
 await assert.rejects(rpc('start',{...wa,leaseToken:renewed.lease_token}),'New lease requires fresh approval');
 await db.exec('reset role');await db.exec(fs.readFileSync('integrations/anki-bridge/migration-device-requests.sql','utf8'));await owner(a);
 async function command(action,args={}){return (await db.query('select public.anki_device_command($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value}
 await assert.rejects(command('device_request',{deviceId:device,kind:'shell',command:'anything'}),'Only fixed commands');
 await assert.rejects(command('device_request',{deviceId:device,kind:'fushi_read',scope:'favorites',limit:20}),'Explicit source transfer consent');
 await assert.rejects(command('device_request',{deviceId:device,kind:'fushi_read',scope:'favorites',limit:21,confirmed:true}),'Bound source count');
 const read=await command('device_request',{deviceId:device,kind:'fushi_read',scope:'favorites',limit:1,confirmed:true});
 assert.equal(read.lease_token,undefined);const task=await command('device_poll',{deviceId:device});assert.equal(task.id,read.id);assert.equal(await command('device_poll',{deviceId:device}),null,'Active request cannot be leased twice');
 const cmd={requestId:read.id,deviceId:device,leaseToken:task.lease_token};
 await owner(b);await assert.rejects(command('device_status',{requestId:read.id}));await assert.rejects(command('device_result',{...cmd,result:{items:[]}}));await assert.rejects(command('device_poll',{deviceId:device}));await owner(a);
 await assert.rejects(db.query('select * from public.anki_device_requests'),'Device command table is RPC-only');
 await assert.rejects(command('device_result',{...cmd,result:{items:[{id:'1',key:'b'.repeat(64),password:'forbidden'}]}}),'No unexpected private fields');
 await assert.rejects(command('device_result',{...cmd,result:{items:[{id:'1',key:'b'.repeat(64)},{id:'2',key:'c'.repeat(64)}]}}),'No full-library result');
 await command('device_result',{...cmd,result:{items:[{id:'1',key:'b'.repeat(64),quote:'Synthetic only',mediaAvailable:false}]}});
 const status=await command('device_status',{requestId:read.id});assert.equal(status.status,'complete');assert.equal(status.lease_token,undefined);
 await assert.rejects(command('device_result',{...cmd,result:{items:[]}}),'Completed command cannot be overwritten');
 const diagnosis=await command('device_request',{deviceId:device,kind:'diagnostics'}),dl=await command('device_poll',{deviceId:device});
 await db.exec('reset role');await db.query("update public.anki_device_requests set lease_until=now()-interval '1 second' where id=$1",[diagnosis.id]);await owner(a);
 const dl2=await command('device_poll',{deviceId:device});assert.notEqual(dl2.lease_token,dl.lease_token);
 await assert.rejects(command('device_result',{requestId:diagnosis.id,deviceId:device,leaseToken:dl.lease_token,result:{}}),'Lost-response retry rejects stale lease');
 await command('device_result',{requestId:diagnosis.id,deviceId:device,leaseToken:dl2.lease_token,error:'Synthetic disconnected'});assert.equal((await command('device_status',{requestId:diagnosis.id})).status,'error');
 await assert.rejects(command('device_request',{deviceId:device,kind:'undo',jobId:web.id,confirmed:true}),'Cannot undo an active batch');
 const finalLease={...wa,leaseToken:renewed.lease_token},finalReview=await review('review_publish',{...finalLease,snapshot:{...snapshot,deck:'Other'}});
 await review('review_approve',{jobId:web.id,revision:finalReview.revision});await rpc('start',finalLease);
 await rpc('ack',{...finalLease,cardKey:'one',status:'complete',noteId:'123'});await rpc('ack',{...finalLease,cardKey:'two',status:'complete',noteId:'456'});await rpc('finish',finalLease);
 await assert.rejects(command('device_request',{deviceId:device,kind:'undo',jobId:web.id}),'Explicit undo confirmation');
 const undoRequest=await command('device_request',{deviceId:device,kind:'undo',jobId:web.id,confirmed:true});assert.equal(undoRequest.payload.target.deck,'Other','Original deck, not a current local default');
 const openRequest=await command('device_request',{deviceId:device,kind:'open_note',jobId:web.id,cardKey:'one',noteId:'999'});assert.equal(openRequest.payload.noteId,'123','Client cannot nominate an arbitrary Anki note');
 await assert.rejects(command('device_request',{deviceId:device,kind:'open_note',jobId:web.id,cardKey:'missing'}));
 await db.exec('reset role');await db.exec(fs.readFileSync('integrations/anki-bridge/migration-pending-job.sql','utf8'));
 await db.query("update public.anki_jobs set status='awaiting_device',lease_token=null,lease_until=null,created_at='2020-01-01' where id=$1",[web.id]);
 await db.query("insert into public.anki_jobs(user_id,device_id,dedupe,payload,status) select $1,$2,md5(i::text)||md5((i+1000)::text),$3::jsonb,'complete' from generate_series(1,105) i",[a,device,JSON.stringify(payload)]);
 await owner(a);assert.equal((await rpc('list')).length,100);assert.equal((await rpc('list')).some(row=>row.id===web.id),false);
 async function nextJob(){return (await db.query('select public.anki_next_job($1::jsonb) as value',[JSON.stringify({deviceId:device})])).rows[0].value}
 assert.equal((await nextJob()).id,web.id,'Oldest pending job survives the recent-history display cap');
 const held=await rpc('claim',{jobId:web.id,deviceId:device});assert.equal(await nextJob(),null,'Do not take over an active device lease');
 await owner(b);await assert.rejects(nextJob(),'Device identity is owner-isolated');await owner(a);
 await db.exec('reset role');await db.exec(fs.readFileSync('integrations/anki-bridge/migration-review-changes.sql','utf8'));await owner(a);
 const change={field:'Dictionary',before:'Old meaning',after:'New meaning',beforeTruncated:true,afterTruncated:false};
 const changed={...snapshot,deck:'Other',rows:snapshot.rows.map(row=>({...row,changes:[change]}))};
 const changedArgs={jobId:web.id,deviceId:device,leaseToken:held.lease_token};
 await review('review_publish',{...changedArgs,snapshot:changed});
 assert.equal((await review('review_get',{jobId:web.id})).snapshot.rows[0].changes[0].field,'Dictionary');
 for(const invalid of [{...change,field:'Private'},{...change,before:'x'.repeat(601)},{...change,afterTruncated:'false'},{...change,password:'secret'}]){
  await assert.rejects(review('review_publish',{...changedArgs,snapshot:{...changed,rows:[{...changed.rows[0],changes:[invalid]},changed.rows[1]]}}),'Bound and whitelist preview summaries');
 }
 await review('review_publish',{...changedArgs,snapshot:{...snapshot,deck:'Other'}});
 await owner(b);await assert.rejects(review('review_get',{jobId:web.id}));await owner(a);
 await db.exec('reset role');await db.exec(fs.readFileSync('integrations/anki-bridge/migration-dictionary.sql','utf8'));await db.exec(fs.readFileSync('integrations/anki-bridge/migration-device-idempotency.sql','utf8'));await owner(a);
 const identity='88888888-8888-4888-8888-888888888888',readArgs={deviceId:device,kind:'fushi_read',scope:'favorites',limit:1,confirmed:true,clientRequestId:identity};
 const once=await command('device_request',readArgs);assert.equal((await command('device_request',readArgs)).id,once.id,'Retry returns original request');
 await assert.rejects(command('device_request',{...readArgs,limit:2}),'Same identity cannot change parameters');
 await owner(b);await assert.rejects(command('device_request',readArgs));await owner(a);
 assert.equal((await command('device_status',{requestId:once.id})).request_fingerprint,undefined,'Internal dedupe data stays private');
 assert.equal((await command('device_request',{deviceId:device,kind:'diagnostics'})).kind,'diagnostics','Legacy caller remains supported');
 await db.close();console.log('Anki SQL passed: PostgreSQL/RLS, atomic leases, website approval/targets, device whitelist, bounded Fushi consent, private-field rejection, preview changes and idempotent recovery.');
 const {default:handler,validatePayload}=await import('../api/anki-jobs.js');
 const valid={...card,key:'key',sceneId:'scene',entryId:'entry',origin:'clock',sourceTitle:'',sourceUrl:'',exampleHighlights:[],translationHighlights:[]};
 assert.equal(validatePayload({version:1,cards:[valid]}).cards[0].sourceType,'lexi');assert.throws(()=>validatePayload({version:1,cards:[{...valid,sourceUrl:'javascript:alert(1)'}]}));assert.throws(()=>validatePayload({version:1,cards:[valid,valid]}));
 function response(){return {code:200,status(n){this.code=n;return this},setHeader(){},json(data){this.data=data;return this}}}
 const req={method:'POST',headers:{},body:{action:'health'}};delete process.env.ANKI_BRIDGE_ENABLED;let res=response();await handler(req,res);assert.equal(res.code,503);process.env.ANKI_BRIDGE_ENABLED='true';res=response();await handler(req,res);assert.equal(res.code,401);
 const original=global.fetch;try{global.fetch=async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.args.userId,undefined);return {ok:true,json:async()=>({schema:1})}};res=response();await handler({...req,headers:{authorization:'Bearer fixture'},body:{action:'health',args:{userId:b}}},res);assert.equal(res.code,200)}finally{global.fetch=original;delete process.env.ANKI_BRIDGE_ENABLED}
 console.log('Anki API passed: default closed gate, authentication, payload safety, dedupe and server-owned identity.');
})().catch(error=>{console.error(error);process.exitCode=1});
