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
  for(const width of [320,390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<900,isMobile:width<900});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof openHistoryModal==='function');
   await page.evaluate(()=>{
    const result={meta:{query:"you're really something",language:'English'},headword:{title:"you're really something",coreMeaning:'你真了不起；你可真行',basicPartOfSpeech:'短语',summary:'既可真诚赞赏，也可根据语境表达讽刺。'},senses:[
     {partOfSpeech:'短语',shortestLabel:'真了不起（赞赏）',meaning:'对他人的能力或表现表达欣赏。',example:"You solved it already? You're really something!",translation:'你已经解决了？你真了不起！'},
     {partOfSpeech:'短语',shortestLabel:'真行（反语）',meaning:'在讽刺、不满或无奈的语气中，表示对方的言行令人无语、过分或不可理喻。',example:"You broke my phone and then blamed me? You're really something.",translation:'你摔坏了我手机，还反过来怪我？你可真行。'}],collocations:[{phrase:'be really something',note:'口语常用',meaning:'某物或某事非常出色、令人赞叹。',example:'That sunset was really something.',translation:'那场日落真是美极了。'}],register:{style:'口语',tone:'赞赏或反讽',environment:'结合上下文判断真实语气。'}};
    setHistory([{id:1,query:result.meta.query,result,createdAt:'2026-10-10T00:00:00Z'}]);
    currentHistoryId=1;renderResult(result);openHistoryModal(1);
   });
   await page.waitForTimeout(350);
   const shot=async name=>{if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`${process.env.QA_LABEL||'flat'}-${name}-${width}-${theme}.png`)})}};
   const measure=await page.locator('#modal-card-page .fragment-item').nth(1).evaluate(el=>{
    const text=el.querySelector('.line>span'),button=el.querySelector('.fragment-pin-btn'),title=el.querySelector('.item-title');
    const group=el.closest('.sense-group');
    return {itemWidth:el.clientWidth,textWidth:text.getBoundingClientRect().width,groupBorder:getComputedStyle(group).borderLeftWidth,itemBorder:getComputedStyle(el).borderLeftWidth,buttonWidth:button.getBoundingClientRect().width,titleRight:title.getBoundingClientRect().right,buttonLeft:button.getBoundingClientRect().left};
   });
   console.log(JSON.stringify({width,theme,...measure}));
   await shot('detail-top');
   const row=page.locator('#modal-card-page .fragment-item').nth(1);
   await row.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(200);
   await shot('detail-reading');
   if(process.env.QA_LABEL!=='before'){
    assert.equal(measure.groupBorder,'0px');assert.equal(measure.itemBorder,'0px');
    assert.ok(measure.textWidth>measure.itemWidth*.69,'Reading text uses most available width');
    assert.ok(measure.buttonWidth>=40,'Bookmark remains touch-friendly');
    assert.ok(await row.evaluate(el=>{
     const title=el.querySelector('.item-title'),button=el.querySelector('.fragment-pin-btn');
     const range=document.createRange();range.selectNodeContents(title);
     return [...range.getClientRects()].every(rect=>rect.right<=button.getBoundingClientRect().left);
    }),'Title text does not overlap bookmark');
    const pin=row.locator('.fragment-pin-btn');
    if(width<900)await pin.tap();else await pin.click();
    await page.waitForFunction(()=>getHistory()[0].fragmentPins.length===1);
    await page.keyboard.press('Escape');
    const home=page.locator('#result-card .fragment-item').first();
    assert.equal(await home.evaluate(el=>getComputedStyle(el).borderLeftWidth),'0px');
    await page.evaluate(()=>window.scrollTo(0,600));await page.waitForTimeout(250);
    await shot('home-scrolled');
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   assert.ok(await page.locator('.history-modal-card').evaluate(el=>el.scrollWidth<=el.clientWidth));
   assert.deepEqual(errors,[]);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
