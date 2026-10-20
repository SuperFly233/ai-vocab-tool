const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
  await page.route('https://**/*',route=>route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>typeof SceneUI!=='undefined');
  await page.evaluate(()=>{
   const now=new Date().toISOString();
   setSettings({...getSettings(),favoriteFolders:[{id:'folder_qa',name:'QA',createdAt:now,updatedAt:now}],apiProfiles:[{id:'qa-api',name:'QA',apiUrl:'https://example.com',apiKey:'test-only',model:'QA'}],activeApiProfileId:'qa-api'});
   const result={headword:{title:'original',coreMeaning:'Meaning'},senses:[]};
   setHistory([{id:1,query:'original',result,folderIds:['folder_qa'],followups:[{id:3,question:'Q',answer:'A',createdAt:now}],createdAt:now}]);
  });
  const undo=async()=>{await page.locator('.toast-action').last().click();await page.evaluate(()=>document.querySelectorAll('.toast-close').forEach(button=>button.click()))};
  await page.evaluate(()=>{window.__delete=deleteHistory(1)});await page.locator('#confirm-cancel').click();await page.evaluate(()=>__delete);assert.equal(await page.evaluate(()=>getHistory().length),1);
  await page.evaluate(()=>{window.__delete=deleteHistory(1)});await page.locator('#confirm-ok').click();await page.evaluate(()=>__delete);assert.equal(await page.evaluate(()=>getHistory().length),0);
  await page.evaluate(()=>addHistory({id:2,query:'other',result:{headword:{title:'other'}},createdAt:new Date().toISOString()}));
  await undo();assert.equal(await page.evaluate(()=>getHistory().length),2,'Undo retains records created after deletion');
  await page.evaluate(()=>{openHistoryModal(1);window.__delete=deleteFollowup('modal',3)});await page.locator('#confirm-ok').click();await page.evaluate(()=>__delete);
  assert.equal(await page.evaluate(()=>getHistory().find(row=>row.id===1).followups.length),0);await undo();assert.equal(await page.evaluate(()=>getHistory().find(row=>row.id===1).followups.length),1);
  await page.evaluate(()=>{closeHistoryModal();showView('settings');window.__delete=deleteApiProfile('qa-api')});await page.locator('#confirm-ok').click();await page.evaluate(()=>__delete);
  assert.ok(await page.evaluate(()=>!getSettings().apiProfiles.some(row=>row.id==='qa-api')));await undo();assert.ok(await page.evaluate(()=>getSettings().apiProfiles.some(row=>row.id==='qa-api')));
  await page.evaluate(()=>{window.__delete=deleteFavoriteFolder('folder_qa')});await page.locator('#folder-delete-keep').click();await page.evaluate(()=>__delete);
  assert.ok(await page.evaluate(()=>!getSettings().favoriteFolders.some(row=>row.id==='folder_qa')));await undo();
  assert.ok(await page.evaluate(()=>getSettings().favoriteFolders.some(row=>row.id==='folder_qa')));
  assert.ok(await page.evaluate(()=>getHistory().find(row=>row.id===1).folderIds.includes('folder_qa')));
  await page.waitForFunction(()=>document.querySelector('.network-indicator').dataset.state==='good');
  const dot=await page.locator('.network-light').evaluate(node=>{const style=getComputedStyle(node);return {width:style.width,color:style.backgroundColor}});
  assert.equal(dot.width,'12px');assert.equal(dot.color,'rgb(35, 182, 108)');
  await page.locator('.network-indicator').click();assert.ok(await page.locator('.network-status-panel').isVisible());
  console.log('Deletion safety passed: cancel, history undo preserving concurrent additions, followup, API profile, folder membership and honest visible network indicator.');
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
