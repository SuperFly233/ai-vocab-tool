const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const engines=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const engine=process.env.QA_ENGINE||'chromium';
  browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<900}),page=await context.newPage(),errors=[];
   page.setDefaultTimeout(10000);
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&typeof getSettings==='function');
   async function drag(start,end){
    if(width<900&&engine==='chromium'){
     const session=await context.newCDPSession(page);
     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});await page.waitForTimeout(220);
     assert.equal(await page.locator('.direct-drag').count(),1,'Touch long press moves original item');
     for(let i=1;i<=10;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*i/10,y:start.y+(end.y-start.y)*i/10,id:1}]});
     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await session.detach();
    }else{
     await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(start.x,start.y+8);
     assert.equal(await page.locator('.direct-drag').count(),1,'Mouse moves original item');
     await page.mouse.move(end.x,end.y,{steps:10});await page.mouse.up();
    }
    assert.equal(await page.locator('.reorder-ghost').count(),0,'No detached capsule');
   }
   await page.locator('.scene-menu-toggle').click();
   await page.waitForSelector('#scene-query-menu:popover-open');
   console.log(`${engine} ${width}: initial menu open`);
   const menu=await page.locator('#scene-query-menu').evaluate(node=>({parent:node.parentElement.tagName,width:node.offsetWidth,height:node.offsetHeight}));
   assert.equal(menu.parent,'BODY');assert.ok(menu.width<=240&&menu.height<=160,'Plus menu remains intrinsic, not full-screen');
   await page.setViewportSize({width,height:420});
   await page.locator('.scene-menu-toggle').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
   if(!await page.locator('#scene-query-menu').isVisible())await page.locator('.scene-menu-toggle').click();
   await page.waitForSelector('#scene-query-menu:popover-open');
   console.log(`${engine} ${width}: constrained menu open`);
   const small=await page.locator('#scene-query-menu').boundingBox();assert.ok(small.height<=240&&small.y+small.height<=420,'Constrained viewport keeps menu bounded');
   await page.setViewportSize({width,height:844});await page.locator('.scene-menu-toggle').scrollIntoViewIfNeeded();await page.waitForTimeout(350);
   if(!await page.locator('#scene-query-menu').isVisible())await page.locator('.scene-menu-toggle').click();
   await page.locator('[data-scene-action="open"]').click();
   console.log(`${engine} ${width}: scene editor open`);
   await page.locator('[name="entryTitle"]').fill('clock');
   await page.locator('[name="quote"]').fill('I clocked the detail.');
   await page.locator('#scene-editor').dispatchEvent('click');
   assert.ok(await page.locator('#scene-editor').isVisible(),'Editor backdrop cannot dismiss draft');
   await page.locator('[data-scene-action="manual"]').click();
   await page.waitForSelector('.scene-record');
   await page.evaluate(()=>{
    const item=getHistory()[0],now=new Date().toISOString();
    const result={...item.result,meta:{...item.result.meta,authored:false},senses:[{shortestLabel:'notice',meaning:'注意到',example:'I clocked it.'},{shortestLabel:'second meaning',meaning:'第二个义项'}]};
    setHistory([{...item,result,rolls:[{id:'a',result,createdAt:now}],scenes:[{...item.scenes[0],order:0},{...item.scenes[0],id:'second',quote:'Second scene',order:1}]}]);
    currentHistoryId=item.id;renderResult(result);
   });
   const layout=await page.evaluate(()=>{
    const section=document.querySelector('#result-card .scene-section'),senses=document.querySelector('#result-card .sense-group');
    return {before:!senses||section.getBoundingClientRect().top<senses.getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth};
   });assert.ok(layout.before&&!layout.overflow);
   const handles=page.locator('#result-card .scene-order-handle');
   await page.evaluate(()=>window.__beforeSceneOrder=structuredClone(getHistory()));
   const first=await handles.first().boundingBox(),second=await handles.nth(1).boundingBox();
   await drag({x:first.x+first.width/2,y:first.y+first.height/2},{x:second.x+second.width/2,y:second.y+second.height+10});
   assert.equal(await page.evaluate(()=>getHistory()[0].scenes[0].id),'second','Scene order persists');
   assert.equal(await page.evaluate(()=>mergeHistoryItems(getHistory(),__beforeSceneOrder)[0].scenes[0].id),'second','Stale cloud copy cannot overwrite scene order');
   await page.evaluate(()=>openHistoryModal(getHistory()[0].id));
   await page.locator('#modal-visual-tab').click();
   const visual=page.locator('.visual-card[data-visual-kind="senses"]');
   for(const toggle of await visual.locator('.visual-card-toggle[aria-expanded="true"]').all())await toggle.click();
   await visual.nth(1).scrollIntoViewIfNeeded();await page.waitForTimeout(150);
   const vg=await visual.first().locator('.drag-handle').boundingBox(),vt=await visual.nth(1).boundingBox();
   assert.ok(vg.y>=0&&vt.y+vt.height<=844,`Visual test targets must be reachable: ${JSON.stringify({vg,vt})}`);
   await drag({x:vg.x+vg.width/2,y:vg.y+vg.height/2},{x:vt.x+30,y:vt.y+vt.height-4});
   assert.equal(await page.evaluate(()=>modalResult.senses[0].shortestLabel),'second meaning','Visual rows share direct reorder');
   await visual.first().locator('.visual-card-toggle').click();
   await visual.first().evaluate(node=>node.style.minHeight='1000px');
   await visual.first().locator('.drag-handle').scrollIntoViewIfNeeded();await page.waitForTimeout(180);
   const largeGrip=await visual.first().locator('.drag-handle').boundingBox(),body=await page.locator('#history-modal-body').boundingBox();
   const scrollBefore=await page.locator('#history-modal-body').evaluate(node=>node.scrollTop);
   await page.mouse.move(largeGrip.x+largeGrip.width/2,largeGrip.y+largeGrip.height/2);await page.mouse.down();
   await page.mouse.move(largeGrip.x+largeGrip.width/2,largeGrip.y+largeGrip.height/2+8);
   await page.mouse.move(body.x+body.width/2,body.y+body.height-20,{steps:8});
   await page.waitForTimeout(350);
   assert.ok(await page.locator('#history-modal-body').evaluate((node,before)=>node.scrollTop>before+20,scrollBefore),'Holding near edge continues scrolling large rows');
   assert.ok(await page.locator('.direct-drag').evaluate(node=>node.classList.contains('expanded')),'Dragging does not collapse original content');
   await page.waitForFunction(()=>{
    const bounds=document.querySelector('#history-modal-body').getBoundingClientRect(),target=[...document.querySelectorAll('.visual-card[data-visual-kind="senses"]')].find(node=>!node.classList.contains('direct-drag')).getBoundingClientRect();
    return target.top>=bounds.top&&target.bottom<=bounds.bottom;
   },null,{timeout:4000});
   const largeTarget=await page.locator('.visual-card[data-visual-kind="senses"]:not(.direct-drag)').boundingBox();
   await page.mouse.move(largeTarget.x+30,largeTarget.y+largeTarget.height-4,{steps:4});
   await page.mouse.up();
   assert.equal(await page.evaluate(()=>modalResult.senses[0].shortestLabel),'notice','Expanded large row can cross screens and finish reordering');
   await page.evaluate(()=>{saveHistoryEdit();closeHistoryModal();showView('home');scrollTo(0,0);lookupQueue=[{id:1,query:'one'},{id:2,query:'two'}];lookupQueueExpanded=true;renderLookupQueue()});
   await page.locator('.queue-drag').first().scrollIntoViewIfNeeded();await page.waitForTimeout(200);
   const qg=await page.locator('.queue-drag').first().boundingBox(),qt=await page.locator('.queue-item').nth(1).boundingBox();
   await drag({x:qg.x+qg.width/2,y:qg.y+qg.height/2},{x:qt.x+30,y:qt.y+qt.height-2});
   assert.equal(await page.evaluate(()=>lookupQueue[0].id),2,'Queue shares direct reorder');
   await page.evaluate(()=>{lookupQueue=[];renderLookupQueue();const settings=getSettings(),now=new Date().toISOString();settings.favoriteFolders=[{id:'qa_f1',name:'Folder 1',createdAt:now,updatedAt:now},{id:'qa_f2',name:'Folder 2',createdAt:now,updatedAt:now}];settings.favoriteFolderOrder=['qa_f1','qa_f2'];setSettings(settings);showView('folders')});
   const folders=page.locator('.folder-tab[data-folder-custom="true"]');
   await folders.first().scrollIntoViewIfNeeded();await page.waitForTimeout(150);
   const fg=await folders.first().locator('.folder-tab-drag').boundingBox(),ft=await folders.nth(1).boundingBox();
   await drag({x:fg.x+fg.width/2,y:fg.y+fg.height/2},{x:ft.x+30,y:ft.y+ft.height-2});
   assert.equal(await page.evaluate(()=>getSettings().favoriteFolderOrder[0]),'qa_f2','Folders share direct reorder');
   await page.evaluate(()=>{showView('settings');const settings=getSettings();settings.apiProfiles=[1,2,3].map(n=>({id:`qa_${n}`,name:`QA ${n}`,apiUrl:'',apiKey:'',model:''}));settings.activeApiProfileId='qa_1';setSettings(settings);renderSettings()});
   await page.locator('#api-profile-menu-toggle').click();
   await page.waitForSelector('#api-profile-menu:popover-open');
   const api=await page.locator('#api-profile-menu').boundingBox();assert.ok(api.height>140&&api.width>=Math.min(340,width-24));
   const deleteBox=await page.locator('.api-profile-delete').first().evaluate(node=>{const a=node.getBoundingClientRect(),b=node.querySelector('svg').getBoundingClientRect();return Math.abs(a.x+a.width/2-b.x-b.width/2)+Math.abs(a.y+a.height/2-b.y-b.height/2)});
   assert.ok(deleteBox<1,'Delete icon centered');
   const grip=await page.locator('.api-profile-drag').first().boundingBox(),target=await page.locator('.api-profile-option').nth(1).boundingBox();
   await drag({x:grip.x+grip.width/2,y:grip.y+grip.height/2},{x:target.x+25,y:target.y+target.height-2});
   assert.equal(await page.evaluate(()=>getSettings().apiProfiles[0].id),'qa_2','API drag persists');
   await page.evaluate(()=>{document.body.style.minHeight='2500px';scrollBy(0,80)});
   await page.waitForSelector('#api-profile-menu:popover-open',{state:'hidden'});
   await page.locator('#api-profile-menu-toggle').click();
   await page.locator('.api-profile-edit').first().click();
   await page.waitForSelector('#api-profile-modal.open');
   await page.locator('#api-profile-modal').dispatchEvent('click');assert.ok(await page.locator('#api-profile-modal').isVisible());
   const close=page.locator('#api-profile-modal-close');
   await close.evaluate(node=>node.dataset.tip='长提示测试 '.repeat(30));await close.hover();
   await page.waitForSelector('#ui-tooltip:popover-open');
   const tooltip=await page.locator('#ui-tooltip').boundingBox();assert.ok(tooltip.x>=0&&tooltip.y>=0&&tooltip.x+tooltip.width<=width&&tooltip.y+tooltip.height<=844,'Hint wraps inside viewport');
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`workbench-hint-${width}.png`)})}
   await page.mouse.move(1,1);await close.click();
   assert.deepEqual(errors,[]);
   console.log(`Scene workbench ${engine} ${width}px passed: compact menu, explicit dismissal, leading scenes, direct scene/API reorder, centered icons and top-layer wrapped hints.`);
   await context.close();
  }
 }catch(error){console.error(error);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
