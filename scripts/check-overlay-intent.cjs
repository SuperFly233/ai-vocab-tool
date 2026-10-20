const assert=require('node:assert/strict');
const engines=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const engine=process.env.QA_ENGINE||'chromium';
  browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(10000);
   await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&typeof openApiProfileModal==='function');
   for(const kind of ['scene','api','history']){
    await page.evaluate(async kind=>{
     if(kind==='scene')await SceneUI.open();
     else if(kind==='api')openApiProfileModal();
     else{setHistory([{id:1,query:'test',result:{headword:{title:'test'},senses:[]},createdAt:new Date().toISOString()}]);openHistoryModal(1)}
    },kind);
    const layer=page.locator(kind==='scene'?'#scene-editor':kind==='api'?'#api-profile-modal':'#history-modal');
    if(kind==='scene')await layer.locator('[name="quote"]').fill('Unsaved scene');
    if(kind==='api')await page.locator('#api-modal-name').fill('Unsaved profile');
    const field=layer.locator('textarea,input').filter({visible:true}).first();
    const box=await field.boundingBox();
    await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(2,450,{steps:4});await page.mouse.up();
    assert.ok(await layer.isVisible(),`${kind}: release outside must not dismiss`);
    assert.equal(await page.locator('.confirm-layer.open').count(),0,`${kind}: accidental release must not prompt`);
    await page.mouse.click(2,450);
    if(await page.locator('.confirm-layer.open').count()){
     await page.locator('#confirm-cancel').click();assert.ok(await layer.isVisible(),'Cancel keeps draft');
     await page.mouse.click(2,450);await page.locator('#confirm-ok').click();
    }
    await layer.waitFor({state:'hidden'});
   }
   await page.evaluate(()=>{
    const button=document.createElement('button');button.id='hint-probe';button.dataset.tip='批量选择';button.style.cssText='position:fixed;z-index:2000;left:20px;top:4px;width:40px;height:32px';button.textContent='Probe';document.body.append(button);
   });
   for(const side of ['below','above']){
    await page.locator('#hint-probe').evaluate((node,side)=>node.style.top=side==='below'?'4px':'400px',side);
    const motion=await page.locator('#hint-probe').evaluate(node=>{
     node.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
     const hint=document.querySelector('#ui-tooltip'),animation=hint.getAnimations()[0];
     return {open:hint.matches(':popover-open'),duration:animation?.effect.getTiming().duration,frames:animation?.effect.getKeyframes().map(frame=>({opacity:frame.opacity,transform:frame.transform})),radius:getComputedStyle(hint.querySelector('span')).borderRadius};
    });
    assert.ok(motion.open,'Motion begins immediately, without a hover timer');assert.equal(motion.duration,140);assert.equal(motion.frames[0].opacity,'0');assert.equal(motion.frames[1].opacity,'1');assert.equal(motion.frames[0].transform,`translateY(${side==='above'?4:-4}px)`);assert.equal(motion.radius,'0px','Text layer must not inherit rounded clipping');
    await page.locator('#hint-probe').hover();
    const result=await page.evaluate(()=>{
     const hint=document.querySelector('#ui-tooltip'),rect=hint.getBoundingClientRect(),button=document.querySelector('#hint-probe').getBoundingClientRect(),arrow=getComputedStyle(hint,'::before');
     return {open:hint.matches(':popover-open'),side:hint.dataset.side,arrowX:rect.x+parseFloat(arrow.left),center:button.x+button.width/2,arrow:arrow.content,inside:rect.x>=0&&rect.right<=innerWidth&&rect.y>=0&&rect.bottom<=innerHeight};
    });
    assert.ok(result.open&&result.inside,'Hint appears immediately and stays bounded');assert.equal(result.side,side);assert.ok(Math.abs(result.arrowX-result.center)<1,'Arrow points to button center');assert.notEqual(result.arrow,'none');
    await page.mouse.move(width-2,850);
   }
   if(process.env.QA_SCREENSHOTS){await page.locator('#hint-probe').hover();await page.waitForTimeout(170);await page.screenshot({path:require('node:path').join(process.env.QA_SCREENSHOTS,`overlay-arrow-${width}.png`)})}
   await page.mouse.move(width-2,850);await page.waitForTimeout(140);
   await page.locator('#hint-probe').hover();await page.waitForTimeout(170);
   assert.equal(await page.locator('#ui-tooltip').evaluate(node=>getComputedStyle(node).opacity),'1','Completed exit motion must not hide the next tooltip');
   await page.mouse.move(width-2,850);await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await page.locator('#hint-probe').evaluate(node=>{node.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));return document.querySelector('#ui-tooltip').getAnimations().length}),0,'Reduced-motion preference disables floating animation');
   console.log(`Overlay intent ${width}px passed: deliberate backdrop clicks, safe outside release, immediate bidirectional arrow hints.`);
   await context.close();
  }
 }catch(error){console.error(error);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
