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
   await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&typeof renderResult==='function');
   await page.evaluate(()=>SceneUI.open());
   await page.locator('[name="entryTitle"]').fill('go');
   await page.locator('[name="quote"]').fill('Yesterday she went home.');
   await page.locator('[name="translation"]').fill('她昨天回家了。');
   await page.locator('[name="exampleHighlights"]').fill('went');
   await page.locator('[name="translationHighlights"]').fill('回家');
   assert.ok(await page.locator('.scene-source-fields').evaluate(node=>node.open));
   await page.locator('[name="sourceTitle"]').fill('Test Film');
   await page.locator('[name="chapter"]').fill('EP 02');
   await page.locator('[name="timeRange"]').fill('00:01:20');
   await page.locator('[name="sourceUrl"]').fill('https://example.com/series');
   await page.getByRole('button',{name:'更多保存方式',exact:true}).click();
   await page.getByRole('menuitem',{name:'保存为自建词条…',exact:true}).click();
   await page.waitForSelector('#scene-editor',{state:'detached'});
   assert.equal(await page.locator('.scene-record blockquote .hit-mark').innerText(),'went','Custom inflection highlights without matching headword');
   assert.equal(await page.locator('.scene-translation .hit-mark').innerText(),'回家');
   assert.ok(await page.locator('.scene-source').evaluate(node=>node.open),'Reader source is expanded by default');
   assert.deepEqual(await page.evaluate(()=>getHistory()[0].scenes[0].exampleHighlights),['went']);
   await page.reload();await page.waitForFunction(()=>typeof openHistoryModal==='function');
   await page.evaluate(()=>openHistoryModal(getHistory()[0].id));
   assert.equal(await page.locator('#modal-card-page .scene-record blockquote .hit-mark').innerText(),'went');
   await page.locator('#modal-card-page .scene-section-head [data-scene-action="add"]').click();
   assert.equal(await page.locator('[name="sourceTitle"]').inputValue(),'','No implicit source overwriting');
   await page.locator('#scene-source-recent').selectOption('0');
   for(const [key,value] of Object.entries({sourceTitle:'Test Film',chapter:'EP 02',timeRange:'00:01:20',sourceUrl:'https://example.com/series'}))assert.equal(await page.locator(`[name="${key}"]`).inputValue(),value);
   await page.locator('[name="chapter"]').fill('EP 03');
   await page.locator('[name="timeRange"]').fill('00:02:00');
   await page.locator('[name="quote"]').fill('New context');
   await page.locator('[data-scene-action="save"]').click();
   await page.waitForSelector('#scene-editor',{state:'detached'});
   const records=await page.evaluate(()=>getHistory()[0].scenes);
   assert.equal(records.length,2);assert.equal(records[0].chapter,'EP 02');assert.equal(records[1].chapter,'EP 03');assert.equal(records[1].sourceTitle,'Test Film');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   console.log(`Scene authoring ${engine} ${width}px passed: manual highlight arrays, reload/detail, expanded source and editable recent-source reuse.`);
   await context.close();
  }
 }catch(error){console.error(error);process.exitCode=1}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})();
