const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);await page.route('https://**/*',r=>r.abort());await page.goto(`http://127.0.0.1:${server.address().port}/scenes`);await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');
  const quote='This changes nothing of my opinion towards him. The rift between myself and Hropatyr began with this incident, but it is not the source of my hatred for him. '.repeat(5);
  await page.evaluate(async quote=>{await cloudInitPromise;const now=new Date().toISOString();setSettings({...getSettings(),sceneLibrary:[{id:'long-title',groupId:'long-title',quote,createdAt:now,updatedAt:now}]});SceneWorkspace.render();SceneWorkspace.select('long-title')},quote);
  const title=page.locator('.scene-heading h2');assert.equal(await title.textContent(),quote.trim());assert.equal(await title.getAttribute('title'),quote.trim());
  const box=await title.evaluate(node=>{const s=getComputedStyle(node);return {height:node.clientHeight,scroll:node.scrollHeight,line:parseFloat(s.lineHeight),clamp:s.webkitLineClamp,overflow:s.overflow}});assert.equal(box.clamp,'2');assert.equal(box.overflow,'hidden');assert.ok(box.scroll>box.height&&box.height<=box.line*2+2,'Full text must be visually clamped, not destructively sliced');
  assert.equal(await page.locator('.scene-list-copy strong').textContent(),quote.trim());assert.equal(await page.locator('.scene-list-copy strong').evaluate(n=>getComputedStyle(n).textOverflow),'ellipsis');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`title-${width}-${theme}.png`)})}
  console.log(`${width}px ${theme}: full title preserved, two-line ellipsis, complete tooltip and single-line list ellipsis passed`);await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
