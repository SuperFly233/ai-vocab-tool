const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
  for(const width of [390,1440]){
    const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
    await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
    let direct=0,cloud=0,blocked=false,networkFail=false;const calls=[];
    const entry={meta:{query:'better late than never'},headword:{title:'better late than never',coreMeaning:'迟做总比不做好'},senses:[],collocations:[],register:{},confusions:[]};
    await page.route('https://**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.hostname!=='ai.hybgzs.com')return route.abort();
      direct++;calls.push({url:request.url(),body:request.postDataJSON()});
      assert.equal(request.headers().authorization,'Bearer synthetic-test-key');
      assert.equal(request.headers().cookie,undefined);
      if(networkFail)return route.abort('failed');
      if(blocked)return route.fulfill({status:403,contentType:'text/html',body:'<html><title>访问已被拦截</title><style>background:data:image/jpeg;base64,AAA</style></html>'});
      const body=request.postDataJSON();
      if(url.pathname==='/v1/models')return route.fulfill({json:{data:[{id:'model-a'}]}});
      if(body.stream){
        const content=body.max_tokens===9000?JSON.stringify(entry):'A clear answer.';
        return route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({choices:[{delta:{reasoning_content:'must-not-leak'}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:content.slice(0,8)}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:content.slice(8)}}]})});
      }
      return route.fulfill({json:{model:'model-a',choices:[{message:{content:body.max_tokens===4?'OK':JSON.stringify(entry)}}]}});
    });
    await page.route('**/api/config',route=>route.fulfill({json:{defaultAnalyzePrompt:'Synthetic shared prompt'}}));
    await page.route('**/api/analyze',route=>{cloud++;return route.fulfill({json:{cloud:true}})});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>typeof modelRequest==='function');
    const result=await page.evaluate(async()=>{
      const options={apiUrl:'https://ai.hybgzs.com/v1/chat/completions',apiKey:'synthetic-test-key',model:'model-a',query:'better late than never'};
      const stream=await (await modelRequest('analyze',{...options,stream:true})).text();
      const buffered=await (await modelRequest('analyze',{...options,stream:false,systemPrompt:'User override'})).json();
      const followup=await (await modelRequest('followup',{...options,question:'Meaning?',result:buffered,stream:true})).text();
      const models=await (await modelRequest('models',options)).json();
      const test=await (await modelRequest('test-profile',options)).json();
      const other=await (await modelRequest('analyze',{...options,apiUrl:'https://other.example/v1/chat/completions'})).json();
      return {stream,buffered,followup,models,test,other};
    });
    assert.ok(result.stream.includes('"result"')&&result.stream.includes('"delta"')&&!result.stream.includes('must-not-leak'));
    assert.equal(result.buffered.headword.coreMeaning,entry.headword.coreMeaning);
    assert.ok(result.followup.includes('"done":true'));assert.deepEqual(result.models.models,['model-a']);assert.equal(result.test.ok,true);assert.equal(result.other.cloud,true);
    assert.equal(cloud,1);assert.equal(direct,5);
    assert.equal(calls[0].body.response_format,undefined);assert.equal(calls[0].body.messages[0].content,'Synthetic shared prompt');
    assert.equal(calls[1].body.messages[0].content,'User override');
    blocked=true;
    const failure=await page.evaluate(async()=>{const response=await modelRequest('analyze',{apiUrl:'https://ai.hybgzs.com/v1/chat/completions',apiKey:'synthetic-test-key',model:'model-a',systemPrompt:'test'});return {status:response.status,data:await response.json()}});
    assert.equal(failure.status,403);assert.equal(failure.data.requestPath,'browser');assert.ok(!failure.data.error.includes('<html'));
    networkFail=true;
    const network=await page.evaluate(async()=>{try{await modelRequest('test-profile',{apiUrl:'https://ai.hybgzs.com/v1/chat/completions',apiKey:'synthetic-test-key',model:'model-a'})}catch(error){return error.message}});
    assert.ok(network.includes('未自动改走云端'));assert.equal(cloud,1);
    blocked=false;networkFail=false;
    const saved=await page.evaluate(async()=>{
      setSettings({...getSettings(),apiProfiles:[{id:'default',name:'直连验收',apiUrl:'https://ai.hybgzs.com/v1/chat/completions',apiKey:'synthetic-test-key',model:'model-a'}],activeApiProfileId:'default'});
      els.query.value='better late than never';
      await performLookup({query:'better late than never'});
      return {title:getHistory()[0]?.result?.headword?.title,route:RequestUI.snapshot()?.route};
    });
    assert.equal(saved.title,entry.headword.title);assert.equal(saved.route,'browser');assert.equal(cloud,1);
    fs.mkdirSync('tmp/provider-qa',{recursive:true});await page.screenshot({path:`tmp/provider-qa/direct-${width}.png`});
    await context.close();console.log(`PASS ${width}: direct lookup/followup/models/test, shared prompts, real SSE protocol, buffered JSON, no reasoning/cookie/cloud forwarding, safe 403/CORS failure; other providers unchanged`);
  }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
