const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},isMobile:width<=900,hasTouch:width<=900});
   const page=await context.newPage(),errors=[],calls=[];let rejected=false;page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.route('**/api/analyze',async route=>{const {query}=route.request().postDataJSON();calls.push(query);if(query==='retry phrase'&&!rejected){rejected=true;return route.fulfill({status:400,json:{error:'Fixture failure'}})}await route.fulfill({json:{meta:{query},headword:{title:query,coreMeaning:'测试释义'},senses:[{shortestLabel:'义项',meaning:'测试'}],collocations:[],register:{},confusions:[]}})});
   await page.goto(`http://127.0.0.1:${server.address().port}/batch`);await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');
   assert.equal(new URL(page.url()).pathname,'/scenes');assert.equal(await page.locator('.sidebar .nav-item:visible').count(),4);
   await page.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=800;canvas.height=450;const ctx=canvas.getContext('2d');ctx.fillStyle='#65959e';ctx.fillRect(0,0,800,450);ctx.fillStyle='#fff';ctx.font='40px sans-serif';ctx.fillText('Scene learning fixture',60,100);const blob=await new Promise(resolve=>canvas.toBlob(resolve));blob.name='scene.png';const ref=await SceneData.putFile(blob),now=new Date().toISOString();
    setSettings({...getSettings(),apiProfiles:[{id:'qa',name:'QA',apiUrl:'https://example.com/v1',apiKey:'test-only',model:'qa'}],activeApiProfileId:'qa',sceneLibrary:[{id:'one',groupId:'one',title:'日常对话',quote:'We connect the dots and start over.',translation:'我们重新开始，把线索串起来。',sourceTitle:'QA source',note:'场景笔记',media:[ref],createdAt:now,updatedAt:now},{id:'two',groupId:'two',title:'纯文字场景',quote:'A second scene.',sourceTitle:'Other source',createdAt:now,updatedAt:now}]});SceneWorkspace.render();
   });
   const search=page.getByRole('searchbox',{name:'搜索场景'});await search.focus();
   await search.evaluate(input=>{window.__searchInput=input;input.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));input.value='日常';input.dispatchEvent(new InputEvent('input',{bubbles:true,isComposing:true}));input.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true}))});
   assert.equal(await page.locator('.scene-list-row').count(),1);assert.ok(await search.evaluate(input=>input===__searchInput&&document.activeElement===input));await search.fill('');
   await page.locator('[data-select-scene="one"]').click();assert.equal(new URL(page.url()).searchParams.get('scene'),'one');
   if(width<=900)assert.equal(await page.locator('.scene-library-head').isVisible(),false);
   await page.locator('.scene-study-quote').evaluate(node=>window.__sceneQuote=node);
   await page.locator('.scene-study-quote').evaluate(node=>{const selection=getSelection(),range=document.createRange();range.selectNodeContents(node);selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange'))});
   await page.locator('.selection-add').click();assert.equal(await page.locator('.scene-word-chip').count(),1);await page.locator('[data-remove-query]').click();
   const input=page.getByRole('textbox',{name:'添加单词或词组'});await input.evaluate(node=>{const data=new DataTransfer();data.setData('text/plain','connect the dots\nstart over\nconnect the dots\nretry phrase');node.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}))});assert.equal(await page.locator('.scene-word-chip').count(),3);
   await input.fill('start over');
   if(width<=900){await page.locator('.scene-back').click();await page.locator('[data-select-scene="two"]').click();await page.locator('.scene-back').click()}else await page.locator('[data-select-scene="two"]').click();
   await page.locator('[data-select-scene="one"]').click();assert.equal(await input.inputValue(),'start over');assert.equal(await page.locator('.scene-word-chip').count(),3);
   await page.locator('[data-run-scene]').click();await page.waitForFunction(()=>!lookupBusy&&getHistory().length===2);await page.waitForSelector('[data-retry-scene]');assert.equal(calls.length,3);
   assert.equal(await input.inputValue(),'','Accepted input is cleared');
   assert.equal(await page.locator('.scene-word-chip').count(),0,'Accepted basket is cleared');
   await page.locator('.scene-study-quote').evaluate(node=>window.__sceneQuote=node);
   await page.locator('[data-retry-scene]').click();await page.waitForFunction(()=>!lookupBusy&&getHistory().length===3);assert.equal(calls.length,4);
   assert.equal(await page.locator('.scene-task-state[data-status="complete"]').count(),3);
   assert.ok(await page.locator('.scene-study-quote').evaluate(node=>node===__sceneQuote),'Task updates do not rebuild scene content');
   await input.fill('start over');await page.locator('[data-run-scene]').click();await page.waitForFunction(()=>!lookupBusy);assert.equal(calls.length,4,'Existing entries associate without API calls');
   await page.evaluate(()=>SceneUI.queueSceneQueries('two',['start over']));assert.equal(calls.length,4);assert.equal(await page.evaluate(()=>findHistoryByQuery('start over').scenes.length),2);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   const image=page.locator('.scene-detail img');await image.waitFor();assert.ok(await image.evaluate(node=>node.complete&&node.naturalWidth===800));
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`workspace29-${width}-${theme}.png`)});await page.evaluate(()=>window.scrollTo({top:400,behavior:'instant'}));await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`workspace29-scrolled-${width}-${theme}.png`)})}
   await page.reload();await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');assert.equal(await page.locator('.scene-word-chip').count(),0);assert.equal(await input.inputValue(),'');
   await page.evaluate(()=>{const url=new URL(location.href);url.searchParams.set('scene','missing-group');history.pushState(history.state,'',url);SceneWorkspace.render()});assert.equal(new URL(page.url()).searchParams.get('scene'),null);assert.ok(await page.locator('.scene-workspace-message').isVisible());
   await page.locator('[data-select-scene="one"]').click();assert.equal(await page.locator('.scene-workspace-message').isVisible(),false);
   if(width>900){const labelVisible=await page.locator('#nav-scenes span').isVisible();await page.locator('#nav-scenes').hover();assert.equal(await page.locator('#ui-tooltip:popover-open').count(),labelVisible?0:1);await page.mouse.move(0,0)}
   await page.evaluate(()=>showView('settings'));await page.waitForSelector('.settings-search.search-field');
   const last=page.locator('.settings-nav-item').last();await last.click();await page.waitForTimeout(1400);
   const follow=await last.evaluate(node=>{const r=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect();return {inside:r.left>=p.left-1&&r.right<=p.right+1,current:node.classList.contains('active')}});assert.ok(follow.inside&&follow.current,JSON.stringify(follow));
   await page.evaluate(()=>openHistoryModal(getHistory()[0].id));await page.waitForSelector('#modal-card-page .reading-nav button');
   const reading=page.locator('#modal-card-page .reading-nav button').last();await reading.click();await page.waitForTimeout(1400);
   const nav=await reading.evaluate(node=>{const r=node.getBoundingClientRect(),p=node.parentElement.getBoundingClientRect();return {inside:r.left>=p.left-1&&r.right<=p.right+1,current:node.classList.contains('active')}});assert.ok(nav.inside&&nav.current,JSON.stringify(nav));
   if(width<=900){const small=await page.locator('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&parseFloat(getComputedStyle(node).fontSize)<16).map(node=>node.outerHTML.slice(0,100)));assert.deepEqual(small,[]);assert.equal(await page.evaluate(()=>visualViewport.scale),1)}
   assert.deepEqual(errors,[]);console.log(`Scene workspace ${width}px ${theme}: route alias, IME, scene selection, basket, queue/retry/association, persistent drafts, navigation follow and overflow passed.`);await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
