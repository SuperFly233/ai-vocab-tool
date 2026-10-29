const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`,proxyURL=process.env.QA_USE_PROXY&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY),proxy=proxyURL?new URL(proxyURL):null;browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,...(proxy?{proxy:{server:proxy.origin,username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}}:{})});fs.mkdirSync('tmp/dialog-qa/capture-v038',{recursive:true});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);await page.route('https://**/*',r=>new URL(r.request().url()).hostname===new URL(base).hostname?r.continue():r.abort());
  await page.goto(base+'/scenes',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>typeof CaptureUI!=='undefined');
  await page.evaluate(async()=>{await appReady;await cloudInitPromise;SceneUI.syncPending=()=>{};syncAllToCloud=async()=>true;await CaptureUI.open()});
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.capture-dialog'));
  await page.evaluate(()=>CaptureUI.open());await page.waitForSelector('.capture-dialog');
  const corrupt=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(corrupt);corrupt.writeUInt32BE(320,16);corrupt.writeUInt32BE(180,20);await page.locator('[data-capture-files]').setInputFiles({name:'corrupt.png',mimeType:'image/png',buffer:corrupt});await page.getByText('截图无法解码，请重新导出为 PNG 或 JPEG。已添加的其他截图仍保留。',{exact:true}).waitFor();assert.equal(await page.locator('[data-capture-select]').count(),0);
  const image=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=840;canvas.height=420;const ctx=canvas.getContext('2d');ctx.fillStyle='#204e56';ctx.fillRect(0,0,840,420);ctx.fillStyle='#fff';ctx.font='bold 32px sans-serif';ctx.fillText('Small steps make a difference.',35,160);ctx.font='24px sans-serif';ctx.fillText('Synthetic screenshot / No personal data',35,240);return canvas.toDataURL('image/png').split(',')[1]});
  const file={name:'测试 screenshot.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')};
  await page.locator('[data-capture-files]').setInputFiles([file,file]);await page.waitForFunction(()=>document.querySelectorAll('[data-capture-select]').length===1);await page.waitForFunction(()=>document.querySelector('[data-capture-local]').textContent==='草稿已保存在本机');
  await page.locator('[data-capture-field="quote"]').fill('Small steps make a difference. '+ 'A longer original sentence. '.repeat(width===320?30:2));
  await page.locator('[data-capture-field="translation"]').fill('小步前进也会带来改变。');
  await page.locator('[data-capture-field="exampleHighlights"]').fill('make a difference');await page.locator('[data-capture-field="translationHighlights"]').fill('改变');
  await page.locator('[data-capture-field="sourceTitle"]').fill('合成测试来源');await page.locator('[data-capture-field="terms"]').fill('make a difference、small steps');
  await page.locator('[data-capture-field="title"]').fill('截图学习验收');
  await page.screenshot({path:`tmp/dialog-qa/capture-v038/detail-scrolled-${width}-${theme}.png`,animations:'disabled'});
  await page.locator('.capture-detail').evaluate(node=>node.scrollTop=0);await page.screenshot({path:`tmp/dialog-qa/capture-v038/detail-${width}-${theme}.png`,animations:'disabled'});
  assert.ok(await page.evaluate(()=>{const n=document.querySelector('.capture-dialog');return n.scrollWidth<=n.clientWidth+1&&n.getBoundingClientRect().left>=0&&n.getBoundingClientRect().right<=innerWidth&&document.documentElement.scrollWidth<=innerWidth}),'No modal or document overflow');
  assert.ok(await page.locator('[data-capture-field="quote"]').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)>=16));
  await page.keyboard.press('Escape');await page.locator('[data-discard]').click();await page.waitForFunction(()=>!document.querySelector('.capture-dialog'));await page.locator('.toast-action').last().click();await page.waitForSelector('[data-capture-field="quote"]');assert.ok((await page.locator('[data-capture-field="quote"]').inputValue()).includes('make a difference'));
  await page.locator('[data-capture-save]').dblclick();await page.waitForFunction(()=>getSettings().sceneLibrary.some(row=>row.capture));assert.equal(await page.evaluate(()=>getSettings().sceneLibrary.filter(row=>row.capture).length),1);
  assert.equal(await page.evaluate(()=>getSettings().sceneLibrary.find(row=>row.capture).capture.translationOrigin),'manual');
  assert.deepEqual(await page.evaluate(()=>getSettings().sceneLibrary.find(row=>row.capture).translationHighlights),['改变']);
  // All saved fields are disabled; closure requires no unnecessary dirty confirmation.
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.capture-dialog'));assert.equal(await page.locator('[data-discard]').count(),0);
  await page.evaluate(()=>CaptureUI.open());await page.waitForSelector('.capture-dialog');assert.equal(await page.locator('[data-capture-items]').getByText('已保存',{exact:true}).count(),1);
  if(width<=390){await page.locator('[data-capture-back]').click();await page.screenshot({path:`tmp/dialog-qa/capture-v038/list-${width}-${theme}.png`});await page.locator('[data-capture-select]').click();}
  await page.keyboard.press('Escape');if(await page.locator('[data-discard]').count())await page.locator('[data-discard]').click();
  assert.deepEqual(errors,[]);await context.close();console.log(`Capture ${width} ${theme}: original persistence, dedupe, manual review, safe discard/Undo, double-save and mobile bounds passed`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
