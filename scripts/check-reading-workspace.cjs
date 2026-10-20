const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,768,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<900,isMobile:width<900});
   const page=await context.newPage(),errors=[],calls=[];let failOnce=true;page.setDefaultTimeout(10000);
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.route('**/api/analyze',async route=>{
    const {query}=route.request().postDataJSON();calls.push(query);
    if(query==='retry phrase'&&failOnce){failOnce=false;await route.fulfill({status:400,json:{error:'Fixture rejection'}});return}
    const result={meta:{query},headword:{title:query,coreMeaning:'场景测试释义'},senses:[{shortestLabel:'含义',meaning:'Meaning',example:'Example.'}],confusions:[{term:'another',difference:'x'.repeat(1200),usage:'Use'}]};
    await new Promise(resolve=>setTimeout(resolve,80));
    await route.fulfill({contentType:'text/event-stream',body:`data: ${JSON.stringify({delta:JSON.stringify(result)})}\n\ndata: ${JSON.stringify({result,done:true})}\n\n`});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/scenes`);
   await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');
   await page.evaluate(()=>{setSettings({...getSettings(),apiProfiles:[{id:'qa',name:'QA',apiUrl:'https://example.com/v1',apiKey:'test-only',model:'qa-model'}],activeApiProfileId:'qa'});showView('scenes')});
   await page.locator('#scene-hub [data-scene-action="new-library"]').click();
   await page.locator('[name="quote"]').fill('We connect the dots and start over.');
   await page.locator('[name="sourceTitle"]').fill('QA source');
   await page.locator('[data-scene-action="save"]').click();
   await page.waitForFunction(()=>getSettings().sceneLibrary.length===1);
   assert.equal(await page.evaluate(()=>getHistory().length),0,'Independent scene does not create a fake entry');
   await page.locator('#scene-hub [data-scene-action="query"]').click();
   await page.locator('#scene-query-dialog textarea').fill('connect the dots\nstart over\nconnect the dots');
   await page.locator('#scene-query-dialog button[value="query"]').click();
   await page.waitForFunction(()=>getHistory().length===2&&!lookupBusy);
   assert.equal(calls.length,2,'Duplicate batch phrases are only queried once');
   const shared=await page.evaluate(()=>getHistory().map(item=>item.scenes[0].groupId));assert.equal(shared[0],shared[1]);
   assert.ok(await page.evaluate(()=>RequestUI.snapshot().events.some(event=>event.key==='first')));
   await page.locator('#scene-hub [data-scene-action="query"]').click();
   await page.locator('#scene-query-dialog textarea').fill('start over\nretry phrase');
   await page.locator('#scene-query-dialog button[value="query"]').click();
   await page.waitForSelector('[data-retry-task]');
   assert.equal(calls.length,3,'Existing entry is associated without an unnecessary API call');
   await page.locator('[data-retry-task]').click();
   await page.waitForFunction(()=>getHistory().length===3&&!lookupBusy);
   assert.equal(calls.length,4,'Retry only resends the failed task');
   await page.locator('#scene-hub [data-scene-action="edit"]').click();
   await page.locator('[name="note"]').fill('Shared note update');
   await page.locator('[data-scene-action="save"]').click();
   await page.waitForFunction(()=>getHistory().every(item=>item.scenes[0].note==='Shared note update'));
   await page.evaluate(()=>openHistoryModal(getHistory()[0].id));
   await page.waitForSelector('#modal-card-page .reading-nav button');
   assert.ok(await page.locator('#modal-card-page .reading-nav button').count()>1);
   await page.evaluate(()=>{const settings={...getSettings(),readingNav:'left'};setSettings(settings);ExperienceUI.apply(settings)});
   assert.equal(await page.locator('#modal-card-page .reading-layout').getAttribute('data-position'),'left');
   const overflow=await page.locator('#modal-card-page').evaluate(node=>({scroll:node.scrollWidth,width:node.clientWidth}));assert.ok(overflow.scroll<=overflow.width+1,JSON.stringify(overflow));
   await page.locator('#modal-card-page [data-scene-action="remove"]').click();
   await page.locator('#confirm-cancel').click();assert.equal(await page.evaluate(()=>getHistory()[0].scenes.length),1);
   await page.locator('#modal-card-page [data-scene-action="remove"]').click();
   await page.locator('#confirm-ok').click();
   assert.equal(await page.evaluate(()=>getHistory()[0].scenes.length),0);
   assert.equal(await page.evaluate(()=>getHistory()[1].scenes.length),1,'Removing association preserves sibling');
   await page.locator('.toast-action').last().click();
   assert.equal(await page.evaluate(()=>getHistory()[0].scenes.length),1);
   await page.evaluate(()=>{closeHistoryModal();showView('scenes')});
   await page.locator('[data-hub-filter="query"]').fill('missing scene');assert.equal(await page.locator('.scene-hub-row').count(),0);
   await page.locator('[data-hub-filter="query"]').fill('connect');assert.equal(await page.locator('.scene-hub-row').count(),1);
   await page.evaluate(()=>showView('settings'));
   for(const id of ['settings-experience','settings-reading','settings-media','settings-notifications','settings-data'])assert.equal(await page.locator(`#${id}`).count(),1);
   await page.locator('[data-preference="mediaControls"]').uncheck();assert.equal(await page.evaluate(()=>getSettings().mediaControls),false);
   const nav=page.locator('.settings-nav');await nav.scrollIntoViewIfNeeded();
   const sticky=await nav.evaluate(node=>({background:getComputedStyle(node).backgroundColor,top:node.getBoundingClientRect().top}));if(width<900)assert.notEqual(sticky.background,'rgba(0, 0, 0, 0)');
   await page.evaluate(()=>showView('scenes'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`scene-hub-${width}-${theme}.png`)})}
   await page.reload();await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');
   assert.equal(await page.evaluate(()=>getSettings().sceneLibrary.length),1,'Independent scene survives reload');
   assert.equal(await page.evaluate(()=>getHistory().length),3);
   assert.deepEqual(errors,[]);
   console.log(`Workspace ${width}px ${theme}: independent scene, batch dedupe/SSE, shared edit, navigation, confirm/cancel/undo, filters, settings and persistence passed.`);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
