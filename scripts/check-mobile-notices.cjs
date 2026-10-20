const assert=require('node:assert/strict');
const engines=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const engine=process.env.QA_ENGINE||'chromium';
  browser=await engines[engine].launch({headless:true,...(engine==='chromium'&&process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of (process.env.QA_WIDTH?[Number(process.env.QA_WIDTH)]:[390,1440]))for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:844},isMobile:width<900,hasTouch:width<900}),page=await context.newPage();page.setDefaultTimeout(10000);
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof openHistoryModal==='function');
   await page.waitForFunction(()=>document.body.dataset.toastMode);
   await page.evaluate(()=>{
    const result={headword:{title:'connect the dots',coreMeaning:'把零散的点或信息串联起来，得到完整图像或理解事物全貌并得出推论。'+ 'UnbrokenCompound'.repeat(15)},senses:[],collocations:[],confusions:[]};
    showView('home');setResultTab('card',document.querySelector('.result-tabs .tab-btn'));renderResult(result);
    setHistory([{id:1,query:'connect the dots',result,createdAt:new Date().toISOString()}]);
   });
   for(const surface of ['home','detail']){
    if(surface==='detail')await page.evaluate(()=>openHistoryModal(1));
    const core=page.locator(surface==='home'?'#result-card .entry-core':'#modal-card-page .entry-core');
    await core.waitFor({state:'visible'});
    const geometry=await core.evaluate(node=>{
     const mark=node.querySelector('mark'),box=node.getBoundingClientRect(),text=mark.getBoundingClientRect();
     return {inside:text.right<=box.right+1,wrapped:text.height>50,overflow:mark.scrollWidth>mark.clientWidth+1,width:box.width,height:text.height};
    });
    console.log(engine,width,theme,surface,geometry);
    assert.ok(geometry.inside&&!geometry.overflow,'Core meaning must wrap inside its own container, not merely be clipped');
    if(width===390)assert.ok(geometry.wrapped);
   }
   for(const position of ['top','bottom'])for(const mode of ['snackbar','detail']){
    await page.evaluate(({position,mode})=>{
     document.querySelectorAll('.toast').forEach(node=>node.remove());activeToasts.clear();
     const settings=getSettings();settings.toastMode=mode;settings.toastPosition=position;saveSettingsLocal(settings);
     document.body.dataset.toastMode=mode;document.body.dataset.toastPosition=position;
     notify('场景素材已同步，云端副本校验通过。','good','同步成功');
     activeToasts.forEach(state=>clearTimeout(state.timer));
    },{position,mode});
    await page.waitForTimeout(380);
    await page.locator('.toast').evaluate(node=>{node.getAnimations().forEach(animation=>animation.finish())});
    await page.waitForTimeout(50);
    const notice=await page.locator('.toast').evaluate(node=>{
     const box=node.getBoundingClientRect(),stack=node.parentElement.getBoundingClientRect();
     return {height:box.height,stackHeight:stack.height,inside:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight};
    });
    console.log(engine,width,theme,position,mode,notice);
    assert.ok(notice.height<150&&notice.stackHeight<170&&notice.inside,'Notifications must remain content-sized inside the viewport');
    if(process.env.QA_SCREENSHOTS&&position==='top'&&mode==='snackbar')await page.screenshot({animations:'disabled',path:path.join(process.env.QA_SCREENSHOTS,`notice-${engine}-${width}-${theme}.png`)});
    const close=await page.locator('.toast-close').evaluate(node=>{const box=node.getBoundingClientRect(),x=box.x+box.width/2,y=box.y+box.height/2,hit=document.elementFromPoint(x,y);return {x,y,hit:node.contains(hit),target:hit?.outerHTML.slice(0,180),open:node.closest('[popover]').matches(':popover-open')}});
    assert.ok(close.open&&close.hit,`Notification close must be above history: ${JSON.stringify(close)}`);
    await page.mouse.click(close.x,close.y);
    await page.locator('.toast').waitFor({state:'detached'});
   }
   await page.evaluate(()=>{
    const viewer=document.createElement('dialog');viewer.id='notice-dialog-probe';viewer.innerHTML='<p>Media viewer</p>';document.body.append(viewer);viewer.showModal();
    const settings=getSettings();settings.toastMode='snackbar';saveSettingsLocal(settings);document.body.dataset.toastMode='snackbar';
    notify('场景素材已同步，云端副本校验通过。','good','同步成功');activeToasts.forEach(state=>clearTimeout(state.timer));
   });
   await page.waitForTimeout(400);
   await page.setViewportSize({width,height:600});
   const native=await page.locator('.toast').evaluate(node=>({parent:node.parentElement.parentElement.tagName,height:node.getBoundingClientRect().height,stack:node.parentElement.getBoundingClientRect().height}));
   assert.equal(native.parent,'DIALOG','Notifications stay interactive above native media dialog');
   assert.ok(native.height<150&&native.stack<170,'Native dialog and viewport resize must not stretch notification');
   await page.locator('.toast-close').click();
   await page.locator('.toast').waitFor({state:'detached'});
   await page.evaluate(()=>{
    notify('退出动画被禁用时也要关闭。','good','清理测试');
    activeToasts.forEach(state=>clearTimeout(state.timer));
    const toast=document.querySelector('.toast');toast.style.animation='none';toast.querySelector('.toast-close').click();
   });
   await page.locator('.toast').waitFor({state:'detached'});
   for(const mode of ['snackbar','detail']){
    await page.evaluate(mode=>{
     const settings=getSettings();settings.toastMode=mode;saveSettingsLocal(settings);document.body.dataset.toastMode=mode;
     notify('很长的错误信息。'.repeat(100)+' https://example.com/'+ 'unbroken'.repeat(90),'bad','长文本测试');
     activeToasts.forEach(state=>clearTimeout(state.timer));
    },mode);
    await page.locator('.toast').evaluate(node=>node.getAnimations().forEach(animation=>animation.finish()));
    const long=await page.locator('.toast').evaluate(node=>{
     const box=node.getBoundingClientRect(),message=node.querySelector('.toast-msg'),close=node.querySelector('.toast-close').getBoundingClientRect();
     return {height:box.height,scrollable:message.scrollHeight>message.clientHeight,inside:box.left>=0&&box.right<=innerWidth,closeVisible:close.top>=box.top&&close.bottom<=box.bottom};
    });
    assert.ok(long.height<300&&long.scrollable&&long.inside&&long.closeVisible,'Long notifications must scroll internally and keep their close control visible');
    assert.equal(await page.locator('.toast-count').evaluate(node=>getComputedStyle(node).display),'none','Single notice reserves no counter space');
    if(process.env.QA_SCREENSHOTS&&mode==='snackbar')await page.screenshot({animations:'disabled',path:path.join(process.env.QA_SCREENSHOTS,`notice-long-${engine}-${width}-${theme}.png`)});
    await page.locator('.toast-close').evaluate(node=>node.click());
    await page.locator('.toast').waitFor({state:'detached'});
   }
   console.log(`${engine} ${width}px ${theme}: native dialog, viewport resize and notification close passed.`);
   await context.close();
  }
 }catch(error){console.error(error);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
