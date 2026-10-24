const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/dialog-qa/learning-workbench',{recursive:true});
 for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);
  await page.route('https://**/*',r=>new URL(r.request().url()).hostname===new URL(base).hostname?r.continue():r.abort());
  await page.goto(base+'/scenes',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined'&&typeof RowNavigation!=='undefined');await page.evaluate(async()=>{await appReady;await cloudInitPromise;syncAllToCloud=async()=>true});
  await page.evaluate(()=>{
   const now=new Date().toISOString(),scene={id:'row-scene',groupId:'row-scene',quote:'We stayed for good.',translation:'我们永久留下。',media:[],createdAt:now,updatedAt:now};
   const result={meta:{query:'for good',language:'en'},headword:{title:'for good',coreMeaning:'永久地'},senses:Array.from({length:30},(_,i)=>({id:String(i),shortestLabel:'永久',meaning:'永久地留下',example:'We stayed for good.',translation:'我们永久留下。'})),collocations:[],confusions:[],register:{}};
   setSettings({...getSettings(),sceneLibrary:[scene]});setHistory([{id:901,query:'for good',result,scenes:[scene],createdAt:now,updatedAt:now}]);showView('scenes',null,{focus:false});SceneWorkspace.select(scene.groupId);
  });
  const row=page.locator('.scene-study-row');await row.locator('select').selectOption('review');assert.equal(await page.locator('#history-modal.open').count(),0,'State control cannot open row');
  await row.locator('.scene-linked-copy p').evaluate(n=>{const r=document.createRange();r.selectNodeContents(n);getSelection().removeAllRanges();getSelection().addRange(r)});
  await row.click({position:{x:15,y:12}});assert.equal(await page.locator('#history-modal.open').count(),0,'Text selection cannot open row');await page.evaluate(()=>getSelection().removeAllRanges());
  await row.scrollIntoViewIfNeeded();const rect=await row.boundingBox();await page.mouse.move(rect.x+15,rect.y+10);await page.mouse.down();await page.mouse.move(rect.x+35,rect.y+10);await page.mouse.up();assert.equal(await page.locator('#history-modal.open').count(),0,'Dragging cannot open row');await page.evaluate(()=>getSelection().removeAllRanges());
  await row.click({position:{x:15,y:12}});await page.waitForSelector('#history-modal.open');await page.evaluate(()=>closeHistoryModal());
  await row.locator('[data-open-entry]').focus();await page.keyboard.press('Enter');await page.waitForSelector('#history-modal.open');await page.evaluate(()=>closeHistoryModal());
  await page.evaluate(()=>{showView('home',null,{focus:false});els.query.value='for good';renderResult(getHistory()[0].result);window.scrollTo(0,350)});
  await page.waitForFunction(()=>document.body.classList.contains('home-scrolled'));await page.waitForTimeout(300);
  const geometry=await page.evaluate(()=>{const pane=document.querySelector('#home-compact-bar'),input=pane.querySelector('[data-home-query]'),r=input.getBoundingClientRect();return {mask:parseFloat(getComputedStyle(document.body,'::after').height),paneTop:pane.getBoundingClientRect().top,height:pane.getBoundingClientRect().height,hit:input.contains(document.elementFromPoint(r.left+20,r.top+8)),overflow:document.documentElement.scrollWidth>innerWidth}});
  assert.equal(geometry.height,64);
  assert.equal(geometry.mask,0,JSON.stringify(geometry));assert.ok(geometry.hit,'Top of query must remain hittable');assert.ok(!geometry.overflow);await page.screenshot({path:`tmp/dialog-qa/learning-workbench/top-${width}-${theme}.png`,animations:'disabled'});
  await page.evaluate(()=>{window.scrollTo(0,0);showView('scenes',null,{focus:false})});await page.waitForTimeout(300);
  await page.screenshot({path:`tmp/dialog-qa/learning-workbench/scene-${width}-${theme}.png`,animations:'disabled'});assert.deepEqual(errors,[]);await context.close();console.log(`Workbench ${width} ${theme}: top mask, independent controls, selection, drag, whole row, keyboard passed`);
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(e=>{console.error(e);process.exitCode=1});
