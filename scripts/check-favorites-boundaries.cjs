const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  const page=await browser.newPage();
  await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1'));
  await page.route('https://**/*',route=>route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(()=>typeof openFolderSelectModal==='function');
  const failures=[];
  const check=async(name,run)=>{try{await run();console.log(`PASS ${name}`)}catch(error){failures.push(name);console.error(`FAIL ${name}: ${error.message}`)}};
  const seed=()=>page.evaluate(()=>{
   const now='2026-10-01T00:00:00Z';
   setSettings({...getSettings(),favoriteFolders:['a','b','c'].map(id=>({id:`folder_${id}`,name:id,createdAt:now,updatedAt:now}))});
   setHistory([{id:1,query:'clock',favorite:true,folderIds:['folder_a','folder_b'],createdAt:now,updatedAt:now,favoriteUpdatedAt:now,foldersUpdatedAt:now,result:{headword:{title:'clock'}}}]);
  });
  await check('Untouched remote memberships survive picker save',async()=>{
   await seed();
   await page.evaluate(()=>openFolderSelectModal({historyId:1}));
   await page.locator('#folder-select-list input[value="folder_a"]').uncheck();
   await page.evaluate(()=>setHistory(getHistory().map(item=>({...item,favorite:false,favoriteAt:'',folderIds:['folder_a','folder_b','folder_c'],favoriteUpdatedAt:'2026-10-02T00:00:00Z',updatedAt:'2026-10-02T00:00:00Z'}))));
   await page.evaluate(()=>saveFolderSelection());
   const item=await page.evaluate(()=>getHistory()[0]);
   assert.equal(item.favorite,false);
   assert.deepEqual(item.folderIds,['folder_b','folder_c']);
   assert.equal(Date.parse(item.favoriteUpdatedAt),Date.parse('2026-10-02T00:00:00Z'));
  });
  await check('Confirming unchanged picker does not mutate history',async()=>{
   await page.evaluate(()=>closeFolderSelectModal());await seed();
   const before=await page.evaluate(()=>JSON.stringify(getHistory()));
   await page.evaluate(()=>{openFolderSelectModal({historyId:1});saveFolderSelection()});
   assert.equal(await page.evaluate(()=>JSON.stringify(getHistory())),before);
  });
  await check('Record picker prunes remotely added and deleted selections',async()=>{
   await page.evaluate(()=>closeFolderSelectModal());await seed();
   await page.evaluate(()=>{openFolderView('folder_c');openFolderRecordPicker();toggleFolderRecord(1,true);setHistory(getHistory().map(item=>({...item,folderIds:[...item.folderIds,'folder_c']})));renderFolderRecordPicker()});
   assert.equal(await page.locator('#folder-record-count').textContent(),'已选 0 条');
   await page.evaluate(()=>{setHistory(getHistory().map(item=>({...item,folderIds:[]})));toggleFolderRecord(1,true);setHistory([]);renderFolderRecordPicker()});
   assert.equal(await page.locator('#folder-record-count').textContent(),'已选 0 条');
   await page.evaluate(()=>closeFolderRecordPicker());
  });
  await check('Repeated batch addition does not advance field clocks',async()=>{
   await seed();const before=await page.evaluate(()=>JSON.stringify(getHistory()));
   await page.evaluate(()=>addSelectedHistoryToFolders([1],['folder_b']));
   assert.equal(await page.evaluate(()=>JSON.stringify(getHistory())),before);
  });
  await check('Star-only edits preserve custom folder and tag clocks',async()=>{
   await seed();const before=await page.evaluate(()=>getHistory()[0]);
   await page.evaluate(()=>{openFolderSelectModal({historyId:1});document.querySelector('#folder-select-list input[value="liked"]').checked=false;saveFolderSelection()});
   const after=await page.evaluate(()=>getHistory()[0]);
   assert.equal(after.favorite,false);
   assert.equal(after.foldersUpdatedAt,before.foldersUpdatedAt);
   assert.equal(after.tagsUpdatedAt,before.tagsUpdatedAt);
   assert.deepEqual(after.folderIds,before.folderIds);
  });
  await check('Submit revalidates selection even without picker rerender',async()=>{
   await seed();
   await page.evaluate(()=>{openFolderView('folder_c');openFolderRecordPicker();toggleFolderRecord(1,true);setHistory([]);saveFolderRecordPicker()});
   assert.equal(await page.locator('#folder-record-count').textContent(),'已选 0 条');
   assert.ok(await page.locator('#folder-record-save').isDisabled());
   assert.deepEqual(await page.evaluate(()=>getHistory()),[]);
  });
  assert.equal(failures.length,0,failures.join('; '));
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
