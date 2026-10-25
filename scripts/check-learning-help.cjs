const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});const captures=process.env.QA_SCREENSHOTS||'tmp/onboarding043';fs.mkdirSync(captures,{recursive:true});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<600,hasTouch:width<600}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.goto(base+'/');await page.evaluate(async()=>{await appReady;await cloudInitPromise;window.helpSideEffects=0;modelRequest=async()=>{helpSideEffects++;throw Error('Tour must not call AI')};LearningHelp.open('tutorials')});
  await page.locator('.learning-help-dialog').waitFor();assert.equal(await page.locator('[data-start-tour]').count(),4);
  const before=await page.evaluate(()=>({history:JSON.stringify(getHistory()),settings:JSON.stringify(getSettings()),query:els.query.value,href:location.href}));
  for(const group of ['basics','scenes','anki','fushi']){
   await page.locator(`[data-start-tour="${group}"]`).click();await page.locator('.learning-tour-panel').waitFor();
   for(let n=0;n<LearningSteps(group);n++){
    await page.waitForTimeout(100);
    assert.ok(await page.locator('.learning-tour-panel').evaluate(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&node.scrollWidth<=node.clientWidth}),`${width}/${theme}/${group}/${n} panel bounds`);
    if(group==='basics'&&n===1)await page.screenshot({path:path.join(captures,`tour-${width}-${theme}.png`)});
    await page.locator('[data-tour-next]').click();
   }
   assert.equal(await page.locator('.learning-tour-layer').count(),0);await page.evaluate(()=>LearningHelp.open('tutorials'));await page.locator('[data-start-tour="'+group+'"]').waitFor();
  }
  const after=await page.evaluate(()=>({history:JSON.stringify(getHistory()),settings:JSON.stringify(getSettings()),query:els.query.value,href:location.href,sideEffects:helpSideEffects}));
  assert.deepEqual({...after,sideEffects:undefined},{...before,sideEffects:undefined},'Tours cannot write learning data, settings or query input');assert.equal(after.sideEffects,0);
  await page.locator('[data-help-tab="connect"]').click();await page.locator('[data-help-release] a').first().waitFor();assert.match(await page.locator('.help-content').innerText(),/_internal/);assert.match(await page.locator('.help-content').textContent(),/LexiAnkiBridge/);await page.screenshot({path:path.join(captures,`install-${width}-${theme}.png`)});
  assert.ok(await page.locator('.learning-help-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth));
  await page.locator('[data-help-tab="faq"]').click();assert.ok(await page.locator('.help-faq').count()>=8);await page.keyboard.press('Escape');await page.locator('.learning-help-dialog').waitFor({state:'detached'});
  await page.evaluate(()=>LearningHelp.startTour('basics'));await page.locator('.learning-tour-panel').waitFor();await page.keyboard.press('Tab');assert.ok(await page.locator('.learning-tour-panel button:focus').count());await page.keyboard.press('Escape');assert.equal(await page.locator('.learning-tour-layer').count(),0);
  assert.deepEqual(errors,[]);await context.close();console.log(`Learning help ${width} ${theme}: four read-only tours, no learning/AI writes, bounded panels, official install, FAQ, keyboard and dismissal passed.`);
 }
 // First invitation is non-modal, saved per local account, never replayed on reload.
 const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));await page.route('https://**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());await page.goto(base+'/');await page.locator('.learning-welcome').waitFor({timeout:15000});await page.locator('[data-later]').click();await page.reload();await page.waitForTimeout(3300);assert.equal(await page.locator('.learning-welcome').count(),0);await context.close();console.log('First invitation: later persists, refresh does not nag; manual tutorials remain available.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(e=>{console.error(e);process.exitCode=1});
function LearningSteps(group){return {basics:6,scenes:5,anki:5,fushi:4}[group]}
