const assert=require('node:assert/strict'),fs=require('node:fs');
const engines=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;
  const network=route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort();
  const engine=process.env.QA_ENGINE||'chromium';
  browser=await engines[engine].launch({headless:true,...(engine==='chromium'?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    await page.addInitScript(()=>{
      localStorage.setItem('ai_vocab_tool_offline_mode','1');
      if(localStorage.getItem('qa-seeded'))return;
      const old={id:1,query:'old',createdAt:'2026-10-23T00:00:00Z',result:{headword:{title:'old',coreMeaning:'keep'}}};
      localStorage.setItem('ai_vocab_tool_history_v1',JSON.stringify([old]));
      localStorage.setItem('ai_vocab_tool_logs_v1',JSON.stringify([{id:1,time:'2026-10-23T00:00:00Z',title:'Historical block',type:'bad',message:'<html><style>data:image/jpeg;base64,'+'A'.repeat(1700000)+'</style></html>'}]));
      let quota=false;try{localStorage.setItem('qa-too-big','B'.repeat(4000000))}catch(error){quota=error.name==='QuotaExceededError'}
      localStorage.setItem('qa-reproduced',String(quota));localStorage.setItem('qa-seeded','1');
    });
    await page.route('https://**/*',network);
    await page.goto(`${base}/history`);await page.evaluate(()=>appReady);
    const state=await page.evaluate(async()=>{
      await DiagnosticStore.flush();
      const migrated={available:DiagnosticStore.available,legacy:localStorage.getItem(STORAGE_KEYS.logs),length:getLogs()[0].message.length,old:getHistory()[0].query,quota:localStorage.getItem('qa-reproduced')};
      const rows=Array.from({length:120},(_,id)=>{const result={headword:{title:`Synthetic ${id}`,coreMeaning:'complete'},summary:'Z'.repeat(15000)};return {id:id+10,query:`Synthetic ${id}`,createdAt:'2026-10-23T00:00:00Z',result,rolls:[{id:`roll-${id}`,createdAt:'2026-10-23T00:00:00Z',result}]}});
      const logs=getLogs();replaceLocalWithItems({[CLOUD_KEYS.history]:JSON.stringify(rows),[CLOUD_KEYS.historyTombstones]:'[]',[CLOUD_KEYS.logs]:JSON.stringify(logs)});await DiagnosticStore.flush();
      return {...migrated,count:getHistory().length,intact:getHistory().every(row=>row.result.summary.length===15000),logsIntact:getLogs().some(row=>row.message===logs[0].message),legacyAfter:localStorage.getItem(STORAGE_KEYS.logs)};
    });
    assert.equal(state.quota,'true');assert.equal(state.available,true);assert.equal(state.legacy,null);assert.equal(state.legacyAfter,null);assert.ok(state.length>1700000);assert.equal(state.old,'old');assert.equal(state.count,120);assert.ok(state.intact&&state.logsIntact);
    await page.reload();await page.evaluate(()=>appReady);
    assert.equal(await page.evaluate(()=>getHistory().length),120);assert.equal(await page.evaluate(()=>getLogs().some(row=>row.message.length>1700000)),true);
    await page.evaluate(()=>{showView('settings');renderLogs()});
    assert.ok((await page.locator('#log-list').innerText()).length<5000);
    const download=page.waitForEvent('download');await page.evaluate(()=>exportLogs());const file=await download;
    assert.ok(fs.readFileSync(await file.path(),'utf8').length>1700000,'Full diagnostic export remains available');
    await page.locator('#log-list').scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    fs.mkdirSync('tmp/diagnostic-qa',{recursive:true});await page.screenshot({path:`tmp/diagnostic-qa/settings-${engine}-${width}.png`});
    const second=await context.newPage();await second.route('https://**/*',network);await second.goto(`${base}/history`);await second.evaluate(()=>appReady);
    await page.evaluate(async()=>{pushLog('tab-one');await DiagnosticStore.flush()});
    await second.evaluate(async()=>{pushLog('tab-two');await DiagnosticStore.flush()});
    await second.reload();await second.evaluate(()=>appReady);
    assert.equal(await second.evaluate(()=>['tab-one','tab-two'].every(message=>getLogs().some(row=>row.message===message))),true);
    await second.evaluate(async()=>{await setLogs([])});await second.reload();await second.evaluate(()=>appReady);assert.equal(await second.evaluate(()=>getLogs().length),0,'Explicit clear updates archive and survives reload');
    await context.close();console.log(`PASS ${engine} ${width}: real quota reproduced; full diagnostics verified in IndexedDB; 120 large entries sync/reload intact; export, multi-tab updates, bounded display and explicit clear passed`);
  }
  const context=await browser.newContext(),page=await context.newPage();
  await page.addInitScript(()=>{
    localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_logs_v1',JSON.stringify([{id:1,message:'must remain'}]));
    const transaction=IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction=function(...args){if(this.name==='lexi-diagnostics'&&args[1]==='readwrite')throw new DOMException('Simulated disk full','QuotaExceededError');return transaction.apply(this,args)};
  });
  await page.route('https://**/*',network);await page.goto(`${base}/`);await page.evaluate(()=>appReady);
  assert.equal(await page.evaluate(()=>DiagnosticStore.available),false);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem(STORAGE_KEYS.logs))[0].message),'must remain');
  await context.close();console.log('PASS failed migration: legacy logs preserved; fallback is explicit, no false completion');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
