const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,request}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{let browser,client;try{
 const base=process.env.QA_ORIGIN||'https://ai-vocab-tool.pages.dev',version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
 const server=process.env.HTTPS_PROXY||process.env.HTTP_PROXY,proxy=server?{server}:undefined;
 client=await request.newContext({proxy,timeout:60000});
 for(const file of ['index.html','app.js','anki-bridge-ui.js','scene-workspace.js','experience-ui.js','styles.css','icons.js','site.webmanifest']){
  let response,error;for(let n=0;n<3;n++){try{response=await client.get(`${base}/${file}?qa=${version}-${Date.now()}`);if(response.ok())break;error=Error(`${file}: ${response.status()}`)}catch(e){error=e}}
  assert.ok(response?.ok(),String(error));assert.equal((await response.text()).replace(/\r\n/g,'\n'),fs.readFileSync(`dist/${file}`,'utf8').replace(/\r\n/g,'\n'));console.log(`Production ${file}: matches dist`);
 }
 const gate=await client.post(`${base}/api/anki-jobs`,{data:{action:'health'}});assert.equal(gate.status(),503);assert.equal((await gate.json()).enabled,false);console.log('Production cloud send gate remains disabled');
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,proxy});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.addInitScript(()=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme','dark')});
  await page.goto(`${base}/settings?qa=${version}`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof AnkiBridge!=='undefined');assert.equal(await page.evaluate(()=>APP_INFO.version),version);
  await page.locator('[data-settings-target="settings-data"]').count();
  await page.locator('#learning-integrations').evaluate(node=>node.click());await page.waitForSelector('.anki-dialog');assert.ok((await page.locator('.anki-dialog').innerText()).includes('Fushi'));await page.keyboard.press('Escape');
  await page.goto(`${base}/batch`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>location.pathname==='/scenes');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  fs.mkdirSync('tmp/dialog-qa/unified',{recursive:true});await page.screenshot({path:`tmp/dialog-qa/unified/production-${width}.png`});console.log(`Production ${width}px: v${version}, integration dialog, legacy route and no overflow passed`);await context.close();
 }
}finally{await browser?.close();await client?.dispose()}})().catch(e=>{console.error(e);process.exitCode=1});
