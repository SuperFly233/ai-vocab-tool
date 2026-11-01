const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright'),wait=require('./wait-browser-state.cjs'),server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH});fs.mkdirSync('tmp/source-directory0450',{recursive:true});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark']){
  const context=await browser.newContext({viewport:{width,height:950},isMobile:width<600,hasTouch:width<600}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme);localStorage.setItem('lexi-learning-help-v1:offline','{"version":1,"welcome":"never","tours":{}}')},theme);
  await page.route('https://**/*',r=>r.abort());await page.goto(process.env.QA_BASE_URL||'http://127.0.0.1:'+server.address().port+'/scenes');
  await page.evaluate(async()=>{await appReady;await cloudInitPromise;await SourceDirectory.load();window.modelCalls=0;modelRequest=async()=>{modelCalls++;throw Error('No AI during directory scan')};const now=new Date().toISOString();setSettings({...getSettings(),sceneAI:{auto:false},sceneLibrary:Array.from({length:20},(_,i)=>({id:'dir-'+i,groupId:'dir-'+i,title:'合成场景 '+(i+1),quote:'We keep our promise. '.repeat(i===0?20:1),sourceTitle:['原神','Genshin Impact','原神 (Genshin Impact)'][i%3],chapter:i%2?'山间对话':'',note:'Preserve '+i,createdAt:now,updatedAt:now,media:[]}))});SceneWorkspace.render();await SourceDirectory.open()});
  const dialog=page.locator('.source-directory');await dialog.waitFor();assert.equal(await page.locator('[data-dir-proposal]').count(),1);assert.ok((await page.locator('[data-dir-list]').textContent()).includes('20 个场景'));assert.equal(await page.evaluate(()=>modelCalls),0);
  await page.screenshot({path:`tmp/source-directory0450/confirm-${width}-${theme}.png`});await page.locator('[data-dir-save]').click();
  await wait(page,()=>SourceDirectory.sources.length===1&&SceneUI.sceneGroups().every(g=>g.scene.sourceRef));
  assert.equal(await page.evaluate(()=>new Set(SceneUI.sceneGroups().map(g=>g.scene.sourceRef.id)).size),1);assert.equal(await page.evaluate(()=>SceneUI.sceneGroups().find(g=>g.scene.groupId==='dir-1').scene.sourceOriginal),'Genshin Impact');
  assert.equal(await page.evaluate(()=>SceneUI.sceneGroups().find(g=>g.scene.groupId==='dir-1').scene.sourcePath.nodes[0].name),'山间对话');
  await page.locator('[data-dir-name]').fill('原神 · 合成测试');await page.locator('[data-dir-save]').click();await wait(page,()=>SourceDirectory.sources[0].name==='原神 · 合成测试');assert.ok(await page.evaluate(()=>SourceDirectory.sources[0].aliases.includes('原神')));
  assert.equal(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);assert.equal(await page.locator('.directory-layout').evaluate(n=>n.scrollWidth<=n.clientWidth+1),true);
  await page.screenshot({path:`tmp/source-directory0450/directory-${width}-${theme}.png`});
  if(width===390&&theme==='dark'){
   await page.locator('[data-dir-name]').fill('Uncommitted draft');await dialog.locator('header button').click();await page.locator('.draft-confirm[open]').waitFor();await page.locator('[data-keep]').click();assert.equal(await page.locator('[data-dir-name]').inputValue(),'Uncommitted draft');await page.locator('[data-dir-name]').fill('原神 · 合成测试');
   await page.evaluate(async()=>{const w=SourceDirectory.sources[0],p=await SourceDirectory.mutate('node',{workId:w.id,name:'雪国任务线',kind:'arc'}),leaf=await SourceDirectory.mutate('node',{workId:w.id,parentId:p.id,name:'山间重逢',kind:'quest'}),g=SceneUI.sceneGroups().find(g=>g.scene.groupId==='dir-0');SceneUI.applySupplement([{id:g.scene.groupId,expected:SceneUI.supplementVersion(g.scene.groupId),patch:{sourcePath:{workId:w.id,nodes:[p,leaf],basis:'manual'},chapter:leaf.name}}],'local')});
   const safety=await page.evaluate(async()=>{
    const work=SourceDirectory.sources[0],before=JSON.stringify(work),store=LearningStore;LearningStore={...store,atomic:async()=>{throw Error('Synthetic quota failure')}};
    let refused=false;try{await SourceDirectory.mutate('save',{id:work.id,name:'Must not save',type:work.type,aliases:work.aliases,expectedRevision:work.revision})}catch{refused=true}finally{LearningStore=store}
    const unchanged=JSON.stringify(SourceDirectory.sources[0])===before;
    const enriched=await SourceDirectory.enrich({sourceTitle:'Genshin Impact',sourceSuggestion:{workId:work.id,parent:null,chapter:{name:'Unproven chapter',kind:'quest'},basis:'context'}},{quote:'A new screenshot'});
    const noGuess=!enriched.sourcePath&&!SourceDirectory.sources[0].nodes.some(n=>n.name==='Unproven chapter');
    const own=await SourceDirectory.mutate('confirm',{requestKey:'different-work',name:'Another work',type:'game',aliases:[]}),g=SceneUI.sceneGroups().find(g=>g.scene.groupId==='dir-0');await SourceDirectory.applyGroups([g],own);
    const moved=SceneUI.sceneGroups().find(g=>g.scene.groupId==='dir-0').scene;
    return {refused,unchanged,noGuess,clearOldPath:moved.sourcePath===null&&moved.sourceSuggestion===null};
   });assert.deepEqual(safety,{refused:true,unchanged:true,noGuess:true,clearOldPath:true});
  }
  await dialog.locator('header button').click();await dialog.waitFor({state:'detached'});
  await page.evaluate(()=>{SceneWorkspace.render();const select=document.querySelector('[data-scene-group]');if(select){select.value='source';select.dispatchEvent(new Event('change',{bubbles:true}))}});
  // Exercise the real grouping selector, rather than reconstructing completed DOM.
  const group=page.locator('select').filter({has:page.locator('option[value="source"]')});if(await group.count()){await group.first().selectOption('source',{force:true});await page.locator('.source-group').first().waitFor();}
  await page.screenshot({path:`tmp/source-directory0450/tree-${width}-${theme}.png`});assert.equal(await page.evaluate(()=>modelCalls),0);assert.deepEqual(errors,[]);
  await page.reload();await page.evaluate(async()=>{await appReady;await SourceDirectory.load()});assert.equal(await page.evaluate(()=>SourceDirectory.sources.length),width===390&&theme==='dark'?2:1);assert.equal(await page.evaluate(()=>SourceDirectory.describe(SceneUI.sceneGroups().find(g=>g.scene.groupId==='dir-1').scene).name),'原神 · 合成测试');
  console.log(`Source directory ${width} ${theme}: once-only confirmation for20 scenes, aliases, chapter scope, rename, original preservation, refresh and layout passed`);await context.close();
 }
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
