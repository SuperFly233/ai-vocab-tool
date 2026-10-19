const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+yQAAAAASUVORK5CYII=','base64');
const gif=Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7','base64');
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof SceneUI!=='undefined'&&typeof renderResult==='function');
   await page.locator('#query-input').fill('start over');
   await page.locator('[data-scene-action="menu"]').click();
   await page.waitForSelector('#scene-query-menu:popover-open');
   const compact=await page.evaluate(()=>{
    const input=document.querySelector('#query-input').getBoundingClientRect(),toggle=document.querySelector('.scene-menu-toggle').getBoundingClientRect(),menu=document.querySelector('#scene-query-menu').getBoundingClientRect();
    return {sameRow:Math.abs(input.top+input.height/2-toggle.top-toggle.height/2)<3,menuFits:menu.left>=0&&menu.right<=innerWidth,extraRow:!!document.querySelector('.scene-query-actions')};
   });
   assert.ok(compact.sameRow&&compact.menuFits&&!compact.extraRow,'Scene entry adds no separate toolbar row');
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`scene-menu-${width}-${theme}.png`)})}
   await page.keyboard.press('Escape');
   await page.waitForSelector('#scene-query-menu:popover-open',{state:'hidden'});
   await page.waitForFunction(()=>document.querySelector('.scene-menu-toggle').getAttribute('aria-expanded')==='false');
   assert.equal(await page.locator('.scene-menu-toggle').getAttribute('aria-expanded'),'false');
   const geometry=await page.evaluate(()=>{
    const box=selector=>{const rect=document.querySelector(selector).getBoundingClientRect();return {top:rect.top,width:rect.width,height:rect.height}};
    return {input:box('#query-input'),panel:box('.editor-pane'),result:box('.result-pane'),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(!geometry.overflow,'Compact toolbar must not overflow');
   console.log(`Compact toolbar ${width}px ${theme}: ${JSON.stringify(geometry)}`);
   await page.evaluate(()=>{document.querySelector('.result-pane').style.minHeight='1800px';scrollTo(0,400)});
   await page.waitForTimeout(200);
   assert.ok(await page.locator('.scene-menu-toggle').isVisible(),'Scene entry remains available while scrolling');
   await page.locator('.scene-menu-toggle').click();
   await page.waitForSelector('#scene-query-menu:popover-open');
   if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`scene-menu-scrolled-${width}-${theme}.png`)});
   await page.evaluate(()=>scrollTo(0,0));
   await page.waitForTimeout(200);
   await page.evaluate(()=>document.querySelector('.result-pane').style.minHeight='');
   if(await page.locator('#scene-query-menu').isVisible())await page.keyboard.press('Escape');
   await page.locator('.scene-menu-toggle').click();
   await page.locator('[data-scene-action="open"]').click();
   const layer=await page.locator('#scene-editor').evaluate(node=>({layer:Number(getComputedStyle(node).zIndex),history:Number(getComputedStyle(document.querySelector('#history-modal')).zIndex),top:node.querySelector('.scene-editor').getBoundingClientRect().top,bottom:node.querySelector('.scene-editor').getBoundingClientRect().bottom}));
   assert.ok(layer.layer>layer.history,'Scene editor must be above existing detail/review layers');assert.ok(layer.top>=0&&layer.bottom<=900,'Editor fits viewport');
   await page.locator('[name="quote"]').fill("Let's start over!");
   await page.locator('[name="translation"]').fill('我们重新开始吧！');
   await page.locator('[name="note"]').fill('一起参加比赛的场景。');
   await page.locator('#scene-file-picker').setInputFiles({name:'scene.png',mimeType:'image/png',buffer:png});
   await page.waitForFunction(()=>document.querySelectorAll('.scene-file-row').length===1);
   await page.evaluate(bytes=>{
    const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],'animation.gif',{type:'image/gif'}));
    document.querySelector('#scene-editor').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
   },[...gif]);
   await page.waitForFunction(()=>document.querySelectorAll('.scene-file-row').length===2);
   await page.evaluate(bytes=>{
    const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],'duplicate.png',{type:'image/png'}));
    document.querySelector('#scene-editor').dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));
   },[...png]);
   await page.waitForFunction(()=>!document.querySelector('[data-scene-action="manual"]').disabled);
   assert.equal(await page.locator('.scene-file-row').count(),2,'Drop duplicate is deduplicated by content');
   await page.locator('.scene-file-row').nth(1).locator('[data-scene-action="hero"]').click();
   await page.locator('.scene-file-grip').first().press('ArrowDown');
   await page.locator('.scene-source-fields summary').click();
   await page.locator('[name="sourceTitle"]').fill('Episode 02');
   await page.locator('[name="timeRange"]').fill('00:07:18 – 00:07:20');
   await page.locator('[name="sourceUrl"]').fill('https://example.com/watch?t=438');
   if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`scene-editor-${width}-${theme}.png`)})}
   await page.locator('[data-scene-action="manual"]').click();
   await page.waitForSelector('#scene-editor',{state:'detached'});
   await page.waitForSelector('.scene-record');
   await page.locator('.scene-record').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelectorAll('.scene-asset img').length===2);
   const saved=await page.evaluate(()=>getHistory()[0]);
   assert.equal(saved.scenes[0].quote,"Let's start over!");assert.equal(saved.scenes[0].media.length,2);
   assert.equal(saved.scenes[0].heroMedia.length,2,'Multiple main media are persisted');
   assert.equal(await page.evaluate(item=>{
    const stale={...item,scenes:item.scenes.map(scene=>({...scene,heroMedia:[],featured:false,order:999,updatedAt:scene.createdAt}))};
    return mergeHistoryItems([item],[stale])[0].scenes[0].heroMedia.length;
   },saved),2,'Application cloud merge preserves newer main-media selection');
   assert.equal(saved.scenes[0].media[0].mime,'image/gif','Media order persists on save');
   const reading=await page.locator('.scene-record').first().evaluate(node=>{
    const text=node.querySelector('.scene-context').getBoundingClientRect(),media=node.querySelector('.scene-media').getBoundingClientRect();
    return {right:media.left>=text.right,below:media.top>=text.bottom};
   });
   assert.ok(width>=900?reading.right:reading.below,'Desktop pairs text with media on right; mobile stacks');
   await page.locator('.scene-record [data-scene-action="enlarge"]').first().click();
   await page.waitForSelector('#scene-viewer[open]');
   assert.ok(await page.locator('#scene-viewer').evaluate(node=>node.matches(':modal')),'Media enlargement uses native modal top layer');
   await page.evaluate(()=>notify('Viewer notification test','info','Media',false));
   assert.ok(await page.locator('#toast-stack').evaluate(node=>node.matches(':popover-open')&&node.closest('dialog:modal')),'Notifications remain visible and interactive above viewer');
   await page.keyboard.press('Escape');
   await page.waitForSelector('#scene-viewer',{state:'detached'});
   assert.ok(saved.scenes[0].sourceUrl.startsWith('https://example.com/'));
   assert.equal(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes('data:image/'))),false,'Binary never enters localStorage');
   const id=saved.id;
   await page.reload();await page.waitForFunction(()=>typeof openHistoryModal==='function');
   await page.evaluate(id=>openHistoryModal(id),id);
   await page.waitForSelector('.scene-record');
   await page.locator('.scene-record [data-scene-action="edit"]').click();
   await page.locator('[name="note"]').fill('Updated scene note');
   await page.locator('[data-scene-action="save"]').click();
   await page.waitForSelector('#scene-editor',{state:'detached'});
   assert.ok((await page.locator('.scene-record').innerText()).includes('Updated scene note'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal page overflow');
   if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`scene-reader-${width}-${theme}.png`)});
   await page.locator('.scene-record [data-scene-action="remove"]').click();
   assert.equal(await page.locator('.scene-record').count(),0);
   assert.equal(await page.evaluate(()=>getHistory()[0].sceneTombstones.length),1);
   const merge=await page.evaluate(stale=>mergeHistoryItems(getHistory(),[stale])[0].scenes.length,saved);
   assert.equal(merge,0,'Stale synced scene does not resurrect after deletion');
   await page.evaluate(()=>closeHistoryModal());
   await page.locator('#query-input').fill('before lookup');
   await page.evaluate(bytes=>{
    const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],'screenshot.png',{type:'image/png'}));
    document.querySelector('#query-input').dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));
   },[...png]);
   await page.waitForSelector('.scene-file-row');
   await page.locator('[name="quote"]').fill('Added before asking AI');
   await page.locator('[data-scene-action="save"]').click();
   await page.waitForSelector('#scene-editor',{state:'detached'});
   assert.equal(await page.evaluate(async()=>(await SceneData.getDraft('pending:before lookup')).quote),'Added before asking AI');
   assert.equal(await page.evaluate(()=>getHistory().length),1,'Staged context does not create an unwanted AI history record');
   await page.locator('#query-input').fill('drop before lookup');
   await page.evaluate(bytes=>{
    const data=new DataTransfer();data.items.add(new File([new Uint8Array(bytes)],'drop.png',{type:'image/png'}));
    document.querySelector('#query-input').dispatchEvent(new DragEvent('drop',{dataTransfer:data,bubbles:true,cancelable:true}));
   },[...png]);
   await page.waitForSelector('.scene-file-row');
   await page.locator('#scene-file-picker').setInputFiles({name:'unsafe.svg',mimeType:'image/png',buffer:Buffer.from('<svg onload="alert(1)"></svg>')});
   await page.waitForFunction(()=>document.querySelector('#scene-editor-status')?.classList.contains('bad'));
   assert.equal(await page.locator('.scene-file-row').count(),1,'An unsupported file must not discard accepted attachments');
   await page.keyboard.press('Escape');await page.waitForSelector('.confirm-layer.open');
   await page.locator('#confirm-ok').click();await page.waitForSelector('#scene-editor',{state:'detached'});
   assert.deepEqual(errors,[]);
   console.log(`Scenes UI passed ${width}px ${theme}: picker/paste/drop, dedup, manual entry, source, IndexedDB refresh, edit, tombstone merge and width.`);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
