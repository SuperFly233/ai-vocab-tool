const assert=require('node:assert/strict'),fs=require('node:fs'),{createHash}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/dialog-qa/learning-v037',{recursive:true});
 for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];const snapshots=new Map();let submitted=null,approved=false;
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',r=>r.abort());
  await page.route('**/api/anki-jobs',async r=>{const {action,args}=r.request().postDataJSON();let data={};
   if(action==='health')data={schema:1,learningContent:true,payloadVersions:[1,2,3,4]};
   if(action==='devices')data=[{id:'33333333-3333-4333-8333-333333333333',name:'测试电脑',capabilities:{payloadVersions:[1,2,3,4]}}];
   if(action==='dictionary_list')data=[];
   if(action==='content_save'){const canonical=JSON.stringify(args.payload),hash=createHash('sha256').update(canonical).digest('hex');data={id:crypto.randomUUID(),payload:args.payload,canonical,hash};snapshots.set(data.id,data)}
   if(action==='content_get')data=snapshots.get(args.snapshotId);
   if(action==='submit'){submitted={id:'44444444-4444-4444-8444-444444444444',status:'awaiting_confirmation',payload:args.payload};data=submitted}
   if(action==='review_get')data={valid:true,revision:'55555555-5555-4555-8555-555555555555',approved:false,snapshot:{deck:'Lexi 验收',profile:'测试',decks:['Lexi 验收'],rows:submitted.payload.cards.map(c=>({key:c.key,operation:'create',previous:{},changes:[]}))}};
   if(action==='review_approve'){approved=true;data={approved:true}}
   return r.fulfill({json:{enabled:true,data}});
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/history`);await page.waitForFunction(()=>typeof LearningCards!=='undefined');
  await page.evaluate(async()=>{await cloudInitPromise;syncAllToCloud=async()=>true;cloudUser={id:'fixture'};cloudAccessToken=async()=>'fixture';const result={meta:{query:'clcok',model:'fixture'},headword:{title:'clock',coreMeaning:'注意到',summary:'完整说明'},senses:[{shortestLabel:'注意到',partOfSpeech:'verb',meaning:'看出细节',example:'I clocked it. <script>bad()</script>',translation:'我注意到了',exampleHighlights:['clocked'],translationHighlights:['注意到']}],collocations:[{phrase:'clock in',meaning:'登记',example:'Clock in now.',translation:'请登记'}],register:{style:'spoken',tone:'neutral',environment:'daily'},confusions:[{term:'notice',difference:'区别 '.repeat(80),usage:'通用'}]};setHistory([{id:900,query:'clcok',result,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}]);await LearningCards.openEntry(900)});
  await page.waitForSelector('[data-content-part]');assert.equal(await page.locator('[data-content-part]:checked').count(),7);assert.ok((await page.locator('[data-learning-preview]').innerText()).includes('易混词辨析'));assert.equal(await page.locator('[data-learning-preview] script').count(),0);
  await page.locator('[data-content-preset="core"]').click();assert.equal(await page.locator('[data-content-part]:checked').count(),1);await page.keyboard.press('Escape');await page.locator('[data-discard]').click();await page.waitForFunction(()=>!document.querySelector('.learning-send-dialog'));await page.locator('.toast-action').last().click();await page.waitForSelector('[data-content-part]');assert.equal(await page.locator('[data-content-part]:checked').count(),1,'Draft undo restores selected sections');
  await page.locator('[data-content-preset="all"]').first().click();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.learning-send-dialog').scrollWidth<=document.querySelector('.learning-send-dialog').clientWidth));
  await page.screenshot({path:`tmp/dialog-qa/learning-v037/selection-${width}-${theme}.png`,animations:'disabled'});
  await page.locator('[data-submit-learning]').click();await page.getByText('等待电脑准备预览',{exact:true}).waitFor();assert.equal(submitted.payload.version,4);assert.equal(submitted.payload.cards.length,1);const card=submitted.payload.cards[0];assert.equal(card.sceneId,'');assert.equal(card.sourceKind,'entry');assert.equal(card.title,'clock');assert.equal(card.origin,'clcok');assert.equal(snapshots.get(card.contentRef.id).payload.selected.length,7);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.learning-send-dialog'));await page.evaluate(job=>AnkiBridge.reviewJob(job),submitted);await page.waitForFunction(()=>!document.querySelector('[data-review-approve]').disabled);assert.ok((await page.locator('.learning-review-faces').innerText()).includes('完整说明'));
  await page.screenshot({path:`tmp/dialog-qa/learning-v037/review-${width}-${theme}.png`,animations:'disabled'});await page.locator('[data-view-face="front"]').click();assert.equal(await page.getByText('完整说明',{exact:true}).isVisible(),false);await page.locator('[data-view-face="back"]').click();await page.locator('[data-review-approve]').click();assert.ok(approved);assert.deepEqual(errors,[]);await context.close();console.log(`Learning cards ${width} ${theme}: complete defaults, draft undo, direct-entry v4, safe full preview, flip and approval passed`);
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
