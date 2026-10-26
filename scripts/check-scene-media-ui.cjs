const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  const chunks=new Map(),manifests=new Map();let corrupted=false,offline=false;
  async function open(){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
   await page.addInitScript(()=>localStorage.setItem('ai_vocab_tool_offline_mode','1');if(!localStorage.getItem('ai_vocab_tool_settings_v1'))localStorage.setItem('ai_vocab_tool_settings_v1',JSON.stringify({sceneAI:{auto:false}})));
   await page.route('https://**/*',route=>route.abort());
   await page.route('**/api/media',async route=>{
    const data=route.request().postDataJSON();
    if(offline)return route.fulfill({status:503,json:{error:'Test unavailable'}});
    if(data.action==='manifest')return route.fulfill({json:{manifest:manifests.get(data.id)||null}});
    if(data.action==='put'){for(const chunk of data.chunks)chunks.set(`${data.id}:${chunk.index}`,chunk.data);return route.fulfill({json:{count:data.chunks.length}})}
    if(data.action==='complete'){manifests.set(data.id,{id:data.id,size:data.size,mime:data.mime,chunks:Math.ceil(data.size/(512*1024))});return route.fulfill({json:{complete:true}})}
    return route.fulfill({json:{chunks:data.indexes.map(index=>({index,data:corrupted?'AAAA':chunks.get(`${data.id}:${index}`)}))}});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&typeof getHistory==='function');
   await page.evaluate(async()=>{await cloudInitPromise;cloudUser={id:'qa-user'};cloudAccessToken=async()=>'test-only-token'});
   return {context,page};
  }
  const first=await open();
  const fs=require('node:fs'),path=require('node:path');
  const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'lexi-media-test-'));
  await first.page.screenshot({path:path.join(tmp,'frame.jpg'),type:'jpeg'});
  const cache=path.join(require('node:os').homedir(),'AppData','Local','ms-playwright');
  const bundled=process.platform==='win32'&&fs.existsSync(cache)?fs.readdirSync(cache).filter(name=>name.startsWith('ffmpeg-')).sort().at(-1):null;
  const ffmpeg=process.env.FFMPEG_PATH||(bundled?path.join(cache,bundled,'ffmpeg-win64.exe'):'ffmpeg');
  require('node:child_process').execFileSync(ffmpeg,['-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-r','10','-i','pipe:0','-vf','scale=320:180','-c:v','libvpx','-pix_fmt','yuv420p',path.join(tmp,'scene.webm')],{input:Buffer.concat(Array.from({length:10},()=>fs.readFileSync(path.join(tmp,'frame.jpg'))))});
  const video=await first.page.evaluate(async bytes=>{
   const blob=new Blob([new Uint8Array(bytes)],{type:'video/webm'});blob.name='scene.webm';return SceneData.putFile(blob);
  },[...fs.readFileSync(path.join(tmp,'scene.webm'))]);
  assert.equal(video.mime,'video/webm');
  const preview=await first.page.evaluate(async ref=>{const blob=await ScenePreview.get(ref),image=await createImageBitmap(blob),cached=await SceneData.getDraft(`thumbnail-v1:${ref.id}`);return {type:blob.type,width:image.width,height:image.height,cached:cached instanceof Blob}},video);
  assert.equal(preview.type,'image/jpeg');assert.ok(preview.width>0&&preview.height>0&&Math.max(preview.width,preview.height)<=240&&preview.cached,'Encoded video becomes a bounded persisted JPEG poster, not a paused video element');
  await first.page.evaluate(ref=>SceneMedia.upload(ref),video);
  assert.ok(manifests.has(video.id));
  await first.page.evaluate(()=>SceneUI.open());
  await first.page.locator('[name="entryTitle"]').fill('scene memory');
  await first.page.locator('[name="quote"]').fill('A scene with a real playable video.');
  await first.page.evaluate(ref=>{
   const input=document.querySelector('#scene-file-picker');
   return SceneData.getFile(ref.id).then(record=>{const data=new DataTransfer();data.items.add(new File([record.blob],ref.name,{type:ref.mime}));input.files=data.files;input.dispatchEvent(new Event('change',{bubbles:true}))});
  },video);
  await first.page.waitForSelector('.scene-file-row');
  await first.page.getByRole('button',{name:'更多保存方式',exact:true}).click();
  await first.page.getByRole('menuitem',{name:'保存为自建词条…',exact:true}).click();
  await first.page.waitForSelector('.scene-record');await first.page.locator('.scene-record').scrollIntoViewIfNeeded();
  try{await first.page.waitForFunction(()=>document.querySelector('.scene-asset video')?.readyState>=1,{},{timeout:5000})}catch(error){console.log(await first.page.locator('.scene-record').innerText());console.log(await first.page.locator('.scene-asset').evaluateAll(nodes=>nodes.map(node=>({html:node.innerHTML,title:node.title,error:node.querySelector('video')?.error?.message}))));throw error}
  const playback=await first.page.locator('.scene-asset video').evaluate(video=>({paused:video.paused,controls:video.controls,width:video.videoWidth,autoplay:video.autoplay}));
  assert.deepEqual(playback,{paused:true,controls:true,width:320,autoplay:false});
  await first.page.locator('.scene-asset video').evaluate(async video=>{video.muted=true;await video.play()});
  await first.page.waitForFunction(()=>document.querySelector('.scene-asset video').currentTime>.1);
  await first.page.locator('.scene-asset video').evaluate(video=>video.pause());
  await first.page.locator('.scene-record [data-scene-action="enlarge"]').click();
  await first.page.waitForFunction(()=>document.querySelector('#scene-viewer video')?.readyState>=1);
  assert.deepEqual(await first.page.locator('#scene-viewer video').evaluate(video=>({width:video.videoWidth,paused:video.paused,controls:video.controls})),{width:320,paused:true,controls:true},'Enlarged video retains native controls without autoplay');
  await first.page.locator('[data-scene-action="viewer-close"]').click();
  await first.page.waitForSelector('#scene-viewer',{state:'detached'});
  await first.page.locator('.scene-record video').evaluate(async video=>{video.loop=true;video.currentTime=.2;await video.play()});
  await first.page.locator('.scene-record [data-scene-action="enlarge"]').click();
  await first.page.waitForFunction(()=>document.querySelector('#scene-viewer video')?.readyState>=1);
  assert.ok(await first.page.locator('.scene-record video').evaluate(video=>video.paused),'Inline playback pauses before enlargement');
  assert.ok(await first.page.locator('#scene-viewer video').evaluate(video=>video.currentTime>=.2),'Viewer inherits playback position');
  await first.page.locator('[data-scene-action="viewer-close"]').click();
  assert.ok(await first.page.locator('.scene-record video').evaluate(video=>video.paused),'Closing never unexpectedly resumes inline sound');
  await first.page.locator('.scene-record video').evaluate(video=>{
   window.__videoPlay=video.play.bind(video);video.play=()=>video.muted?__videoPlay():Promise.reject(new DOMException('Fixture autoplay restriction','NotAllowedError'));
   const settings={...getSettings(),mediaAutoplay:true,mediaControls:false,mediaTools:'hidden'};setSettings(settings);ExperienceUI.apply(settings);
  });
  await first.page.waitForFunction(()=>document.querySelector('.scene-record video').dataset.soundBlocked==='true');
  assert.ok(await first.page.locator('.scene-record .scene-sound').isVisible(),'Sound control remains visible without native or media tools');
  await first.page.locator('.scene-record video').evaluate(video=>video.play=__videoPlay);
  await first.page.locator('.scene-record .scene-sound').click();
  assert.equal(await first.page.locator('.scene-record video').evaluate(video=>video.muted),false,'Explicit activation enables sound');
  await first.page.evaluate(()=>{const settings={...getSettings(),mediaAutoplay:false,mediaControls:true,mediaTools:'auto'};setSettings(settings);ExperienceUI.apply(settings)});
  const downloadPromise=first.page.waitForEvent('download');
  await first.page.locator('[data-scene-action="backup"]').click();
  const download=await downloadPromise,archive=JSON.parse(require('node:fs').readFileSync(await download.path(),'utf8'));
  assert.equal(archive.files.length,1);assert.ok(archive.files[0].data.length>0);
  const record=await first.page.evaluate(()=>getHistory()[0]);
  const second=await open();
  const chooserPromise=second.page.waitForEvent('filechooser');
  await second.page.evaluate(()=>showView('scenes'));
  await second.page.locator('.scene-library-head [data-shared-more]').click();
  await second.page.getByRole('menuitem',{name:'导入场景备份',exact:true}).click();
  const chooser=await chooserPromise;
  await chooser.setFiles({name:'scene-backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(archive))});
  await second.page.waitForSelector('.confirm-layer.open');
  await second.page.locator('#confirm-ok').click();
  await second.page.waitForSelector('.scene-record');
  assert.equal(await second.page.evaluate(()=>getHistory()[0].scenes[0].quote),record.scenes[0].quote,'Portable archive restores scene text');
  assert.equal(await second.page.evaluate(async id=>(await SceneData.getFile(id)).blob.size,video.id),video.size,'Portable archive restores original binary');
  await second.page.evaluate(()=>closeHistoryModal());
  await second.page.evaluate(async ref=>{const loaded=await SceneMedia.resolve(ref);window.__size=loaded.blob.size},video);
  assert.equal(await second.page.evaluate(()=>__size),video.size,'Blank IndexedDB reconstructs remote media with verified hash');
  const third=await open();corrupted=true;
  const corrupt=await third.page.evaluate(async ref=>{try{await SceneMedia.resolve(ref);return false}catch{return !await SceneData.getFile(ref.id)}},video);
  assert.ok(corrupt,'Corrupt media is rejected before cache commit');corrupted=false;
  offline=true;
  const retry=await third.page.evaluate(async ref=>{try{await SceneMedia.resolve(ref);return false}catch{return true}},video);assert.ok(retry);offline=false;
  await third.page.evaluate(ref=>SceneMedia.resolve(ref).then(()=>{}),video);
  const jpeg=await first.page.screenshot({type:'jpeg'});
  const padded=Buffer.concat([jpeg,Buffer.alloc(1024*1024,173)]);
  const large=await first.page.evaluate(async encoded=>{const bytes=Uint8Array.from(atob(encoded),char=>char.charCodeAt(0));const file=new Blob([bytes],{type:'image/jpeg'});file.name='large-scene.jpg';return SceneData.putFile(file)},padded.toString('base64'));
  await first.page.evaluate(ref=>SceneMedia.upload(ref),large);
  assert.ok(manifests.get(large.id).chunks>=3,'Transport covers multiple upload batches');
  assert.equal(await second.page.evaluate(async ref=>(await SceneMedia.resolve(ref)).blob.size,large),large.size,'Multiple batches reassemble exactly on a new device');
  await third.page.evaluate(record=>setHistory([record]),record);
  await third.page.evaluate(()=>openHistoryModal(getHistory()[0].id));
  await third.page.waitForSelector('.scene-record');
  assert.ok((await third.page.locator('.scene-record').innerText()).includes('real playable video'));
  // Pending creation attaches only after lookup persistence, without changing model JSON.
  await second.page.evaluate(async()=>{
   const scene=SceneData.normalizeScene({id:'pending-scene',quote:'Before AI',createdAt:new Date().toISOString(),media:[]});
   await SceneData.putDraft('pending:clock',scene);
   const result={meta:{query:'clock'},headword:{title:'clock'},senses:[{shortestLabel:'notice',meaning:'to notice'}]};
   const saved=saveLookupResult({query:'clock',result});await SceneUI.attachPending(saved.item.id,'clock');
  });
  assert.equal(await second.page.evaluate(()=>getHistory()[0].scenes[0].quote),'Before AI');
  assert.equal(await second.page.evaluate(()=>getHistory()[0].result.scenes),undefined);
  await second.page.evaluate(()=>{
   showView('home');currentHistoryId=getHistory()[0].id;renderResult(getHistory()[0].result);
  });
  await second.page.locator('#result-card .scene-fragment [data-scene-action="add"]').click();
  await second.page.locator('[name="note"]').fill('A less common sense');
  await second.page.locator('[data-scene-action="save"]').click();
  await second.page.waitForSelector('#scene-editor',{state:'detached'});
  assert.ok(await second.page.evaluate(()=>getHistory()[0].scenes.some(scene=>scene.targetKey.startsWith('sense:'))),'Scene can target a specific sense');
  await second.page.evaluate(()=>{
   const item=getHistory()[0],scene=item.scenes.find(scene=>scene.targetKey);
   reviewCards=[{key:'test-card',historyId:item.id,fragmentKey:scene.targetKey,prompt:'clock',answer:'notice'}];
   reviewSession={keys:['test-card'],index:0,revealed:true,ratings:{}};renderReview();
  });
  assert.ok((await second.page.locator('#review-content').innerText()).includes('A less common sense'),'Review displays matching sense context');
  console.log('Scene media passed: real encoded WebM playback metadata/no autoplay, private transport roundtrip, new-device cache, hash rejection, retry, portable binary backup and pre-query scene attachment.');
  await first.context.close();await second.context.close();await third.context.close();
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
