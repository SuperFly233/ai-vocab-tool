const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),os=require('node:os'),path=require('node:path');
vm.runInThisContext(fs.readFileSync('source-data.js','utf8'));vm.runInThisContext(fs.readFileSync('scene-data.js','utf8'));
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',sid='33333333-3333-4333-8333-333333333333',other='44444444-4444-4444-8444-444444444444';
const src=SourceData.source({id:sid,name:'原神',type:'game',aliases:['Genshin Impact','Ｇｅｎｓｈｉｎ　Ｉｍｐａｃｔ'],revision:1});assert.equal(src.aliases.length,1);
assert.equal(SourceData.match({sourceTitle:' genshin  IMPACT '},[src]).method,'alias');assert.equal(SourceData.match({sourceTitle:'原神二'},[src]).method,'suggestion');assert.equal(SourceData.match({sourceRef:{id:sid},sourceTitle:'old'},[{...src,name:'new'}]).method,'identity');
assert.throws(()=>SourceData.reference({id:sid,name:'原神',method:'teyvat',evidence:{key:'k',version:'a'.repeat(64),chapter:'c',url:'https://teyvat-scriptorium.pages.dev.evil.test/'}}));
const ref={id:sid,name:'原神',method:'manual'},scene={id:'scene-one',groupId:'shared-one',quote:'Hello.',sourceRef:ref,updatedAt:'2026-10-26T00:00:00Z'};
assert.deepEqual(SceneData.normalizeScene(scene).sourceRef,ref);assert.deepEqual(SceneData.reconcile([scene,{...scene,sourceRef:undefined,updatedAt:'2026-10-27T00:00:00Z'}]).items[0].sourceRef,ref,'Old clients cannot clear a newer optional reference by omission');
const {extract,build}=require('./build-teyvat-index.cjs'),data={schemaVersion:3,chapter:{id:1700,title:{zh:'测试章'}},quests:[{id:1,title:{zh:'测试任务'},scenes:[{id:2,lines:[{key:'line-1',nodeId:3,variant:0,text:{en:'She kept her promise.',zh:'她信守了承诺。'}}]}]}]},rows=extract(data,'a'.repeat(64));assert.equal(rows.length,1);assert.equal(rows[0].zh,'她信守了承诺。');assert.throws(()=>extract({...data,schemaVersion:1},'a'.repeat(64)));
(async()=>{
 const {PGlite}=await import('../tmp/anki-bridge-qa/node_modules/@electric-sql/pglite/dist/index.js'),db=new PGlite();
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;");
 await db.query('insert into auth.users values($1),($2)',[a,b]);await db.exec(fs.readFileSync('migrations/20261026_sources.sql','utf8'));
 async function owner(id,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role '+role)}
 const rpc=async(action,args={})=>(await db.query('select public.lexi_sources($1,$2::jsonb) as value',[action,JSON.stringify(args)])).rows[0].value;
 await owner(a);assert.deepEqual(await rpc('list'),[]);assert.equal((await rpc('save',{...src,expectedRevision:0})).revision,1);
 await assert.rejects(rpc('save',{...src,expectedRevision:0}),e=>e.code==='40001');await assert.rejects(rpc('save',{...src,id:other,name:'ＧＥＮＳＨＩＮ　ＩＭＰＡＣＴ',expectedRevision:0}),e=>e.code==='23505');
 await assert.rejects(rpc('save',{id:other,aliases:[],expectedRevision:0}));await assert.rejects(rpc('save',{...src,aliases:[4],expectedRevision:1}));
 await assert.rejects(db.query('delete from public.lexi_sources_catalog'));await assert.rejects(db.query('select * from public.lexi_source_names'));
 await owner(b);assert.deepEqual(await rpc('list'),[]);await rpc('save',{...src,expectedRevision:0});assert.equal((await rpc('list')).length,1);
 await owner('','anon');await assert.rejects(rpc('list'));await assert.rejects(db.query('select * from public.lexi_sources_catalog'));
 await owner('');await assert.rejects(rpc('list'));
 await db.exec('reset role');await db.exec(require('./build-teyvat-index.cjs').sqlFor(rows,{version:'a'.repeat(64),catalogTotal:1737}));await owner(a);
 assert.equal((await rpc('search',{query:' Ｓｈｅ  kept her PROMISE. '})).length,1);assert.equal((await rpc('coverage'))[0].catalog_total,1737);assert.equal((await rpc('search',{query:'She kept'})).length,0,'Near matches are not exact evidence');
 await rpc('save',{...src,name:'原神·规范',expectedRevision:1});assert.equal((await rpc('list'))[0].id,sid,'Renaming retains identity');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'lexi-public-index-')),input=path.join(dir,'chapter.json');fs.writeFileSync(input,JSON.stringify(data));let manifest=await build([input],dir);assert.equal(manifest.chapters['1700'].lines,1);fs.writeFileSync(input,'{}');manifest=await build([input],dir);assert.equal(manifest.chapters['1700'].lines,1);assert.ok(manifest.failed[input]);
 await db.close();console.log('Source contracts/SQL: identity, aliases, ambiguity, length, account isolation, anonymous denial, revisions, collision, exact evidence, legacy preservation and failed-index recovery passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
