const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,args:['--no-proxy-server']});
  try{
    const context=await browser.newContext(),page=await context.newPage();
    await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
    await page.goto(process.env.QA_ORIGIN||'https://ai-vocab-tool.pages.dev',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof modelRequest==='function');
    const errors=[];page.on('console',message=>{if(message.type()==='error')errors.push(message.text().slice(0,500))});
    const result=await page.evaluate(async()=>{
      try{
        const response=await modelRequest('test-profile',{apiUrl:'https://ai.hybgzs.com/v1/chat/completions',apiKey:'lexi-cors-diagnostic-not-a-key',model:'diagnostic-no-model'},{signal:AbortSignal.timeout(15000)});
        const text=await response.text();
        return {status:response.status,requestPath:response.headers.get('X-Lexi-Request-Path'),readable:true,contentType:response.headers.get('content-type'),html:/<html|<!doctype/i.test(text),bodyLength:text.length};
      }catch(error){return {readable:false,error:error.message}}
    });
    console.log(JSON.stringify({route:'isolated Edge with --no-proxy-server',validKeyUsed:false,result,errors},null,2));
    await context.close();
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
