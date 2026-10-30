const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const current=fs.readFileSync('scene-media.js','utf8');
function setup(source,{storageFail=false}={}){
 const records=new Map();let calls=0;
 const context={cloudUser:{id:'one'},cloudAccessToken:async()=>'test-only',AbortController,setTimeout,clearTimeout,Blob,TextDecoder,Uint8Array,Map,Set,crypto:require('node:crypto').webcrypto,atob,btoa,
  SceneData:{getFile:async id=>records.get(id),putRecord:async(id,v)=>{if(storageFail)throw Error('storage quota');records.set(id,v)},inspectFile:async blob=>({ref:{id:'a'.repeat(64),mime:'image/png'},blob})},
  fetch:async()=>{calls++;return {ok:true,json:async()=>({manifest:null})}}};
 vm.createContext(context);vm.runInContext(source,context);
 return {context,records,count:()=>calls};
}
(async()=>{
 const ref={id:'a'.repeat(64),mime:'image/png',size:8};
 const baseline=setup(execFileSync('git',['show','a6a7436:scene-media.js'],{encoding:'utf8'}));
 for(let i=0;i<20;i++)await baseline.context.SceneMedia.resolve(ref).catch(()=>{});
 assert.equal(baseline.count(),20,'Baseline repeatedly sends successful HTTP manifests that contain no material');
 const test=setup(current);
 for(let i=0;i<20;i++)await test.context.SceneMedia.resolve(ref).catch(()=>{});
 assert.equal(test.count(),1,'Missing manifest must stop automatic requests');
 await test.context.SceneMedia.resolve(ref,{refresh:true}).catch(()=>{});assert.equal(test.count(),2,'One explicit retry sends one request');
 test.context.cloudUser={id:'two'};await test.context.SceneMedia.resolve(ref).catch(()=>{});assert.equal(test.count(),3,'Negative result is account isolated');
 await test.context.SceneMedia.resolve({...ref,id:'b'.repeat(64)},{localOnly:true}).catch(()=>{});assert.equal(test.count(),3,'Local preview must not fetch originals');
 const uploads=setup(current);uploads.context.fetch=async()=>{const error=new Error();return {ok:false,json:async()=>({error:'test failure'})}};
 let uploadCalls=0;uploads.context.fetch=async()=>{uploadCalls++;return {ok:false,json:async()=>({error:'test failure'})}};
 for(let i=0;i<20;i++)await uploads.context.SceneMedia.upload(ref).catch(()=>{});
 assert.equal(uploadCalls,1);await uploads.context.SceneMedia.upload(ref,()=>{},{retry:true}).catch(()=>{});assert.equal(uploadCalls,2);
 const storage=setup(current,{storageFail:true});let storageCalls=0;
 storage.context.fetch=async(_url,options)=>{storageCalls++;const p=JSON.parse(options.body);return {ok:true,json:async()=>p.action==='manifest'?{manifest:{size:8,mime:'image/png',chunks:1}}:{chunks:[{index:0,data:Buffer.alloc(8).toString('base64')}]}}};
 for(let i=0;i<20;i++)await storage.context.SceneMedia.resolve(ref).catch(()=>{});
 assert.equal(storageCalls,2,'A verified download followed by storage failure must not redownload repeatedly');
 const switched=setup(current);switched.context.cloudAccessToken=async()=>{switched.context.cloudUser={id:'two'};return 'test-only'};
 await switched.context.SceneMedia.resolve(ref).catch(()=>{});assert.equal(switched.count(),0,'Account change while reading token must stop fetch');
 console.log('Media request budget: baseline20 repeated manifests -> fixed1; explicit retry1; local previews0; storage-failure redownload0; upload failure bounded; account guards passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
