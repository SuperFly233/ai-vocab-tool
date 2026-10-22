const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/dialog-qa/anki-preview-v0351',{recursive:true});
 for(const width of [320,390,768,1024,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',route=>route.abort());
  await page.route('**/api/anki-jobs',async route=>{const input=route.request().postDataJSON();const data=await page.evaluate(input=>AnkiBridge.request(input.action,input.args),input);await route.fulfill({json:{data}})});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
   await cloudInitPromise;cloudUser={id:'preview-fixture'};cloudAccessToken=async()=>'fixture-only';
   const audio=new Blob([new Uint8Array([82,73,70,70,0,0,0,0,87,65,86,69])],{type:'audio/wav'}),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await audio.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
   await SceneMedia.verify({id:hash,size:audio.size,mime:'audio/wav'},audio);
   let rejected=false;try{await SceneMedia.verify({id:'0'.repeat(64),size:audio.size,mime:'audio/wav'},audio)}catch{rejected=true}if(!rejected)throw Error('Audio hash mismatch was accepted');
   const card={key:'one',title:'clock',origin:'clcok',quote:'I clocked the detail.',translation:'我注意到细节。',meaning:'注意到',note:'',sourceTitle:'Synthetic source',exampleHighlights:['clocked'],translationHighlights:['注意到'],media:[]};
   window.previewJob={id:'fixture',payload:{cards:[card,{...card,key:'two'},{...card,key:'three'}]}};
   window.fixtureSnapshot={deck:'Lexi 验收',decks:['Lexi 验收'],profile:'测试配置',rows:[{key:'one',operation:'update',previous:{},changes:[{field:'Origin',before:'clockk',after:'clcok',beforeTruncated:false,afterTruncated:false},{field:'Dictionary',before:'旧释义 '.repeat(120),after:'新释义 '.repeat(120),beforeTruncated:true,afterTruncated:true}]},{key:'two',operation:'create',previous:{}},{key:'three',operation:'skip',previous:{}}]};
   AnkiBridge.request=async action=>{if(action==='health')return {};if(action==='review_get')return {valid:true,approved:false,revision:'fixture',snapshot:fixtureSnapshot};if(action==='review_approve'){window.approved=true;return {approved:true}};throw Error(action)};
   await AnkiBridge.reviewJob(previewJob);
  });
  await page.locator('[data-review-approve]:enabled').waitFor();assert.match(await page.locator('.anki-review-counts').innerText(),/新增 1 · 更新 1 · 跳过 1/);
  assert.equal(await page.locator('.anki-change-row').count(),2);assert.match(await page.locator('.anki-review-diff').innerText(),/仅显示摘要/);
  assert.equal(await page.evaluate(()=>document.querySelector('dialog').scrollWidth>document.querySelector('dialog').clientWidth),false);
  assert.equal(await page.evaluate(()=>{const button=document.querySelector('[data-review-approve]').getBoundingClientRect();return button.bottom<=innerHeight&&button.top>=0}),true,'Confirmation remains in viewport with long differences');
  await page.screenshot({path:`tmp/dialog-qa/anki-preview-v0351/${width}-${theme}.png`});await page.locator('[data-review-approve]').click();assert.equal(await page.evaluate(()=>window.approved),true);await page.keyboard.press('Escape');
  await page.evaluate(async()=>{fixtureSnapshot.rows[0]={key:'one',operation:'update',previous:{Meaning:'<b>old</b><script>window.badPreview=true</script>'}};await AnkiBridge.reviewJob(previewJob)});
  assert.equal(await page.evaluate(()=>Boolean(window.badPreview)),false);assert.equal(await page.locator('.anki-review-diff script').count(),0);assert.match(await page.locator('.anki-review-diff').innerText(),/此电脑未提供逐字段差异/);await page.keyboard.press('Escape');
  await page.evaluate(async()=>{previewJob.payload.cards[2].media=[{id:'a'.repeat(64),size:10,mime:'image/png',name:'missing.png'}];SceneMedia.resolve=async()=>{throw Error('Synthetic missing media')};await AnkiBridge.reviewJob(previewJob)});
  assert.equal(await page.locator('[data-review-approve]').isDisabled(),true,'Missing media on another card blocks whole-batch approval');assert.match(await page.locator('.scene-dialog-status').innerText(),/素材校验未通过/);await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);await context.close();console.log(`Preview ${width} ${theme}: counts, changed-only excerpts, legacy HTML safety, whole-batch media guard and dismissal passed`);
 }
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}})().catch(error=>{console.error(error);process.exitCode=1});
