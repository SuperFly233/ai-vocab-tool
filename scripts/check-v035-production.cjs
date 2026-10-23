const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const base=process.env.QA_ORIGIN||'https://ai-vocab-tool.pages.dev',version=process.env.QA_VERSION||'0.35.1',capture=process.env.QA_SCREENSHOTS||'tmp/dialog-qa/v035-production',sha=value=>createHash('sha256').update(value).digest('hex');
(async()=>{let browser;try{
 const files=fs.readdirSync('dist',{recursive:true}).filter(file=>fs.statSync(path.join('dist',file)).isFile());
 for(const file of files){const response=await fetch(`${base}/${file.replaceAll('\\','/')}`,{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,file);assert.equal(sha(Buffer.from(await response.arrayBuffer())),sha(fs.readFileSync(path.join('dist',file))),`${file} deployed hash`)}
 const enabled=process.env.QA_PRODUCTION_ENABLED==='1';
 const gate=await fetch(`${base}/api/anki-jobs`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'health'}),signal:AbortSignal.timeout(20000)});assert.equal(gate.status,enabled?401:503);if(!enabled)assert.equal((await gate.json()).enabled,false);
 console.log(`Production static verification: ${files.length} hashes match; external gate ${enabled?'requires authentication':'closed'}.`);
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync(capture,{recursive:true});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
  await page.route('https://**/*',route=>{const url=new URL(route.request().url());return url.hostname===new URL(base).hostname?route.continue():route.abort()});
  await page.goto(base+'/scenes');await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');assert.equal(await page.evaluate(()=>APP_INFO.version),version);
  await page.evaluate(async()=>{await globalThis.appReady;await cloudInitPromise;const now=new Date().toISOString();setSettings({...getSettings(),sceneLibrary:Array.from({length:30},(_,index)=>({id:`prod-fixture-${index}`,groupId:`prod-fixture-${index}`,title:`Synthetic scene ${index}`,quote:'Isolated browser acceptance only.',createdAt:now,updatedAt:now}))});SceneWorkspace.render()});
  for(const view of ['history','folders','scenes','settings']){
   await page.evaluate(view=>{showView(view,null,{focus:false});ExperienceUI.refresh()},view);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${view} ${width} overflow`);if(view==='settings')await page.waitForFunction(()=>document.querySelector('.settings-nav-item.active')?.dataset.settingsTarget==='settings-model');await page.screenshot({path:`${capture}/${view}-${width}.png`});
  }
  await page.evaluate(()=>{showView('scenes',null,{focus:false});scrollTo({top:700,behavior:'instant'})});await page.waitForFunction(()=>document.querySelector('.scroll-top-button')?.hidden===false);await page.screenshot({path:`${capture}/scenes-scrolled-${width}.png`});
  assert.equal(await page.locator('#scene-hub [data-fushi-browser]').isVisible(),false,'Unavailable production source import is not shown as usable');
  if(width<=900)assert.equal(await page.evaluate(()=>document.querySelector('.scroll-top-button').getBoundingClientRect().bottom<document.querySelector('.sidebar').getBoundingClientRect().top),true,'Top action clears bottom navigation');
  await page.getByRole('button',{name:'回到顶部',exact:true}).click();await page.waitForFunction(()=>scrollY<5);
  await page.evaluate(()=>{setRememberViewFilters(false);setHintsHidden(true);setTooltipsHidden(false)});await page.reload();await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');assert.equal(await page.evaluate(()=>getSettings().rememberViewFilters),false);assert.equal(await page.evaluate(()=>getSettings().tooltipsHidden),false);
  assert.deepEqual(errors,[]);await context.close();console.log(`Production ${width}px isolated browser: version, views, scrolled mask/top action, independent settings and unauthenticated integration hiding passed.`);
 }
}finally{await browser?.close()}})().catch(error=>{console.error(error);process.exitCode=1});
