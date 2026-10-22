const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of [320,390,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>typeof notify==='function');
  await page.evaluate(async()=>{await cloudInitPromise;window.undoCalls=[];notify('Operation A','info','Synthetic',false,{label:'Undo A',run:()=>window.undoCalls.push('A')});notify('Background failure','bad','Synthetic',false);notify('Operation B','info','Synthetic',false,{label:'Undo B',run:()=>window.undoCalls.push('B')})});
  assert.equal(await page.locator('.toast-action').textContent(),'Undo B');await page.locator('.toast-action').click();await page.waitForFunction(()=>document.querySelector('.toast-action')?.textContent==='Undo A');await page.locator('.toast-action').click();await page.waitForFunction(()=>document.querySelector('.toast-msg')?.textContent==='Background failure');assert.deepEqual(await page.evaluate(()=>window.undoCalls),['B','A']);
  await page.locator('.toast-close').click();await page.waitForFunction(()=>!document.querySelector('.toast'));
  await page.evaluate(()=>{notify('Old account operation','info','Synthetic',false,{label:'Forbidden undo',run:()=>window.undoCalls.push('wrong')});cloudUser={id:'other'}});
  await page.locator('.toast-action').click();assert.deepEqual(await page.evaluate(()=>window.undoCalls),['B','A']);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await context.close();console.log(`Notice priority ${width} ${theme}: newest undo first, older undo retained, background failure not lost, account switch blocks callback`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
