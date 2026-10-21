const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});
 for(const width of [390,1440])for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',r=>r.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/scenes`);await page.waitForFunction(()=>typeof SceneStudy!=='undefined');
  await page.evaluate(async()=>{await cloudInitPromise;const now=new Date().toISOString(),canvas=document.createElement('canvas');canvas.width=600;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#267b80';ctx.fillRect(0,0,600,360);ctx.fillStyle='#fff';ctx.font='30px sans-serif';ctx.fillText('Nested media preview',24,100);const blob=await new Promise(r=>canvas.toBlob(r));blob.name='test.png';const ref=await SceneData.putFile(blob);setSettings({...getSettings(),sceneLibrary:[{id:'dismiss',groupId:'dismiss',quote:'Unchanged scene.',media:[ref],createdAt:now,updatedAt:now}]});SceneWorkspace.render();SceneWorkspace.select('dismiss');await SceneUI.open('library','','dismiss')});
  await page.waitForFunction(()=>document.querySelector('#scene-editor img')?.naturalWidth===600);
  const open=async()=>{await page.locator('#scene-editor img').click();await page.waitForSelector('#scene-viewer[open]');await page.waitForFunction(()=>document.querySelector('#scene-viewer img')?.naturalWidth===600)};
  const closed=()=>page.waitForFunction(()=>!document.querySelector('#scene-viewer[open]'));
  await open();if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`nested-viewer-${width}-${theme}.png`)})}
  await page.keyboard.press('Escape');await closed();assert.equal(await page.locator('#scene-editor').count(),1,'Escape preserves underlying editor');
  await page.evaluate(()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',repeat:true,bubbles:true})));assert.equal(await page.locator('#scene-editor').count(),1,'Held Escape must not cascade to the parent');
  await open();await page.mouse.click(2,450);await closed();assert.equal(await page.locator('#scene-editor').count(),1,'Backdrop preserves underlying editor');
  await open();await page.mouse.move(width/2,450);await page.mouse.down();await page.mouse.move(2,450,{steps:8});await page.mouse.up();assert.equal(await page.locator('#scene-viewer[open]').count(),1,'Inside-to-outside release must not dismiss');
  await page.keyboard.press('Tab');await page.keyboard.press('Tab');assert.ok(await page.locator('#scene-viewer').evaluate(node=>node.contains(document.activeElement)),'Tab stays inside top native dialog');
  await page.locator('#scene-viewer [data-scene-action="viewer-close"]').click();await closed();
  await page.locator('#scene-editor [name="quote"]').fill('Preserve this unsaved draft.');await open();await page.keyboard.press('Escape');await closed();assert.equal(await page.locator('#scene-editor [name="quote"]').inputValue(),'Preserve this unsaved draft.');assert.equal(await page.locator('#confirm-layer.open').count(),0);
  await page.keyboard.press('Escape');await page.locator('#confirm-ok').click();await page.locator('.toast-action').last().click();assert.equal(await page.locator('#scene-editor [name="quote"]').inputValue(),'Preserve this unsaved draft.');
  await page.evaluate(()=>AnkiBridge.manage());await page.keyboard.press('Escape');assert.equal(await page.locator('.anki-dialog[open]').count(),0);assert.equal(await page.locator('#scene-editor').count(),1);
  await page.evaluate(()=>AnkiBridge.manage());await page.mouse.click(2,450);await page.waitForFunction(()=>!document.querySelector('.anki-dialog[open]'));assert.equal(await page.locator('#scene-editor').count(),1);
  await page.locator('[data-scene-export]').evaluate(node=>node.click());await page.mouse.click(2,450);await page.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal(await page.locator('#scene-editor').count(),1);
  await page.evaluate(async()=>{const item=saveLookupResult({query:'preview',result:{meta:{query:'preview'},headword:{title:'preview',coreMeaning:'预览'},senses:[],collocations:[],register:{},confusions:[]}}).item;await SceneStudy.associate('dismiss',[item.id]);SceneStudy.openHighlights(item.id,'dismiss')});
  await page.locator('#scene-highlight-editor [name="quote"]').fill('Unchanged');await page.mouse.click(2,450);await page.locator('.draft-confirm [data-keep]').click();await page.waitForSelector('.draft-confirm',{state:'detached'});assert.equal(await page.locator('#scene-highlight-editor [name="quote"]').inputValue(),'Unchanged');
  await page.keyboard.press('Escape');await page.locator('.draft-confirm [data-discard]').click();await page.waitForFunction(()=>!document.querySelector('dialog[open]'));assert.equal(await page.locator('#scene-editor [name="quote"]').inputValue(),'Preserve this unsaved draft.');
  assert.deepEqual(errors,[]);console.log(`${width}px ${theme}: nested viewer Escape/backdrop/X, no drag-release dismissal, dirty parent preserved and editor undo passed`);await context.close();
 }
}finally{await browser?.close();await new Promise(r=>server.close(r))}})().catch(e=>{console.error(e);process.exitCode=1});
