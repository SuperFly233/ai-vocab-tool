(function(root){
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const defaults={query:'',source:'',media:'',study:'',sort:'updated',group:'flat'},filters={...defaults},drafts=new Map(),thumbs=new Map();
  let paneKey='',listKey='',selectedText='',savedListScroll=0,savedPageScroll=0,uiOwner=null,review=null,visibleGroups=[];
  const uiKey=()=>`lexi-scene-view:${cloudUser?.id||'local'}`;
  function saveView(){try{sessionStorage.setItem(uiKey(),JSON.stringify({query:filters.query,listScroll:savedListScroll,pageScroll:savedPageScroll}))}catch{}if(uiOwner===(cloudUser?.id||'local'))rememberViewPreference('scenes',filters)}
  function restoreAccount(){
    const owner=cloudUser?.id||'local';if(owner===uiOwner)return;
    uiOwner=owner;Object.assign(filters,defaults);review=null;paneKey='';listKey='';savedListScroll=0;savedPageScroll=0;
    try{const value=JSON.parse(sessionStorage.getItem(uiKey())||'null');if(value){filters.query=typeof value.query==='string'?value.query:'';savedListScroll=Number(value.listScroll)||0;savedPageScroll=Number(value.pageScroll)||0}}catch{}
    Object.assign(filters,ViewPreferences.get('scenes',getSettings()));
    document.getElementById('scene-hub')?.replaceChildren();
  }
  const thumbQueue=[],thumbPending=new WeakSet();let thumbActive=0;
  const thumbObserver=new IntersectionObserver(entries=>{for(const entry of entries){entry.target._inView=entry.isIntersecting;if(entry.isIntersecting){const ref=entry.target._sceneRef;if(ref&&!entry.target.dataset.ready&&!thumbPending.has(entry.target)){thumbPending.add(entry.target);thumbQueue.push({ref,node:entry.target,owner:uiOwner})}}}pumpThumbs()},{rootMargin:'100px'});
  function pumpThumbs(){
    while(thumbActive<(innerWidth<=900?1:2)&&thumbQueue.length){const {ref,node,owner}=thumbQueue.shift();if(owner!==uiOwner||activeView!=='scenes'||!node.isConnected||!node._inView||!node.getBoundingClientRect().width){thumbPending.delete(node);continue}thumbActive++;loadThumb(ref,node,owner).finally(()=>{thumbActive--;thumbPending.delete(node);pumpThumbs()})}
  }
  const normalize=value=>normalizeSearch(value);
  const draftKey=id=>`lexi-scene-basket:${cloudUser?.id||'local'}:${id}`;
  function draft(id){
    if(!drafts.has(draftKey(id))){let value={queries:[],text:''};try{const saved=JSON.parse(sessionStorage.getItem(draftKey(id)));if(Array.isArray(saved?.queries))value={queries:saved.queries.filter(v=>typeof v==='string').slice(0,20),text:String(saved.text||'')}}catch{}drafts.set(draftKey(id),value)}
    return drafts.get(draftKey(id));
  }
  function saveDraft(id){try{sessionStorage.setItem(draftKey(id),JSON.stringify(draft(id)))}catch{}}
  const selectedId=()=>new URL(location.href).searchParams.get('scene')||'';
  function select(id,replace=false){
    if(selectedId()===id)return;
    const host=document.getElementById('scene-hub');savedListScroll=host.querySelector('.scene-master')?.scrollTop||0;savedPageScroll=scrollY;
    if(!selectedId()){saveView();history.replaceState({...history.state,sceneList:true},'',location.href)}
    const message=host.querySelector('.scene-workspace-message');if(message)message.hidden=true;
    const url=new URL(location.href);url.searchParams.set('scene',id);
    history[replace||selectedId()?'replaceState':'pushState']({...history.state,view:'scenes',sceneWorkbench:true,sceneFromList:!selectedId()||history.state?.sceneFromList},'',url);
    render();if(innerWidth<=900)window.scrollTo({top:0,behavior:'instant'});
  }
  function back(){
    if(history.state?.sceneFromList){history.back();return}
    const url=new URL(location.href);url.searchParams.delete('scene');history.replaceState({...history.state,sceneWorkbench:false},'',url);render();
    retryThumbs();
    document.querySelector('.scene-master')?.scrollTo({top:savedListScroll});window.scrollTo({top:savedPageScroll,behavior:'instant'});
  }
  function setup(host){
    if(host.querySelector('.scene-workspace'))return;
    host.innerHTML=`<header class="section-head scene-library-head"><div><h1>场景</h1><p class="section-sub" data-scene-count></p></div><div class="scene-actions" data-history-id="library"><button class="plain-btn" data-fushi-browser>${icon('book-open')}Fushi 来源</button>${SceneUI.action('import','导入场景备份')}${SceneUI.action('backup','导出独立场景备份')}<button class="plain-btn scene-add-command" data-scene-action="new-library">${icon('image-plus')}<span>添加场景</span></button></div></header><label class="history-search scene-search"><span>${icon('search')}</span><input type="search" aria-label="搜索场景" placeholder="搜索原句、来源或词条" autocomplete="off"></label><div class="scene-filter-bar"><select aria-label="筛选来源" data-filter="source"><option value="">所有来源</option></select><select aria-label="筛选素材" data-filter="media"><option value="">全部素材</option><option value="image/">图片 / GIF</option><option value="video/">视频</option><option value="text">纯文字</option></select></div><p class="scene-workspace-message" role="status" hidden></p><div class="scene-workspace"><nav class="scene-master" aria-label="场景列表"></nav><section class="scene-detail" aria-label="场景详情"></section></div>`;
    const search=host.querySelector('input');search.value=filters.query;
    search.addEventListener('input',event=>{if(event.isComposing)return;filters.query=search.value;saveView();render()});
    search.addEventListener('compositionend',()=>{filters.query=search.value;saveView();render()});
    host.querySelector('.scene-filter-bar').insertAdjacentHTML('beforeend',`<select aria-label="筛选学习状态" data-filter="study"><option value="">全部学习状态</option><option value="new">未学习</option><option value="review">待回顾</option><option value="mastered">已掌握</option></select><select aria-label="场景排序" data-filter="sort"><option value="updated">最近修改</option><option value="created">最近创建</option></select><select aria-label="场景分组" data-filter="group"><option value="flat">平铺列表</option><option value="source">按来源分组</option></select><button class="icon-btn" data-reset-scene-filters aria-label="重置筛选" data-tip="重置筛选">${icon('x')}</button>`);
    host.querySelectorAll('[data-filter]').forEach(field=>{field.value=filters[field.dataset.filter];field.onchange=()=>{filters[field.dataset.filter]=field.value;saveView();render()}});
    host.querySelector('[data-reset-scene-filters]').innerHTML=icon('rotate-ccw');
    host.querySelector('[data-reset-scene-filters]').onclick=resetFilters;
    const tools=document.createElement('div');tools.className='scene-browse-tools';search.closest('label').before(tools);tools.append(search.closest('label'),host.querySelector('.scene-filter-bar'));
    host.querySelector('.scene-library-head .scene-actions').insertAdjacentHTML('afterbegin',`<button class="icon-btn" data-scene-review aria-label="回顾当前场景" data-tip="回顾当前筛选的场景">${icon('play')}</button><button class="icon-btn" data-scene-export aria-label="导出学习清单" data-tip="导出学习清单">${icon('file-text')}</button>`);
    host.querySelector('[data-scene-review]').onclick=()=>startReview();
    host.querySelector('[data-scene-export]').onclick=()=>{const node=document.createElement('dialog');node.className='scene-study-dialog';node.innerHTML=`<header><h2>导出学习清单</h2><button class="icon-btn" aria-label="关闭">${icon('x')}</button></header><div class="scene-export-options"><button class="plain-btn" data-export="html">${icon('file-text')}可读 HTML</button><button class="plain-btn" data-export="json">${icon('code-2')}结构化 JSON</button></div>`;node.querySelector('header button').onclick=()=>node.close();node.querySelectorAll('[data-export]').forEach(button=>button.onclick=()=>{SceneStudy.exportList(visibleGroups,button.dataset.export);node.close()});node.onclose=()=>node.remove();document.body.append(node);node.showModal()};
    host.querySelector('.scene-master').onclick=event=>{const row=event.target.closest('[data-select-scene]');if(row)select(row.dataset.selectScene)};
    paneKey='';listKey='';
  }
  function showError(text){const node=document.querySelector('.scene-detail-status');if(node)node.textContent=text}
  function addQueries(id,text){
    const basket=draft(id),unique=new Map([...basket.queries,...text.split(/\n/).map(v=>v.trim()).filter(Boolean)].map(value=>[normalize(value),value]));
    if(unique.size>20||[...unique.values()].some(v=>v.length>200)){showError('每次最多 20 个词组，每个不超过 200 字。');return false}
    basket.queries=[...unique.values()];saveDraft(id);renderBasket(id);showError('');return true;
  }
  function renderBasket(id){
    const host=document.querySelector('.scene-word-basket');if(!host)return;
    const basket=draft(id);host.innerHTML=basket.queries.map((query,index)=>`<span class="scene-word-chip"><span>${esc(query)}</span><button type="button" data-remove-query="${index}" aria-label="移除 ${esc(query)}" data-tip="移除词组">${icon('x')}</button></span>`).join('');
    host.querySelectorAll('button').forEach(button=>button.onclick=()=>{basket.queries.splice(Number(button.dataset.removeQuery),1);saveDraft(id);renderBasket(id)});
    const clear=document.querySelector('[data-clear-scene-basket]');if(clear)clear.hidden=!basket.queries.length&&!basket.text;
    updateQueryButton(id);
  }
  function updateQueryButton(id){
    const basket=draft(id),input=document.querySelector('.scene-phrase-form input'),run=document.querySelector('[data-run-scene]');if(!run)return;
    const count=new Set([...basket.queries,...(input?.value.trim()?[input.value.trim()]:[])].map(normalize)).size;run.disabled=!count;run.querySelector('span').textContent=count>1?`查询 ${count} 个词组`:'查询';
    const clear=document.querySelector('[data-clear-scene-basket]');if(clear)clear.hidden=!count;
  }
  function renderTasks(group){
    const host=document.querySelector('.scene-linked-results');if(!host)return;
    const {scene,links}=group,byQuery=new Map();
    for(const item of links)byQuery.set(normalize(item.query),{query:historyDisplayTitle(item),status:'complete',id:item.id});
    const all=new Map(SceneUI.tasks());
    for(const request of [...lookupQueue,...(activeLookupRequest?[activeLookupRequest]:[])])if(request.sceneGroupId===scene.groupId){const key=`${request.sceneGroupId}:${normalize(request.query)}`;all.set(key,{request,status:activeLookupSignature===lookupRequestSignature(request)?'running':'queued',message:''})}
    for(const [key,task] of all)if(task.request.sceneGroupId===scene.groupId){const existing=findHistoryByQuery(task.request.query);byQuery.set(normalize(task.request.query),{query:task.request.query,status:task.status,message:task.message,key,id:existing?.id})}
    const pending=[...byQuery.values()].filter(task=>task.status!=='complete');
    const tasksHost=document.querySelector('.scene-query-tasks');
    const taskHTML=pending.map(task=>`<div class="scene-result-row"><div>${['queued','running'].includes(task.status)?`<button type="button" class="scene-task-link" data-open-scene-task="${esc(task.key)}" aria-label="${esc(task.status==='running'?'在首页查看查询进度':'在首页查看等待队列')}：${esc(task.query)}"><strong>${esc(task.query)}</strong></button>`:`<strong>${esc(task.query)}</strong>`}${task.message?`<p>${esc(task.message)}</p>`:''}</div><span class="scene-task-state" data-status="${esc(task.status)}">${esc(({queued:'等待查询',running:'查询中',complete:'已完成',error:'失败'})[task.status]||'查询中')}</span>${task.status==='error'?`<button class="icon-btn" data-retry-scene="${esc(task.key)}" aria-label="重试 ${esc(task.query)}" data-tip="重试">${icon('refresh-cw')}</button>`:''}</div>`).join('');
    if(tasksHost&&tasksHost.dataset.content!==taskHTML){
      tasksHost.dataset.content=taskHTML;tasksHost.innerHTML=taskHTML;
      tasksHost.querySelectorAll('[data-retry-scene]').forEach(button=>button.onclick=()=>SceneUI.retrySceneTask(button.dataset.retryScene));
      tasksHost.querySelectorAll('[data-open-scene-task]').forEach(button=>{button.dataset.rowLink='';RowNavigation.bind(button.closest('.scene-result-row'),()=>{
        const task=all.get(button.dataset.openSceneTask);if(!task)return;
        const matches=request=>request?.sceneGroupId===scene.groupId&&normalize(request.query)===normalize(task.request.query);
        const running=activeLookupRequest&&matches(activeLookupRequest),queued=lookupQueue.find(matches);
        if(!running&&!queued){renderTasks(group);return}
        showView('home',null,{focus:false});
        if(!running){lookupQueueExpanded=true;renderLookupQueue()}
        const target=running?els.resultCard:els.lookupQueue?.querySelector(`[data-queue-id="${Number(queued.id)}"]`)||els.lookupQueue;
        requestAnimationFrame(()=>target?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));
      })});
    }
    const html=links.map(item=>{const associated=SceneStudy.link(item,scene.groupId),study=SceneStudy.state(item,scene.groupId);return `<div class="scene-result-row scene-study-row" data-history-id="${esc(item.id)}" data-scene-id="${esc(associated.id)}"><div class="scene-linked-copy"><strong><a data-row-link data-open-entry="${esc(item.id)}" href="/history?entry=${encodeURIComponent(item.id)}">${esc(historyDisplayTitle(item))}</a></strong><p>${esc(SceneStudy.meaning(item))}</p><span class="scene-task-state" data-status="complete">已完成</span></div><select data-study-entry="${esc(item.id)}" aria-label="${esc(historyDisplayTitle(item))} 学习状态">${Object.entries(SceneStudy.labels).map(([key,label])=>`<option value="${key}" ${key===study?'selected':''}>${label}</option>`).join('')}</select><div class="scene-link-actions"><button class="icon-btn" data-highlight-entry="${esc(item.id)}" aria-label="编辑关联高亮" data-tip="编辑此词条的场景高亮">${icon('pencil')}</button>${SceneUI.action('remove','移除此词条的场景关联')}</div></div>`}).join('')||'<p class="scene-empty-text">尚未关联词条</p>';
    if(host.dataset.content===html)return;host.dataset.content=html;host.innerHTML=html;
    host.querySelectorAll('[data-open-entry]').forEach(link=>RowNavigation.bind(link.closest('.scene-result-row'),()=>openHistoryModal(link.dataset.openEntry)));
    host.querySelectorAll('[data-study-entry]').forEach(select=>select.onchange=()=>{try{SceneStudy.setState(select.dataset.studyEntry,scene.groupId,select.value)}catch(error){showError(error.message);renderTasks(group)}});
    host.querySelectorAll('[data-highlight-entry]').forEach(button=>button.onclick=()=>SceneStudy.openHighlights(button.dataset.highlightEntry,scene.groupId));
  }
  function renderDetail(group){
    const host=document.querySelector('.scene-detail');if(!host)return;
    if(!group){if(paneKey!=='empty'){host.innerHTML='<p class="scene-empty-text">选择一个场景，开始阅读与查词</p>';paneKey='empty'}return}
    const {scene,item}=group,{studyState,studyUpdatedAt,...content}=scene,key=JSON.stringify([content,item.id,review&&[review.index,review.revealed]]);
    if(key!==paneKey){
      paneKey=key;selectedText='';
      host.querySelectorAll('video').forEach(video=>video.pause());
host.innerHTML=`<article class="scene-workbench" data-history-id="${esc(item.id)}" data-scene-id="${esc(scene.id)}"><header><button class="scene-back plain-btn" aria-label="返回场景列表">${icon('arrow-left')}<span>场景</span></button><h2>${esc(scene.title||scene.sourceTitle||'未命名场景')}</h2><div class="scene-actions">${SceneUI.action('edit','编辑场景')}${SceneUI.action('remove',item.id==='library'?'删除独立场景':'移除此词条的场景关联')}</div></header><div class="scene-sync-error" data-scene-sync-status role="status" ${SceneUI.syncError(scene.id)?'':'hidden'}>${esc(SceneUI.syncError(scene.id))}${SceneUI.syncError(scene.id)?SceneUI.action('sync','重试同步素材'):''}</div><div class="scene-study-content">${scene.media.length?`<div class="scene-media">${SceneUI.assets(scene.media)}</div>`:''}<div class="scene-study-text">${scene.quote?`<blockquote class="scene-study-quote">${highlightText(scene.quote,scene.exampleHighlights||[])}</blockquote>`:''}${scene.translation?`<p class="scene-translation">${esc(scene.translation)}</p>`:''}<p class="scene-source-line">${esc([scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · '))}${scene.sourceUrl?` <a href="${esc(scene.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开来源 ${icon('arrow-up-right')}</a>`:''}</p>${scene.note?`<p class="scene-note">${esc(scene.note)}</p>`:''}<button class="plain-btn selection-add" type="button" hidden>${icon('plus')}加入待查询</button></div></div><section class="scene-query-workspace"><h3>从这句话查词</h3><div class="scene-word-basket"></div><form class="scene-phrase-form"><label class="scene-word-input">${icon('search')}<input aria-label="添加单词或词组" placeholder="输入想查的单词或词组" autocomplete="off"></label><button class="icon-btn" type="button" data-add-scene-query aria-label="加入待查词组" data-tip="加入待查词组">${icon('plus')}</button><button class="plain-btn primary-btn" type="submit" data-run-scene>${icon('search')}<span>查询</span></button></form><div class="scene-query-footer"><span class="scene-detail-status" role="status"></span></div></section><section class="scene-associated"><h3>关联词条</h3><div class="scene-linked-results"></div></section></article>`;
      const heading=host.querySelector('.scene-workbench>header h2'),headingGroup=document.createElement('div');headingGroup.className='scene-heading';heading.before(headingGroup);headingGroup.append(heading);headingGroup.insertAdjacentHTML('beforeend',SceneUI.timeMeta(scene));
      if(!scene.title)heading.textContent=scene.quote||scene.sourceTitle||'未命名场景';heading.title=heading.textContent;heading.setAttribute('aria-label',heading.textContent);
      const translation=host.querySelector('.scene-study-text>.scene-translation');if(translation)translation.innerHTML=highlightText(scene.translation,scene.translationHighlights||[]);
      host.querySelector('.scene-study-text>.scene-source-line').insertAdjacentHTML('afterend',SceneUI.provenance(scene));
      const quote=host.querySelector('.scene-study-quote');if(quote)quote.dataset.label='原句';if(translation)translation.dataset.label='译文';
      host.querySelector('.scene-back').onclick=()=>review?exitReview():back();
      const mediaHost=host.querySelector('.scene-study-content>.scene-media');
      if(mediaHost&&scene.media.length>1){mediaHost.innerHTML=`<div class="scene-media-choice">${scene.media.map((ref,index)=>`<button class="plain-btn" data-media-index="${index}" aria-pressed="${index===0}">${icon(ref.mime.startsWith('video/')?'play':'images')}<span>${index+1} / ${scene.media.length}</span></button>`).join('')}</div><div class="scene-current-media">${SceneUI.assets(scene.media.slice(0,1))}</div>`;mediaHost.querySelectorAll('[data-media-index]').forEach(button=>button.onclick=()=>{mediaHost.querySelectorAll('video').forEach(video=>video.pause());mediaHost.querySelectorAll('[data-media-index]').forEach(row=>row.setAttribute('aria-pressed',String(row===button)));mediaHost.querySelector('.scene-current-media').innerHTML=SceneUI.assets([scene.media[Number(button.dataset.mediaIndex)]])})}
      host.querySelector('.scene-query-workspace h3').insertAdjacentHTML('afterend',`<button type="button" class="icon-btn scene-clear-basket" data-clear-scene-basket aria-label="清空待查词组" data-tip="清空待查词组">${icon('trash-2')}</button>`);
      host.querySelector('.scene-query-workspace').insertAdjacentHTML('beforeend','<div class="scene-query-tasks" aria-live="polite"></div>');
      host.querySelector('.scene-associated h3').insertAdjacentHTML('afterend',`<button class="plain-btn scene-associate-command" type="button" data-associate-entry>${icon('list-plus')}关联已有词条</button>`);
      host.querySelector('[data-associate-entry]').onclick=()=>SceneStudy.openPicker(scene.groupId);
      const workflow=document.createElement('nav');workflow.className='scene-learning-actions';workflow.setAttribute('aria-label','场景学习操作');
      workflow.innerHTML=`<button class="plain-btn" type="button" data-scene-focus-query>${icon('search')}摘词查询</button>`;
      workflow.append(host.querySelector('[data-associate-entry]'));host.querySelector('.scene-study-content').after(workflow);
      workflow.querySelector('[data-scene-focus-query]').onclick=()=>{const field=host.querySelector('.scene-phrase-form input');field.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});field.focus({preventScroll:true})};
      const input=host.querySelector('.scene-phrase-form input'),basket=draft(scene.groupId);input.value=basket.text;
      host.querySelector('[data-clear-scene-basket]').onclick=()=>{const before=structuredClone(basket),account=uiOwner;basket.queries=[];basket.text='';input.value='';saveDraft(scene.groupId);renderBasket(scene.groupId);notify('待查词组已清空。','info','场景学习',true,{label:'撤销',run:()=>{if(account!==uiOwner||draft(scene.groupId).text||draft(scene.groupId).queries.length)return notify('待查内容已有变化，未覆盖。','warn','撤销');Object.assign(draft(scene.groupId),before);saveDraft(scene.groupId);if(selectedId()===scene.groupId||innerWidth>900){const current=document.querySelector('.scene-phrase-form input');if(current&&document.querySelector('.scene-workbench')?.dataset.sceneId===scene.id){current.value=before.text;renderBasket(scene.groupId)}}}})};
      input.oninput=()=>{basket.text=input.value;saveDraft(scene.groupId);updateQueryButton(scene.groupId)};
      let composing=false,blockSubmitUntil=0,submitting=false;
      input.addEventListener('compositionstart',()=>{composing=true});input.addEventListener('compositionend',()=>{composing=false;blockSubmitUntil=performance.now()+120});
      input.addEventListener('keydown',event=>{if(event.key==='Enter'&&(event.isComposing||composing||event.keyCode===229||performance.now()<blockSubmitUntil)){event.preventDefault();blockSubmitUntil=performance.now()+120}});
      const add=()=>{if(input.value.trim()&&addQueries(scene.groupId,input.value)){input.value='';basket.text='';saveDraft(scene.groupId);updateQueryButton(scene.groupId)}};
      host.querySelector('[data-add-scene-query]').onclick=add;
      input.addEventListener('paste',event=>{const value=event.clipboardData?.getData('text/plain')||'';if(/[\r\n]/.test(value)){event.preventDefault();if(addQueries(scene.groupId,value)){input.value='';basket.text='';saveDraft(scene.groupId);updateQueryButton(scene.groupId)}}});
      host.querySelector('.selection-add').onpointerdown=event=>event.preventDefault();
      host.querySelector('.selection-add').onclick=()=>{if(addQueries(scene.groupId,selectedText)){getSelection()?.removeAllRanges();host.querySelector('.selection-add').hidden=true}};
      host.querySelector('form').onsubmit=async event=>{
        event.preventDefault();
        if(composing||submitting||performance.now()<blockSubmitUntil)return;
        const queries=[...new Map([...basket.queries,...(input.value.trim()?[input.value.trim()]:[])].map(value=>[normalize(value),value])).values()];if(!queries.length)return;
        if(queries.length>20||queries.some(value=>value.length>200)){showError('每次最多 20 个词组，每个不超过 200 字。');return}
        const button=host.querySelector('[data-run-scene]'),submittedText=input.value;button.disabled=true;submitting=true;
        try{const result=await SceneUI.queueSceneQueries(scene.groupId,queries),accepted=new Set((result?.accepted||queries).map(normalize));basket.queries=basket.queries.filter(value=>!accepted.has(normalize(value)));if(basket.text===submittedText&&accepted.has(normalize(submittedText))){input.value='';basket.text=''}saveDraft(scene.groupId);if(selectedId()===scene.groupId){const current=host.querySelector('.scene-phrase-form input');if(current)current.value=basket.text;renderBasket(scene.groupId);showError(result?.failed.length?`${result.failed.length} 个词组未提交，请重试。`:'')}}catch(error){showError(error.message)}finally{submitting=false;if(button.isConnected)updateQueryButton(scene.groupId)}
      };
      renderBasket(scene.groupId);
      if(review){
        host.classList.add('scene-review-mode');host.querySelector('.scene-query-workspace').hidden=true;
        const associated=host.querySelector('.scene-associated');associated.hidden=!review.revealed;
        workflow.hidden=true;
        host.querySelector('.scene-workbench').insertAdjacentHTML('afterbegin',`<div class="scene-review-toolbar"><strong>场景回顾 ${review.index+1} / ${review.ids.length}</strong><button class="plain-btn" data-review-exit>${icon('x')}退出回顾</button></div>`);
        host.querySelector('.scene-workbench').insertAdjacentHTML('beforeend',`<footer class="scene-review-footer"><button class="icon-btn" data-review-prev aria-label="上一个场景" data-tip="上一个场景" ${review.index===0?'disabled':''}>${icon('arrow-left')}</button><button class="plain-btn primary-btn" data-review-reveal>${review.revealed?'收起释义':'展开关联释义'}</button><button class="icon-btn" data-review-next aria-label="下一个场景" data-tip="下一个场景" ${review.index===review.ids.length-1?'disabled':''}>${icon('arrow-up-right')}</button></footer>`);
        host.querySelector('[data-review-exit]').onclick=exitReview;host.querySelector('[data-review-reveal]').onclick=()=>{review.revealed=!review.revealed;render()};
        for(const [name,step] of [['prev',-1],['next',1]])host.querySelector(`[data-review-${name}]`).onclick=()=>{review.index+=step;review.revealed=false;render();scrollTo({top:0,behavior:'instant'})};
      }else host.classList.remove('scene-review-mode');
    }
    const quote=host.querySelector('.scene-study-quote');
    const automatic=group.links.flatMap(item=>{
      const associated=SceneStudy.link(item,scene.groupId),result=displayedResultForHistory(item.id,item)||{};
      return associated?.exampleHighlights?.length?associated.exampleHighlights:resultQueryHighlightTerms(result);
    });
    const highlighted=highlightText(scene.quote,scene.exampleHighlights?.length?scene.exampleHighlights:automatic);
    if(quote&&quote.innerHTML!==highlighted)quote.innerHTML=highlighted;
    renderTasks(group);
  }
  function startReview(ids=visibleGroups.map(group=>group.scene.groupId)){const known=new Set(SceneUI.sceneGroups().map(group=>group.scene.groupId));ids=[...new Set(ids)].filter(id=>known.has(id));if(!ids.length)return;review={ids,index:0,revealed:false,scroll:scrollY};paneKey='';render();scrollTo({top:0,behavior:'instant'})}
  function exitReview(){const scroll=review?.scroll||0;review=null;paneKey='';render();scrollTo({top:scroll,behavior:'instant'})}
  async function loadThumb(ref,node,owner){
    try{
      let url=thumbs.get(ref.id);if(!url){const blob=await ScenePreview.get(ref);url=thumbs.get(ref.id)||URL.createObjectURL(blob);thumbs.set(ref.id,url)}
      if(owner!==uiOwner||!node.isConnected||node._sceneRef?.id!==ref.id)return;
      const media=new Image();media.alt='';media.setAttribute('aria-hidden','true');await new Promise((resolve,reject)=>{media.onload=resolve;media.onerror=reject;media.src=url});if(node.isConnected&&owner===uiOwner&&node._sceneRef?.id===ref.id){node.replaceChildren(media);node.dataset.ready='true';delete node.dataset.unavailable}
    }catch{if(node.isConnected){node.dataset.unavailable='true';node.dataset.tip='缩略图暂不可用，点击打开原素材';node.setAttribute('aria-label','缩略图暂不可用')}}
  }
  function render(){
    const host=document.getElementById('scene-hub');if(!host)return;restoreAccount();setup(host);
    const groups=SceneUI.sceneGroups(),sources=[...new Set(groups.map(row=>row.scene.sourceTitle).filter(Boolean))].sort();
    const source=host.querySelector('[data-filter="source"]'),options='<option value="">所有来源</option>'+sources.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
    if(source.innerHTML!==options){source.innerHTML=options;source.value=filters.source}
    const rows=groups.filter(({scene,links})=>(!filters.source||scene.sourceTitle===filters.source)&&(!filters.media||(filters.media==='text'?!scene.media.length:scene.media.some(ref=>ref.mime.startsWith(filters.media))))&&(!filters.study||(links.length?links.some(item=>SceneStudy.state(item,scene.groupId)===filters.study):filters.study==='new'))&&normalize([scene.title,scene.quote,scene.translation,scene.note,scene.sourceTitle,...links.map(historyDisplayTitle)].join(' ')).includes(normalize(filters.query))).sort((a,b)=>Date.parse(b.scene[filters.sort==='created'?'createdAt':'updatedAt'])-Date.parse(a.scene[filters.sort==='created'?'createdAt':'updatedAt'])||a.scene.groupId.localeCompare(b.scene.groupId));
    if(filters.group==='source')rows.sort((a,b)=>(a.scene.sourceTitle||'未填写来源').localeCompare(b.scene.sourceTitle||'未填写来源'));
    visibleGroups=rows;host.querySelector('[data-scene-review]').disabled=!rows.length;host.querySelector('[data-scene-export]').disabled=!rows.length;
    host.querySelector('[data-scene-review]').innerHTML=icon('book-open');host.querySelector('[data-reset-scene-filters]').innerHTML=icon('rotate-ccw');
    host.querySelector('[data-reset-scene-filters]').hidden=!Object.keys(defaults).some(key=>filters[key]!==defaults[key]);
    host.querySelector('[data-scene-count]').textContent=`${rows.length} / ${groups.length} 个场景`;
    if(review){review.ids=review.ids.filter(id=>groups.some(group=>group.scene.groupId===id));review.index=Math.min(review.index,review.ids.length-1);if(!review.ids.length)review=null}
    let id=review?review.ids[review.index]:selectedId(),group=groups.find(row=>row.scene.groupId===id);
    if(id&&!group){const message=host.querySelector('.scene-workspace-message');message.textContent='该场景已不存在，已返回场景列表。';message.hidden=false;const url=new URL(location.href);url.searchParams.delete('scene');history.replaceState(history.state,'',url);id=''}
    if(!id&&innerWidth>900&&rows.length){group=rows[0];id=group.scene.groupId}
    host.classList.toggle('scene-detail-open',Boolean(id));
    const key=JSON.stringify([filters.group,getSettings().historyTimeMode,rows.map(({scene,links})=>[scene.groupId,scene.title,scene.quote,scene.sourceTitle,scene.createdAt,scene.updatedAt,scene.media[0]?.id,links.length])]);
    const list=host.querySelector('.scene-master');
    if(key!==listKey){listKey=key;const scroll=list.scrollTop;
      thumbObserver.disconnect();for(const job of thumbQueue)thumbPending.delete(job.node);thumbQueue.length=0;
      let lastSource=null;list.innerHTML=rows.map(({scene,links})=>{const source=scene.sourceTitle||'未填写来源',heading=filters.group==='source'&&source!==lastSource?`<h3 class="scene-source-heading">${esc(source)}</h3>`:'';lastSource=source;return `${heading}<button type="button" class="scene-list-row" data-select-scene="${esc(scene.groupId)}"><span class="scene-thumb">${icon(scene.media[0]?.mime.startsWith('video/')?'play':'images')}</span><span class="scene-list-copy"><strong>${esc(scene.title||scene.quote||scene.sourceTitle||'未命名场景')}</strong><span>${esc(scene.quote||scene.note||'纯素材场景')}</span><small>${esc(scene.sourceTitle||'未填写来源')} · ${links.length} 个词条</small>${SceneUI.timeMeta(scene,getSettings().historyTimeMode)}</span></button>`}).join('')||'<div class="scene-empty-text">没有匹配的场景</div>';list.scrollTop=scroll;
      rows.forEach(({scene},index)=>{if(scene.media[0]){const node=list.querySelectorAll('.scene-list-row')[index].querySelector('.scene-thumb');node._sceneRef=scene.media[0];thumbObserver.observe(node)}});
    }
    list.querySelectorAll('[data-select-scene]').forEach(button=>{const active=button.dataset.selectScene===id;button.classList.toggle('active',active);button.setAttribute('aria-current',String(active))});
    renderDetail(group);
  }
  document.addEventListener('selectionchange',()=>{
    const quote=document.querySelector('.scene-study-quote'),button=document.querySelector('.selection-add'),selection=getSelection();if(!quote||!button)return;
    const valid=selection?.rangeCount&&quote.contains(selection.anchorNode)&&quote.contains(selection.focusNode);
    selectedText=valid?String(selection).trim():'';button.hidden=!selectedText||selectedText.length>200;
  });
  addEventListener('resize',()=>{if(activeView==='scenes')render()});
  document.getElementById('clear-scene-previews')?.addEventListener('click',async event=>{const button=event.currentTarget;button.disabled=true;try{await root.SceneWorkspace.clearPreviews();notify('缩略图缓存已清理，原素材不受影响。','good','缓存')}catch(error){notify(error.message,'warn','缓存')}finally{button.disabled=false}});
  function retryThumbs(){document.querySelectorAll('.scene-thumb[data-unavailable]').forEach(node=>{thumbObserver.unobserve(node);thumbObserver.observe(node)})}
  addEventListener('online',()=>{if(activeView==='scenes')retryThumbs()});
  addEventListener('popstate',()=>{if(location.pathname==='/scenes'){review=null;render();if(!selectedId())requestAnimationFrame(()=>{retryThumbs();document.querySelector('.scene-master')?.scrollTo({top:savedListScroll});scrollTo({top:savedPageScroll,behavior:'instant'})})}});
  addEventListener('pagehide',()=>{if(activeView==='scenes'&&!selectedId()){savedListScroll=document.querySelector('.scene-master')?.scrollTop||0;savedPageScroll=scrollY}saveView()});
  addEventListener('pagehide',event=>{if(!event.persisted){for(const url of thumbs.values())URL.revokeObjectURL(url);thumbs.clear()}});
  function applyPreferences(value){restoreAccount();Object.assign(filters,value);const host=document.getElementById('scene-hub');host?.querySelectorAll('[data-filter]').forEach(field=>{field.value=filters[field.dataset.filter]});if(activeView==='scenes')render()}
  function resetFilters(){Object.assign(filters,defaults);const host=document.getElementById('scene-hub'),search=host?.querySelector('.scene-search input');if(search)search.value='';host?.querySelectorAll('[data-filter]').forEach(field=>field.value=filters[field.dataset.filter]);saveView();render()}
  root.SceneWorkspace={render,select,back,addQueries,startReview,applyPreferences,resetFilters,clearPreviews:async()=>{await root.ScenePreview?.clear();await SceneData.clearPreviews();for(const url of thumbs.values())URL.revokeObjectURL(url);thumbs.clear();listKey='';if(activeView==='scenes')render()},filteredGroups:()=>visibleGroups};if(activeView==='scenes')render();
})(globalThis);
