const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/dialog-qa/timestamps-v0392',{recursive:true});
 for(const width of [320,390,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);
  await page.route('https://**/*',r=>new URL(r.request().url()).hostname===new URL(base).hostname?r.continue():r.abort());await page.goto(base+'/scenes',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');
  await page.evaluate(async()=>{await appReady;await cloudInitPromise;const year=new Date().getFullYear(),createdAt=`${year}-10-24T13:12:32`,updatedAt=`${year}-10-24T23:30:45`;setSettings({...getSettings(),historyTimeMode:'updated',sceneLibrary:[{id:'time-fixture',groupId:'time-fixture',title:'Timestamp acceptance',quote:'Synthetic content only.',media:[],createdAt,updatedAt}]});SceneWorkspace.render()});
  const time=page.locator('.scene-master .compact-date').first();assert.equal(await time.textContent(),'10/24 23:30');const tip=await time.getAttribute('data-tip');assert.equal(tip.split('\n').length,2);assert.match(tip,/^创建 \d{4}\/10\/24 13:12:32\n修改 \d{4}\/10\/24 23:30:45$/);await time.hover();await page.waitForTimeout(180);
  const geometry=await page.locator('#ui-tooltip').evaluate(n=>{const r=n.getBoundingClientRect(),t=n.querySelector('.ui-tooltip-text'),s=getComputedStyle(t);return {open:n.matches(':popover-open'),height:t.getBoundingClientRect().height,line:parseFloat(s.lineHeight),left:r.left,right:r.right,white:s.whiteSpace,overflow:t.scrollWidth>t.clientWidth}});assert.equal(geometry.open,true);assert.equal(geometry.white,'pre');assert.ok(Math.abs(geometry.height-2*geometry.line)<2);assert.ok(geometry.left>=0&&geometry.right<=width);assert.equal(geometry.overflow,false);await page.screenshot({path:`tmp/dialog-qa/timestamps-v0392/${width}-${theme}.png`});await context.close();console.log(`Timestamp ${width} ${theme}: minute label, two full-time lines, no wrapping/overflow passed`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
