const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 const widths=process.env.QA_WIDTHS?process.env.QA_WIDTHS.split(',').map(Number):[320,390,768,1024,1440];
 for(const width of widths)for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',route=>route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/history`);await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');
  await page.evaluate(async()=>{await cloudInitPromise;const now=new Date().toISOString();for(let index=0;index<60;index++)saveLookupResult({query:`word ${index}`,result:{meta:{query:`word ${index}`},headword:{title:`word ${index}`,coreMeaning:'固定工具栏和主内容滚动测试'},senses:[],collocations:[],register:{},confusions:[]}});setHistory(getHistory().map(row=>({...row,favorite:true,folderIds:['liked']})));setSettings({...getSettings(),sceneLibrary:Array.from({length:40},(_,index)=>({id:`browse${index}`,groupId:`browse${index}`,quote:'A sufficiently long scene quote. '.repeat(15),title:`Scene ${index}`,sourceTitle:'Test source',createdAt:now,updatedAt:now}))});renderHistory()});
  await page.evaluate(()=>setHistorySort('text'));await page.evaluate(()=>showView('scenes',null,{focus:false}));await page.getByRole('combobox',{name:'场景排序'}).selectOption('created');
  assert.equal(await page.evaluate(()=>getSettings().viewPreferences.history.value.sort),'text');assert.equal(await page.evaluate(()=>getSettings().viewPreferences.scenes.value.sort),'created');
  await page.reload();await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');assert.equal(await page.getByRole('combobox',{name:'场景排序'}).inputValue(),'created');
  await page.evaluate(()=>showView('history',null,{focus:false}));assert.equal(await page.evaluate(()=>historyState.sort),'text');
  fs.mkdirSync('tmp/dialog-qa/browse-consistency',{recursive:true});
  for(const view of ['history','folders','scenes','settings']){
   await page.evaluate(view=>{showView(view,null,{focus:false});if(view==='folders')openFolderView('liked')},view);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForFunction(()=>document.querySelector('.scroll-top-button')?.hidden);
   assert.equal(await page.locator('.settings-page-head [onclick="scrollSettingsToTop()"]').count(),0);
   if(view==='settings')await page.waitForFunction(()=>document.querySelector('.settings-nav-item.active')?.dataset.settingsTarget==='settings-model');
   await page.evaluate(async()=>{scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*.04,behavior:'instant'});await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))});assert.equal(await page.locator('.scroll-top-button').isVisible(),false,'Top five percent stays uncluttered');
   await page.evaluate(()=>scrollTo({top:Math.max(500,(document.documentElement.scrollHeight-innerHeight)*.25),behavior:'instant'}));
   await page.waitForFunction(()=>{const el=document.scrollingElement;return el.scrollHeight<=el.clientHeight+1||!document.querySelector('.scroll-top-button').hidden});
   const measure=await page.evaluate(()=>{const header=Math.max(document.querySelector('.topbar')?.getBoundingClientRect().bottom||0,innerWidth>900?document.querySelector('.sidebar')?.getBoundingClientRect().bottom||0:0),mask=getComputedStyle(document.body,'::after'),tools=document.querySelector('.view.active .history-tools,.view.active .folder-toolbar,.view.active .scene-browse-tools');return {header,maskHeight:parseFloat(mask.height),maskPosition:mask.position,toolTop:tools?.getBoundingClientRect().top,overflow:document.documentElement.scrollWidth>innerWidth}});
   assert.equal(measure.maskPosition,'fixed');assert.ok(measure.maskHeight>=measure.header-1);assert.equal(measure.overflow,false,`${view} overflow`);
   if(measure.toolTop!==undefined)assert.ok(Math.abs(measure.toolTop-measure.header-8)<3,`${view} sticky ${JSON.stringify(measure)}`);
   await page.screenshot({path:`tmp/dialog-qa/browse-consistency/${view}-${width}-${theme}.png`});
   if(await page.locator('.scroll-top-button').isVisible()){if(width<=900)assert.equal(await page.evaluate(()=>document.querySelector('.scroll-top-button').getBoundingClientRect().bottom<document.querySelector('.sidebar').getBoundingClientRect().top),true,'Top action stays above bottom navigation');await page.locator('.scroll-top-button').click();await page.waitForFunction(()=>scrollY<5)}
  }
  await page.evaluate(()=>showView('history',null,{focus:false}));await page.locator('[data-reset-browse="history"]').click();assert.equal(await page.evaluate(()=>historyState.sort),'updated');assert.equal(await page.evaluate(()=>getSettings().viewPreferences.scenes.value.sort),'created','History reset does not reset scenes');
  await page.evaluate(()=>setRememberViewFilters(false));await page.reload();await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');assert.equal(await page.evaluate(()=>getSettings().rememberViewFilters),false);assert.equal(await page.evaluate(()=>ViewPreferences.get('scenes',getSettings()).sort),'updated');
  assert.deepEqual(errors,[]);await context.close();console.log(`Browse consistency ${width}px ${theme}: shared sticky mask/tools, conditional top action, independent preferences/refresh/reset passed`);
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
