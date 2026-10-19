const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [320,390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<900,isMobile:width<900});
   const page=await context.newPage();
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme);speechSynthesis.speak=utterance=>{window.__spokenText=utterance.text};speechSynthesis.cancel=()=>{}},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof renderResult==='function');
   await page.evaluate(()=>{
    const result={meta:{query:'rhythm',language:'English'},headword:{title:'rhythm'},senses:[{shortestLabel:'节奏',meaning:'单行释义',example:'One line.',translation:'单行译文'},{shortestLabel:'真了不起（赞赏）',meaning:'对他人的能力或表现表达欣赏。',example:"You solved it already? You're really something!",translation:'你已经解决了？你真了不起！'}]};
    setHistory([{id:1,query:'rhythm',result,createdAt:'2026-10-10T00:00:00Z'}]);currentHistoryId=1;renderResult(result);
   });
   for(const root of ['#result-card','#modal-card-page']){
    if(root.includes('modal'))await page.evaluate(()=>openHistoryModal(1));
    const row=page.locator(`${root} .fragment-item`).first();
    await row.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(250);
    const measured=await row.evaluate(el=>{
     const lines=[...el.querySelectorAll('.line')].map(line=>line.getBoundingClientRect());
     const tops=[...el.querySelectorAll('.line>b')].map(label=>label.getBoundingClientRect().top);
     const button=el.querySelector('.spoken-example .speech-btn').getBoundingClientRect();
     return {first:tops[1]-tops[0],second:tops[2]-tops[1],buttonHeight:button.height,noOverlap:button.top>=lines[0].bottom&&button.bottom<=lines[2].top};
    });
    console.log(JSON.stringify({width,theme,root,...measured}));
    assert.ok(Math.abs(measured.first-measured.second)<=.5,'Single-line text rows must have equal vertical rhythm');
    assert.equal(measured.buttonHeight,30,'Speech hit area is preserved');
    assert.ok(measured.noOverlap,'Speech button does not cover adjacent rows');
    const highlighted=page.locator(`${root} .fragment-item`).nth(1);
    await highlighted.evaluate(el=>{
     const example=el.querySelector('.spoken-example>span');
     example.innerHTML="You solved it already? <mark class=\"hit-mark\">You're really something!</mark>";
     [...el.querySelectorAll('.line')].at(-1).querySelector(':scope>span').innerHTML='你已经解决了？<mark class="hit-mark">你真了不起！</mark>';
    });
    const gaps=await highlighted.evaluate(el=>{
     const rows=[...el.querySelectorAll('.line')].map(line=>line.getBoundingClientRect());
     return [rows[1].top-rows[0].bottom,rows[2].top-rows[1].bottom];
    });
    assert.ok(Math.abs(gaps[0]-gaps[1])<=.5,`Highlighted text must keep equal row gaps: ${gaps}`);
    if(width===1440&&theme==='light'&&root==='#result-card'){
     await highlighted.scrollIntoViewIfNeeded();
     await highlighted.screenshot({path:require('node:path').join(require('node:os').tmpdir(),'lexi-highlighted-row-rhythm.png')});
    }
    const button=row.locator('.spoken-example .speech-btn');
    if(width<900)await button.tap();else await button.click();
    assert.equal(await page.evaluate(()=>__spokenText),'One line.');
    await page.evaluate(()=>stopSpeech());
   }
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
