import assert from 'node:assert/strict';
import {readdir,readFile} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {createHash} from 'node:crypto';

const origin=new URL(process.argv[2]);
assert.equal(origin.protocol,'https:');
assert.ok(origin.hostname.endsWith('.ai-vocab-tool.pages.dev')||origin.hostname==='ai-vocab-tool.pages.dev');
const root=join(process.cwd(),'dist');
async function* files(directory){for(const item of await readdir(directory,{withFileTypes:true})){const path=join(directory,item.name);if(item.isDirectory())yield* files(path);else yield path}}
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');let count=0;
for await(const path of files(root)){
 const name=relative(root,path).replaceAll('\\','/');const response=await fetch(new URL('/'+name,origin),{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,name);assert.equal(digest(Buffer.from(await response.arrayBuffer())),digest(await readFile(path)),`${name} bytes`);count++;
}
const response=await fetch(new URL('/api/sync',origin),{method:'POST',headers:{'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(20000)});assert.equal(response.status,401,'Unauthenticated sync rejected');
console.log(`${origin.origin}: ${count} deployed file hashes match; sync authentication gate returns401.`);
