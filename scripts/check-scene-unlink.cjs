const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const proxyURL=process.env.QA_USE_PROXY&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY),proxy=proxyURL?new URL(proxyURL):null;
 browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_PATH,...(proxy?{proxy:{server:proxy.origin,username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}}:{args:['--no-proxy-server']})});
 for(const width of process.env.QA_WIDTH?[+process.env.QA_WIDTH]:[320,390,768,1024,1440])for(const theme of process.env.QA_THEME?[process.env.QA_THEME]:['light','dark'])for(const standalone of [true,false]){
 const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(10000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);await page.route('https://**/*',r=>process.env.QA_BASE_URL&&new URL(r.request().url()).origin===new URL(process.env.QA_BASE_URL).origin?r.continue():r.abort());
 await page.goto((process.env.QA_BASE_URL||`http://127.0.0.1:${server.address().port}`)+'/scenes',{waitUntil:'domcontentloaded',timeout:45000});
 await page.evaluate(async standalone=>{await appReady;await cloudInitPromise;const canvas=document.createElement('canvas');canvas.width=300;canvas.height=120;const ctx=canvas.getContext('2d');ctx.fillStyle='#547da2';ctx.fillRect(0,0,300,120);const blob=await new Promise(r=>canvas.toBlob(r));blob.name='synthetic.png';const ref=await SceneData.putFile(blob);const now=new Date().toISOString(),scene={id:'base',groupId:'shared',title:'合成关联测试',quote:'A task is a pillar.',translation:'测试原句',note:'原笔记',sourceTitle:'Synthetic',media:[ref],learningTargets:[{id:'target',phrase:'pillar',meaning:'此处的支柱',kind:'phrase',provenance:'manual'}],createdAt:now,updatedAt:now};setSettings({...getSettings(),sceneLibrary:standalone?[scene]:[],sceneLibraryTombstones:[],sceneAI:{auto:false}});setHistory(['task','pillar'].map((q,i)=>({id:7101+i,query:q,result:{meta:{query:q},headword:{title:q,coreMeaning:'测试'},senses:[],collocations:[],register:{},confusions:[]},scenes:[{...scene,id:'link-'+i}],createdAt:now,updatedAt:now})));showView('scenes');SceneWorkspace.select('shared')},standalone);
 await page.waitForSelector('.scene-linked-results .scene-result-row');
 const snapshot=()=>page.evaluate(()=>({library:getSettings().sceneLibrary,groups:SceneUI.sceneGroups().map(g=>({id:g.scene.groupId,links:g.links.map(i=>i.id)})),entries:getHistory().map(i=>({id:i.id,scenes:i.scenes,tombs:i.sceneTombstones}))}));
 const before=await snapshot();
 await page.locator('.scene-linked-results [data-history-id="7102"] [data-scene-action="unlink"]').click();
 await page.waitForSelector('.confirm-layer.open');
 const confirmation=await page.locator('.confirm-layer.open').innerText();
 assert.ok(confirmation.includes('场景、原素材、词条本身及其他词条关联都会保留'));
 await page.locator('.confirm-layer.open button').filter({hasText:/确认|删除|移除/}).last().click();
 await page.waitForTimeout(400);
 const after=await snapshot();
 assert.equal(after.groups.length,1,'Unlink must never remove the scene');
 assert.deepEqual(after.groups[0].links,[7101],'Only the clicked association may be removed');
 assert.equal(after.entries.find(i=>i.id===7102).scenes.length,0);
 assert.deepEqual(after.entries.find(i=>i.id===7101),before.entries.find(i=>i.id===7101),'Other entry and association must be byte-identical');
 assert.ok(after.library.some(s=>s.groupId==='shared'),'Unlink preserves a standalone scene even for legacy link-only groups');
 assert.equal(await page.locator('[data-scene-action="unlink"] svg[data-lucide="unlink"]').count(),1);
 await page.locator('.toast-action').filter({hasText:'撤销'}).last().click();
 await page.waitForFunction(()=>SceneUI.sceneGroups()[0].links.length===2);
 // Remove both associations; the final unlink must leave a readable scene container.
 for(const id of [7102,7101]){await page.locator(`.scene-linked-results [data-history-id="${id}"] [data-scene-action="unlink"]`).click();await page.locator('.confirm-layer.open button').filter({hasText:'确认'}).click();await page.waitForTimeout(80)}
 const empty=await snapshot();assert.equal(empty.groups.length,1);assert.equal(empty.groups[0].links.length,0);assert.equal(empty.entries.length,2);
 assert.equal(empty.library[0].quote,'A task is a pillar.');assert.equal(empty.library[0].note,'原笔记');
 assert.equal(empty.library[0].learningTargets[0].meaning,'此处的支柱');assert.equal(empty.library[0].media.length,1);assert.ok(await page.evaluate(async()=>Boolean((await SceneData.getFile(getSettings().sceneLibrary[0].media[0].id))?.blob)),'Original media bytes survive');
 fs.mkdirSync('tmp/scene-unlink',{recursive:true});await page.screenshot({path:`tmp/scene-unlink/${width}-${theme}-${standalone?'library':'legacy'}.png`});
 await page.reload();await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&SceneUI.sceneGroups().length===1);assert.equal((await snapshot()).groups[0].links.length,0,'Reload preserves orphan container');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
 console.log(`Unlink ${width} ${theme} ${standalone?'library':'legacy'}: one-only, last-link, undo, reload and layout passed.`);
 await page.close();}
 }finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
