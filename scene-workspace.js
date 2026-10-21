(function(root){
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const filters={query:'',source:'',media:''},drafts=new Map(),thumbs=new Map();
  let paneKey='',listKey='',selectedText='',savedListScroll=0,savedPageScroll=0;
  const thumbQueue=[],thumbPending=new WeakSet();let thumbActive=0;
  const thumbObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){thumbObserver.unobserve(entry.target);const ref=entry.target._sceneRef;if(ref&&!thumbPending.has(entry.target)){thumbPending.add(entry.target);thumbQueue.push({ref,node:entry.target})}}pumpThumbs()},{rootMargin:'100px'});
  function pumpThumbs(){
    while(thumbActive<(innerWidth<=900?1:2)&&thumbQueue.length){const {ref,node}=thumbQueue.shift();if(!node.isConnected||!node.getBoundingClientRect().width){thumbPending.delete(node);if(node.isConnected)thumbObserver.observe(node);continue}thumbActive++;loadThumb(ref,node).finally(()=>{thumbActive--;thumbPending.delete(node);pumpThumbs()})}
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
    const host=document.getElementById('scene-hub');savedListScroll=host.querySelector('.scene-master')?.scrollTop||0;savedPageScroll=scrollY;
    const message=host.querySelector('.scene-workspace-message');if(message)message.hidden=true;
    const url=new URL(location.href);url.searchParams.set('scene',id);
    history[replace?'replaceState':'pushState']({...history.state,view:'scenes',sceneWorkbench:true},'',url);
    render();if(innerWidth<=900)window.scrollTo({top:0,behavior:'instant'});
  }
  function back(){
    const url=new URL(location.href);url.searchParams.delete('scene');history.replaceState({...history.state,sceneWorkbench:false},'',url);render();
    document.querySelectorAll('.scene-thumb[data-unavailable]').forEach(node=>thumbObserver.observe(node));
    document.querySelector('.scene-master')?.scrollTo({top:savedListScroll});window.scrollTo({top:savedPageScroll,behavior:'instant'});
  }
  function setup(host){
    if(host.querySelector('.scene-workspace'))return;
    host.innerHTML=`<header class="section-head scene-library-head"><div><h1>场景</h1><p class="section-sub" data-scene-count></p></div><div class="scene-actions" data-history-id="library">${SceneUI.action('import','导入场景备份')}${SceneUI.action('backup','导出独立场景备份')}<button class="plain-btn scene-add-command" data-scene-action="new-library">${icon('image-plus')}<span>添加场景</span></button></div></header><label class="history-search scene-search"><span>${icon('search')}</span><input type="search" aria-label="搜索场景" placeholder="搜索原句、来源或词条" autocomplete="off"></label><div class="scene-filter-bar"><select aria-label="筛选来源" data-filter="source"><option value="">所有来源</option></select><select aria-label="筛选素材" data-filter="media"><option value="">全部素材</option><option value="image/">图片 / GIF</option><option value="video/">视频</option><option value="text">纯文字</option></select></div><p class="scene-workspace-message" role="status" hidden></p><div class="scene-workspace"><nav class="scene-master" aria-label="场景列表"></nav><section class="scene-detail" aria-label="场景详情"></section></div>`;
    const search=host.querySelector('input');search.value=filters.query;
    search.addEventListener('input',event=>{if(event.isComposing)return;filters.query=search.value;render()});
    search.addEventListener('compositionend',()=>{filters.query=search.value;render()});
    host.querySelectorAll('[data-filter]').forEach(field=>{field.value=filters[field.dataset.filter];field.onchange=()=>{filters[field.dataset.filter]=field.value;render()}});
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
    updateQueryButton(id);
  }
  function updateQueryButton(id){
    const basket=draft(id),input=document.querySelector('.scene-phrase-form input'),run=document.querySelector('[data-run-scene]');if(!run)return;
    const count=new Set([...basket.queries,...(input?.value.trim()?[input.value.trim()]:[])].map(normalize)).size;run.disabled=!count;run.querySelector('span').textContent=count>1?`查询 ${count} 个词组`:'查询';
  }
  function renderTasks(group){
    const host=document.querySelector('.scene-linked-results');if(!host)return;
    const {scene,links}=group,byQuery=new Map();
    for(const item of links)byQuery.set(normalize(item.query),{query:historyDisplayTitle(item),status:'complete',id:item.id});
    const all=new Map(SceneUI.tasks());
    for(const request of [...lookupQueue,...(activeLookupRequest?[activeLookupRequest]:[])])if(request.sceneGroupId===scene.groupId){const key=`${request.sceneGroupId}:${normalize(request.query)}`;if(!all.has(key))all.set(key,{request,status:activeLookupSignature===lookupRequestSignature(request)?'running':'queued',message:''})}
    for(const [key,task] of all)if(task.request.sceneGroupId===scene.groupId){const existing=findHistoryByQuery(task.request.query);byQuery.set(normalize(task.request.query),{query:task.request.query,status:task.status,message:task.message,key,id:existing?.id})}
    const html=[...byQuery.values()].map(task=>`<div class="scene-result-row"><div><strong>${esc(task.query)}</strong>${task.message?`<p>${esc(task.message)}</p>`:''}</div><span class="scene-task-state" data-status="${esc(task.status)}">${esc(({queued:'等待查询',running:'查询中',complete:'已完成',error:'失败'})[task.status]||'查询中')}</span>${task.status==='error'?`<button class="icon-btn" data-retry-scene="${esc(task.key)}" aria-label="重试 ${esc(task.query)}" data-tip="重试">${icon('refresh-cw')}</button>`:task.status==='complete'&&task.id?`<button class="icon-btn" data-open-entry="${esc(task.id)}" aria-label="打开 ${esc(task.query)}" data-tip="打开词条">${icon('arrow-up-right')}</button>`:''}</div>`).join('')||'<p class="scene-empty-text">尚未关联词条</p>';
    if(host.dataset.content===html)return;host.dataset.content=html;host.innerHTML=html;
    host.querySelectorAll('[data-open-entry]').forEach(button=>button.onclick=()=>openHistoryModal(button.dataset.openEntry));
    host.querySelectorAll('[data-retry-scene]').forEach(button=>button.onclick=()=>SceneUI.retrySceneTask(button.dataset.retryScene));
  }
  function renderDetail(group){
    const host=document.querySelector('.scene-detail');if(!host)return;
    if(!group){if(paneKey!=='empty'){host.innerHTML='<p class="scene-empty-text">选择一个场景，开始阅读与查词</p>';paneKey='empty'}return}
    const {scene,item}=group,key=JSON.stringify([scene,item.id]);
    if(key!==paneKey){
      paneKey=key;selectedText='';
host.innerHTML=`<article class="scene-workbench" data-history-id="${esc(item.id)}" data-scene-id="${esc(scene.id)}"><header><button class="scene-back plain-btn" aria-label="返回场景列表">${icon('arrow-left')}<span>场景</span></button><h2>${esc(scene.title||scene.sourceTitle||'未命名场景')}</h2><div class="scene-actions">${SceneUI.action('edit','编辑场景')}${SceneUI.action('remove',item.id==='library'?'删除独立场景':'移除此词条的场景关联')}</div></header><div class="scene-sync-error" data-scene-sync-status role="status" ${SceneUI.syncError(scene.id)?'':'hidden'}>${esc(SceneUI.syncError(scene.id))}${SceneUI.syncError(scene.id)?SceneUI.action('sync','重试同步素材'):''}</div><div class="scene-study-content">${scene.media.length?`<div class="scene-media">${SceneUI.assets(scene.media)}</div>`:''}<div class="scene-study-text">${scene.quote?`<blockquote class="scene-study-quote">${highlightText(scene.quote,scene.exampleHighlights||[])}</blockquote>`:''}${scene.translation?`<p class="scene-translation">${esc(scene.translation)}</p>`:''}<p class="scene-source-line">${esc([scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · '))}${scene.sourceUrl?` <a href="${esc(scene.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开来源 ${icon('arrow-up-right')}</a>`:''}</p>${scene.note?`<p class="scene-note">${esc(scene.note)}</p>`:''}<button class="plain-btn selection-add" type="button" hidden>${icon('plus')}加入待查询</button></div></div><section class="scene-query-workspace"><h3>从这句话查词</h3><div class="scene-word-basket"></div><form class="scene-phrase-form"><label class="scene-word-input">${icon('search')}<input aria-label="添加单词或词组" placeholder="输入想查的单词或词组" autocomplete="off"></label><button class="icon-btn" type="button" data-add-scene-query aria-label="加入待查词组" data-tip="加入待查词组">${icon('plus')}</button><button class="plain-btn primary-btn" type="submit" data-run-scene>${icon('search')}<span>查询</span></button></form><div class="scene-query-footer"><span class="scene-detail-status" role="status"></span></div></section><section class="scene-associated"><h3>关联词条</h3><div class="scene-linked-results"></div></section></article>`;
      host.querySelector('.scene-back').onclick=back;
      const input=host.querySelector('.scene-phrase-form input'),basket=draft(scene.groupId);input.value=basket.text;
      input.oninput=()=>{basket.text=input.value;saveDraft(scene.groupId);updateQueryButton(scene.groupId)};
      input.addEventListener('keydown',event=>{if(event.isComposing&&event.key==='Enter')event.preventDefault()});
      const add=()=>{if(input.value.trim()&&addQueries(scene.groupId,input.value)){input.value='';basket.text='';saveDraft(scene.groupId);updateQueryButton(scene.groupId)}};
      host.querySelector('[data-add-scene-query]').onclick=add;
      input.addEventListener('paste',event=>{const value=event.clipboardData?.getData('text/plain')||'';if(/[\r\n]/.test(value)){event.preventDefault();if(addQueries(scene.groupId,value)){input.value='';basket.text='';saveDraft(scene.groupId);updateQueryButton(scene.groupId)}}});
      host.querySelector('.selection-add').onpointerdown=event=>event.preventDefault();
      host.querySelector('.selection-add').onclick=()=>{if(addQueries(scene.groupId,selectedText)){getSelection()?.removeAllRanges();host.querySelector('.selection-add').hidden=true}};
      host.querySelector('form').onsubmit=async event=>{
        event.preventDefault();
        const queries=[...new Map([...basket.queries,...(input.value.trim()?[input.value.trim()]:[])].map(value=>[normalize(value),value])).values()];if(!queries.length)return;
        if(queries.length>20||queries.some(value=>value.length>200)){showError('每次最多 20 个词组，每个不超过 200 字。');return}
        const button=host.querySelector('[data-run-scene]');button.disabled=true;
        try{await SceneUI.queueSceneQueries(scene.groupId,queries);showError(`已提交 ${queries.length} 个词组`)}catch(error){showError(error.message)}finally{if(button.isConnected)updateQueryButton(scene.groupId)}
      };
      renderBasket(scene.groupId);
    }
    renderTasks(group);
  }
  async function loadThumb(ref,node){
    try{
      let url=thumbs.get(ref.id);if(!url){const blob=await ScenePreview.get(ref);url=thumbs.get(ref.id)||URL.createObjectURL(blob);thumbs.set(ref.id,url)}
      if(!node.isConnected)return;
      const media=new Image();media.alt='';media.setAttribute('aria-hidden','true');await new Promise((resolve,reject)=>{media.onload=resolve;media.onerror=reject;media.src=url});if(node.isConnected){node.replaceChildren(media);node.dataset.ready='true';delete node.dataset.unavailable}
    }catch{if(node.isConnected){node.dataset.unavailable='true';node.dataset.tip='缩略图暂不可用，点击打开原素材';node.setAttribute('aria-label','缩略图暂不可用')}}
  }
  function render(){
    const host=document.getElementById('scene-hub');if(!host)return;setup(host);
    const groups=SceneUI.sceneGroups(),sources=[...new Set(groups.map(row=>row.scene.sourceTitle).filter(Boolean))].sort();
    const source=host.querySelector('[data-filter="source"]'),options='<option value="">所有来源</option>'+sources.map(value=>`<option value="${esc(value)}">${esc(value)}</option>`).join('');
    if(source.innerHTML!==options){source.innerHTML=options;source.value=filters.source}
    const rows=groups.filter(({scene,links})=>(!filters.source||scene.sourceTitle===filters.source)&&(!filters.media||(filters.media==='text'?!scene.media.length:scene.media.some(ref=>ref.mime.startsWith(filters.media))))&&normalize([scene.title,scene.quote,scene.translation,scene.note,scene.sourceTitle,...links.map(historyDisplayTitle)].join(' ')).includes(normalize(filters.query)));
    host.querySelector('[data-scene-count]').textContent=`${rows.length} / ${groups.length} 个场景`;
    let id=selectedId(),group=groups.find(row=>row.scene.groupId===id);
    if(id&&!group){const message=host.querySelector('.scene-workspace-message');message.textContent='该场景已不存在，已返回场景列表。';message.hidden=false;const url=new URL(location.href);url.searchParams.delete('scene');history.replaceState(history.state,'',url);id=''}
    if(!id&&innerWidth>900&&rows.length){group=rows[0];id=group.scene.groupId}
    host.classList.toggle('scene-detail-open',Boolean(id));
    const key=JSON.stringify(rows.map(({scene,links})=>[scene.groupId,scene.title,scene.quote,scene.sourceTitle,scene.media[0]?.id,links.length]));
    const list=host.querySelector('.scene-master');
    if(key!==listKey){listKey=key;const scroll=list.scrollTop;
      list.innerHTML=rows.map(({scene,links})=>`<button type="button" class="scene-list-row" data-select-scene="${esc(scene.groupId)}"><span class="scene-thumb">${icon(scene.media[0]?.mime.startsWith('video/')?'play':'images')}</span><span class="scene-list-copy"><strong>${esc(scene.title||scene.sourceTitle||'未命名场景')}</strong><span>${esc(scene.quote||scene.note||'纯素材场景')}</span><small>${esc(scene.sourceTitle||'未填写来源')} · ${links.length} 个词条</small></span></button>`).join('')||'<div class="scene-empty-text">没有匹配的场景</div>';list.scrollTop=scroll;
      rows.forEach(({scene},index)=>{if(scene.media[0]){const node=list.children[index].querySelector('.scene-thumb');node._sceneRef=scene.media[0];thumbObserver.observe(node)}});
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
  addEventListener('pagehide',event=>{if(!event.persisted){for(const url of thumbs.values())URL.revokeObjectURL(url);thumbs.clear()}});
  root.SceneWorkspace={render,select,back};if(activeView==='scenes')render();
})(globalThis);
