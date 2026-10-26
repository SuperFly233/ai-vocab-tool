// Operator-only builder: public chapter data only, never private learning records.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT='https://teyvat-scriptorium.pages.dev',norm=v=>String(v||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('en');
const hash=v=>crypto.createHash('sha256').update(v).digest('hex'),quote=v=>"'"+String(v).replace(/'/g,"''")+"'";
function extract(data,version){
  const chapter=String(data.chapter?.id||'');
  if(!/^\d+$/.test(chapter)||data.schemaVersion!==3||!Array.isArray(data.quests))throw Error('Unsupported public chapter schema');
  const rows=data.quests.flatMap(q=>{
    if(!Array.isArray(q.scenes))throw Error('Missing chapter scenes');
    return q.scenes.flatMap(s=>{
      if(!Array.isArray(s.lines))throw Error('Missing scene lines');
      return s.lines.filter(l=>l.text?.en||l.text?.zh).map(l=>{
        const en=l.text.en||'',zh=l.text.zh||'';
        if(typeof en!=='string'||typeof zh!=='string'||en.length>50000||zh.length>50000||!l.key)throw Error('Invalid public line');
        return {key:[chapter,q.id,s.id,l.nodeId,l.variant,l.key].join(':'),chapter,version,en,zh,en_key:norm(en),zh_key:norm(zh),title:[data.chapter.title?.zh||data.chapter.title?.en||chapter,q.title?.zh||q.title?.en||q.id].join(' · '),url:ROOT+'/?chapter='+encodeURIComponent(chapter)+'&quest='+encodeURIComponent(q.id)};
      });
    });
  });
  if(!rows.length||new Set(rows.map(r=>r.key)).size!==rows.length)throw Error('Empty or duplicate chapter lines; old chapter retained');
  return rows;
}
function sqlFor(rows,entry){
  const chapter=rows[0].chapter;
  return 'begin;\ninsert into public.lexi_teyvat_coverage(chapter,version,line_count,catalog_total) values('+[chapter,entry.version,rows.length,entry.catalogTotal].map(quote).join(',')+') on conflict(chapter) do update set version=excluded.version,line_count=excluded.line_count,catalog_total=excluded.catalog_total,indexed_at=now();\ndelete from public.lexi_teyvat_lines where chapter='+quote(chapter)+';\ninsert into public.lexi_teyvat_lines select * from jsonb_populate_recordset(null::public.lexi_teyvat_lines,'+quote(JSON.stringify(rows))+'::jsonb);\ncommit;\n';
}
function atomic(file,value){const pending=file+'.pending';fs.writeFileSync(pending,value);fs.renameSync(pending,file)}
async function get(url){
  for(let attempt=0;attempt<2;attempt++)try{const r=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Public endpoint returned '+r.status);return await r.text()}catch(e){if(attempt===1)throw e;await new Promise(r=>setTimeout(r,1000))}
}
async function build(inputs,out='tmp/teyvat-index',{refresh=false}={}){
  fs.mkdirSync(out,{recursive:true});
  const file=path.join(out,'manifest.json'),manifest=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{schema:1,chapters:{},failed:{}};
  if(manifest.schema!==1)throw Error('Unsupported index manifest; use a new output directory');
  let catalog;
  if(inputs.some(v=>v==='--catalog'||/^\d+$/.test(v))){
    const raw=await get(ROOT+'/api/catalog');catalog=JSON.parse(raw);if(catalog.schemaVersion!==3||!Array.isArray(catalog.items))throw Error('Unsupported public catalog');
    manifest.catalog={version:hash(raw),total:catalog.items.length,at:catalog.generatedAt};atomic(path.join(out,'catalog.json'),raw);
  }
  const ids=inputs.includes('--catalog')?catalog.items.filter(v=>!v.hidden&&!v.unreleased).map(v=>String(v.id)):inputs;
  for(const input of ids){
    if(/^\d+$/.test(input)&&!refresh&&manifest.chapters[input]&&fs.existsSync(path.join(out,input+'.json'))&&hash(fs.readFileSync(path.join(out,input+'.json')))===manifest.chapters[input].artifactHash)continue;
    let chapter=String(input),raw;
    try{
      if(/^\d+$/.test(input))raw=await get(ROOT+'/api/quest/'+input+'?langs=CHS,EN');
      else if(/^https:\/\/teyvat-scriptorium.pages.dev\/api\/quest\/\d+\?langs=CHS,EN$/.test(input))raw=await get(input);
      else if(!input.includes('://'))raw=fs.readFileSync(input,'utf8');
      else throw Error('Unapproved public endpoint');
      const data=JSON.parse(raw),version=hash(raw),rows=extract(data,version);chapter=String(data.chapter.id);
      const artifact=JSON.stringify(rows),entry={version,lines:rows.length,catalogTotal:manifest.catalog?.total||0,artifactHash:hash(artifact),indexedAt:new Date().toISOString()};
      atomic(path.join(out,chapter+'.json'),artifact);atomic(path.join(out,chapter+'.sql'),sqlFor(rows,entry));manifest.chapters[chapter]=entry;delete manifest.failed[input];
      console.log('Public chapter '+chapter+': '+rows.length+' lines; atomic import prepared.');
    }catch(e){manifest.failed[input]={message:e.message,at:new Date().toISOString()};console.error('Chapter '+input+' failed; existing index retained: '+e.message)}
    atomic(file,JSON.stringify(manifest,null,2));
  }
  atomic(file,JSON.stringify(manifest,null,2));return manifest;
}
module.exports={extract,build,sqlFor};
if(require.main===module){const args=process.argv.slice(2),outAt=args.indexOf('--out'),out=outAt<0?'tmp/teyvat-index':args[outAt+1];if(outAt>=0)args.splice(outAt,2);const refresh=args.includes('--refresh');build(args.filter(v=>v!=='--refresh'),out,{refresh}).then(m=>{console.log(JSON.stringify({chapters:Object.keys(m.chapters).length,failed:Object.keys(m.failed).length,catalog:m.catalog?.total||0}));if(Object.keys(m.failed).length)process.exitCode=1}).catch(e=>{console.error(e.message);process.exitCode=1})}
