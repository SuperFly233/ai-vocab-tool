const assert=require('node:assert/strict'),fs=require('node:fs'),{chapterImport}=require('./prepare-teyvat-import.cjs');
(async()=>{
 const {PGlite}=await import('../tmp/anki-bridge-qa/node_modules/@electric-sql/pglite/dist/index.js'),db=new PGlite();
 try{
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;");await db.exec(fs.readFileSync('migrations/20261026_sources.sql','utf8'));
 const entry={version:'a'.repeat(64),lines:2,catalogTotal:1737},row={chapter:'1700',version:entry.version,key:'1700:one',en:'Public line',zh:'公开语录',en_key:'public line',zh_key:'公开语录',title:'Public chapter',url:'https://teyvat-scriptorium.pages.dev/?chapter=1700'},rows=[row,{...row,key:'1700:two',en:'Second line'}],job=chapterImport('1700',entry,rows);
 await assert.rejects(db.exec(job.finalize),/Incomplete chapter/);await db.exec('rollback');assert.equal((await db.query('select count(*) as count from public.lexi_teyvat_coverage')).rows[0].count,0);
 for(const sql of job.stage)await db.exec(sql);await db.exec(job.finalize);assert.equal((await db.query('select count(*) as count from public.lexi_teyvat_lines')).rows[0].count,2);
 for(const sql of job.stage)await db.exec(sql);await db.exec(job.finalize);assert.equal((await db.query('select count(*) as count from public.lexi_teyvat_lines')).rows[0].count,2,'Staging and finalize are replayable');
 const next=chapterImport('1700',{...entry,version:'b'.repeat(64)},rows.map(r=>({...r,version:'b'.repeat(64)})));await assert.rejects(db.exec(next.finalize));await db.exec('rollback');assert.equal((await db.query('select version from public.lexi_teyvat_coverage')).rows[0].version,entry.version,'Incomplete replacement retains old live coverage');
 assert.throws(()=>chapterImport('1700',entry,[row,row]));assert.throws(()=>chapterImport('1700',entry,[row,{...row,key:'other',url:'https://evil.test/'}]));
 console.log('Public corpus import: bounded staging, incomplete refusal, atomic replacement, replay and origin/checksum preparation passed.');
 }finally{await db.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
