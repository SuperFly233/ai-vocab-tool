const assert=require('node:assert/strict');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const staticServer=require('./browser-test-server.cjs').createServer();
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const close=server=>new Promise(resolve=>server.close(resolve));
const result={meta:{query:'clock',language:'en'},headword:{title:'clock',coreMeaning:'注意到'},senses:[],collocations:[{phrase:'clock in',meaning:'打卡',example:'Please clock in.',translation:'请打卡。'}],register:{},confusions:[]};
let release,ended=false,buffered=false;
const upstream=http.createServer(async(req,res)=>{
 let input='';for await(const chunk of req)input+=chunk;
 const payload=JSON.parse(input);
 assert.equal(payload.stream,true);
 assert.equal(req.headers.accept,'text/event-stream');
 if(buffered){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(result)}}]}));return}
 res.writeHead(200,{'Content-Type':'text/event-stream'});
 const send=data=>res.write(`data: ${JSON.stringify({choices:[{delta:data}]})}\n\n`);
 send({reasoning_content:'private thinking must not appear in the answer'});
 const lookup=payload.max_tokens===9000;
 if(lookup)assert.equal(payload.response_format,undefined,'Streaming must not activate gateway JSON buffering');
 send({content:lookup?'\u007b"headword":{"title":"clock","coreMeaning":"注意到"},"collocations":[{"phrase":"clock in","meaning":"打卡","example":"Please clock in.","translation":"请打':'First real network chunk'});
 await new Promise(resolve=>{release=resolve});
 ended=true;
 // End without a frame delimiter to exercise the actual server parser.
 res.end(`data: ${JSON.stringify({choices:[{delta:{content:lookup?'卡。"}],"senses":[],"register":{},"confusions":[],"meta":{"query":"clock","language":"en"}}':' and final chunk'}}]})}`);
});
(async()=>{
 let browser,appServer;
 try{
  const {runVercelHandler}=await import('../functions/_utils/vercel-adapter.js');
  const analyze=(await import('../api/analyze.js')).default;
  const followup=(await import('../api/followup.js')).default;
  await listen(upstream);
  appServer=http.createServer(async(req,res)=>{
   if(!['/api/analyze','/api/followup'].includes(req.url)){staticServer.emit('request',req,res);return}
   try{
    let body='';for await(const chunk of req)body+=chunk;
    const response=await runVercelHandler(req.url.endsWith('analyze')?analyze:followup,{
     request:new Request(`http://127.0.0.1${req.url}`,{method:'POST',headers:req.headers,body}),env:{},waitUntil:work=>work.catch(console.error),
    });
    res.writeHead(response.status,Object.fromEntries(response.headers));
    for await(const chunk of response.body)res.write(chunk);
    res.end();
   }catch(error){res.writeHead(500).end(error.message)}
  });
  await listen(appServer);
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${appServer.address().port}`);
   await page.waitForFunction(()=>typeof performLookup==='function');
   await page.evaluate(url=>{currentApiSettings=()=>({apiUrl:url,apiKey:'local-test-only',model:'test-flash'});},`http://127.0.0.1:${upstream.address().port}`);
   ended=false;release=null;
   await page.evaluate(()=>{window.__job=performLookup({query:'clock'})});
   await page.waitForFunction(()=>document.querySelector('#result-card .entry-core')?.textContent.includes('注意到'));
   await page.waitForFunction(()=>[...document.querySelectorAll('#result-card .stream-block')].find(block=>block.querySelector('.block-title')?.textContent.includes('固定搭配'))?.textContent.includes('请打'));
   assert.equal(ended,false,'Visible lookup text must arrive before the upstream is allowed to complete');
   assert.equal(typeof release,'function');
   assert.equal(await page.evaluate(()=>getHistory().length),0);
   console.log(`${width}px: lookup visible while provider completion remains gated`);
   release();await page.evaluate(()=>__job);
   assert.equal(await page.locator('#result-card .entry-title').textContent(),'clock');
   assert.equal(await page.evaluate(()=>getHistory().length),1);
   ended=false;release=null;
   await page.evaluate(()=>{setPendingFollowup('current','Explain');window.__followup=requestFollowup('Explain',getCurrentHistoryItem(),{scope:'current',onDelta:text=>updatePendingFollowup('current',text)});});
   await page.waitForFunction(()=>pendingFollowup.item.answer==='First real network chunk');
   assert.equal(ended,false,'Visible followup must arrive before upstream completion');
   release();assert.equal(await page.evaluate(()=>__followup),'First real network chunk and final chunk');
   console.log(`${width}px: followup visible while provider completion remains gated`);
   buffered=true;
   const fallback=await page.evaluate(async()=>{
    const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...currentApiSettings(),query:'clock',stream:true})});
    return {type:response.headers.get('content-type'),mode:response.headers.get('x-lexi-stream'),result:await response.json()};
   });
   assert.match(fallback.type,/application\/json/);assert.equal(fallback.mode,'buffered');assert.deepEqual(fallback.result,result);
   buffered=false;
   await page.close();
  }
 }finally{release?.();await browser?.close();if(appServer)await close(appServer);await close(upstream)}
})().catch(error=>{console.error(error);process.exitCode=1});
