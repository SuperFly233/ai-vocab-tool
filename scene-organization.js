(function(root){
  const esc=escapeHTML,owner=()=>cloudUser?.id||'local';
  const selections={scenes:new Set(),folders:new Set()};let selectionOwner=owner(),mode={scenes:false,folders:false},folderSelectionContext=null;
  const group=id=>SceneUI.sceneGroups().find(row=>row.scene.groupId===id);
  function state(id){
    const record=getSettings().sceneOrganization?.[id]||{},favorite=record.favorite?.value===true;
    return {favorite,pinned:record.pinned?.value===true,folderIds:favorite?normalizeSelectableFolderIds(record.folders?.value||[]).filter(id=>id!==FOLDER_LIKED_ID):[]};
  }
  const key=target=>`${target.type}:${target.id}`;
  const entryRecord=item=>({favorite:Boolean(item.favorite),folderIds:item.folderIds||[],tags:item.tags||[],favoriteUpdatedAt:item.favoriteUpdatedAt||'',foldersUpdatedAt:item.foldersUpdatedAt||'',tagsUpdatedAt:item.tagsUpdatedAt||''});
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
      if(Object.entries(next).every(([field,value])=>JSON.stringify(value.value)===JSON.stringify(record[field]?.value??(field==='folders'?[]:false))))continue;
      organization[target.id]=next;before.push({target,record:previous});after.push({target,record:JSON.parse(JSON.stringify(next))});
    }
    const nextHistory=history.map(item=>{
      if(!targetsByKey.has(`entry:${item.id}`))return item;
      const previous=entryRecord(item);
      let favorite=previous.favorite,folders=[...previous.folderIds];
      if(operation==='favorite')favorite=true;
      if(operation==='unfavorite'){favorite=false;folders=[]}
      if(operation==='folders'&&folderIds.length){favorite=true;folders=[...new Set([...folders,...ids])]}
      if(operation==='remove-folder')folders=folders.filter(id=>!ids.has(id));
      const tags=operation==='unfavorite'?[]:operation==='remove-folder'?previous.tags.filter(tag=>!ids.has(legacyTagFolderId(tag))):previous.tags;
      const favoriteChanged=favorite!==previous.favorite,foldersChanged=JSON.stringify(folders)!==JSON.stringify(previous.folderIds),tagsChanged=JSON.stringify(tags)!==JSON.stringify(previous.tags);
      if(!favoriteChanged&&!foldersChanged&&!tagsChanged)return item;
      const next={...item,favorite,folderIds:folders,tags,favoriteUpdatedAt:favoriteChanged?clock:previous.favoriteUpdatedAt,foldersUpdatedAt:foldersChanged?clock:previous.foldersUpdatedAt,tagsUpdatedAt:tagsChanged?clock:previous.tagsUpdatedAt};
      before.push({target:{type:'entry',id:String(item.id)},record:previous});after.push({target:{type:'entry',id:String(item.id)},record:entryRecord(next)});return next;
    });
    if(!before.length)return targets.some(target=>target.type==='scene'?validGroups.has(target.id):history.some(item=>String(item.id)===String(target.id)));
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
        const expected=after.find(row=>key(row.target)===key(previous.target)).record,current=entryRecord(item);
        if(JSON.stringify(current)!==JSON.stringify(expected))return item;
        restored.add(key(previous.target));return {...item,...previous.record,folderIds:normalizeSelectableFolderIds(previous.record.folderIds).filter(id=>id!==FOLDER_LIKED_ID),favoriteUpdatedAt:now,foldersUpdatedAt:now,tagsUpdatedAt:now};
      });
      if(!restored.size)return notify('内容已删除或整理状态已有后续变化，未覆盖。','warn','撤销');
      if(setHistoryAndSettings(entries,{...live,sceneOrganization:records,updatedAt:now}))refresh();
    }});return true;
  }
  function controls(id){const s=state(id);return `<span class="scene-organize-actions" data-organize-group="${esc(id)}">${SharedUI.command('添加到收藏夹','folder-plus',`data-organize="folders" aria-pressed="${s.favorite}"`)}${SharedUI.command(s.pinned?'取消置顶场景':'置顶场景','pin','data-organize="pin"')}</span>`}
  function folderIds(id){const s=state(id);return [...(s.favorite?[FOLDER_LIKED_ID]:[]),...s.folderIds]}
  function folderEntries(folderId,entries,type=folderState.contentType||'all'){
    if(folderId===FOLDER_INSIGHTS_ID&&!folderSearchIsGlobal())return entries;
    const scenes=SceneUI.sceneGroups().filter(({scene,links})=>{
      const s=state(scene.groupId);return s.favorite&&(folderSearchIsGlobal()||folderIds(scene.groupId).includes(folderId))&&LearningTools.matches([scene.title,scene.quote,scene.translation,scene.sourceTitle,scene.note,...links.map(historyDisplayTitle)],folderState.query);
    }).map(g=>({__scene:g, id:`scene:${g.scene.groupId}`,createdAt:g.scene.createdAt,updatedAt:g.scene.updatedAt}));
    const all=[...(type==='scene'?[]:entries),...(type==='entry'?[]:scenes)];
    return all.sort((a,b)=>Number(Boolean(b.__scene&&state(b.__scene.scene.groupId).pinned))-Number(Boolean(a.__scene&&state(a.__scene.scene.groupId).pinned))||(folderState.sort==='title'?historyCollator.compare(a.__scene?.scene.title||a.__scene?.scene.quote||historyDisplayTitle(a),b.__scene?.scene.title||b.__scene?.scene.quote||historyDisplayTitle(b)):Date.parse(b[folderState.sort==='created'?'createdAt':'updatedAt']||0)-Date.parse(a[folderState.sort==='created'?'createdAt':'updatedAt']||0))||String(a.id).localeCompare(String(b.id)));
  }
  function row(item){const {scene,links}=item.__scene;return `<div class="history-item scene-favorite-row" data-open-row data-scene-favorite="${esc(scene.groupId)}"><div class="history-copy"><div class="history-word"><a data-row-link href="/scenes?scene=${encodeURIComponent(scene.groupId)}">${esc(scene.title||scene.quote||scene.sourceTitle||'未命名场景')}</a></div><p class="history-summary">${highlightText(scene.quote,scene.exampleHighlights)}</p>${scene.translation?`<p class="history-summary">${highlightText(scene.translation,scene.translationHighlights)}</p>`:''}<div class="history-meta"><span>场景 · ${links.length} 个词条</span>${scene.sourceTitle?`<span>${esc(scene.sourceTitle)}</span>`:''}${compactHistoryTimeHTML(scene,getSettings().historyTimeMode,folderState.sort)}</div></div>${controls(scene.groupId)}</div>`}
  function enhance(host=document){
    if(selectionOwner!==owner()){selectionOwner=owner();selections.scenes.clear();selections.folders.clear();mode={scenes:false,folders:false};folderSelectionContext=null}
    host.querySelectorAll('[data-scene-favorite]').forEach(row=>RowNavigation.bind(row,()=>{showView('scenes',null,{focus:false});SceneWorkspace.select(row.dataset.sceneFavorite)}));
    document.querySelectorAll('[data-learning-entry]').forEach(row=>{const meta=row.querySelector('.history-meta');if(!meta)return;let label=meta.querySelector('[data-entry-learning-state]');if(!label){label=document.createElement('span');label.dataset.entryLearningState='';meta.append(label)}const text=SceneStudy.labels[getSettings().entryLearning?.[row.dataset.learningEntry]?.state?.value||'new'];if(label.textContent!==text)label.textContent=text});
    document.querySelectorAll('[data-scene-group]').forEach(row=>{const actions=row.querySelector(':scope>header .scene-actions');if(actions&&!actions.querySelector('[data-organize-group]'))actions.insertAdjacentHTML('afterbegin',controls(row.dataset.sceneGroup))});
    document.querySelectorAll('[data-organize-group]').forEach(container=>{
      const id=container.dataset.organizeGroup,s=state(id),account=owner();
      container.querySelectorAll('[data-organize]').forEach(button=>{const action=button.dataset.organize;button.onclick=event=>{event.stopPropagation();if(account!==owner())return notify('账号已切换，请重新打开。','warn','整理');const operation=button.dataset.organize;if(operation==='folders')openFolderSelectModal({type:'scene',sceneIds:[id]});else apply([{type:'scene',id}],operation)};
        if(['favorite','unfavorite'].includes(action)){button.dataset.organize=s.favorite?'unfavorite':'favorite';button.classList.toggle('active',s.favorite);button.setAttribute('aria-pressed',String(s.favorite));button.setAttribute('aria-label',s.favorite?'取消收藏场景':'收藏场景')}
        if(action==='pin'){button.classList.toggle('active',s.pinned);button.setAttribute('aria-pressed',String(s.pinned))}
        if(action==='folders'){button.classList.toggle('active',s.favorite);button.setAttribute('aria-pressed',String(s.favorite))}
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
    document.querySelectorAll('.history-actions').forEach(node=>SharedUI.more(node,'button[aria-label="重新生成"],button[aria-label="删除"]'));
    document.querySelectorAll('.scene-workbench>header>.scene-actions,.scene-entry>header>.scene-actions,.scene-memory>header>.scene-actions').forEach(node=>SharedUI.more(node,'[data-organize="pin"],[data-scene-action="edit"],[data-scene-action="remove"],[data-scene-action="feature"]'));
    document.querySelectorAll('.scene-favorite-row>.scene-organize-actions').forEach(node=>SharedUI.more(node,'[data-organize="pin"]'));
    root.EntryMaintenance?.enhanceControls();
    document.querySelectorAll('.result-icons,.folder-head-actions').forEach(node=>SharedUI.more(node,'button[aria-label^="导出"],button[aria-label="复制 JSON"],button[aria-label="重命名收藏夹"],[data-entry-maintenance]'));
    document.querySelectorAll('.scene-library-head>.scene-actions').forEach(node=>{if(!node.querySelector('[data-source-workspace]'))node.insertAdjacentHTML('beforeend','<button class="icon-btn" data-source-workspace aria-label="场景检查与整理" data-tip="场景检查与整理">'+icon('list')+'</button>');SharedUI.more(node,'[data-fushi-browser],[data-scene-action="supplement"],[data-scene-action="import"],[data-scene-action="backup"],[data-scene-export],[data-source-workspace]')});
  }
  const targetFromKey=value=>{const split=value.indexOf(':');return {type:value.slice(0,split),id:value.slice(split+1)}};
  function toggle(scope,target){const id=key(target),selected=selections[scope];if(selected.has(id))selected.delete(id);else selected.add(id);enhanceSelection(scope)}
  function enhanceSelection(scope){
    const rootNode=document.querySelector(scope==='scenes'?'#scene-hub':'#folder-panel'),heading=rootNode?.querySelector(scope==='scenes'?'.scene-library-head':'.folder-content-head');if(!heading)return;
    if(scope==='folders'&&folderSelectionContext!==folderState.activeId){folderSelectionContext=folderState.activeId;selections.folders.clear();mode.folders=false}
    if(scope==='folders'&&folderState.activeId===FOLDER_INSIGHTS_ID&&!folderSearchIsGlobal()){mode.folders=false;selections.folders.clear();rootNode.querySelector('[data-learning-selection="folders"]')?.remove();rootNode.querySelector('[data-selection-tools="folders"]')?.remove();heading.classList.remove('selection-header-active');return}
    const sceneIds=new Set(SceneUI.sceneGroups().map(row=>row.scene.groupId)),entryIds=new Set(getHistory().map(item=>String(item.id)));
    for(const value of selections[scope]){const target=targetFromKey(value);if(!(target.type==='scene'?sceneIds:entryIds).has(target.id))selections[scope].delete(value)}
    let bar=rootNode.querySelector(`[data-learning-selection="${scope}"]`);if(!bar){bar=document.createElement('div');bar.className='learning-selection-bar';bar.dataset.learningSelection=scope;(heading.querySelector(':scope>.folder-head-actions,:scope>.scene-actions')||heading).append(bar)}
    const selected=selections[scope],personal=scope==='folders'&&!folderSearchIsGlobal()&&folderState.activeId===FOLDER_LIKED_ID,custom=scope==='folders'&&!folderSearchIsGlobal()&&![FOLDER_INSIGHTS_ID,FOLDER_LIKED_ID].includes(folderState.activeId);
    const command=(action,label,name)=>SharedUI.command(label,name,`data-bulk="${action}"`);
    const html=mode[scope]?SharedUI.selectionSession(selected.size,'data-select-mode aria-pressed="true"'):SharedUI.command('批量选择','square-check','data-select-mode aria-pressed="false"');
    let tools=rootNode.querySelector(`[data-selection-tools="${scope}"]`);if(!tools){tools=document.createElement('div');tools.className='batch-selection-toolbar';tools.dataset.selectionTools=scope;rootNode.querySelector(scope==='scenes'?'.scene-workspace':'#folder-history-list').before(tools)}tools.hidden=!mode[scope];
    const toolHTML=SharedUI.selectionGroups(`<label class="selection-all"><input type="checkbox" data-select-all aria-label="全选筛选结果"><span>全选</span></label>${SharedUI.command('清空选择','rotate-ccw','data-clear-selection')}`,`${command('folders','添加到收藏夹','folder-plus')}${personal?command('unfavorite','取消收藏','star-off'):custom?command('remove-folder','移出当前收藏夹','folder-minus'):''}${SharedUI.command('更多操作','ellipsis','data-bulk-more')}`);
    const context=`${folderState.activeId}:${folderSearchIsGlobal()}`;
    if(bar.dataset.content!==html||bar.dataset.owner!==owner()||bar.dataset.context!==context){bar.dataset.content=html;bar.dataset.owner=owner();bar.dataset.context=context;const account=owner();bar.innerHTML=html;bar.querySelector('[data-select-mode]').onclick=()=>{if(account!==owner())return;mode[scope]=!mode[scope];if(!mode[scope])selected.clear();enhanceSelection(scope)};
    }
    const candidates=()=>scope==='scenes'?SceneWorkspace.filteredGroups().map(g=>({type:'scene',id:g.scene.groupId})):filteredFolderEntries().filter(item=>!item.pin).map(item=>({type:item.__scene?'scene':'entry',id:item.__scene?.scene.groupId||String(item.id)}));
    if(tools.dataset.content!==toolHTML||tools.dataset.owner!==owner()||tools.dataset.context!==context){tools.dataset.content=toolHTML;tools.dataset.owner=owner();tools.dataset.context=context;tools.innerHTML=toolHTML;const account=owner();
      tools.querySelector('[data-select-all]').onchange=event=>{if(account!==owner())return;for(const target of candidates()){if(event.target.checked)selected.add(key(target));else selected.delete(key(target))}enhanceSelection(scope)};
      tools.querySelector('[data-clear-selection]').onclick=()=>{if(account!==owner())return;selected.clear();enhanceSelection(scope)};
      const more=tools.querySelector('[data-bulk-more]');if(more)more.onclick=()=>SharedUI.menu(more,[!personal?{label:'取消收藏',icon:'star-off',disabled:!selected.size,run:()=>{if(apply([...selected].map(targetFromKey),'unfavorite')){selected.clear();enhanceSelection(scope)}}}:null,{label:'导出所选 JSON',icon:'download',disabled:!selected.size,run:()=>{
        if(scope==='scenes'){SceneStudy.exportList(SceneUI.sceneGroups().filter(g=>selected.has(key({type:'scene',id:g.scene.groupId}))),'json');return}
        const records=[...selected].map(targetFromKey).map(t=>{if(t.type==='entry')return getHistory().find(row=>String(row.id)===t.id);const current=group(t.id);return current?{__scene:current}:null}).filter(Boolean);exportVisibleFolderJSON(records,true);
      }}]);
      tools.querySelectorAll('[data-bulk]').forEach(button=>{button.onclick=()=>{
        if(account!==owner())return notify('账号已切换，请重新选择。','warn','整理');const targets=[...selected].map(targetFromKey),operation=button.dataset.bulk;if(!targets.length)return;
        if(operation==='folders'){openFolderSelectModal({type:'learning',targets});return}
        if(operation==='remove-folder'&&(!folderState.activeId||folderState.activeId===FOLDER_INSIGHTS_ID||folderSearchIsGlobal()))return notify('请先打开具体收藏夹。','info','整理');
        const action=operation==='remove-folder'&&folderState.activeId===FOLDER_LIKED_ID?'unfavorite':operation;
        if(apply(targets,action,operation==='remove-folder'?[folderState.activeId]:[])){selected.clear();enhanceSelection(scope)};
      }});
    }
    const candidatesNow=candidates(),chosen=candidatesNow.filter(target=>selected.has(key(target))).length,all=tools.querySelector('[data-select-all]');all.checked=Boolean(candidatesNow.length&&chosen===candidatesNow.length);all.indeterminate=chosen>0&&chosen<candidatesNow.length;all.disabled=!candidatesNow.length;tools.querySelector('[data-clear-selection]').disabled=!selected.size;tools.querySelectorAll('[data-bulk]').forEach(button=>button.disabled=!selected.size);heading.classList.toggle('selection-header-active',mode[scope]);
    const rows=scope==='scenes'?rootNode.querySelectorAll('.scene-list-row'):rootNode.querySelectorAll('.history-item[data-learning-entry],.history-item[data-scene-favorite]');
    for(const row of rows){
      const target=scope==='scenes'?{type:'scene',id:row.dataset.selectScene}:row.dataset.sceneFavorite?{type:'scene',id:row.dataset.sceneFavorite}:{type:'entry',id:row.dataset.learningEntry};
      if(scope==='folders')RowNavigation.bind(row,()=>{if(mode.folders)toggle(scope,target);else if(target.type==='scene'){showView('scenes',null,{focus:false});SceneWorkspace.select(target.id)}else openHistoryModal(target.id)});
      row.classList.toggle('selection-active',mode[scope]);row.classList.toggle('selected',selected.has(key(target)));
      let wrapper=row;if(row.tagName==='BUTTON'||scope==='scenes'){
        if(!row.parentElement.classList.contains('learning-selectable-row')){wrapper=document.createElement('div');wrapper.className='learning-selectable-row';row.before(wrapper);wrapper.append(row)}else wrapper=row.parentElement;
      }
      if(scope==='scenes'){
        let favorite=wrapper.querySelector(':scope>[data-list-favorite]');if(!favorite){favorite=document.createElement('button');favorite.type='button';favorite.className='icon-btn';favorite.dataset.listFavorite='';favorite.innerHTML=icon('folder-plus');wrapper.append(favorite)}
        const active=state(target.id).favorite,account=owner();wrapper.classList.toggle('active',row.classList.contains('active'));wrapper.classList.toggle('selection-active',mode[scope]);favorite.classList.toggle('active',active);favorite.setAttribute('aria-pressed',String(active));favorite.setAttribute('aria-label','添加到收藏夹');favorite.dataset.tip='添加到收藏夹';favorite.onclick=event=>{event.stopPropagation();if(account===owner())openFolderSelectModal({type:'scene',sceneIds:[target.id]})};
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
