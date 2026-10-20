const assert=require('node:assert/strict');
const path=require('node:path');
const engines=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const engine=process.env.QA_ENGINE||'chromium';
  const memoryMedia=process.env.QA_MEMORY_MEDIA==='1';
  if(memoryMedia)console.log('Layout fixture: in-memory media store; real IndexedDB media persistence is verified separately in Chromium.');
  browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of (process.env.QA_WIDTHS||'320,390,1024,1440').split(',').map(Number))for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<900,isMobile:width<900}),page=await context.newPage();page.setDefaultTimeout(12000);
   let unavailable=true,requests=0;
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.route('**/api/media',route=>{
    requests++;const data=route.request().postDataJSON();
    return unavailable?route.fulfill({status:503,json:{error:'Test unavailable'}}):route.fulfill({json:data.action==='manifest'?{manifest:null}:data.action==='complete'?{complete:true}:{count:data.chunks.length}});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&document.body.dataset.toastMode);
   await page.evaluate(async memoryMedia=>{
    await cloudInitPromise;
    if(memoryMedia){
     const files=new Map();
     SceneData.getFile=async id=>files.get(id);
     SceneData.putRecord=async(id,value)=>files.set(id,value);
     SceneData.putFile=async blob=>{const record=await SceneData.inspectFile(blob);files.set(record.ref.id,{...record,uploadedFor:[]});return record.ref};
    }
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1600;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#739e9b';ctx.fillRect(0,0,1200,1600);ctx.fillStyle='#fff';ctx.font='80px sans-serif';ctx.fillText('Scene fixture',100,200);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));blob.name='scene.png';
    const ref=await SceneData.putFile(blob),now=new Date().toISOString();
    const result={headword:{title:'connect the dots',coreMeaning:'把零散的信息串联起来，理解事物全貌。',summary:'从已有线索建立联系。'},senses:[{shortestLabel:'建立关联',meaning:'理解线索间的关系。'}],collocations:[],confusions:[]};
    setHistory([{id:1,query:'connect the dots',result,createdAt:now,scenes:[{id:'scene-test',quote:'I connected the dots.',sourceTitle:'Test source',featured:true,media:[ref],heroMedia:[ref.id],createdAt:now,updatedAt:now}]}]);
    currentHistoryId=1;showView('home');setResultTab('card',document.querySelector('.result-tabs .tab-btn'));renderResult(result);
   },memoryMedia);
   for(const scope of ['#result-card','#modal-card-page']){
    if(scope.includes('modal'))await page.evaluate(()=>openHistoryModal(1));
    const scene=page.locator(`${scope} .scene-record`);await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(scope=>{const img=document.querySelector(`${scope} .scene-record img`);return img?.complete&&img.naturalWidth===1200},scope);
    const layout=await page.locator(scope).evaluate(root=>{
     const core=root.querySelector('.entry-core').getBoundingClientRect(),section=root.querySelector('.scene-section').getBoundingClientRect(),img=root.querySelector('.scene-record img').getBoundingClientRect();
     return {coreFirst:core.bottom<section.top,mediaHeight:img.height,overflow:root.scrollWidth>root.clientWidth+1};
    });
    assert.ok(layout.coreFirst&&!layout.overflow);assert.ok(layout.mediaHeight<=(width<=600?180:220)+1);
    assert.equal(await scene.locator('[data-scene-action="load"],[data-scene-action="sync"]').count(),0,'No manual loading/sync controls in normal reading');
    if(width>600){
     const divider=scene.locator('.scene-splitter');await divider.focus();
     await page.keyboard.press('ArrowLeft');assert.equal(await divider.getAttribute('aria-valuenow'),'41');
     await divider.press('Home');assert.equal(await divider.getAttribute('aria-valuenow'),'38');
     const box=await divider.boundingBox();assert.ok(box.width>=10&&box.height>50,'Divider has a stable pointer target');
     const rail=await divider.locator('.scene-splitter-rail').evaluate(node=>({width:node.getBoundingClientRect().width,opacity:getComputedStyle(node).opacity,color:getComputedStyle(node).backgroundColor}));
     assert.ok(rail.width>=2&&Number(rail.opacity)>=.6&&rail.color!=='rgba(0, 0, 0, 0)','Actual rail must be visible in both themes');
     await page.mouse.move(box.x+box.width/2,box.y+20);await page.mouse.down();await page.mouse.move(box.x-40,box.y+20,{steps:5});await page.mouse.up();
     assert.ok(Number(await divider.getAttribute('aria-valuenow'))>38,'Pointer dragging adjusts media ratio');
     await divider.dblclick();assert.equal(await divider.getAttribute('aria-valuenow'),'38');
    }
    assert.ok(await scene.locator('.scene-sync-error').evaluate(node=>node.hidden));
    if(process.env.QA_SCREENSHOTS&&scope.includes('modal'))await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`reading-${engine}-${width}-${theme}.png`)});
   }
   await page.evaluate(async()=>{cloudUser={id:'scene-ui-qa'};cloudAccessToken=async()=>'test-only';await SceneUI.syncPending()});
   assert.ok(await page.locator('#modal-card-page .scene-sync-error').isVisible(),'Automatic upload failure exposes retry');
   await page.evaluate(()=>openHistoryModal(1));
   assert.ok(await page.locator('#modal-card-page .scene-sync-error').isVisible(),'Failure survives same-entry rerender');
   unavailable=false;await page.locator('#modal-card-page [data-scene-action="sync"]').click();
   await page.waitForFunction(()=>document.querySelector('#modal-card-page .scene-sync-error').hidden);
   await page.waitForFunction(async()=>{const ref=getHistory()[0].scenes[0].media[0];return (await SceneData.getFile(ref.id)).uploadedFor.includes('scene-ui-qa')});
   await page.waitForFunction(()=>[...document.querySelectorAll('.toast-msg')].some(node=>node.textContent==='场景素材已同步。'));
   const previous=requests;await page.evaluate(()=>SceneUI.syncPending());assert.equal(requests,previous,'Uploaded media are not uploaded on every open');
   if(width===390&&theme==='light'){
    unavailable=true;
    await page.evaluate(async()=>{
     const ref=getHistory()[0].scenes[0].media[0],record=await SceneData.getFile(ref.id);await SceneData.putRecord(ref.id,{...record,uploadedFor:[]});
     await SceneUI.syncPending();
    });
    assert.ok(await page.locator('#modal-card-page .scene-sync-error').isVisible());
    unavailable=false;
    await page.evaluate(()=>dispatchEvent(new Event('online')));
    await page.waitForFunction(async()=>{const ref=getHistory()[0].scenes[0].media[0];return (await SceneData.getFile(ref.id)).uploadedFor.includes('scene-ui-qa')});
    await page.waitForFunction(()=>document.querySelector('#modal-card-page .scene-sync-error').hidden);
   }
   await page.evaluate(()=>{closeHistoryModal();showView('settings')});
   const font=page.locator('#font-mode-sans');await font.scrollIntoViewIfNeeded();
   const settings=await page.locator('#settings-reading').evaluate(root=>{
    const font=root.querySelector('#font-mode-sans'),style=getComputedStyle(font),button=font.getBoundingClientRect(),row=font.closest('.setting-row'),copy=row.firstElementChild.getBoundingClientRect();
    return {nowrap:style.whiteSpace==='nowrap',buttonWidth:button.width,copyWidth:copy.width,rowWidth:row.clientWidth,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(settings.nowrap&&!settings.overflow&&settings.buttonWidth>=60);
   if(width===1440)assert.ok(settings.copyWidth>settings.rowWidth*.55,'Description uses remaining desktop width');
   const toggle=page.locator('#visual-hints-pinned');assert.equal(await toggle.getAttribute('role'),'switch');
   assert.equal(await toggle.evaluate(node=>getComputedStyle(node).appearance),'none');
   await toggle.check();assert.equal(await page.evaluate(()=>getSettings().visualHintsPinned),true);
   await toggle.focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>getSettings().visualHintsPinned),false);
   if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`settings-${engine}-${width}-${theme}.png`)});
   console.log(`${engine} ${width}px ${theme}: core-first reading, bounded automatic media, failure-only retry, deduplicated sync, settings width and keyboard capsule switch passed.`);
   await context.close();
  }
 }catch(error){console.error(error);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
