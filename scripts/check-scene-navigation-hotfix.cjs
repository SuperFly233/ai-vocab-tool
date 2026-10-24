const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/dialog-qa/scene-navigation-hotfix',{recursive:true});
 for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));let requests=0;
  await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);await page.route('https://**/*',r=>new URL(r.request().url()).hostname===new URL(base).hostname?r.continue():r.abort());await page.route('**/api/analyze',r=>{requests++;return r.abort()});
  await page.goto(base+'/scenes');await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');
  await page.evaluate(async()=>{
   await appReady;await cloudInitPromise;syncAllToCloud=async()=>true;
   const now=new Date().toISOString(),scene=id=>({id,groupId:id,title:id==='scene-a'?'第一处场景':'第二处场景',quote:'Please clock in before work.',translation:'请在上班前打卡。',featured:true,media:[],createdAt:now,updatedAt:now});
   globalThis.__fixtureResult={meta:{query:'clock',language:'en'},headword:{title:'clock',coreMeaning:'注意到／记录'},senses:[],collocations:[{phrase:'clock in',meaning:'记录上班时间',example:'Please clock in.',translation:'请打卡。'}],register:{},confusions:[]};
   setSettings({...getSettings(),sceneLibrary:[scene('scene-a'),scene('scene-b')]});setHistory([{id:901,query:'clock',result:__fixtureResult,scenes:[{...scene('scene-a'),id:'link-a'},{...scene('scene-b'),id:'link-b'}],createdAt:now,updatedAt:now}]);showView('scenes',null,{focus:false});SceneWorkspace.select('scene-a');
  });
  if(width<=900){const b=await page.locator('.scene-back').boundingBox(),h=await page.locator('.scene-workbench>header').boundingBox();assert.ok(Math.abs(b.x-h.x)<1&&b.width<130,`Back must be start-aligned, not stretch/center: ${JSON.stringify({b,h})}`)}
  await page.screenshot({path:`tmp/dialog-qa/scene-navigation-hotfix/scene-${width}-${theme}.png`,animations:'disabled'});
  await page.evaluate(()=>{
   globalThis.__task={query:'clock in',sceneGroupId:'scene-a',direction:'en-zh',note:'synthetic scene context',folderIds:[]};
   // Production reports running before it assigns activeLookupRequest. Preserve that order.
   SceneUI.taskResult(__task,'running');lookupBusy=true;activeLookupRequest=storableLookupRequest(__task);activeLookupSignature=lookupRequestSignature(__task);els.query.value=__task.query;
   const runId=++lookupRunId;renderLookupLoading(__task.query,currentApiSettings(),runId);
   const body=new ReadableStream({start(controller){globalThis.__controller=controller}});globalThis.__stream=readLookupStream(new Response(body,{headers:{'Content-Type':'text/event-stream'}}),{query:__task.query,runId});
   globalThis.__send=data=>__controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
   __send({delta:'{"headword":{"title":"clock in","coreMeaning":"打卡"},"collocations":[{"phrase":"clock in","meaning":"登记","example":"Please clock in.","translation":"请打'});
  });
  await page.waitForFunction(()=>[...els.resultCard.querySelectorAll('.stream-block')].find(block=>block.querySelector('.block-title')?.textContent.includes('固定搭配'))?.textContent.includes('请打'));
  await page.locator('[data-open-scene-task]').click();assert.equal(await page.evaluate(()=>activeView),'home');assert.equal(await page.evaluate(()=>activeLookupRequest.query),'clock in');assert.equal(requests,0,'Viewing progress cannot submit another model request');
  await page.screenshot({path:`tmp/dialog-qa/scene-navigation-hotfix/stream-${width}-${theme}.png`,animations:'disabled'});
  await page.locator('.stream-block').filter({has:page.locator('.block-title',{hasText:'固定搭配'})}).scrollIntoViewIfNeeded();await page.screenshot({path:`tmp/dialog-qa/scene-navigation-hotfix/translation-${width}-${theme}.png`,animations:'disabled'});
  await page.evaluate(()=>{__send({delta:'卡。"}]}'});__send({result:__fixtureResult,done:true});__controller.close()});await page.evaluate(()=>__stream);
  await page.evaluate(()=>{lookupBusy=false;activeLookupRequest=null;activeLookupSignature='';SceneUI.taskResult(__task,'complete');showView('scenes',null,{focus:false});SceneWorkspace.select('scene-a');lookupQueue=[{...__task,query:'waiting phrase',id:77,signature:lookupRequestSignature({...__task,query:'waiting phrase'})}];SceneWorkspace.render()});
  await page.locator('[data-open-scene-task]').click();assert.equal(await page.evaluate(()=>activeView),'home');assert.equal(await page.evaluate(()=>lookupQueue.length),1);assert.equal(requests,0);assert.equal(await page.locator('.queue-item').getByText('waiting phrase',{exact:true}).count(),1);
  await page.evaluate(()=>{lookupQueue=[];showView('scenes',null,{focus:false});SceneWorkspace.select('scene-a')});await page.locator('[data-open-entry="901"]').click();await page.waitForSelector('#history-modal.open');
  await page.locator('#history-modal [data-scene-id="link-b"] [data-scene-action="workspace"]').click();await page.waitForFunction(()=>!els.historyModal.classList.contains('open'));assert.equal(await page.evaluate(()=>activeView),'scenes');assert.equal(new URL(page.url()).searchParams.get('scene'),'scene-b','Entry link targets the precise associated scene');
  if(width===390&&theme==='light'){
   await page.evaluate(()=>{openHistoryModal(901);setModalTab('json',document.getElementById('modal-json-tab'));els.modalJsonEdit.value='{invalid but recoverable draft';});
   await page.evaluate(()=>document.querySelector('#history-modal [data-scene-id="link-a"] [data-scene-action="workspace"]').click());await page.waitForSelector('#confirm-layer.open');await page.locator('#confirm-cancel').click();assert.equal(await page.locator('#history-modal').evaluate(n=>n.classList.contains('open')),true,'Cancelled navigation preserves editor');
   await page.evaluate(()=>document.querySelector('#history-modal [data-scene-id="link-a"] [data-scene-action="workspace"]').click());await page.locator('#confirm-ok').click();await page.waitForFunction(()=>!els.historyModal.classList.contains('open'));assert.equal(new URL(page.url()).searchParams.get('scene'),'scene-a');await page.locator('.toast-action').last().click();await page.waitForSelector('#history-modal.open');assert.equal(await page.locator('#modal-json-edit').inputValue(),'{invalid but recoverable draft');await page.evaluate(()=>closeHistoryModal());
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();console.log(`Scene navigation ${width} ${theme}: left back, partial collocation translation, running/queued navigation without request and exact bidirectional link passed`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(error=>{console.error(error);process.exitCode=1});
