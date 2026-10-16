const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 const failures=[];
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,1440,2138])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<900,isMobile:width<900});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}/history`);
   await page.waitForFunction(()=>typeof renderHistory==='function');
   const check=async(name,fn)=>{try{await fn();console.log(`PASS ${width} ${theme}: ${name}`)}catch(error){failures.push(`${width} ${theme}: ${name}`);console.error(`FAIL ${width} ${theme}: ${name}: ${error.message}`)}};
   await check('Direct entry initializes seven filter controls even without history',async()=>{
    assert.equal(await page.locator('#history-filterbar .history-filter-trigger').count(),7);
    assert.equal(await page.locator('#history-filterbar').isVisible(),width>900);
   });
   await page.evaluate(()=>{
    const make=(id,title,example,language)=>({id,query:title,result:{meta:{query:title,language},headword:{title,coreMeaning:'plain'},senses:[{shortestLabel:'meaning',meaning:'plain',example,translation:'translated'}]},createdAt:'2026-10-10T00:00:00Z'});
    setHistory([make(1,'needle','plain example','English'),make(2,'other','needle example','Japanese')]);
   });
   await page.reload();await page.waitForFunction(()=>typeof renderHistory==='function');
   await check('Reload and settings round trip retain working filters',async()=>{
    assert.equal(await page.locator('#history-filterbar .history-filter-trigger').count(),7);
    if(width<900){await page.locator('#history-filter-toggle').tap();assert.ok(await page.locator('#history-filterbar').isVisible())}
    await page.locator('[data-filter-key="language"] .history-filter-trigger').click();
    await page.locator('[data-filter-key="language"] [data-value="en"]').click();
    assert.equal(await page.locator('#history-list .history-item').count(),1);
    await page.evaluate(()=>{showView('settings');showView('history')});
    assert.equal(await page.locator('#history-list .history-item').count(),1);
    assert.equal(await page.locator('[data-filter-key="language"] .history-filter-trigger.active').count(),1);
    await page.evaluate(()=>clearHistoryFilter('language'));
   });
   await page.evaluate(()=>{historyState.query='';historyState.searchScopeOpen=false;resetHistorySearchScopes()});
   await check('Implicit all narrows on first choice, then adds and restores',async()=>{
    await page.locator('#history-search').fill('needle');await page.waitForTimeout(160);
    assert.equal(await page.locator('#history-list .history-item').count(),2);
    await page.locator('#history-search-scope-toggle').click();
    assert.equal(await page.locator('.history-search-scope-option.active').count(),0);
    assert.equal(await page.locator('#history-list .history-item').count(),2,'Opening menu does not filter');
    await page.locator('[data-scope="example"]').click();
    assert.deepEqual(await page.evaluate(()=>historyState.searchScopes),['example']);
    assert.equal(await page.locator('#history-list .history-item').count(),1);
    await page.locator('[data-scope="word"]').click();
    assert.equal(await page.locator('#history-list .history-item').count(),2);
    await page.locator('[data-scope="example"]').click();
    assert.equal(await page.locator('#history-list .history-item').count(),1);
    await page.locator('[data-scope="word"]').click();
    assert.equal(await page.locator('#history-search-scope-summary').textContent(),'全部');
    assert.equal(await page.locator('.history-search-scope-option.active').count(),0);
    await page.locator('[data-scope="example"]').click();
    await page.locator('[data-scope-action="all"]').click();
    assert.equal(await page.locator('#history-list .history-item').count(),2);
    assert.equal(await page.locator('.history-search-scope-option.active').count(),0);
   });
   await page.evaluate(()=>{clearHistorySearch();closeHistorySearchScopeMenu();historyState.filtersOpen=false;renderHistory()});
   await check('Collapsed mobile to desktop resize needs no settings detour',async()=>{
    await page.setViewportSize({width:390,height:900});
    assert.equal(await page.locator('#history-filterbar').isVisible(),false);
    await page.setViewportSize({width:1440,height:900});
    assert.ok(await page.locator('#history-filterbar').isVisible());
    assert.equal(await page.locator('#history-filterbar .history-filter-trigger:visible').count(),7);
    await page.setViewportSize({width,height:900});
   });
   await check('Filter options reuse cache and refresh after data changes',async()=>{
    const result=await page.evaluate(()=>{
     const original=collectHistoryOptions;
     let scans=0;
     collectHistoryOptions=items=>{scans++;return original(items)};
     try{
      renderHistory();renderHistory();
      const unchanged=scans;
      setHistory([...getHistory(),{id:3,query:'bonjour',result:{meta:{language:'French'},headword:{title:'bonjour'}},createdAt:'2026-10-10T00:00:00Z'}]);
      const changed=scans;
      const french=Boolean(document.querySelector('[data-filter-key="language"] [data-value="fr"]'));
      setHistory(getHistory().filter(item=>item.id!==3));
      return {unchanged,changed,french,removed:!document.querySelector('[data-filter-key="language"] [data-value="fr"]')};
     }finally{collectHistoryOptions=original}
    });
    assert.equal(result.unchanged,0);assert.equal(result.changed,1);assert.ok(result.french&&result.removed);
   });
   await page.evaluate(()=>{closeHistoryFilterMenus();document.activeElement?.blur()});
   assert.deepEqual(errors,[]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.QA_SCREENSHOTS){
    fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});
    const shot=name=>page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`${name}-${width}-${theme}.png`)});
    await shot('history-controls');
    await page.locator('#history-search-scope-toggle').click();await shot('scope-all');
    await page.locator('[data-scope="example"]').click();await shot('scope-example');
    assert.ok(await page.locator('[data-scope="example"] svg').count());
    await page.evaluate(()=>{closeHistorySearchScopeMenu();window.scrollTo(0,250)});await page.waitForTimeout(200);await shot('history-scrolled');
   }
   await context.close();
  }
  assert.deepEqual(failures,[]);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
