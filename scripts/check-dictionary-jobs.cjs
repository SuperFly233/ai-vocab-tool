const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const hash=value=>createHash('sha256').update(value).digest('hex');
(async()=>{
 const {PGlite}=await import('../tmp/anki-bridge-qa/node_modules/@electric-sql/pglite/dist/index.js'),db=new PGlite();
 try{
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;");
 for(const file of ['migration.sql','migration-web-review.sql','migration-device-requests.sql','migration-pending-job.sql','migration-dictionary.sql'])await db.exec(fs.readFileSync('integrations/anki-bridge/'+file,'utf8'));
 const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',device='33333333-3333-4333-8333-333333333333';
 await db.query('insert into auth.users values($1),($2)',[a,b]);
 async function owner(id){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated')}
 async function rpc(name,action,args={}){return (await db.query(`select public.${name}($1,$2::jsonb) as value`,[action,JSON.stringify(args)])).rows[0].value}
 const bridge=(a,b)=>rpc('anki_bridge',a,b),command=(a,b)=>rpc('anki_device_command',a,b),dictionary=(a,b)=>rpc('anki_dictionary',a,b);
 await owner(a);await bridge('register',{deviceId:device,name:'Dictionary fixture'});assert.deepEqual((await bridge('health')).payloadVersions,[1,2,3]);
 const req=await command('device_request',{deviceId:device,kind:'dictionary_lookup',query:'clock',dictionary:'OALDPE'});assert.equal(req.kind,'dictionary_lookup');
 await owner(b);await assert.rejects(command('device_request',{deviceId:device,kind:'dictionary_lookup',query:'clock',dictionary:'OALDPE'}));await assert.rejects(command('device_status',{requestId:req.id}));
 await owner(a);const lease=await command('device_poll',{deviceId:device}),args={deviceId:device,requestId:lease.id,leaseToken:lease.lease_token};
 const result={dictionary:'OALDPE',query:'clock',entries:[{headword:'clock',reading:'',html:'<p>clock</p>',hash:hash('<p>clock</p>'),senses:[{id:hash('<p>notice 注意到</p>'),html:'<p>notice 注意到</p>'},{id:hash('<p>time</p>'),html:'<p>time</p>'}]}]};
 const tampered=structuredClone(result);tampered.entries[0].senses[0].html='<p>changed</p>';
 await assert.rejects(command('device_result',{...args,result:tampered}));
 await assert.rejects(command('device_result',{...args,result:{...result,query:'other'}}));await command('device_result',{...args,result});
 await assert.rejects(dictionary('dictionary_save',{requestId:req.id,entryIndex:0,senseIds:['d'.repeat(64)]}));
 const save={requestId:req.id,entryIndex:0,senseIds:[result.entries[0].senses[0].id]},snap=await dictionary('dictionary_save',save);assert.equal(snap.payload.senses.length,1);assert.equal(snap.hash.length,64);assert.equal((await dictionary('dictionary_save',save)).id,snap.id);
 assert.equal((await dictionary('dictionary_list',{query:'CLOCK'})).length,1);assert.equal((await dictionary('dictionary_get',{snapshotId:snap.id})).payload.dictionary,'OALDPE');
 await assert.rejects(db.query('update public.anki_dictionary_snapshots set payload=$1',['{}']),'Snapshot is RPC-only and immutable');
 const card={key:'dictionary-one',sourceType:'lexi',sourceId:'fixture',sceneId:'fixture',entryId:'fixture',title:'clock',origin:'clock',quote:'I clocked it.',translation:'注意到',meaning:'notice',note:'',sourceTitle:'fixture',sourceUrl:'',exampleHighlights:[],translationHighlights:[],media:[],dictionaryRef:{id:snap.id,hash:snap.hash}};
 const submit={deviceId:device,dedupe:'e'.repeat(64),payload:{version:3,confirmationMode:'web',cards:[card]}};
 const job=await bridge('submit',submit);assert.equal(job.payload.version,3);assert.equal((await bridge('submit',submit)).id,job.id);
 await assert.rejects(bridge('submit',{...submit,payload:{...submit.payload,cards:[{...card,meaning:'changed'}]}}),'Dedupe cannot mutate snapshot');
 assert.equal((await bridge('list')).find(row=>row.id===job.id).payload.cards[0].meaning,'notice');
 await owner(b);await assert.rejects(dictionary('dictionary_get',{snapshotId:snap.id}));assert.deepEqual(await dictionary('dictionary_list',{query:'clock'}),[]);
 await bridge('register',{deviceId:b,name:'Other owner'});await assert.rejects(bridge('submit',{...submit,deviceId:b}),'Cannot submit another owner dictionary');
 await assert.rejects(db.query('select public.anki_bridge_v2($1,$2::jsonb)',['health','{}']),'Cannot bypass v3 validation through legacy internal RPC');
 console.log('Dictionary jobs: five migrations, owner/device/lease isolation, authoritative sense selection, immutable snapshots, dedupe and v1/v2/v3 protocol passed.');
 }finally{await db.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
