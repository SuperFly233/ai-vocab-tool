const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of [320,390,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[],commands=[];let current='';page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',r=>r.abort());
  const device='33333333-3333-4333-8333-333333333333',job={id:'11111111-1111-4111-8111-111111111111',device_id:device,status:'complete',payload:{version:2,confirmationMode:'web',cards:[{key:'one',title:'Synthetic word'}]}};
  await page.route('**/api/anki-jobs',r=>{const {action,args}=r.request().postDataJSON();let data=[];
   if(action==='list')data=[job];if(action==='health')data={bridgeVersion:'0.2.0'};if(action==='devices')data=[{id:device,name:'测试电脑'}];if(action==='results')data=[{card_key:'one',status:'complete',note_id:'123',message:''}];
   if(action==='device_request'){commands.push(args);current=args.kind;data={id:'44444444-4444-4444-8444-444444444444'}}
   if(action==='device_status')data={status:'complete',result:current==='undo'?{rows:[{key:'one',status:'error',message:'已学习，保留。'}]}:current==='open_note'?{opened:true}:{cloud:{ok:true},anki:{ok:true,detail:{profile:'test'}},fushi:{ok:false,message:'未运行'}}};return r.fulfill({json:{enabled:true,data}})
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/scenes`);await page.waitForFunction(()=>typeof FushiWorkspace!=='undefined');await page.evaluate(async()=>{await cloudInitPromise;cloudUser={id:'fixture'};cloudAccessToken=async()=>'fixture';await AnkiBridge.manage()});
  await page.locator('[data-remote-undo]').click();await page.locator('[data-cancel-intent]').click();assert.equal(commands.length,0);
  await page.locator('[data-remote-undo]').click();await page.locator('[data-accept-intent]').click();await page.waitForSelector('.anki-remote-results');assert.ok((await page.locator('.anki-remote-results').innerText()).includes('未撤销'));assert.equal(commands[0].kind,'undo');assert.equal(commands[0].confirmed,true);await page.locator('dialog').last().locator('header button').click();
  await page.locator('[data-results]').click();await page.waitForSelector('[data-open-remote]');await page.locator('[data-open-remote]').click();await page.waitForFunction(()=>[...document.querySelectorAll('dialog')].at(-1)?.textContent.includes('已在接收电脑'));assert.equal(commands[1].cardKey,'one');assert.equal(commands[1].noteId,undefined,'Server resolves note ID, never client-controlled');await page.locator('dialog').last().locator('header button').click();await page.locator('dialog').last().locator('header button').click();
  await page.evaluate(()=>AnkiBridge.connections());await page.locator('[data-check-integration]').click();await page.waitForSelector('[data-diagnose-device]');await page.locator('[data-diagnose-device]').click();await page.waitForSelector('[data-connection-ok="false"]');assert.ok((await page.locator('[data-connection-ok="false"]').innerText()).includes('未运行'));assert.equal(commands[2].kind,'diagnostics');assert.ok(await page.evaluate(()=>{const n=[...document.querySelectorAll('dialog')].at(-1);return n.scrollWidth<=n.clientWidth&&document.documentElement.scrollWidth<=innerWidth}));
  fs.mkdirSync('tmp/dialog-qa/fushi-web',{recursive:true});await page.screenshot({path:`tmp/dialog-qa/fushi-web/device-${width}-${theme}.png`});assert.deepEqual(errors,[]);await context.close();console.log(`Device actions ${width} ${theme}: explicit undo, studied item retained, receipt-based open, accurate diagnosis and modal layout passed`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
