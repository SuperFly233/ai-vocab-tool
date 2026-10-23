const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
  let browser;
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
    for(const width of [390,1440]){
      const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
      await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
      await page.route('https://**/*',route=>route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}/history`);
      await page.waitForFunction(()=>typeof replaceLocalWithItems==='function');
      const result=await page.evaluate(()=>{
        const rows=Array.from({length:300},(_,id)=>{
          const result={headword:{title:`Synthetic ${id}`,coreMeaning:'meaning'},summary:'x'.repeat(10000)};
          return {id:id+1,query:`Synthetic ${id}`,createdAt:'2026-10-23T00:00:00Z',result,rolls:[{id:`roll-${id}`,createdAt:'2026-10-23T00:00:00Z',result}],note:'preserved',scenes:[]};
        });
        localStorage.setItem(STORAGE_KEYS.history,JSON.stringify(rows.slice(0,150)));
        let oldQuota=false;
        try{localStorage.setItem(STORAGE_KEYS.history,JSON.stringify(rows))}catch(error){oldQuota=StorageState.isQuotaError(error)}
        replaceLocalWithItems({[CLOUD_KEYS.history]:JSON.stringify(rows),[CLOUD_KEYS.historyTombstones]:'[]'});
        const restored=getHistory();
        const raw=localStorage.getItem(STORAGE_KEYS.history);
        const error=new DOMException('The quota has been exceeded','QuotaExceededError');
        error.storageCommit={rollbackOk:true};
        return {oldQuota,count:restored.length,allIntact:restored.every(row=>row.result.summary.length===10000&&row.rolls[0].result.summary.length===10000&&row.note==='preserved'),rawSize:raw.length,fullSize:JSON.stringify(rows).length,message:cloudErrorMessage(error)};
      });
      assert.ok(result.oldQuota,'Original duplicate payload reproduces real browser quota error');
      assert.equal(result.count,300);assert.ok(result.allIntact);
      assert.ok(result.rawSize<result.fullSize*.55);
      assert.ok(result.message.includes('浏览器本地空间已满')&&!result.message.includes('The quota'));
      await page.reload();await page.waitForFunction(()=>typeof getHistory==='function');
      assert.equal(await page.evaluate(()=>getHistory().length),300);
      assert.equal(await page.evaluate(()=>getHistory().every(row=>row.result.summary.length===10000)),true);
      fs.mkdirSync(path.join(__dirname,'../tmp/quota-qa'),{recursive:true});
      await page.screenshot({path:path.join(__dirname,`../tmp/quota-qa/history-${width}.png`)});
      console.log(`PASS ${width}: real quota reproduced, merged 300 entries losslessly, ${Math.round(100*(1-result.rawSize/result.fullSize))}% smaller, reload intact`);
      await context.close();
    }
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
