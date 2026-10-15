const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const server=require('./browser-test-server.cjs').createServer();
(async()=>{
 let browser;
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({headless:true,...(process.env.BROWSER_PATH?{executablePath:process.env.BROWSER_PATH}:{})});
  for(const width of [320,390,1440])for(const theme of ['light','dark']){
   const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<900,isMobile:width<900,acceptDownloads:true});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(theme=>{localStorage.setItem('ai_vocab_tool_offline_mode','1');localStorage.setItem('ai_vocab_tool_theme',theme)},theme);
   await page.route('https://**/*',route=>route.abort());
   await page.goto(`http://127.0.0.1:${server.address().port}`);
   await page.waitForFunction(()=>typeof openHistoryModal==='function');
   const click=async locator=>{
    await locator.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
    await page.waitForTimeout(180);
    if(width>=900)return locator.click();
    const rect=await locator.boundingBox();
    assert.ok(await locator.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}),'Touch target must be unobscured');
    await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);
   };
   const dismiss=async()=>{
    const closes=page.locator('.toast:not(.leaving) .toast-close');
    while(await closes.count()){
     try{if(width>=900)await closes.first().click({timeout:1000});else await click(closes.first())}
     catch(error){if(await closes.count())throw error}
    }
    await page.waitForTimeout(350);
   };
   const shot=async name=>{
    await dismiss();
    const measurements=await page.evaluate(()=>{
     const card=document.querySelector('.history-modal-card'),body=document.querySelector('#history-modal-body'),bar=document.querySelector('#modal-rollbar');
     return {page:document.documentElement.scrollWidth,width:innerWidth,body:body.clientWidth,scroll:body.scrollWidth,cardRight:card.getBoundingClientRect().right,barBottom:bar.getBoundingClientRect().bottom,bodyTop:body.getBoundingClientRect().top};
    });
    assert.ok(measurements.page<=measurements.width&&measurements.scroll<=measurements.body&&measurements.cardRight<=measurements.width,JSON.stringify(measurements));
    assert.ok(measurements.bodyTop>=measurements.barBottom-1,'Version strip is outside content scroller');
    if(process.env.QA_SCREENSHOTS){fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`${name}-${width}-${theme}.png`)})}
   };
   await page.evaluate(()=>{
    const date='2026-10-10T00:00:00Z';
    const make=(title,label)=>({meta:{origin:'clok',query:'clok',language:'English'},headword:{title,coreMeaning:label},senses:[{shortestLabel:'注意',meaning:'Notice',example:'She clocked him.',translation:'她注意到他。'},{shortestLabel:label,meaning:label,example:'An example.'}],collocations:[{phrase:'clock in',meaning:'打卡'}],confusions:[{term:'notice',difference:label}]});
    const rolls=['a','b','c'].map((id,i)=>({id,createdAt:date,model:`Model ${id}`,result:make(`clock ${id}`,`Meaning ${i}`)}));
    setHistory([{id:1,query:'clok',createdAt:date,updatedAt:date,rolls,result:rolls[0].result,favorite:true}]);
    window.__original=JSON.parse(JSON.stringify(getHistory()));
    openHistoryModal(1);
   });
   const firstGrip=await page.locator('.roll-grip').first().boundingBox();
   const secondRoll=await page.locator('.roll-btn').nth(1).boundingBox();
   const tabs=await page.locator('.roll-tabs').boundingBox();
   const start={x:firstGrip.x+firstGrip.width/2,y:firstGrip.y+firstGrip.height/2};
   const end={x:Math.min(secondRoll.x+secondRoll.width-2,tabs.x+tabs.width-2),y:start.y};
   if(width<900){
    const cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...start,id:1}]});
    await page.waitForTimeout(330);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...end,id:1}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
   }else{
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.waitForTimeout(330);
    await page.mouse.move(end.x,end.y,{steps:6});await page.mouse.up();
   }
   await page.waitForTimeout(300);
   assert.notEqual(await page.evaluate(()=>getHistory()[0].rolls[0].id),'a','Long-press grip reorders versions');
   await page.evaluate(()=>persistModalRollOrder(__original[0].rolls.map(roll=>historyRollViewKey(roll))));
   await dismiss();
   await click(page.getByRole('button',{name:'管理版本',exact:true}));
   assert.equal(await page.locator('.version-row').count(),3);
   const name=page.locator('.version-name').first();
   await name.fill('主要解释');await name.press('Tab');
   await page.waitForFunction(()=>getHistory()[0].rolls[0].name==='主要解释');
   await click(page.locator('.version-row').nth(1).getByRole('button',{name:'设为默认',exact:true}));
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls[0].id),'b');
   assert.equal(await page.evaluate(()=>mergeHistoryItems(__original,getHistory())[0].rolls[0].id),'b','Unrelated stale metadata cannot reverse default order');
   await click(page.locator('.version-row').nth(2).getByRole('button',{name:'删除版本',exact:true}));
   await click(page.locator('#confirm-cancel'));
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),3);
   await click(page.locator('.version-row').nth(2).getByRole('button',{name:'删除版本',exact:true}));
   await click(page.locator('#confirm-ok'));
   assert.equal(await page.locator('.version-row').count(),2);
   assert.equal(await page.evaluate(()=>mergeHistoryItems(getHistory(),__original)[0].rolls.length),2,'Deleted roll must not revive from stale sync');
   await click(page.locator('.toast-action'));
   assert.equal(await page.locator('.version-row').count(),3);
   assert.equal(await page.evaluate(()=>getHistory()[0].rollTombstones.length),0);
   await dismiss();
   await click(page.locator('.version-row input[type=checkbox]').nth(0));
   await click(page.locator('.version-row input[type=checkbox]').nth(1));
   await click(page.getByRole('button',{name:'对比与整合',exact:true}));
   assert.equal(await page.locator('#version-merge-content h3').textContent(),'clock b');
   await page.locator('.version-merge-head select').selectOption('a');
   assert.equal(await page.locator('#version-merge-content h3').textContent(),'clock a');
   await shot('integration');
   await click(page.getByRole('button',{name:'保存为新版本',exact:true}));
   await page.waitForFunction(()=>getHistory()[0].rolls.length===4);
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls[0].mergedFrom.length),2);
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls[0].result.senses.length),3);
   assert.equal(await page.evaluate(()=>JSON.stringify(getHistory()[0].rolls.find(r=>r.id==='a').result)),await page.evaluate(()=>JSON.stringify(__original[0].rolls.find(r=>r.id==='a').result)));
   await dismiss();
   await click(page.locator('#modal-visual-tab'));
   await page.evaluate(()=>{els.historyModalBody.scrollTop=500});await page.waitForTimeout(300);
   const geometry=await page.evaluate(()=>{const nav=document.querySelector('.visual-workbench-nav').getBoundingClientRect(),bar=els.modalRollbar.getBoundingClientRect();return {nav:nav.top,bar:bar.bottom}});
   assert.ok(geometry.nav>=geometry.bar-1,JSON.stringify(geometry));
   await shot('visual-scrolled');
   await page.evaluate(()=>{els.historyModalBody.scrollTop=0});
   // Input selection is based on the production editor's field labels.
   const firstField=page.locator('#modal-visual-editor input').first();
   await firstField.fill('clock edited');
   await click(page.getByRole('button',{name:'管理版本',exact:true}));
   assert.equal(await page.evaluate(()=>activeModalTab),'visual','Unsaved draft blocks manager navigation');
   await dismiss();
   await click(page.getByRole('button',{name:'保存修改',exact:true}));
   await dismiss();
   const count=await page.evaluate(()=>getHistory()[0].rolls.length);
   assert.equal(count,4);
   assert.equal(await page.evaluate(()=>mergeHistoryItems(getHistory(),__original)[0].rolls.length),4,'Edited stable-id version must not duplicate after merge');
   await click(page.getByRole('button',{name:'管理版本',exact:true}));
   const json=JSON.stringify({headword:{title:'imported',coreMeaning:'Imported'},senses:[]});
   await page.locator('.version-import input').setInputFiles({name:'import.json',mimeType:'application/json',buffer:Buffer.from(json)});
   await page.waitForFunction(()=>getHistory()[0].rolls.length===5);
   assert.equal(await page.locator('#modal-title').textContent(),'imported','Switching version updates the detail heading');
   assert.equal(await page.locator('#modal-query-edit').inputValue(),'clok','Origin remains the actual query');
   await dismiss();
   await click(page.getByRole('button',{name:'管理版本',exact:true}));
   await page.locator('.version-import input').setInputFiles({name:'import.json',mimeType:'application/json',buffer:Buffer.from(json)});
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),5,'Identical imports are not duplicated');
   await dismiss();
   if(width<900){
    await page.locator('.roll-tabs').evaluate(el=>{el.scrollLeft=0});
    const rect=await page.locator('.roll-btn').first().boundingBox();
    const cdp=await context.newCDPSession(page);
    const point={x:rect.x+rect.width-32,y:rect.y+rect.height-12,id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    for(let step=1;step<=6;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...point,x:point.x-step*10}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
    await page.waitForTimeout(200);
    assert.ok(await page.locator('.roll-tabs').evaluate(el=>el.scrollLeft>0),'Ordinary touch swipe scrolls versions without invoking reorder');
    await page.locator('.roll-tabs').evaluate(el=>{el.scrollLeft=0});
   }
   await shot('versions');
   await page.locator('.version-import input').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"headword":{"title":"bad"},"senses":[null]}')});
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),5,'Malformed JSON structures are rejected');
   await dismiss();
   await page.evaluate(()=>deleteModalVersions(getHistory()[0].rolls.map(roll=>String(roll.id))));
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),5,'Last version protection applies to bulk actions too');
   await dismiss();
   await page.reload();await page.waitForFunction(()=>typeof openHistoryModal==='function');
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),5);
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.find(roll=>roll.id==='a').name),'主要解释','Version names survive refresh');
   await page.evaluate(()=>{openHistoryModal(1);openVersionManager()});
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls[0].result.headword.title),'imported');
   // Production quota failure must leave all versions intact.
   await page.evaluate(()=>{window.__commit=commitStorageChanges;commitStorageChanges=()=>{throw new DOMException('quota','QuotaExceededError')}});
   await click(page.locator('.version-row').last().getByRole('button',{name:'删除版本',exact:true}));
   await click(page.locator('#confirm-ok'));
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),5);
   await page.evaluate(()=>{commitStorageChanges=__commit});
   await dismiss();
   await page.evaluate(()=>{
    const rolls=getHistory()[0].rolls;
    versionSelection=new Set([String(rolls[0].id),String(rolls[1].id)]);
    renderVersionManager();
   });
   await click(page.getByRole('button',{name:'对比与整合',exact:true}));
   await page.evaluate(()=>{
    const item=getHistory()[0],rolls=item.rolls.map((roll,index)=>index?roll:{...roll,updatedAt:new Date().toISOString(),result:{...roll.result,headword:{...roll.result.headword,title:'changed remotely'}}});
    setHistory([{...item,rolls,updatedAt:new Date().toISOString()}]);
   });
   await click(page.getByRole('button',{name:'保存为新版本',exact:true}));
   assert.equal(await page.evaluate(()=>getHistory()[0].rolls.length),5,'Changed source blocks stale integration');
   await dismiss();
   await page.evaluate(()=>{openHistoryModal(1);setModalTab('json',document.getElementById('modal-json-tab'));const data=JSON.parse(els.modalJsonEdit.value);data.headword.title='exported draft';els.modalJsonEdit.value=JSON.stringify(data)});
   const download=page.waitForEvent('download');
   await page.evaluate(()=>exportModalJSON());
   const downloaded=await download;
   assert.equal(JSON.parse(fs.readFileSync(await downloaded.path(),'utf8')).headword.title,'exported draft','JSON export reads current draft');
   await page.evaluate(()=>{closeHistoryModal();openHistoryModal(1);openVersionManager()});
   await page.evaluate(()=>{window.__staleGeneration=JSON.parse(JSON.stringify(getHistory()[0]))});
   await click(page.locator('.version-row').last().getByRole('button',{name:'删除版本',exact:true}));
   await click(page.locator('#confirm-ok'));
   const generated=await page.evaluate(()=>{
    const result={headword:{title:'a new generation',coreMeaning:'fresh'},senses:[]};
    saveLookupResult({query:'clok',result,existingId:1,sourceItem:__staleGeneration,modelInfo:{model:'new model'}});
    const item=getHistory()[0],merged=mergeHistoryItems([item],[__staleGeneration])[0];
    return {count:item.rolls.length,mergedCount:merged.rolls.length,first:merged.rolls[0].result.headword.title};
   });
   assert.deepEqual(generated,{count:5,mergedCount:5,first:'a new generation'},'Generation uses live versions and promotes its default order without reviving deletion');
   assert.deepEqual(errors,[]);
   console.log(`Version UI passed: ${width}px ${theme}, naming/default/delete/cancel/undo/stale-sync/integration/import/draft/order/scroll/quota.`);
   await context.close();
  }
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
