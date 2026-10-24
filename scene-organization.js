(function(root){
  const esc=escapeHTML,owner=()=>cloudUser?.id||'local';
  const selections={scenes:new Set(),folders:new Set()};let selectionOwner=owner(),mode={scenes:false,folders:false};
  const group=id=>SceneUI.sceneGroups().find(row=>row.scene.groupId===id);
  function state(id){
    const record=getSettings().sceneOrganization?.[id]||{},favorite=record.favorite?.value===true;
    return {favorite,pinned:record.pinned?.value===true,folderIds:favorite?normalizeSelectableFolderIds(record.folders?.value||[]).filter(id=>id!==FOLDER_LIKED_ID):[]};
  }
  const key=target=>`${target.type}:${target.id}`;
  function refresh(){renderFoldersView();if(activeView==='scenes')SceneWorkspace.render();enhance()}
  function apply(targets,operation,folderIds=[],initial=null){
    const account=owner(),settings=getSettings(),history=getHistory(),organization=SceneData.mergeOrganization(settings.sceneOrganization),before=[],after=[];
    const clock=new Date(Object.values(organization).reduce((max,v)=>Object.values(v).reduce((n,f)=>Math.max(n,Date.parse(f.updatedAt)||0),max),Date.now())+1).toISOString();
    const ids=new Set(normalizeSelectableFolderIds(folderIds).filter(id=>id!==FOLDER_LIKED_ID));
    const targetsByKey=new Map(targets.map(t=>[key(t),t]));
    const validGroups=new Set(SceneUI.sceneGroups().map(g=>g.scene.groupId));
    for(const target of targetsByKey.values())if(target.type==='scene'&&validGroups.has(target.id)){
      const record=organization[target.id]||{},previous=JSON.parse(JSON.stringify(record)),current=state(target.id),next={...record};
      const set=(field,value)=>next[field]={value,updatedAt:clock};
      if(operation==='pin')set('pinned',!current.pinned);
      if(operation==='favorite'||operation==='unfavorite'){set('favorite',operation==='favorite');if(operation==='unfavorite')set('folders',[])}
      if(operation==='folders'){
        const removed=new Set((initial||[]).filter(id=>!ids.has(id))),added=[...ids].filter(id=>!(initial||[]).includes(id));
        const folders=initial?current.folderIds.filter(id=>!removed.has(id)).concat(added):[...new Set([...current.folderIds,...ids])];
        set('folders',[...new Set(folders)].sort());if(folders.length||folderIds.includes(FOLDER_LIKED_ID))set('favorite',true);
        else if(initial?.includes(FOLDER_LIKED_ID)&&!folderIds.includes(FOLDER_LIKED_ID)){set('favorite',false);set('folders',[])}
      }
      if(operation==='remove-folder')set('folders',current.folderIds.filter(id=>!ids.has(id)));
      organization[target.id]=next;before.push({target,record:previous});after.push({target,record:JSON.parse(JSON.stringify(next))});
    }
    const nextHistory=history.map(item=>{
      if(!targetsByKey.has(`entry:${item.id}`))return item;
      const previous={favorite:Boolean(item.favorite),folderIds:item.folderIds||[],favoriteUpdatedAt:item.favoriteUpdatedAt||'',foldersUpdatedAt:item.foldersUpdatedAt||''};
      let favorite=previous.favorite,folders=[...previous.folderIds];
      if(operation==='favorite')favorite=true;
      if(operation==='unfavorite'){favorite=false;folders=[]}
      if(operation==='folders'){favorite=true;folders=[...new Set([...folders,...ids])]}
      if(operation==='remove-folder')folders=folders.filter(id=>!ids.has(id));
      const next={...item,favorite,folderIds:folders,favoriteUpdatedAt:clock,foldersUpdatedAt:clock};
      before.push({target:{type:'entry',id:String(item.id)},record:previous});after.push({target:{type:'entry',id:String(item.id)},record:{favorite,folderIds:folders,favoriteUpdatedAt:clock,foldersUpdatedAt:clock}});return next;
    });
    if(!before.length)return false;
    if(!setHistoryAndSettings(nextHistory,{...settings,sceneOrganization:organization,updatedAt:clock}))return false;
    refresh();notify(`已整理 ${before.length} 项。`,'good','整理',true,{label:'撤销',run:()=>{
      if(owner()!==account)return notify('账号已切换，未撤销。','warn','撤销');
      const live=getSettings(),records=SceneData.mergeOrganization(live.sceneOrganization),now=new Date(Math.max(Date.now(),Date.parse(clock)+1)).toISOString(),restored=new Set(),currentGroups=new Set(SceneUI.sceneGroups().map(g=>g.scene.groupId));
      for(const entry of before)if(entry.target.type==='scene'&&currentGroups.has(entry.target.id)){
        const expected=after.find(row=>key(row.target)===key(entry.target)).record,current=records[entry.target.id]||{};
        if(JSON.stringify(SceneData.mergeOrganization({record:current}))!==JSON.stringify(SceneData.mergeOrganization({record:expected})))continue;
        const next={...current};for(const field of ['favorite','pinned','folders'])if(expected[field]?.updatedAt===clock)next[field]={value:entry.record[field]?.value??(field==='folders'?[]:false),updatedAt:now};
        records[entry.target.id]=next;restored.add(key(entry.target));
      }
      const entries=getHistory().map(item=>{
        const previous=before.find(row=>row.target.type==='entry'&&String(row.target.id)===String(item.id));if(!previous)return item;
        const expected=after.find(row=>key(row.target)===key(previous.target)).record,current={favorite:Boolean(item.favorite),folderIds:item.folderIds||[],favoriteUpdatedAt:item.favoriteUpdatedAt||'',foldersUpdatedAt:item.foldersUpdatedAt||''};
        if(JSON.stringify(current)!==JSON.stringify(expected))return item;
        restored.add(key(previous.target));return {...item,...previous.record,folderIds:normalizeSelectableFolderIds(previous.record.folderIds).filter(id=>id!==FOLDER_LIKED_ID),favoriteUpdatedAt:now,foldersUpdatedAt:now};
      });
      if(!restored.size)return notify('内容已删除或整理状态已有后续变化，未覆盖。','warn','撤销');
      if(setHistoryAndSettings(entries,{...live,sceneOrganization:records,updatedAt:now}))refresh();
    }});return true;
  }
  function controls(id){const s=state(id);return `<span class="scene-organize-actions" data-organize-group="${esc(id)}"><button class="icon-btn ${s.favorite?'active':''}" data-organize="${s.favorite?'unfavorite':'favorite'}" aria-label="${s.favorite?'取消收藏场景':'收藏场景'}" aria-pressed="${s.favorite}" data-tip="${s.favorite?'取消收藏':'收藏场景'}">${icon('star')}</button><button class="icon-btn ${s.pinned?'active':''}" data-organize="pin" aria-label="${s.pinned?'取消置顶场景':'置顶场景'}" aria-pressed="${s.pinned}" data-tip="${s.pinned?'取消置顶':'置顶场景'}">${icon('pin')}</button><button class="icon-btn" data-organize="folders" aria-label="整理场景到收藏夹" data-tip="收藏夹">${icon('folder-plus')}</button></span>`}
  function folderIds(id){const s=state(id);return [...(s.favorite?[FOLDER_LIKED_ID]:[]),...s.folderIds]}
  function folderEntries(folderId,entries,type=folderState.contentType||'all'){
    if(folderId===FOLDER_INSIGHTS_ID&&!folderSearchIsGlobal())return entries;
    const scenes=SceneUI.sceneGroups().filter(({scene,links})=>{
      const s=state(scene.groupId);return s.favorite&&(folderSearchIsGlobal()||folderIds(scene.groupId).includes(folderId))&&LearningTools.matches([scene.title,scene.quote,scene.translation,scene.sourceTitle,scene.note,...links.map(historyDisplayTitle)],folderState.query);
    }).map(g=>({__scene:g, id:`scene:${g.scene.groupId}`,createdAt:g.scene.createdAt,updatedAt:g.scene.updatedAt}));
    const all=[...(type==='scene'?[]:entries),...(type==='entry'?[]:scenes)];
    return all.sort((a,b)=>Number(Boolean(b.__scene&&state(b.__scene.scene.groupId).pinned))-Number(Boolean(a.__scene&&state(a.__scene.scene.groupId).pinned))||(folderState.sort==='title'?historyCollator.compare(a.__scene?.scene.title||a.__scene?.scene.quote||historyDisplayTitle(a),b.__scene?.scene.title||b.__scene?.scene.quote||historyDisplayTitle(b)):Date.parse(b[folderState.sort==='created'?'createdAt':'updatedAt']||0)-Date.parse(a[folderState.sort==='created'?'createdAt':'updatedAt']||0))||String(a.id).localeCompare(String(b.id)));
  }
  function row(item){const {scene,links}=item.__scene;return `<div class="history-item scene-favorite-row" data-open-row data-scene-favorite="${esc(scene.groupId)}"><div class="history-copy"><div class="history-word"><a data-row-link href="/scenes?scene=${encodeURIComponent(scene.groupId)}">${esc(scene.title||scene.quote||scene.sourceTitle||'未命名场景')}</a></div><p class="history-summary">${highlightText(scene.quote,scene.exampleHighlights)}</p>${scene.translation?`<p class="history-summary">${highlightText(scene.translation,scene.translationHighlights)}</p>`:''}<div class="history-meta"><span>场景 · ${links.length} 个词条</span>${scene.sourceTitle?`<span>${esc(scene.sourceTitle)}</span>`:''}${SceneUI.timeMeta(scene)}</div></div>${controls(scene.groupId)}</div>`}
  function enhance(host=document){
    if(selectionOwner!==owner()){selectionOwner=owner();selections.scenes.clear();selections.folders.clear();mode={scenes:false,folders:false}}
    host.querySelectorAll('[data-scene-favorite]').forEach(row=>RowNavigation.bind(row,()=>{showView('scenes',null,{focus:false});SceneWorkspace.select(row.dataset.sceneFavorite)}));
    document.querySelectorAll('[data-learning-entry]').forEach(row=>{const meta=row.querySelector('.history-meta');if(!meta)return;let label=meta.querySelector('[data-entry-learning-state]');if(!label){label=document.createElement('span');label.dataset.entryLearningState='';meta.append(label)}const text=SceneStudy.labels[getSettings().entryLearning?.[row.dataset.learningEntry]?.state?.value||'new'];if(label.textContent!==text)label.textContent=text});
    document.querySelectorAll('[data-scene-group]').forEach(row=>{const actions=row.querySelector(':scope>header .scene-actions');if(actions&&!actions.querySelector('[data-organize-group]'))actions.insertAdjacentHTML('afterbegin',controls(row.dataset.sceneGroup))});
    document.querySelectorAll('[data-select-scene]').forEach(row=>{
      const s=state(row.dataset.selectScene),copy=row.querySelector('.scene-list-copy');if(!copy)return;
      let label=copy.querySelector('[data-organization-label]');if(!label){label=document.createElement('small');label.dataset.organizationLabel='';copy.append(label)}
      const text=[s.pinned?'已置顶':'',s.favorite?'已收藏':''].filter(Boolean).join(' · ');if(label.textContent!==text)label.textContent=text;label.hidden=!label.textContent;
    });
    document.querySelectorAll('[data-organize-group]').forEach(container=>{
      const id=container.dataset.organizeGroup,s=state(id),account=owner();
      container.querySelectorAll('[data-organize]').forEach(button=>{const action=button.dataset.organize;button.onclick=event=>{event.stopPropagation();if(account!==owner())return notify('账号已切换，请重新打开。','warn','整理');const operation=button.dataset.organize;if(operation==='folders')openFolderSelectModal({type:'scene',sceneIds:[id]});else apply([{type:'scene',id}],operation)};
        if(['favorite','unfavorite'].includes(action)){button.dataset.organize=s.favorite?'unfavorite':'favorite';button.classList.toggle('active',s.favorite);button.setAttribute('aria-pressed',String(s.favorite));button.setAttribute('aria-label',s.favorite?'取消收藏场景':'收藏场景')}
        if(action==='pin'){button.classList.toggle('active',s.pinned);button.setAttribute('aria-pressed',String(s.pinned))}
      });
    });
    const toolbar=document.querySelector('.folder-toolbar');if(toolbar&&!toolbar.querySelector('[data-folder-content-type]')){
      const select=document.createElement('select');select.dataset.folderContentType='';select.setAttribute('aria-label','收藏内容类型');select.innerHTML='<option value="all">全部内容</option><option value="entry">词条</option><option value="scene">场景</option>';select.value=folderState.contentType||'all';select.onchange=()=>{folderState.contentType=select.value;rememberViewPreference('folders');renderFoldersView()};toolbar.querySelector('[data-reset-browse]').before(select);
    }
    const typeSelect=toolbar?.querySelector('[data-folder-content-type]');if(typeSelect){
      if(typeSelect!==document.activeElement)typeSelect.value=folderState.contentType||'all';
      const all=filteredFolderEntries(folderState.activeId,historyForFolder(folderState.activeId),'all'),scenes=all.filter(item=>item.__scene).length,counts={all:all.length,entry:all.length-scenes,scene:scenes};
      for(const option of typeSelect.options){const text=`${({all:'全部内容',entry:'词条',scene:'场景'})[option.value]} ${counts[option.value]}`;if(option.textContent!==text)option.textContent=text}
    }
    for(const scope of ['scenes','folders'])enhanceSelection(scope);
  }
  const targetFromKey=value=>{const split=value.indexOf(':');return {type:value.slice(0,split),id:value.slice(split+1)}};
  function toggle(scope,target){const id=key(target),selected=selections[scope];if(selected.has(id))selected.delete(id);else selected.add(id);enhanceSelection(scope)}
  function enhanceSelection(scope){
    const rootNode=document.querySelector(scope==='scenes'?'#scene-hub':'#folder-panel'),heading=rootNode?.querySelector(scope==='scenes'?'.scene-library-head':'.folder-content-head');if(!heading)return;
    let bar=rootNode.querySelector(`[data-learning-selection="${scope}"]`);if(!bar){bar=document.createElement('div');bar.className='learning-selection-bar';bar.dataset.learningSelection=scope;heading.after(bar)}
    const selected=selections[scope],html=`<button class="plain-btn" data-select-mode>${icon(mode[scope]?'x':'square-check')}<span>${mode[scope]?'退出多选':'多选整理'}</span></button>${mode[scope]?`<span role="status">已选 ${selected.size} 项</span><button class="icon-btn" data-bulk="favorite" aria-label="收藏所选内容" data-tip="收藏">${icon('star')}</button><button class="icon-btn" data-bulk="folders" aria-label="所选内容加入收藏夹" data-tip="加入收藏夹">${icon('folder-plus')}</button>${scope==='folders'?`<button class="icon-btn" data-bulk="remove-folder" aria-label="从当前收藏夹移出所选内容" data-tip="移出当前收藏夹">${icon('bookmark-x')}</button>`:''}<button class="icon-btn" data-bulk="unfavorite" aria-label="取消收藏所选内容" data-tip="取消收藏">${icon('star')}</button>`:''}`;
    if(bar.dataset.content!==html||bar.dataset.owner!==owner()){bar.dataset.content=html;bar.dataset.owner=owner();const account=owner();bar.innerHTML=html;bar.querySelector('[data-select-mode]').onclick=()=>{if(account!==owner())return;mode[scope]=!mode[scope];if(!mode[scope])selected.clear();enhanceSelection(scope)};
      bar.querySelectorAll('[data-bulk]').forEach(button=>{button.disabled=!selected.size;button.onclick=()=>{
        if(account!==owner())return notify('账号已切换，请重新选择。','warn','整理');const targets=[...selected].map(targetFromKey),operation=button.dataset.bulk;if(!targets.length)return;
        if(operation==='folders'){openFolderSelectModal({type:'learning',targets});return}
        if(operation==='remove-folder'&&(!folderState.activeId||folderState.activeId===FOLDER_INSIGHTS_ID||folderSearchIsGlobal()))return notify('请先打开具体收藏夹。','info','整理');
        const action=operation==='remove-folder'&&folderState.activeId===FOLDER_LIKED_ID?'unfavorite':operation;
        if(apply(targets,action,operation==='remove-folder'?[folderState.activeId]:[])){selected.clear();enhanceSelection(scope)};
      }});
    }
    const rows=scope==='scenes'?rootNode.querySelectorAll('.scene-list-row'):rootNode.querySelectorAll('.history-item[data-learning-entry],.history-item[data-scene-favorite]');
    for(const row of rows){
      const target=scope==='scenes'?{type:'scene',id:row.dataset.selectScene}:row.dataset.sceneFavorite?{type:'scene',id:row.dataset.sceneFavorite}:{type:'entry',id:row.dataset.learningEntry};
      if(scope==='folders')RowNavigation.bind(row,()=>{if(mode.folders)toggle(scope,target);else if(target.type==='scene'){showView('scenes',null,{focus:false});SceneWorkspace.select(target.id)}else openHistoryModal(target.id)});
      let wrapper=row;if(row.tagName==='BUTTON'||scope==='scenes'){
        if(!row.parentElement.classList.contains('learning-selectable-row')){wrapper=document.createElement('div');wrapper.className='learning-selectable-row';row.before(wrapper);wrapper.append(row)}else wrapper=row.parentElement;
      }
      if(scope==='scenes'){
        let favorite=wrapper.querySelector(':scope>[data-list-favorite]');if(!favorite){favorite=document.createElement('button');favorite.type='button';favorite.className='icon-btn';favorite.dataset.listFavorite='';favorite.innerHTML=icon('star');wrapper.append(favorite)}
        const active=state(target.id).favorite,account=owner();favorite.classList.toggle('active',active);favorite.setAttribute('aria-pressed',String(active));favorite.setAttribute('aria-label',active?'取消收藏场景':'收藏场景');favorite.dataset.tip=active?'取消收藏':'收藏场景';favorite.onclick=event=>{event.stopPropagation();if(account===owner())apply([target],state(target.id).favorite?'unfavorite':'favorite')};
      }
      let label=wrapper.querySelector(':scope>.learning-row-check');if(!mode[scope]){label?.remove();continue}
      if(!label){label=document.createElement('label');label.className='learning-row-check';label.innerHTML='<input type="checkbox">';wrapper.prepend(label)}
      const input=label.querySelector('input');input.setAttribute('aria-label',`选择${row.querySelector('strong,.history-word')?.textContent||'内容'}`);input.checked=selected.has(key(target));input.onchange=()=>toggle(scope,target);
    }
  }
  function selectSceneRow(event,id){if(!mode.scenes)return false;RowNavigation.open(event,()=>toggle('scenes',{type:'scene',id}),event.target.closest('[data-select-scene]'));return true}
  function reviewCards(entries){return entries.flatMap(item=>{
    if(!item.__scene)return LearningTools.reviewDeck([{id:item.id,title:historyDisplayTitle(item),result:latestHistoryResult(item),contentKey:stableHash(historyRollContentKey(getHistoryRolls(item)[0]||{}))}]);
    const {scene}=item.__scene;return [{key:`scene:${scene.groupId}:${stableHash(JSON.stringify(scene))}`,kind:'scene',sceneGroupId:scene.groupId,prompt:scene.title||scene.sourceTitle||'场景回顾'}];
  })}
  function renderSceneReview(card,body){
    if(!card.sceneGroupId)return false;
    const current=group(card.sceneGroupId);if(!current){body.innerHTML='<p>此场景已删除。</p><button class="plain-btn" onclick="rateReview(\'skip\')">下一项</button>';return true}
    const {scene,links}=current;
    body.innerHTML=`<div class="review-question"><div class="review-kicker">场景</div><h2>${esc(card.prompt)}</h2><blockquote>${highlightText(scene.quote,scene.exampleHighlights)}</blockquote><div class="scene-media review-scene-media">${SceneUI.assets(scene.media)}</div><div class="review-answer" ${reviewSession.revealed?'':'hidden'}><p>${highlightText(scene.translation,scene.translationHighlights)}</p>${links.map(item=>`<div class="review-linked-entry"><button class="scene-task-link" data-review-entry="${esc(item.id)}">${esc(historyDisplayTitle(item))}</button><p>${esc(SceneStudy.meaning(item))}</p><select aria-label="${esc(historyDisplayTitle(item))} 学习状态" data-review-study="${esc(item.id)}">${Object.entries(SceneStudy.labels).map(([state,label])=>`<option value="${state}" ${SceneStudy.state(item,scene.groupId)===state?'selected':''}>${label}</option>`).join('')}</select></div>`).join('')||'<p>尚未关联词条，可查看场景，不会自动标记掌握。</p>'}</div><small>${esc([scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · '))}</small></div><div class="review-controls"><button class="plain-btn review-reveal" aria-expanded="${reviewSession.revealed}" onclick="revealReview()">${reviewSession.revealed?'隐藏释义':'显示释义'}</button><button class="plain-btn" onclick="rateReview('skip')">下一项</button><button class="scene-task-link" data-review-source>打开场景</button></div>`;
    body.querySelectorAll('[data-review-entry]').forEach(button=>button.onclick=()=>{closeReview();openHistoryModal(button.dataset.reviewEntry)});
    body.querySelectorAll('[data-review-study]').forEach(select=>select.onchange=()=>{try{SceneStudy.setState(select.dataset.reviewStudy,scene.groupId,select.value)}catch(error){notify(error.message,'warn','学习状态');renderSceneReview(card,body)}});
    body.querySelector('[data-review-source]').onclick=()=>{closeReview();showView('scenes',null,{focus:false});SceneWorkspace.select(scene.groupId)};return true;
  }
  function rate(card,rating){
    if(card?.kind!=='word'||!['known','again'].includes(rating))return true;
    const current=getHistory().find(item=>String(item.id)===String(card.historyId));if(!current)return false;
    if(card.key!==`${current.id}:${stableHash(historyRollContentKey(getHistoryRolls(current)[0]||{}))}`){notify('词条内容已有变化，请重新开始回顾。','warn','学习状态');return false}
    const account=owner(),settings=getSettings(),records=SceneData.mergeOrganization(settings.entryLearning),id=String(card.historyId),before=records[id]?.state?.value||'new';
    const updatedAt=new Date(Math.max(Date.now(),Date.parse(records[id]?.state?.updatedAt)||0)+1).toISOString(),after={value:rating==='known'?'mastered':'review',updatedAt};records[id]={state:after};
    if(!setSettings({...settings,entryLearning:records,updatedAt}))return false;
    notify('词条学习状态已保存。','good','学习',true,{label:'撤销',run:()=>{
      if(owner()!==account||!getHistory().some(item=>String(item.id)===id)||JSON.stringify(getSettings().entryLearning?.[id]?.state)!==JSON.stringify(after))return notify('账号、词条或学习状态已有变化，未覆盖。','warn','撤销');
      const latest=getSettings(),now=new Date(Math.max(Date.now(),Date.parse(updatedAt)+1)).toISOString();setSettings({...latest,entryLearning:{...latest.entryLearning,[id]:{state:{value:before,updatedAt:now}}},updatedAt:now});
    }});return true;
  }
  document.addEventListener('click',event=>{const button=event.target.closest('[data-scene-organize-menu]');if(button)openFolderSelectModal({type:'scene',sceneIds:[button.dataset.sceneOrganizeMenu]})});
  root.SceneOrganization={state,group,apply,controls,folderIds,folderEntries,row,enhance,selectSceneRow,reviewCards,renderSceneReview,rate};
  if(activeView==='scenes')SceneWorkspace.render();if(activeView==='folders')renderFoldersView();
})(globalThis);
