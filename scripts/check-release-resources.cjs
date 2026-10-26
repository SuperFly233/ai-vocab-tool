const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const hash=v=>createHash('sha256').update(v).digest('hex');
(async()=>{const base=process.argv[2];assert.match(base||'',/^https:\/\/(?:[a-z0-9-]+\.)?ai-vocab-tool\.pages\.dev$/);let count=0;for(const file of fs.readdirSync('dist',{recursive:true}).filter(f=>fs.statSync(path.join('dist',f)).isFile())){
 const response=await fetch(base+'/'+file.replaceAll('\\','/'),{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,file);assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(fs.readFileSync(path.join('dist',file))),file);count++;
 }for(const route of ['sync','anki-jobs']){const response=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'health'}),signal:AbortSignal.timeout(20000)});assert.equal(response.status,401,route)}console.log(JSON.stringify({base,resources:count,auth:'sync401/anki401',version:JSON.parse(fs.readFileSync('package.json')).version}));
})().catch(e=>{console.error(e.message);process.exitCode=1});
