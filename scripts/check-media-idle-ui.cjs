const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{let browser;try{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.QA_BASE_URL||`http://127.0.0.1:${server.address().port}`,proxy=process.env.QA_USE_PROXY&&(process.env.HTTPS_PROXY||process.env.HTTP_PROXY);browser=await chromium.launch({headless:true,...(proxy?{proxy:{server:new URL(proxy).origin}}:{})});
 const page=await browser.newPage({viewport:{width:1440,height:950}});page.setDefaultTimeout(15000);let calls=[];
 await page.addInitScript(()=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('lexi-learning-help-v1:offline',JSON.stringify({version:1,welcome:'never',tours:{}}))});
 await page.route('https://**/*',r=>new URL(r.request().url()).origin===new URL(base).origin?r.continue():r.abort());
 await page.route('**/api/media*',route=>{calls.push(route.request().postDataJSON());return route.fulfill({status:200,json:{manifest:null}})});
 await page.goto(base);await page.evaluate(async()=>{await appReady;await cloudInitPromise;await SceneAITasks.ready;cloudUser={id:'media-idle-qa'};cloudAccessToken=async()=>'test-only';showView('exercise',null,{focus:false});const now=new Date().toISOString();
  setSettings({...getSettings(),sceneLibrary:Array.from({length:30},(_,i)=>SceneData.normalizeScene({id:'remote-'+i,groupId:'remote-'+i,title:'远端测试 '+i,quote:'Synthetic remote-only scene '+i,media:[{id:(i+1).toString(16).padStart(64,'0'),name:'remote.png',mime:'image/png',size:100}],createdAt:now,updatedAt:now}))});
 });
 await page.evaluate(async()=>{for(let i=0;i<5;i++){await SceneUI.syncPending();SceneUI.renderHub();ExperienceUI.refresh();dispatchEvent(new Event('focus'));dispatchEvent(new Event('online'))}});
 await page.waitForTimeout(2000);assert.equal(calls.length,0,'Exercise idle, repeated cloud completion, online/focus and hidden library must request no media');
 await page.evaluate(()=>showView('scenes',null,{focus:false}));await page.waitForTimeout(1000);
 const before=calls.length;assert.ok(before<=1,'List thumbnails must not download remote originals; only visible detail may request');
 await page.evaluate(()=>{for(let i=0;i<25;i++)SceneWorkspace.render()});
 await page.locator('.scene-master').evaluate(node=>{node.scrollTop=1000});await page.locator('.scene-master').evaluate(node=>{node.scrollTop=0});
 await page.waitForTimeout(1000);assert.equal(calls.length,before,'Failed media must not retry on rendering or scrolling');
 await page.evaluate(()=>showView('exercise',null,{focus:false}));calls=[];
 // Exercise the browser's actual observers and event loop, not only timer source checks.
 await page.waitForTimeout(20000);assert.equal(calls.length,0,'Twenty-second real-page exercise idle trace must contain zero media requests');
 fs.mkdirSync('tmp/media-idle',{recursive:true});await page.screenshot({path:'tmp/media-idle/exercise.png'});
 fs.writeFileSync('tmp/media-idle/trace.json',JSON.stringify({remoteScenes:30,cloudCompletions:5,rerenders:25,idleMs:20000,idleMediaRequests:calls.length,visibleDetailInitialRequests:before}));
 console.log('Real-page media idle trace:30 remote scenes,5 sync/focus/online cycles,25 renders; hidden/list media0;20s exercise idle0; visible failed detail bounded.');
}finally{await browser?.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1});
