const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=process.env.QA_ORIGIN||`http://127.0.0.1:${server.address().port}`;
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();page.setDefaultTimeout(10000);
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
  await page.route('https://**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());await page.goto(base);await page.waitForSelector('#home-compact-bar',{state:'attached'});
  await page.evaluate(async()=>{await appReady;await cloudInitPromise;renderResult({headword:{title:'once-in-a-lifetime',coreMeaning:'千载难逢'},senses:Array.from({length:30},()=>({meaning:'A rare opportunity.',example:'A once-in-a-lifetime chance.',translation:'千载难逢的机会。'})),collocations:[],confusions:[]})});
  for(const layout of ['top','split'])for(const [lines,queued] of [[1,0],[1,20],[3,3],[20,20]]){
   await page.evaluate(({layout,lines,queued})=>{HomeSticky.close();scrollTo(0,0);setLayout(layout);els.query.value=Array.from({length:lines},()=> 'once-in-a-lifetime').join('\n');lookupQueue=Array.from({length:queued},(_,i)=>({id:9000+i,query:`Queued term ${i}`,folderIds:[]}));lookupQueueExpanded=queued>0;renderLookupQueue();scrollTo(0,500)},{layout,lines,queued});await page.waitForFunction(()=>document.body.classList.contains('home-scrolled'));await page.locator('[data-home-options]').click();await page.waitForTimeout(80);
   const measure=await page.evaluate(()=>{const pane=document.querySelector('.editor-pane'),input=els.query,shell=input.closest('.query-shell');return {panel:pane.getBoundingClientRect().toJSON(),input:input.getBoundingClientRect().toJSON(),shell:shell.getBoundingClientRect().toJSON(),radius:parseFloat(getComputedStyle(shell).borderRadius),bar:document.querySelector('#home-compact-bar').getBoundingClientRect().height}});
   if(process.env.QA_SCREENSHOTS&&(lines===1&&!queued||lines===20)){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`${layout}-${lines}-${queued}-${width}-${theme}.png`),animations:'disabled'})}
   if(process.env.QA_OBSERVE)console.log(JSON.stringify({width,theme,layout,lines,queued,...measure}));else{
    assert.ok(measure.input.height<=(lines===1?48:136),`Input remains compact: ${JSON.stringify(measure)}`);assert.ok(measure.radius<=8,'Expanded editor is not a giant pill');assert.ok(measure.panel.width<=Math.min(880,width-16)+1,'Expanded panel has a reading-width cap');assert.ok(measure.panel.height<=420&&measure.panel.bottom<=900,'Expanded panel bounded');if(lines===1&&!queued)assert.ok(measure.panel.height<=(width<=900?210:160),'Single input does not reserve batch space');assert.equal(Math.round(measure.bar),64);
    assert.equal(await page.locator('.editor-pane:popover-open .query-actions').isVisible(),false,'Only the sticky bar owns scene/search commands');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   }
   if(!process.env.QA_OBSERVE&&lines===1&&!queued){await page.locator('#query-input').fill(Array(20).fill('Another phrase').join('\n'));assert.equal(Math.round((await page.locator('#query-input').boundingBox()).height),136);await page.locator('#query-input').fill('once-in-a-lifetime');assert.ok((await page.locator('#query-input').boundingBox()).height<=48,'Input shrinks after removing batch text')}
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>els.query.value.split('\n').length),lines);assert.equal(await page.evaluate(()=>lookupQueue.length),queued);
  }
  await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>!document.body.classList.contains('home-scrolled'));assert.equal(await page.locator('#query-input').evaluate(node=>node.style.height),'','Leaving compact mode restores normal sizing');await context.close();console.log(`Expanded query ${width} ${theme}: top/split,1/3/20 inputs, queue bounds and preserved state passed`);
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
