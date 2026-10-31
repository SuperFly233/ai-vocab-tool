const waitForState=require('./wait-browser-state.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/analysis-lifecycle',{recursive:true});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark']){
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await context.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:'+server.address().port);
  await page.evaluate(async()=>{
   await appReady;await cloudInitPromise;await SceneAITasks.ready;
   window.profile={id:'qa',name:'Synthetic',apiUrl:'https://vision.example.com/v1/chat/completions',apiKey:'synthetic-not-a-real-key',model:'synthetic'};
   setSettings({...getSettings(),apiProfiles:[profile],sceneAI:{auto:false,useImage:false,profileId:'qa',mode:'default'}});
   localStorage.setItem('lexi-scene-ai-consent:local:'+await SceneAITasks.fingerprint(profile),'yes');
   window.scene=SceneData.normalizeScene({id:'retained',groupId:'retained',title:'合成场景',quote:'We keep the promise.',translation:'',note:'Never delete this note',media:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
   setSettings({...getSettings(),sceneLibrary:[scene]});window.calls=0;window.work=[];
   SceneAIClient={...SceneAIClient,analyze:(p,s,o)=>{calls++;return new Promise(resolve=>work.push({resolve,signal:o.signal}))}};
   window.makeResult=()=>({...SceneAIData.parse(JSON.stringify({title:'信守承诺',quote:scene.quote,translation:'我们信守承诺。',learningTargets:[{phrase:'keep',meaning:'信守'}]})),model:'synthetic',generatedAt:new Date().toISOString()});
   const template=await SceneAITasks.create(profile,scene,{}),jobs=Array.from({length:150},(_,i)=>({...template,id:'legacy-'+i,state:i%2?'check':'reviewed',result:makeResult(),bound:{groupId:scene.groupId,scene,expected:SceneUI.supplementVersion(scene.groupId)}}));
   await SceneData.putDraft('scene-ai-task-pool:local',{version:1,jobs});
   window.newJob=await SceneAITasks.create(profile,scene,{});await SceneAITasks.remove([newJob.id]);window.outer=AnkiBridge.dialog('外层测试');await SceneAITasks.open();
  });
  assert.equal(await page.locator('[data-pool-remove]').count(),50,'Paginated records all expose deletion');
  await page.locator('[data-pool-remove]').first().click();await page.locator('#confirm-top-layer[open]').waitFor();
  assert.equal(await page.locator('#confirm-ok').evaluate(n=>{const r=n.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===n}),true,'Confirmation must be hit-testable above two native dialogs');
  await page.screenshot({path:'tmp/analysis-lifecycle/confirm-'+width+'-'+theme+'.png'});
  await page.keyboard.press('Escape');await page.locator('#confirm-top-layer').waitFor({state:'hidden'});assert.equal(await page.locator('.scene-ai-pool[open]').count(),1,'Escape closes confirmation only');
  await page.locator('[data-pool-remove]').first().click();await page.locator('#confirm-ok').click();
  await waitForState(page,async()=>(await SceneAITasks.list()).length===149);
  assert.equal(await page.evaluate(()=>SceneUI.sceneGroups().length),1);
  await page.locator('[data-pool-clear]').click();await page.locator('#confirm-ok').click();await waitForState(page,async()=>(await SceneAITasks.list()).length===0);
  assert.equal(await page.evaluate(()=>SceneUI.sceneGroups()[0].scene.note),'Never delete this note');
  await page.screenshot({path:'tmp/analysis-lifecycle/empty-'+width+'-'+theme+'.png'});
  await page.evaluate(()=>{document.querySelector('.scene-ai-pool').close();outer.close()});
  // Actual editor save while the provider is still working: no approval pool is needed.
  await page.evaluate(()=>SceneUI.open('library'));await page.locator('[name=quote]').fill('We keep the promise.');await page.locator('[data-ai-analyze]').click();await page.waitForFunction(()=>calls===1);await page.locator('[data-scene-action=save]').click();await page.waitForSelector('#scene-editor',{state:'detached'});
  await page.evaluate(()=>work[0].resolve(makeResult()));await waitForState(page,async()=>(await SceneAITasks.list()).some(j=>j.state==='reviewed'));
  assert.equal(await page.evaluate(()=>SceneUI.sceneGroups().find(g=>g.scene.groupId!==scene.groupId).scene.translation),'我们信守承诺。');
  // Concurrent manual edits block late saves but keep the existing generated result editable.
  await page.evaluate(async()=>{window.conflict=await SceneAITasks.create(profile,scene,{});await SceneAITasks.bind(conflict.id,scene);window.conflictRun=SceneAITasks.execute(conflict,profile);setSettings({...getSettings(),sceneLibrary:getSettings().sceneLibrary.map(s=>s.groupId===scene.groupId?{...s,note:'Manual edit',updatedAt:new Date(Date.now()+1000).toISOString()}:s)})});
  await page.waitForFunction(()=>calls===2);await page.evaluate(async()=>{work[1].resolve(makeResult());await conflictRun;await SceneAITasks.open(conflict.id)});
  assert.match(await page.locator('[data-pool-id="'+await page.evaluate(()=>conflict.id)+'"]').textContent(),/已有修改/);
  await page.locator('[data-pool-id="'+await page.evaluate(()=>conflict.id)+'"] [data-pool-open]').click();await page.locator('#scene-editor').waitFor();
  assert.equal(await page.locator('[name=translation]').inputValue(),'我们信守承诺。');assert.equal(await page.locator('[data-ai-use]').count(),0);
  await page.locator('[data-scene-action=save]').click();await page.waitForSelector('#scene-editor',{state:'detached'});assert.equal(await page.evaluate(()=>SceneUI.sceneGroups().find(g=>g.scene.groupId===scene.groupId).scene.note),'Manual edit');
  // All states, including a running capture task, can be removed without resurrection.
  await page.evaluate(async()=>{window.deleting=await SceneAITasks.create(profile,scene,{capture:true});window.late=SceneAITasks.execute(deleting,profile).catch(e=>e.message)});await page.waitForFunction(()=>calls===3);
  await page.evaluate(async()=>{window.removed=await SceneAITasks.remove([deleting.id]);work[2].resolve(makeResult());await late});
  assert.equal(await page.evaluate(async()=>(await SceneAITasks.list()).some(j=>j.id===deleting.id)),false);
  await page.evaluate(async()=>{await SceneAITasks.restoreRecords(removed,'local')});assert.equal(await page.evaluate(async()=>(await SceneAITasks.list()).find(j=>j.id===deleting.id).state),'interrupted');assert.equal(await page.evaluate(()=>calls),3,'Undo cannot restart paid requests');
  // Storage failure is visible and does not remove data or send an AI request.
  await page.evaluate(async()=>{window.put=SceneData.putDraft;SceneData.putDraft=()=>Promise.reject(Error('Synthetic storage failure'));window.storageRejected=false;try{await SceneAITasks.remove([conflict.id])}catch{storageRejected=true}SceneData.putDraft=put});
  assert.equal(await page.evaluate(()=>storageRejected),true);assert.equal(await page.evaluate(async()=>(await SceneAITasks.list()).some(j=>j.id===conflict.id)),true);
  if(width===390&&theme==='light'){
   await page.evaluate(async()=>{window.blockers=[];window.blocked=Promise.all([0,1].map(i=>navigator.locks.request('scene-ai-slot:'+i,()=>new Promise(r=>blockers.push(r)))))});
   await page.waitForFunction(()=>blockers.length===2);
   await page.evaluate(async()=>{window.queued=await SceneAITasks.create(profile,scene,{});window.queuedRun=SceneAITasks.execute(queued,profile).catch(e=>e.message);const deleted=await SceneAITasks.remove([queued.id]);await SceneAITasks.restoreRecords(deleted,'local');blockers.forEach(r=>r());await blocked;await queuedRun});
   assert.equal(await page.evaluate(()=>calls),3,'Undoing a deleted queued task must not revive its previous waiting execution');
   await page.evaluate(async()=>{const live=await SceneAITasks.list();await SceneAITasks.remove(live.filter(j=>['queued','running'].includes(j.state)).map(j=>j.id));for(let i=0;i<20;i++)await SceneAITasks.create(profile,scene,{});window.limitEnforced=false;try{await SceneAITasks.create(profile,scene,{})}catch{limitEnforced=true}await SceneAITasks.remove((await SceneAITasks.list()).filter(j=>j.state==='queued').map(j=>j.id))});
   assert.equal(await page.evaluate(()=>limitEnforced),true,'Only concurrent jobs are limited, not retained history');
  }
  await page.evaluate(()=>SceneAITasks.open());await page.screenshot({path:'tmp/analysis-lifecycle/records-'+width+'-'+theme+'.png'});
  assert.ok(await page.locator('.scene-ai-pool').evaluate(n=>n.scrollWidth<=n.clientWidth+1));
  await page.keyboard.press('Escape');await page.evaluate(()=>SceneUI.openSupplement());assert.equal(await page.locator('[data-batch-apply]').count(),0);assert.equal(await page.evaluate(()=>calls),3,'Opening supplement does not call the model');await page.screenshot({path:'tmp/analysis-lifecycle/supplement-'+width+'-'+theme+'.png'});
  assert.deepEqual(errors,[]);await context.close();console.log(width+' '+theme+': 150 legacy records, deletion, top-layer confirmation, immediate-save auto completion, concurrent edit, no paid replay, persistence failure passed');
 }
 }finally{await browser?.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
