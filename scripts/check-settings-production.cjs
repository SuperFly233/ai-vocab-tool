const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium,request}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{let browser,client;try{
 const base=process.env.QA_ORIGIN||'https://ai-vocab-tool.pages.dev',server=process.env.HTTPS_PROXY||process.env.HTTP_PROXY,proxy=server?{server}:undefined;
 client=await request.newContext({proxy,timeout:60000});
 for(const file of ['index.html','app.js','experience-ui.js','styles.css','icons.js','site.webmanifest']){
  let response,error;for(let attempt=0;attempt<3;attempt++){try{response=await client.get(`${base}/${file}?qa=258b6fa-${attempt}`);if(response.ok())break;error=new Error(`${file}: ${response.status()}`)}catch(e){error=e}}
  assert.ok(response?.ok(),String(error));assert.equal((await response.text()).replace(/\r\n/g,'\n'),fs.readFileSync(path.join('dist',file),'utf8').replace(/\r\n/g,'\n'));console.log(`Production ${file}: matches local dist`);
 }
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,proxy});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.addInitScript(()=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme','dark')});
  await page.goto(`${base}/settings?qa=258b6fa`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');
  assert.equal(await page.evaluate(()=>APP_INFO.version),'0.33.0');assert.equal(await page.locator('.settings-nav-item').count(),7);
  await page.getByRole('searchbox',{name:'搜索设置'}).fill('toast');assert.ok(await page.locator('#settings-notifications').isVisible());
  await page.locator('.settings-search .history-clear-btn').click();await page.locator('[data-settings-target="settings-reading"]').click();await page.waitForTimeout(1600);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  fs.mkdirSync('tmp/dialog-qa/settings',{recursive:true});await page.screenshot({path:`tmp/dialog-qa/settings/production-${width}-dark.png`});
  console.log(`Production ${width}px: v0.33.0, categories, search, navigation and no page overflow passed`);await context.close();
 }
}finally{await browser?.close();await client?.dispose()}})().catch(e=>{console.error(e);process.exitCode=1});
