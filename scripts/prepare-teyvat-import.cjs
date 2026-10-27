// Operator-only public corpus import. This script prepares SQL; it never connects to a database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex'),q=value=>"'"+String(value).replace(/'/g,"''")+"'";
function chapterImport(chapter,entry,rows){
 if(!/^\d+$/.test(chapter)||!Number.isSafeInteger(entry.lines)||entry.lines<1||rows.length!==entry.lines||!/^[a-f0-9]{64}$/.test(entry.version)||!Number.isSafeInteger(entry.catalogTotal)||entry.catalogTotal<0)throw Error('Invalid chapter manifest');
 const keys=new Set();for(const row of rows){if(row.chapter!==chapter||row.version!==entry.version||typeof row.key!=='string'||!row.key||keys.has(row.key)||typeof row.en!=='string'||typeof row.zh!=='string'||!row.en&&!row.zh||new URL(row.url).origin!=='https://teyvat-scriptorium.pages.dev')throw Error('Invalid public chapter row');keys.add(row.key)}
 const chunks=[];let pending=[],bytes=0;
 for(const row of rows){const size=Buffer.byteLength(JSON.stringify(row));if(size>180000)throw Error('Public line exceeds operator batch limit');if(bytes+size>180000&&pending.length){chunks.push(pending);pending=[];bytes=0}pending.push(row);bytes+=size}if(pending.length)chunks.push(pending);
 const stage=chunks.map(batch=>'insert into lexi_private.teyvat_import select * from jsonb_populate_recordset(null::public.lexi_teyvat_lines,'+q(JSON.stringify(batch))+'::jsonb) on conflict(key) do update set chapter=excluded.chapter,version=excluded.version,en=excluded.en,zh=excluded.zh,en_key=excluded.en_key,zh_key=excluded.zh_key,title=excluded.title,url=excluded.url;\n');
 // Staging can commit in bounded chunks; only a complete chapter may replace live rows.
 const finalize='begin;\nselect pg_advisory_xact_lock(hashtextextended('+q('teyvat:'+chapter)+',0));\ndo $gate$ begin if (select count(*) from lexi_private.teyvat_import where chapter='+q(chapter)+' and version='+q(entry.version)+') <> '+rows.length+" then raise exception 'Incomplete chapter staging; live chapter retained'; end if; end $gate$;\n"+
 'insert into public.lexi_teyvat_coverage(chapter,version,line_count,catalog_total) values('+[chapter,entry.version,rows.length,entry.catalogTotal].map(q).join(',')+') on conflict(chapter) do update set version=excluded.version,line_count=excluded.line_count,catalog_total=excluded.catalog_total,indexed_at=now();\n'+
 'delete from public.lexi_teyvat_lines where chapter='+q(chapter)+';\ninsert into public.lexi_teyvat_lines select * from lexi_private.teyvat_import where chapter='+q(chapter)+' and version='+q(entry.version)+';\ncommit;\n';
 return {stage,finalize};
}
function prepare(input='tmp/teyvat-index',out='tmp/teyvat-import'){
 const manifest=JSON.parse(fs.readFileSync(path.join(input,'manifest.json'),'utf8'));if(manifest.schema!==1)throw Error('Unsupported public index');fs.mkdirSync(out,{recursive:true});const result=[];
 for(const [chapter,entry] of Object.entries(manifest.chapters)){const bytes=fs.readFileSync(path.join(input,chapter+'.json'));if(hash(bytes)!==entry.artifactHash)throw Error('Chapter artifact checksum mismatch: '+chapter);const sql=chapterImport(chapter,entry,JSON.parse(bytes)),files=[];
  sql.stage.forEach((text,i)=>{const name=chapter+'-stage-'+String(i+1).padStart(4,'0')+'.sql';fs.writeFileSync(path.join(out,name),text);files.push({name,sha256:hash(text),bytes:Buffer.byteLength(text)})});const name=chapter+'-finalize.sql';fs.writeFileSync(path.join(out,name),sql.finalize);files.push({name,sha256:hash(sql.finalize),bytes:Buffer.byteLength(sql.finalize)});result.push({chapter,version:entry.version,lines:entry.lines,files});
 }
 const report={schema:1,publicOnly:true,preparedOnly:true,chapters:result};fs.writeFileSync(path.join(out,'import-manifest.json'),JSON.stringify(report,null,2));return report;
}
module.exports={chapterImport,prepare};
if(require.main===module)try{const result=prepare(process.argv[2],process.argv[3]);console.log(JSON.stringify({preparedOnly:true,chapters:result.chapters.length,lines:result.chapters.reduce((n,c)=>n+c.lines,0)}))}catch(e){console.error(e.message);process.exitCode=1}
