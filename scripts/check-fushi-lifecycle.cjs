const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 const page=await browser.newPage({viewport:{width:1024,height:900}});
 await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
 await page.route('https://**/*',r=>r.abort());
 const device='33333333-3333-4333-8333-333333333333',other='55555555-5555-4555-8555-555555555555';
 const requests=new Map(),submitted=[];let loseResponse=true,statusCalls=0,waiting=false;
 await page.route('**/api/anki-jobs',async route=>{
  const {action,args}=route.request().postDataJSON();let data={};
  if(action==='devices')data=[{id:device,name:'测试电脑'},{id:other,name:'另一电脑'}];
  if(action==='device_request'){
   submitted.push(args);let record=requests.get(args.clientRequestId);
   if(!record){record={id:crypto.randomUUID(),args};requests.set(args.clientRequestId,record)}
   if(loseResponse){loseResponse=false;return route.abort('failed')}
   data={id:record.id,status:'waiting'};
  }
  if(action==='device_status'){
   statusCalls++;const record=[...requests.values()].find(r=>r.id===args.requestId);
   assert.ok(record);const a=record.args,scope=a.scope;
   data={id:record.id,device_id:a.deviceId,payload:{scope,limit:a.limit},status:waiting?'waiting':'complete',result:{items:[{id:device+':'+scope+':1',key:(scope==='favorites'?'a':'b').repeat(64),title:scope,quote:'Synthetic private source '+scope,sourceTitle:'fixture'}]}};
  }
  return route.fulfill({json:{enabled:true,data}});
 });
 const url=`http://127.0.0.1:${server.address().port}/scenes`;
 async function initialize(){await page.waitForFunction(()=>typeof FushiWorkspace!=='undefined');await page.evaluate(async()=>{await cloudInitPromise;syncAllToCloud=async()=>true;cloudUser={id:'lifecycle'};cloudAccessToken=async()=>'fixture';SceneWorkspace.render()})}
 async function open(){await page.locator('#scene-hub [data-fushi-browser]').click();await page.waitForSelector('[data-read-fushi]')}
 async function read(){await page.locator('[data-read-fushi]').click();await page.locator('[data-accept-intent]').click()}
 await page.goto(url);await initialize();await open();await read();
 await page.waitForFunction(()=>!document.querySelector('[data-read-fushi]').disabled);
 await page.locator('[data-read-fushi]').click();await page.waitForSelector('[data-fushi-source]');
 assert.equal(requests.size,1);assert.equal(submitted.length,2);assert.equal(submitted[0].clientRequestId,submitted[1].clientRequestId,'Lost reply resumes identical request');
 await page.locator('[data-fushi-source]').check();
 await page.getByRole('searchbox',{name:'搜索 Fushi 来源'}).fill('Synthetic');
 const saved=await page.evaluate(()=>sessionStorage.getItem('lexi-fushi-session-v1:lifecycle'));
 assert.ok(!saved.includes('Synthetic private source'),'No raw sentence in session storage');
 await page.reload();await initialize();await open();await page.waitForSelector('[data-fushi-source]:checked');
 assert.equal(submitted.length,2,'Refresh recovers original result, not another read');
 assert.equal(await page.getByRole('searchbox',{name:'搜索 Fushi 来源'}).inputValue(),'Synthetic');
 await page.locator('[name=scope]').selectOption('staged');await read();await page.waitForSelector('[data-fushi-source]');await page.locator('[data-fushi-source]').check();
 assert.equal(await page.locator('[data-remove-selected]').count(),2,'Basket spans confirmed ranges');
 await page.locator('[name=device]').selectOption(other);await page.locator('[data-cancel-intent]').click();
 assert.equal(await page.locator('[name=device]').inputValue(),device);assert.equal(await page.locator('[data-remove-selected]').count(),2);
 await page.locator('[data-clear-fushi]').click();await page.locator('.toast-action').click();assert.equal(await page.locator('[data-remove-selected]').count(),2);
 await page.locator('[data-clear-fushi]').click();await page.locator('.toast-close').click();
 waiting=true;await read();await page.waitForFunction(()=>document.querySelector('[data-read-state]').textContent.includes('等待电脑'));
 await page.evaluate(()=>{globalThis.qaHidden=true;Object.defineProperty(document,'hidden',{configurable:true,get:()=>globalThis.qaHidden});document.dispatchEvent(new Event('visibilitychange'))});
 const hiddenCalls=statusCalls;await page.waitForTimeout(2300);assert.equal(statusCalls,hiddenCalls,'Hidden window stops polling');
 await page.evaluate(()=>{globalThis.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.fushi-source-dialog'));
 const calls=statusCalls;await page.waitForTimeout(2300);assert.equal(statusCalls,calls,'Closed window stops polling');
 const count=requests.size;waiting=false;await open();await page.waitForSelector('[data-fushi-source]');assert.equal(requests.size,count,'Reopen continues original read');
 const validation=await page.evaluate(()=>{
  const row={id:'sample',key:'c'.repeat(64),quote:'complete'};
  const before=JSON.stringify(getSettings().sceneLibrary);let refused=false;
  try{SceneUI.importFushi([row,{...row,id:'bad',key:'d'.repeat(64),quote:''}],'lifecycle',{silent:true})}catch{refused=true}
  return refused&&before===JSON.stringify(getSettings().sceneLibrary);
 });assert.ok(validation,'Invalid item prevents all writes');
 await page.locator('[data-fushi-source]').check();await page.keyboard.press('Escape');await page.locator('[data-discard]').click();await page.waitForFunction(()=>!document.querySelector('.fushi-source-dialog'));
 await page.evaluate(()=>{const key='lexi-fushi-session-v1:lifecycle',value=JSON.parse(sessionStorage.getItem(key));value.query='later search';sessionStorage.setItem(key,JSON.stringify(value))});
 await page.locator('.toast-action').click();assert.equal(await page.locator('.fushi-source-dialog').count(),0,'Stale discard undo never overwrites a later session');
 console.log('Fushi lifecycle passed: lost reply nonce reuse, refresh/selection recovery, private session boundary, cross-scope basket, device cancel, clear undo, close polling, reopen and atomic validation.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
