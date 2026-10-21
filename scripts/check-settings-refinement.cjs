const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  await page.addInitScript(t=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',t)},theme);await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/settings`);await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');
  await page.evaluate(async()=>{await cloudInitPromise});
  assert.deepEqual(await page.locator('.settings-nav-item b').allTextContents(),['模型生成','界面布局','阅读体验','场景媒体','消息通知','数据同步','维护诊断']);
  assert.equal(await page.locator('.settings-nav-item small').count(),0);
  assert.equal(await page.locator('[data-settings-target]').count(),7);
  const input=page.getByRole('searchbox',{name:'搜索设置'});
  await input.fill('toast');assert.equal(await page.locator('.settings-content>.setting-group:visible').count(),1);assert.ok(await page.locator('#settings-notifications').isVisible());
  await input.fill('不存在的关键词987');assert.ok(await page.locator('.settings-empty').isVisible());assert.equal(await page.locator('.settings-search [role=status]').textContent(),'0 项');
  await page.locator('.settings-empty button').click();assert.equal(await input.inputValue(),'');assert.equal(await page.locator('.settings-nav-item:visible').count(),7);assert.ok(await input.evaluate(n=>n===document.activeElement));
  await input.evaluate(n=>{n.dispatchEvent(new CompositionEvent('compositionstart',{data:'主'}));n.value='主题';n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new CompositionEvent('compositionend',{data:'主题'}))});
  assert.ok(await input.evaluate(n=>n===document.activeElement));assert.ok(await page.locator('#settings-experience').isVisible());await page.locator('.settings-search .history-clear-btn').click();
  await page.locator('[data-settings-target="settings-reading"]').click();await page.waitForTimeout(1400);
  const toggle=page.locator('#settings-reading .setting-collapse-btn');await toggle.click();assert.equal(await toggle.getAttribute('aria-label'),'展开 阅读体验');await toggle.click();assert.equal(await toggle.getAttribute('aria-label'),'折叠 阅读体验');
  const reading=await page.locator('#settings-reading').evaluate(n=>({labels:[...n.querySelectorAll('.setting-label')].map(x=>x.textContent),overflow:document.documentElement.scrollWidth>innerWidth,controls:[...n.querySelectorAll('.seg button')].every(x=>x.scrollWidth<=x.clientWidth+1)}));
  assert.equal(reading.overflow,false);assert.equal(reading.controls,true);assert.equal(reading.labels.at(-1),'可视化填写提示');
  if(width>900){const bounds=await page.locator('#settings-reading .seg').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().right));assert.ok(Math.max(...bounds)-Math.min(...bounds)<2)}
  assert.equal(await page.locator('#settings-maintenance>.setting-row').last().locator('.danger-btn').count(),1);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.body,':after').position),'fixed');
  await page.locator('[data-settings-target="settings-media"]').click();await page.waitForTimeout(1400);
  const autoplay=page.locator('[data-preference="mediaAutoplay"]');await autoplay.check();assert.equal(await page.evaluate(()=>getSettings().mediaAutoplay),true);await autoplay.focus();await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>getSettings().mediaAutoplay),false);
  await page.locator('[data-preference="mediaTools"] [data-value="always"]').click();assert.equal(await page.evaluate(()=>getSettings().mediaTools),'always');
  await page.locator('[data-settings-target="settings-reading"]').click();await page.waitForTimeout(1400);
  if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`settings-reading-${width}-${theme}.png`)});await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(1400);await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`settings-top-${width}-${theme}.png`)})}
  console.log(`${width}px ${theme}: categories/search/IME/empty recovery/collapse/alignment passed`);await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
