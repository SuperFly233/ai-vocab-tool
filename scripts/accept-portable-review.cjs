const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const input=JSON.parse(fs.readFileSync(0,'utf8'));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
  await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
  await page.goto(input.origin+'/scenes');
  await page.evaluate(async input=>{await globalThis.appReady;await cloudInitPromise;cloudUser={id:input.owner};cloudAccessToken=async()=>input.access;await AnkiBridge.reviewJob(input.job)},input);
  await page.locator('[data-review-approve]').waitFor();
  assert.equal(await page.locator('[data-review-deck]').inputValue(),'Lexi 验收','Live acceptance may only approve the dedicated test deck');
  try{await page.waitForFunction(()=>document.querySelector('[data-review-approve]')?.disabled===false)}catch{
   throw Error('Approval stayed disabled: '+await page.locator('.scene-dialog-status').innerText());
  }
  assert.equal(await page.evaluate(()=>document.querySelector('.anki-dialog').scrollWidth>document.querySelector('.anki-dialog').clientWidth),false);
  fs.mkdirSync('tmp/dialog-qa/portable-live',{recursive:true});
  await page.screenshot({path:'tmp/dialog-qa/portable-live/'+input.label+'.png'});
  await page.locator('[data-review-approve]').click();
  await page.waitForFunction(()=>document.querySelector('[data-review-state]')?.textContent.includes('已确认'));
  console.log('Website preview and explicit dedicated-test confirmation passed');
 }finally{await browser?.close()}
})().catch(error=>{console.error(error.message);process.exitCode=1});
