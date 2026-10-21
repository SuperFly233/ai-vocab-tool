const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [320,390,1100,1440])for(const theme of ['light','dark']){
   const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.stack));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   let aiCalls=0,failAI=true;
   await page.route('**/api/analyze',route=>{
    const data=route.request().postDataJSON();if(data.systemPrompt?.includes('词典编辑')){aiCalls++;if(failAI){failAI=false;return route.fulfill({status:503,json:{error:'Fixture AI unavailable'}})}}
    return route.fulfill({json:{meta:{query:data.query},headword:{title:data.query,coreMeaning:'整合释义'},senses:[{shortestLabel:'合并后的语义',meaning:'AI fixture'}],collocations:[],register:{},confusions:[]}});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>typeof ExperienceUI!=='undefined');
   await page.evaluate(()=>{
    const now=new Date().toISOString(),result={headword:{title:'as of today',coreMeaning:'截至今天'},senses:[{shortestLabel:'截至',meaning:'截至当前日期',example:'As of today, things have changed.'}],collocations:[],register:{style:'formal'},confusions:[]};
    const scene={id:'polish-scene',quote:'A long scene quote must not become a top-level reading section.',sourceTitle:'QA source',createdAt:now,updatedAt:now};
    const rolls=['a','b','c'].map(id=>({id,name:'Source '+id,model:'Model '+id,createdAt:now,result:{...result,senses:[...result.senses,{shortestLabel:'Meaning '+id,meaning:'Detail '+id}]}}));
    setHistory([{id:1,query:'as of today',rolls,result:rolls[0].result,scenes:[scene],createdAt:now}]);
    setSettings({...getSettings(),apiProfiles:[{id:'qa',name:'QA',apiUrl:'https://example.com/v1',apiKey:'test-only',model:'qa-model'}],activeApiProfileId:'qa'});
   });
   assert.equal(await page.locator('.sidebar .nav-item:visible').count(),4);
   const shell=await page.evaluate(()=>{
    const nodes=[...document.querySelectorAll('.sidebar .nav-item,.topbar-actions>.theme-switch,.topbar-actions>.utility-nav,.account-status-wrap')].filter(node=>node.getBoundingClientRect().width>0).map(node=>{const r=node.getBoundingClientRect();return {label:node.textContent.trim(),x:r.left,y:r.top,right:r.right,bottom:r.bottom}});
    return {overflow:document.documentElement.scrollWidth>innerWidth,nodes};
   });assert.equal(shell.overflow,false,JSON.stringify(shell));
   for(const a of shell.nodes)for(const b of shell.nodes)if(a!==b)assert.ok(a.right<=b.x+1||b.right<=a.x+1||a.bottom<=b.y+1||b.bottom<=a.y+1,'Navigation overlap '+JSON.stringify({width,a,b}));
   await page.locator('#nav-scenes').click();assert.equal(await page.locator('#scene-hub h1').textContent(),'场景');
   assert.equal(await page.locator('#nav-batch').count(),0);
   await page.evaluate(()=>showView('settings'));
   assert.deepEqual(await page.locator('.settings-nav-item b').allTextContents(),['模型与生成','外观与布局','阅读','场景与媒体','通知','数据与同步','维护与诊断']);
   assert.equal(await page.locator('.settings-nav-item small').count(),0);
   await page.getByRole('searchbox',{name:'搜索设置'}).fill('视频原生控件');assert.equal(await page.locator('.setting-row:visible').count(),1);
   await page.getByRole('searchbox',{name:'搜索设置'}).fill('nothing-matches-fixture');assert.equal(await page.locator('.setting-row:visible').count(),0);
   await page.getByRole('searchbox',{name:'搜索设置'}).fill('');assert.ok(await page.locator('.setting-row:visible').count()>10);
   await page.evaluate(()=>openHistoryModal(1));await page.waitForSelector('#modal-card-page .reading-nav button');
   const labels=await page.locator('#modal-card-page .reading-nav button').allTextContents();assert.equal(labels.filter(label=>label==='场景记忆').length,1);assert.ok(!labels.some(label=>label.includes('long scene')));
   const preview=await page.locator('#modal-card-page .reading-nav button').evaluateAll(nodes=>nodes.map(node=>node.dataset.tip));assert.ok(preview.every(text=>text.length<240));assert.ok(!preview.some(text=>text.includes('例句As of')));
   await page.getByRole('button',{name:'管理版本',exact:true}).click();
   await page.evaluate(()=>persistModalRollOrder(getHistory().find(row=>row.id===1).rolls.slice().reverse().map(roll=>historyRollViewKey(roll))));
   assert.deepEqual(await page.locator('.version-row').evaluateAll(nodes=>nodes.map(node=>node.dataset.versionId)),await page.evaluate(()=>getHistory().find(row=>row.id===1).rolls.map(roll=>roll.id)));
   const integrate=page.getByRole('button',{name:'预览整合全部版本',exact:true});assert.ok((await integrate.boundingBox()).height<=44);assert.equal(await integrate.textContent(),'');
   await integrate.click();assert.equal(await page.evaluate(()=>getHistory().find(row=>row.id===1).rolls.length),3);
   await page.getByRole('button',{name:'用 AI 优化整合预览',exact:true}).click();await page.waitForFunction(()=>versionMergeDraft.error&&!versionMergeDraft.busy);assert.equal(await page.evaluate(()=>versionMergeDraft.mode),'local');assert.equal(await page.evaluate(()=>getHistory().find(row=>row.id===1).rolls.length),3);
   await page.getByRole('button',{name:'用 AI 优化整合预览',exact:true}).click();await page.waitForFunction(()=>versionMergeDraft.mode==='ai'&&!versionMergeDraft.busy);assert.equal(aiCalls,2);
   assert.equal(await page.evaluate(()=>versionMergeDraft.result.headword.title),'as of today');
   assert.equal(await page.evaluate(()=>versionMergeDraft.result.meta.origin),'as of today');
   await page.getByRole('button',{name:'确认添加新版本',exact:true}).click();assert.equal(await page.evaluate(()=>getHistory().find(row=>row.id===1).rolls.length),4);
   await page.locator('.toast-action').last().click();assert.equal(await page.evaluate(()=>getHistory().find(row=>row.id===1).rolls.length),3,'Undo removes only integrated version');
   await page.getByRole('button',{name:'更多版本操作'}).first().click();
   await page.locator('#version-options button').first().locator('svg').waitFor({state:'visible'});
   const menu=await page.locator('#version-options button').first().evaluate(node=>({display:getComputedStyle(node).display,whiteSpace:getComputedStyle(node).whiteSpace,svg:node.querySelector('svg').getBoundingClientRect().width}));assert.equal(menu.display,'flex');assert.equal(menu.whiteSpace,'nowrap');assert.equal(menu.svg,17);
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`polish-versions-${width}-${theme}.png`)})}
   await page.evaluate(()=>{document.getElementById('version-options').hidePopover();closeHistoryModal();showView('settings')});
   if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`polish-settings-${width}-${theme}.png`)});
   assert.deepEqual(errors,[]);console.log(`Polish ${width}px ${theme}: primary routes, batch dedupe, settings search, hierarchy/summaries, unified order, AI preview/confirm/undo and menu geometry passed.`);await page.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
