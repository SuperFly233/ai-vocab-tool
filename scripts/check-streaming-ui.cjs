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
  for(const width of [390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<900,isMobile:width<900});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof readLookupStream==='function');
   await page.evaluate(()=>{
    window.__result={meta:{query:'clock',language:'English'},headword:{title:'clock',coreMeaning:'注意到'},senses:[{shortestLabel:'留意',meaning:'注意到一个原本没有留意的细节',example:'I clocked the difference.',translation:'我注意到了区别。'}]};
    configInfo={model:'test-pro'};
   });
   const partial=await page.evaluate(()=>({
    meaning:partialLookupFromRaw('{"senses":[{"shortestLabel":"留意","meaning":"正在增加','clock').senses[0]?.meaning,
    incompleteUnicode:partialStringValue('{"title":"A\\u4f','title'),
    unicode:partialStringValue('{"title":"A\\u4f60','title'),
    escaped:partialStringValue('{"title":"A\\"B','title'),
   }));
   assert.deepEqual(partial,{meaning:'正在增加',incompleteUnicode:'A',unicode:'A你',escaped:'A"B'});
   assert.ok(await page.evaluate(()=>renderResultProvenance(__result,'current',null).includes('来源 <b>未记录</b>')),'Unknown provenance does not use the configured model');
   await page.evaluate(()=>{
    const runId=++lookupRunId;
    renderLookupLoading('clock',currentApiSettings(),runId);
    const body=new ReadableStream({start(controller){window.__controller=controller}});
    window.__streamJob=readLookupStream(new Response(body,{headers:{'Content-Type':'text/event-stream'}}),{query:'clock',runId});
    window.__send=(data,tail='\n\n')=>__controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}${tail}`));
    __send({delta:'{"meta":{"query":"clock"},"headword":{"title":"clock","coreMeaning":"注'});
   });
   await page.waitForFunction(()=>document.querySelector('#result-card .entry-core')?.textContent.includes('注'));
   assert.equal(await page.evaluate(()=>getHistory().length),0,'Incomplete previews are never persisted');
   await page.evaluate(()=>__send({delta:'意到"},"senses":[{"shortestLabel":"留意","meaning":"注意到一个原本没有留意的细节'}));
   await page.waitForFunction(()=>document.querySelector('#result-card .stream-item')?.textContent.includes('原本没有留意'));
   await page.evaluate(()=>{__send({result:__result,done:true},'');__controller.close()});
   assert.deepEqual(await page.evaluate(()=>__streamJob),await page.evaluate(()=>__result),'Final event without delimiter is accepted');
   await page.evaluate(()=>{
    const original=fetch;window.__fetch=original;
    window.fetch=async(url,options)=>String(url)==='/api/analyze'?new Response(JSON.stringify(__result),{headers:{'Content-Type':'application/json'}}):original(url,options);
    window.__lookupJob=performLookup({query:'clock'});
   });
   await page.evaluate(()=>__lookupJob);
   assert.equal(await page.locator('#result-card').evaluate(el=>el.classList.contains('result-typing')),false,'Buffered JSON must not pretend to stream');
   assert.ok((await page.locator('#result-card .entry-provenance').textContent()).includes('test-pro'));
   assert.ok((await page.locator('#result-card .entry-provenance').textContent()).includes('服务端配置'));
   await page.evaluate(()=>renderResult(currentResult));
   const provenance=await page.locator('#result-card .entry-provenance').textContent();
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`model-home-${width}-${theme}.png`)})}
   await page.evaluate(()=>openHistoryModal(currentHistoryId));
   assert.equal(await page.locator('#modal-card-page .entry-provenance').textContent(),provenance,'Home and detail show identical provenance');
   await page.evaluate(()=>{
    const item=getCurrentHistoryItem(),now=new Date().toISOString();
    const old=makeHistoryRoll({...__result,headword:{...__result.headword,title:'older clock'}},now,'old',{model:'test-flash',modelSource:'网页设置：测试'});
    setHistory(getHistory().map(row=>row.id===item.id?{...row,rolls:[...getHistoryRolls(row),old]}:row));
    window.__oldRoll=historyRollViewKey(old);
   });
   await page.evaluate(()=>setModalRoll(String(__oldRoll)));
   assert.ok((await page.locator('#modal-card-page .entry-provenance').textContent()).includes('test-flash'),'Metadata follows selected version, not current API settings');
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`model-detail-${width}-${theme}.png`)})}
   await page.keyboard.press('Escape');
   await page.evaluate(()=>{
    setPendingFollowup('current','Explain it');
    window.__samples=[];
    window.__answer='A gradually revealed answer with enough text to observe intermediate updates. '.repeat(3);
    window.fetch=async()=>new Response(JSON.stringify({answer:__answer}),{headers:{'Content-Type':'application/json'}});
    window.__followupJob=requestFollowup('Explain it',getCurrentHistoryItem(),{scope:'current',onDelta:text=>{__samples.push(text);updatePendingFollowup('current',text)}});
   });
   assert.equal(await page.evaluate(()=>__followupJob),await page.evaluate(()=>__answer));
   assert.equal(await page.evaluate(()=>__samples.length),1,'Buffered followup is not replayed token by token');
   assert.equal(await page.evaluate(()=>__samples.at(-1)),await page.evaluate(()=>__answer));
   await page.evaluate(()=>{
    clearPendingFollowup('current');setPendingFollowup('current','Stream it');
    window.fetch=async()=>new Response(new ReadableStream({start(controller){window.__followupController=controller}}),{headers:{'Content-Type':'text/event-stream'}});
    window.__streamFollowupJob=requestFollowup('Stream it',getCurrentHistoryItem(),{scope:'current',onDelta:text=>updatePendingFollowup('current',text)});
   });
   await page.waitForFunction(()=>Boolean(window.__followupController));
   await page.evaluate(()=>__followupController.enqueue(new TextEncoder().encode('data: {"delta":"First part"}\n\n')));
   await page.waitForFunction(()=>pendingFollowup.item.answer==='First part');
   await page.evaluate(()=>{__followupController.enqueue(new TextEncoder().encode('data: {"delta":" and final part"}\n\ndata: {"done":true}\n\n'));__followupController.close()});
   assert.equal(await page.evaluate(()=>__streamFollowupJob),'First part and final part');
   await page.evaluate(()=>{clearPendingFollowup('current');window.fetch=__fetch});
   await page.evaluate(()=>{
    window.fetch=async()=>new Response(`data: ${JSON.stringify({delta:JSON.stringify(__result)})}\n\ndata: ${JSON.stringify({result:__result,done:true})}\n\n`,{headers:{'Content-Type':'text/event-stream'}});
    window.__liveLookupJob=performLookup({query:'clock'});
   });
   await page.evaluate(()=>__liveLookupJob);
   assert.equal(await page.locator('#result-card').evaluate(el=>el.classList.contains('result-typing')),false,'SSE completion does not replay the result animation');
   await page.evaluate(()=>{window.fetch=__fetch});
   const cancelled=await page.evaluate(async()=>{
    const updates=[];const queue=createReceivedText(text=>updates.push(text));
    queue.push('a'.repeat(400));queue.cancel();const count=updates.length;
    await new Promise(resolve=>setTimeout(resolve,60));return updates.length===count;
   });
   assert.ok(cancelled,'Cancelling clears pending reveal timers');
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.deepEqual(await page.evaluate(async()=>{const values=[];const queue=createReceivedText(value=>values.push(value));await queue.finish('full text');queue.cancel();return values}),['full text']);
   await page.emulateMedia({reducedMotion:'no-preference'});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.deepEqual(errors,[]);
   console.log(`Streaming/provenance passed ${width}px ${theme}: incomplete fields, unicode, final frame, buffered lookup/followup, live followup, version model, reduced motion.`);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
