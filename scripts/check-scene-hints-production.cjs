const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium,request}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{let browser,client,page;try{
 const base=process.env.QA_ORIGIN||'https://ai-vocab-tool.pages.dev',version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
 const proxyServer=process.env.HTTPS_PROXY||process.env.HTTP_PROXY,proxy=proxyServer?{server:proxyServer}:undefined;
 client=await request.newContext({proxy,timeout:60000});
 for(const file of ['index.html','app.js','scene-data.js','scene-ui.js','scene-study.js','scene-workspace.js','experience-ui.js','ui-overlays.js','styles.css','icons.js','site.webmanifest']){
  const response=await client.get(`${base}/${file}?qa=${Date.now()}`);assert.ok(response.ok(),file);assert.equal((await response.text()).replace(/\r\n/g,'\n'),fs.readFileSync(`dist/${file}`,'utf8').replace(/\r\n/g,'\n'));console.log(`${file}: production matches isolated release`);
 }
 const gate=await client.post(`${base}/api/anki-jobs`,{data:{action:'health'}});assert.equal(gate.status(),503);assert.equal((await gate.json()).enabled,false);
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,proxy});
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:844}});page=await context.newPage();
  await page.addInitScript(()=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme','dark')});
  await page.goto(`${base}/settings`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');assert.equal(await page.evaluate(()=>APP_INFO.version),version);
  await page.getByRole('searchbox',{name:'搜索设置'}).fill('隐藏编辑气泡');await page.locator('#hints-hidden').check();assert.equal(await page.evaluate(()=>getSettings().hintsHidden),true);
  await page.goto(`${base}/scenes`,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof SceneWorkspace!=='undefined');
  await page.evaluate(async()=>{await cloudInitPromise;const now=new Date().toISOString();setSettings({...getSettings(),sceneLibrary:[{id:'qa-hints',groupId:'qa-hints',quote:'I clocked a thorn.',translation:'我注意到眼中钉。',createdAt:now,updatedAt:now}]});SceneWorkspace.render();await SceneUI.open('library','','qa-hints')});
  const input=page.locator('#scene-editor [name="exampleHighlights"]');await input.fill('clocked\nthorn');await input.focus();assert.equal(await page.locator('.visual-hint-bubble:popover-open').count(),0);
  await page.evaluate(()=>setHintsHidden(false));await page.locator('#scene-editor [name="translationHighlights"]').fill('注意到、眼中钉');await input.focus();const bubble=page.locator('.visual-hint-bubble:popover-open');await bubble.waitFor();await bubble.evaluate(async node=>{await Promise.all(node.getAnimations().map(animation=>animation.finished.catch(()=>{})))});
  const rect=await bubble.boundingBox();assert.ok(rect.width<=width-24&&rect.height<=220&&rect.x>=0);
  fs.mkdirSync('tmp/dialog-qa/scene-hints',{recursive:true});await page.screenshot({path:`tmp/dialog-qa/scene-hints/production-${width}.png`});
  await page.locator('#scene-editor [data-scene-action="save"]').click();assert.deepEqual(await page.evaluate(()=>getSettings().sceneLibrary[0].exampleHighlights),['clocked','thorn']);assert.deepEqual(await page.evaluate(()=>getSettings().sceneLibrary[0].translationHighlights),['注意到','眼中钉']);
  console.log(`Production ${width}px v${version}: settings switch, persisted opt-out, multiline bilingual save and compact bubble passed; isolated browser storage only`);await context.close();
 }
}catch(error){if(page){fs.mkdirSync('tmp/dialog-qa/scene-hints',{recursive:true});await page.screenshot({path:'tmp/dialog-qa/scene-hints/production-failure.png'});console.log(await page.evaluate(()=>({active:document.activeElement?.outerHTML,hidden:getSettings().hintsHidden,body:document.body.className,hints:[...document.querySelectorAll('.visual-hint-bubble[popover]')].map(node=>({open:node.matches(':popover-open'),rect:node.getBoundingClientRect().toJSON()}))})).catch(()=>null))}throw error}finally{await browser?.close();await client?.dispose()}})().catch(error=>{console.error(error);process.exitCode=1});
