const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 const screenshots=process.env.QA_SCREENSHOTS||'tmp/bridge041-connections';fs.mkdirSync(screenshots,{recursive:true});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
  await page.route('**/api/anki-jobs',async route=>{const {action}=route.request().postDataJSON();const respond=data=>route.fulfill({json:{enabled:true,data}});
   if(action==='health')return respond({bridgeVersion:'9.9.9',payloadVersions:[1,2,3,4]});
   if(action==='devices')return respond([{id:'33333333-3333-4333-8333-333333333333',name:'Synthetic test PC',last_seen:new Date().toISOString(),capabilities:{bridgeVersion:'0.3.0'}}]);
   if(action==='device_request')return respond({id:'44444444-4444-4444-8444-444444444444'});
   if(action==='device_status')return respond({status:'complete',result:{deviceName:'Synthetic test PC',deviceId:'33333333-3333-4333-8333-333333333333',checkedAt:new Date(Date.now()-121000).toISOString(),cloud:{ok:true},anki:{ok:true},fushi:{ok:false},dictionary:{ok:false}}});
   return respond([])
  });
  await page.goto(base+'/settings');await page.evaluate(async()=>{await appReady;await cloudInitPromise;cloudUser={id:'synthetic'};cloudAccessToken=async()=>'fixture';AnkiBridge.connections()});
  const dialog=page.locator('.learning-help-dialog');await dialog.locator('[data-help-release] a').first().waitFor();
  await page.locator('[data-help-check-cloud]').click();await page.waitForFunction(()=>document.querySelector('[data-help-diagnostic]')?.textContent.includes('0.3.0'));
  assert.match(await dialog.innerText(),/登记版本 0.3.0/);assert.doesNotMatch(await dialog.innerText(),/Bridge 9.9.9/);
  assert.ok(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth));
  await page.screenshot({path:path.join(screenshots,`connections-${width}-${theme}.png`)});
  await page.locator('[data-help-check-device]').click();const diagnostic=page.locator('[data-help-diagnostic]');await diagnostic.getByText(/需重新检查/).waitFor();assert.match(await diagnostic.innerText(),/可选/);
  await page.keyboard.press('Escape');await page.keyboard.press('Escape');assert.equal(await page.locator('.anki-dialog').count(),0);assert.deepEqual(errors,[]);await context.close();console.log(`Connections ${width} ${theme}: release guide, actual-device version, optional sources, stale diagnostic and nested dismissal passed.`);
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(e=>{console.error(e);process.exitCode=1});
