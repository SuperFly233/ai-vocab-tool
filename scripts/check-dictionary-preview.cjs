const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const sha=value=>createHash('sha256').update(value).digest('hex');
(async()=>{
 const preview='https://287a78d4.ai-vocab-tool.pages.dev';
 for(const file of ['index.html','dictionary-ui.js','anki-bridge-ui.js','fushi-workspace.js','experience-ui.js','styles.css']){
  const response=await fetch(`${preview}/${file}`,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,file);assert.equal(sha(Buffer.from(await response.arrayBuffer())),sha(fs.readFileSync(`dist/${file}`)),`${file} deployed bytes`);
 }
 const request={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'health'}),signal:AbortSignal.timeout(20000)};
 assert.equal((await fetch(`${preview}/api/anki-jobs`,request)).status,401,'Preview enabled but authentication required');
 assert.equal((await fetch('https://ai-vocab-tool.pages.dev/api/anki-jobs',{...request,signal:AbortSignal.timeout(20000)})).status,503,'Production remains gated');
 console.log('Dictionary preview: six resource hashes match; preview requires login and production remains disabled.');
})().catch(error=>{console.error(error);process.exitCode=1});
