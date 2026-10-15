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
    for(const width of [390,1440])for(const theme of ['light','dark']){
      const context=await browser.newContext({viewport:{width,height:844},hasTouch:width<900,isMobile:width<900,acceptDownloads:true});
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(theme=>{
        localStorage.setItem('ai_vocab_tool_offline_mode','1');
        localStorage.setItem('ai_vocab_tool_theme',theme);
        window.__spoken=[];
        window.__cancels=0;
        Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'en-US',name:'Test'}],cancel:()=>{window.__cancels++},speak:utterance=>{window.__spoken.push({text:utterance.text,lang:utterance.lang});window.__utterance=utterance;utterance.onstart?.()}}});
        window.SpeechSynthesisUtterance=function(text){this.text=text};
      },theme);
      await page.route('https://**/*',route=>route.abort());
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(()=>typeof renderResult==='function');
      const click=async locator=>{
        await locator.evaluate(node=>node.scrollIntoView({block:'center',behavior:'instant'}));
        await page.waitForTimeout(260);
        try{
          if(width>=900)return await locator.click({timeout:10000});
          let point=await locator.evaluate(node=>{
            const rect=node.getBoundingClientRect();
            const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
            const hit=document.elementFromPoint(x,y);
            return {x,y,reachable:node.contains(hit),notification:Boolean(hit?.closest('.toast'))};
          });
          if(!point.reachable&&point.notification){
            await click(page.locator('#toast-stack .toast-close').last());
            await page.waitForTimeout(300);
            point=await locator.evaluate(node=>{const r=node.getBoundingClientRect();const x=r.x+r.width/2,y=r.y+r.height/2;return {x,y,reachable:node.contains(document.elementFromPoint(x,y))}});
          }
          assert.ok(point.reachable,`Touch control is obscured: ${locator}`);
          await page.touchscreen.tap(point.x,point.y);
        }
        catch(error){
          console.log(await locator.evaluate(node=>{const r=node.getBoundingClientRect();return {target:node.outerHTML,rect:{x:r.x,y:r.y,width:r.width,height:r.height},scrollY,hit:document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.outerHTML}}));
          if(process.env.QA_SCREENSHOTS)await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,'failure.png')});
          throw error;
        }
      };
      const shot=async name=>{
        console.log(`Checking ${name}: ${width}px ${theme}`);
        if(await page.locator('#toast-stack .toast:not(.leaving) .toast-close').count()){
          await click(page.locator('#toast-stack .toast:not(.leaving) .toast-close').last());
          await page.waitForTimeout(300);
        }
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${name} page overflow`);
        if(process.env.QA_SCREENSHOTS){
          fs.mkdirSync(process.env.QA_SCREENSHOTS,{recursive:true});
          await page.screenshot({path:path.join(process.env.QA_SCREENSHOTS,`${name}-${width}-${theme}.png`)});
        }
      };
      await page.evaluate(()=>{
        const now=new Date().toISOString();
        const result=(title,meaning,language='English')=>({meta:{origin:title==='clock'?'clok':title,query:title==='clock'?'clok':title,language},headword:{title,coreMeaning:meaning,summary:meaning},senses:[{shortestLabel:meaning,partOfSpeech:'verb',meaning,example:`I clocked the guard. ${title}`,translation:'我注意到了守卫。'},{shortestLabel:'计时',partOfSpeech:'verb',meaning:'Measure time',example:'Clock the race.',translation:'为比赛计时。'}],collocations:[{phrase:'clock in',meaning:'打卡',example:'Clock in at nine.',translation:'九点打卡。'}],confusions:[{term:'notice',difference:'Neutral',usage:'Common'}],register:{style:'informal',tone:'casual',environment:'dialogue'}});
        setSettings({...getSettings(),favoriteFolders:[{id:'folder_a',name:'剧情词汇',createdAt:now,updatedAt:now,order:0},{id:'folder_b',name:'写作',createdAt:now,updatedAt:now,order:1}]});
        setHistory([{id:1,query:'clok',result:result('clock','注意到'),favorite:true,folderIds:['folder_a'],tags:['old-tag'],note:'**personal note**',createdAt:now,updatedAt:now},{id:2,query:'notice',result:result('notice','察觉'),favorite:true,folderIds:['folder_a'],createdAt:now,updatedAt:now},{id:3,query:'世界',result:result('世界','world','Japanese'),favorite:true,createdAt:now,updatedAt:now}]);
        currentHistoryId=1;
        renderResult(latestHistoryResult(getHistory().find(item=>item.id===1)));
      });
      await click(page.locator('#result-card .entry-title-row .speech-btn'));
      assert.deepEqual(await page.evaluate(()=>__spoken.at(-1)),{text:'clock',lang:'en-US'});
      await click(page.locator('#result-card .entry-title-row .speech-btn'));
      assert.equal(await page.evaluate(()=>speechPlayback),null);
      await click(page.locator('#result-card .spoken-example .speech-btn').first());
      assert.ok((await page.evaluate(()=>__spoken.at(-1).text)).includes('clocked'));
      await page.evaluate(()=>__utterance.onerror({error:'voice-unavailable'}));
      assert.equal(await page.locator('#result-card .speech-btn.speaking').count(),0);
      await click(page.locator('#result-card .fragment-pin-btn').first());
      assert.equal(await page.evaluate(()=>getHistory().find(item=>item.id===1).fragmentPins.length),1);
      await shot('lookup');

      await page.evaluate(()=>openFolderView('folder_a'));
      await page.locator('#folder-search').fill('clock personal');
      await page.waitForTimeout(180);
      assert.equal(await page.locator('#folder-history-list .history-item').count(),1);
      assert.equal(await page.locator('#folder-search').evaluate(node=>node===document.activeElement),true);
      await shot('folder-search');
      const downloadPromise=page.waitForEvent('download');
      await click(page.locator('#folder-content-head [aria-label="导出 Markdown"]'));
      const download=await downloadPromise;
      assert.equal(path.extname(download.suggestedFilename()),'.md');
      const markdown=fs.readFileSync(await download.path(),'utf8');
      assert.ok(markdown.includes('# clock')&&markdown.includes('clok')&&markdown.includes('注意到')&&markdown.includes('personal note'));
      await click(page.locator('#folder-search-clear'));
      await click(page.locator('#folder-content-head [aria-label="复习当前列表"]'));
      assert.equal(await page.locator('#review-progress').textContent(),'1 / 2');
      assert.equal(await page.locator('.review-answer').isVisible(),false);
      assert.equal(await page.locator('#review-content button:has-text("已掌握")').isDisabled(),true);
      await click(page.locator('.review-reveal'));
      await shot('review');
      await click(page.locator('#review-content button:has-text("待巩固")'));
      assert.equal(await page.locator('#review-progress').textContent(),'2 / 2');
      await click(page.locator('#review-close'));
      await page.reload();
      await page.waitForFunction(()=>typeof startFolderReview==='function');
      await click(page.locator('#folder-content-head [aria-label="复习当前列表"]'));
      assert.equal(await page.locator('#review-progress').textContent(),'2 / 2','Review resumes after reload');
      await click(page.locator('#review-content [aria-label="跳过"]'));
      assert.ok((await page.locator('.review-summary p').textContent()).includes('待巩固 1'));
      await click(page.locator('.review-summary button'));
      assert.equal(await page.locator('#review-progress').textContent(),'1 / 2');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#review-modal').isVisible(),false);

      await page.evaluate(()=>openFolderView('insights'));
      await page.locator('#folder-search').fill('clock 注意到');
      await page.waitForTimeout(180);
      assert.equal(await page.locator('.fragment-library-item').count(),1);
      await click(page.locator('#folder-content-head [aria-label="复习当前列表"]'));
      assert.equal(await page.locator('.review-question h2').textContent(),'clock');
      assert.equal(await page.locator('.review-answer').isVisible(),false);
      await click(page.locator('#review-close'));
      const remove=page.locator('.fragment-library-remove');
      await remove.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#history-modal').isVisible(),false,'Nested fragment button must not open detail');

      await page.evaluate(()=>showView('history'));
      const folderButton=page.locator('#history-list .history-actions [aria-label="添加到收藏夹"]').first();
      await folderButton.focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('#folder-select-modal').isVisible(),true);
      assert.equal(await page.locator('#history-modal').isVisible(),false,'Nested history button must not open detail');
      await page.evaluate(()=>closeFolderSelectModal());
      await click(page.locator('#history-selection-toggle'));
      await click(page.locator('#history-select-matching'));
      assert.equal(await page.locator('#history-selection-count').textContent(),'已选 3 条');
      await shot('history-selection');
      await page.evaluate(()=>{window.__beforeBatch=getHistory()});
      await click(page.locator('#history-selection-bar [aria-label="批量加入收藏夹"]'));
      await page.locator('#folder-select-list input[value="folder_b"]').check();
      await click(page.locator('#folder-select-modal button:has-text("确定")'));
      assert.deepEqual(await page.evaluate(()=>getHistory().find(item=>item.id===1).folderIds.sort()),await page.evaluate(()=>[...new Set([...__beforeBatch.find(item=>item.id===1).folderIds,'folder_b'])].sort()));
      assert.deepEqual(await page.evaluate(()=>getHistory().find(item=>item.id===1).tags),['old-tag']);
      assert.equal(await page.evaluate(()=>getHistory().find(item=>item.id===1).favorite),true);
      assert.ok(await page.evaluate(()=>mergeHistoryItems(getHistory(),__beforeBatch).find(item=>item.id===1).folderIds.includes('folder_b')),'Stale device merge retains bulk additions');
      const jsonPromise=page.waitForEvent('download');
      await click(page.locator('#history-selection-bar [aria-label="导出所选 JSON"]'));
      assert.equal(JSON.parse(fs.readFileSync(await (await jsonPromise).path(),'utf8')).length,3);
      await click(page.locator('#history-selection-bar [aria-label="删除所选"]'));
      await click(page.locator('#confirm-cancel'));
      assert.equal(await page.evaluate(()=>getHistory().length),3,'Canceling bulk delete keeps history');
      await click(page.locator('#history-selection-bar [aria-label="删除所选"]'));
      await click(page.locator('#confirm-ok'));
      await page.waitForFunction(()=>getHistory().length===0);
      assert.equal(await page.evaluate(()=>getHistoryTombstones().length),3);
      await click(page.locator('.toast-action:has-text("撤销")').last());
      assert.equal(await page.evaluate(()=>getHistory().length),3);
      assert.equal(await page.evaluate(()=>getHistoryTombstones().length),0);

      await page.evaluate(async()=>{
        currentResult=latestHistoryResult(getHistory().find(item=>item.id===1));
        const saved=navigator.clipboard.writeText;
        navigator.clipboard.writeText=async()=>{throw new Error('Denied')};
        await copyJSON();
        navigator.clipboard.writeText=saved;
      });
      assert.ok((await page.locator('#toast-stack').textContent()).includes('复制失败'));
      await page.evaluate(()=>openHistoryModal(1));
      await page.evaluate(()=>{regenerateModalHistory()});
      await click(page.locator('#confirm-cancel'));
      assert.equal(await page.locator('#history-modal').isVisible(),true,'Canceling regeneration retains the detail');
      await shot('detail');
      await page.evaluate(()=>{
        window.__historyBeforeFailure=localStorage.getItem(STORAGE_KEYS.history);
        window.__originalCommit=commitStorageChanges;
        commitStorageChanges=()=>{throw new DOMException('Quota exceeded','QuotaExceededError')};
      });
      await click(page.locator('#modal-card-page .fragment-pin-btn').first());
      assert.equal(await page.locator('#modal-card-page .fragment-pin-btn[aria-busy="true"]').count(),0,'Failed bookmark writes clear the busy indicator');
      assert.equal(await page.evaluate(()=>localStorage.getItem(STORAGE_KEYS.history)===__historyBeforeFailure),true);
      assert.ok(await page.evaluate(()=>!itemFolderIds(getHistory().find(item=>item.id===3)).includes('folder_a')),'Quota fixture must attempt a real addition');
      assert.equal(await page.evaluate(()=>addSelectedHistoryToFolders([3],['folder_a'])),false);
      assert.equal(await page.evaluate(()=>localStorage.getItem(STORAGE_KEYS.history)===__historyBeforeFailure),true,'Failed batch write is atomic');
      await page.evaluate(()=>{commitStorageChanges=__originalCommit});
      await click(page.locator('#modal-json-tab'));
      const draft=await page.evaluate(()=>({...modalResult,headword:{...modalResult.headword,title:'clock (edited)'}}));
      await page.locator('#modal-json-edit').fill(JSON.stringify(draft));
      const draftPromise=page.waitForEvent('download');
      await click(page.locator('.modal-file-actions [aria-label="导出 Markdown"]'));
      assert.ok(fs.readFileSync(await (await draftPromise).path(),'utf8').includes('# clock (edited)'),'Detail export uses the edited draft');
      await page.locator('#modal-json-edit').fill('{');
      await click(page.locator('.modal-file-actions [aria-label="导出 Markdown"]'));
      assert.ok((await page.locator('#toast-stack').textContent()).includes('JSON 错误'),'Invalid JSON prevents draft export');
      await page.locator('#modal-json-edit').fill(JSON.stringify(draft));
      await click(page.locator('#modal-visual-tab'));
      await click(page.locator('[data-visual-kind="senses"] .drag-handle').first());
      await click(page.locator('[data-visual-kind="senses"] .drag-handle').nth(1));
      assert.equal(await page.evaluate(()=>collectVisualResult().senses[0].shortestLabel),'计时','Visual reorder changes the collected data');
      await click(page.locator('#modal-visual-page button:has-text("保存可视化修改")'));
      await page.evaluate(()=>closeHistoryModal());
      await page.evaluate(()=>openHistoryModal(1));
      assert.equal(await page.evaluate(()=>modalResult.senses[0].shortestLabel),'计时','Visual order survives reopening');
      assert.equal(await page.evaluate(()=>modalResult.headword.title),'clock (edited)','JSON and visual edits share a draft');
      await page.evaluate(()=>closeHistoryModal());
      await page.evaluate(()=>{
        const now=new Date().toISOString();
        setSettings({...getSettings(),apiProfiles:[{id:'profile_a',name:'A',apiUrl:'https://example.com/v1/chat/completions',apiKey:'',model:'a',updatedAt:now},{id:'profile_b',name:'B',apiUrl:'https://example.com/v1/chat/completions',apiKey:'',model:'b',updatedAt:now}],apiProfileOrder:['profile_a','profile_b'],apiProfileOrderUpdatedAt:now,activeApiProfileId:'profile_a'});
        showView('settings');
      });
      await click(page.locator('#api-profile-menu-toggle'));
      await click(page.locator('[data-profile-id="profile_a"] .api-profile-drag'));
      await click(page.locator('[data-profile-id="profile_b"] .api-profile-drag'));
      assert.deepEqual(await page.evaluate(()=>getSettings().apiProfileOrder),['profile_b','profile_a'],'Model configuration order persists');
      await page.reload();
      await page.waitForFunction(()=>typeof getSettings==='function');
      assert.deepEqual(await page.evaluate(()=>getSettings().apiProfileOrder),['profile_b','profile_a'],'Model order survives reload');
      await page.evaluate(()=>{
        window.__undoCalls=[];
        notify('same','good','test',false,{label:'撤销',run:()=>__undoCalls.push('old')});
        notify('same','good','test',false,{label:'撤销',run:()=>__undoCalls.push('new')});
      });
      assert.equal(await page.locator('#toast-stack .toast').count(),1);
      await click(page.locator('#toast-stack .toast-action'));
      assert.deepEqual(await page.evaluate(()=>__undoCalls),['new'],'Repeated action notifications replace stale callbacks');
      assert.deepEqual(errors,[]);
      console.log(`Learning UI passed: ${width}px ${theme}, speech/search/export/review/resume/bulk/keyboard/cancel/undo.`);
      await context.close();
    }
  }finally{
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{console.error(error);process.exitCode=1});
