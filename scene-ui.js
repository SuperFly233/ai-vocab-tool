(function attachSceneUI(root){
  let editor=null,busy=false,returnFocus=null;
  const urls=new Map();
  const syncErrors=new Map();
  const syncKey=sceneId=>`${cloudUser?.id||''}:${sceneId}`;
  let cleanupTimer=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const historyItem=id=>getHistory().find(item=>String(item.id)===String(id));
  const scenes=item=>SceneData.reconcile(item?.scenes,item?.sceneTombstones).items;
  function action(name,label,attributes=''){
    const glyph={edit:'pencil',remove:'trash-2',download:'download',backup:'download',close:'x',detach:'x',sync:'refresh-cw',import:'folder',feature:'star',hero:'star',enlarge:'maximize-2','viewer-close':'x'}[name]||'plus';
    return `<button type="button" class="icon-btn" data-scene-action="${name}" ${attributes} aria-label="${esc(label)}" data-tip="${esc(label)}">${icon(glyph)}</button>`;
  }
  function assets(items=[]){
    return items.map(ref=>`<figure class="scene-asset" data-scene-asset="${esc(ref.id)}" data-scene-mime="${esc(ref.mime)}" aria-label="${esc(ref.name)}"><span class="scene-asset-loading" aria-hidden="true"></span></figure>`).join('');
  }
  const syncErrorHTML=message=>message?`<span>${esc(message)}</span>${action('sync','重试同步素材')}`:'';
  function renderCard(scene,item){
    const source=[scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · ');
    const result=displayedResultForHistory(item.id,item);
    // Explicit selections take precedence over automatic headword/core-meaning matches.
    const quote=highlightText(scene.quote,exampleHighlightTermsForItem(scene,scene.exampleHighlights.length?[]:resultQueryHighlightTerms(result)));
    const translation=highlightText(scene.translation,translationHighlightTermsForItem(scene,{}));
    const hero=scene.media.filter(ref=>scene.heroMedia.includes(ref.id));
    const syncError=syncErrors.get(syncKey(scene.id));
    return `<article class="scene-record ${hero.length?'scene-illustrated':''}" data-scene-id="${esc(scene.id)}" data-history-id="${esc(item.id)}">
      <header><div>${scene.title?`<h4>${esc(scene.title)}</h4>`:''}${scene.targetLabel?`<small>${esc(scene.targetLabel)}</small>`:''}</div><div class="scene-actions"><button class="icon-btn scene-order-handle" type="button" aria-label="拖动场景排序" data-tip="拖动场景排序">${icon('grip-vertical')}</button>${action('feature',scene.featured?'取消主场景':'设为主场景',`aria-pressed="${scene.featured}"`)}${action('edit','编辑场景')}${action('remove','删除场景')}</div></header>
      <div class="scene-sync-error" data-scene-sync-status role="status" ${syncError?'':'hidden'}>${syncErrorHTML(syncError)}</div>
      <div class="scene-context">
      ${scene.quote?`<blockquote>${quote}</blockquote>`:''}${scene.translation?`<p class="scene-translation">${translation}</p>`:''}
      ${scene.note?`<p class="scene-note">${esc(scene.note)}</p>`:''}
      ${source||scene.sourceUrl?`<details class="scene-source" open><summary>${icon('chevron-down')}来源与备注</summary>${source?`<p>${esc(source)}</p>`:''}${scene.sourceUrl?`<a href="${esc(scene.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开来源 ${icon('arrow-up-right')}</a>`:''}</details>`:''}</div>
      ${hero.length?`<div class="scene-media">${assets(hero)}</div>`:''}
      ${scene.media.some(ref=>!hero.includes(ref))?`<details class="scene-more-media"><summary>其他素材 · ${scene.media.length-hero.length}</summary><div class="scene-media">${assets(scene.media.filter(ref=>!hero.includes(ref)))}</div></details>`:''}
    </article>`;
  }
  function render(item,targetKey=''){
    if(!item?.id)return '';
    const all=scenes(item);
    if(!targetKey&&!all.length)return `<div class="scene-empty-entry" data-history-id="${esc(item.id)}"><button class="scene-link" type="button" data-scene-action="add">${icon('plus')}<span>添加场景</span></button></div>`;
    const selected=targetKey?all.filter(scene=>scene.targetKey===targetKey):all.filter(scene=>scene.featured);
    if(targetKey)return `<div class="scene-fragment" data-history-id="${esc(item.id)}" data-scene-target="${esc(targetKey)}"><button type="button" class="scene-link" data-scene-action="add">${icon('plus')}<span>场景${selected.length?` · ${selected.length}`:''}</span></button>${selected.map(scene=>renderCard(scene,item)).join('')}</div>`;
    const other=all.filter(scene=>!scene.featured&&!scene.targetKey);
    return `<section class="block scene-section" data-history-id="${esc(item.id)}"><div class="scene-section-head"><h3>场景记忆${all.length?` <small>${all.length}</small>`:''}</h3><div class="scene-actions">${all.length?action('backup','导出场景备份（含素材）'):''}${action('add','添加场景')}</div></div><div class="scene-record-list">${selected.map(scene=>renderCard(scene,item)).join('')}</div>${other.length?`<details class="scene-library"><summary>其他场景 · ${other.length}</summary><div class="scene-record-list">${other.map(scene=>renderCard(scene,item)).join('')}</div></details>`:''}</section>`;
  }
  function field(key,label,value='',multiline=false){
    return `<label class="scene-field"><span>${label}</span>${multiline?`<textarea name="${key}" rows="${key==='note'?3:2}">${esc(value)}</textarea>`:`<input name="${key}" value="${esc(value)}" ${key==='sourceUrl'?'type="url"':'type="text"'}>`}</label>`;
  }
  function readForm(){
    const form=document.querySelector('#scene-editor-form');
    if(!editor||!form)return null;
    const data=Object.fromEntries(new FormData(form));
    return SceneData.normalizeScene({...editor.scene,...data,exampleHighlights:splitVisualList(data.exampleHighlights),translationHighlights:splitVisualList(data.translationHighlights),featured:form.elements.featured.checked,media:editor.scene.media});
  }
  function recentSources(){
    const unique=new Map();
    for(const scene of getHistory().flatMap(scenes).sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0))){
      const source=Object.fromEntries(['sourceTitle','chapter','timeRange','sourceUrl'].map(key=>[key,scene[key]]));
      if(!Object.values(source).some(Boolean))continue;
      const key=JSON.stringify([source.sourceTitle,source.chapter,source.sourceUrl]);
      if(!unique.has(key))unique.set(key,source);
      if(unique.size===8)break;
    }
    return [...unique.values()];
  }
  async function open(id=null,targetKey='',sceneId=''){
    if(editor)return;
    const item=id?historyItem(id):null;
    if(id&&!item)return notify('词条已被删除。','info','场景记忆');
    returnFocus=document.activeElement;
    const now=new Date().toISOString();
    let scene=scenes(item).find(row=>row.id===sceneId);
    const query=item?.query||document.querySelector('#query-input')?.value.trim()||'';
    if(!scene&&!item){
      try{scene=await SceneData.getDraft(`pending:${normalizeSearch(query)}`)}catch{}
    }
    let targetLabel='';
    if(targetKey&&item){
      for(const kind of ['sense','collocation','confusion']){
        const fragment=findFragmentInResult(displayedResultForHistory(id,item),kind,targetKey);
        if(fragment){targetLabel=fragmentPinShape(kind,fragment).title||'';break}
      }
    }
    scene=SceneData.normalizeScene(scene||{id:crypto.randomUUID(),targetKey,targetLabel,createdAt:now,updatedAt:now,media:[]});
    const sources=recentSources();
    editor={historyId:item?.id||null,query,scene,initial:JSON.stringify(scene),newScene:!sceneId};
    const layer=document.createElement('div');layer.id='scene-editor';layer.className='scene-editor-layer modal-layer open';
    layer.innerHTML=`<section class="scene-editor" role="dialog" aria-modal="true" aria-labelledby="scene-editor-title"><header><div><h2 id="scene-editor-title">${sceneId?'编辑':'添加'}场景</h2><p>${esc(targetLabel||scene.targetLabel||query||'独立记录')}</p></div>${action('close','关闭场景编辑')}</header>
      <form id="scene-editor-form"><div class="scene-editor-body">
      ${!item?field('entryTitle','词条',query):''}${field('title','场景标题（可选）',scene.title)}<label class="scene-feature-switch"><input type="checkbox" role="switch" name="featured" ${scene.featured?'checked':''}><span>在词条开头展示</span></label>
      ${field('quote','原句 / 场景内容',scene.quote,true)}${field('translation','译文（可选）',scene.translation,true)}
      <div class="scene-field-grid scene-highlights">${field('exampleHighlights','原句高亮（可选）',scene.exampleHighlights.join('、'))}${field('translationHighlights','译文高亮（可选）',scene.translationHighlights.join('、'))}</div>
      <div class="scene-drop" tabindex="0" role="group" aria-label="场景素材"><button type="button" class="plain-btn" data-scene-action="pick">${icon('plus')}添加图片、GIF 或视频</button><small>PNG / JPEG / GIF / WebP · MP4 / WebM · 每文件 20 MB</small><input id="scene-file-picker" type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" multiple hidden><div id="scene-file-list"></div></div>
      ${field('note','我的笔记',scene.note,true)}<details class="scene-source-fields" open><summary>${icon('chevron-down')}来源信息</summary>${sources.length?`<label class="scene-field"><span>最近来源</span><select id="scene-source-recent"><option value="">选择已用来源</option>${sources.map((source,index)=>`<option value="${index}">${esc([source.sourceTitle||source.sourceUrl||'来源',source.chapter,source.timeRange].filter(Boolean).join(' · ').slice(0,160))}</option>`).join('')}</select></label>`:''}<div class="scene-field-grid">${field('sourceTitle','作品 / 来源标题',scene.sourceTitle)}${field('chapter','章节 / 集数',scene.chapter)}${field('timeRange','时间段',scene.timeRange)}${field('sourceUrl','来源网址',scene.sourceUrl)}</div></details>
      </div><p id="scene-editor-status" role="status"></p><footer>${!item?'<button type="button" class="plain-btn" data-scene-action="manual">保存为自建词条</button>':''}<button type="button" class="plain-btn primary-btn" data-scene-action="save">${item?'保存场景':'随查词保存'}</button></footer></form></section>`;
    document.body.append(layer);document.body.classList.add('modal-open');
    layer.addEventListener('backdrop-dismiss',()=>close());
    layer.querySelector('#scene-source-recent')?.addEventListener('change',event=>{
      if(event.target.value==='')return;
      const source=sources[Number(event.target.value)];if(!source)return;
      for(const [key,value] of Object.entries(source))layer.querySelector(`[name="${key}"]`).value=value;
    });
    layer.querySelector('#scene-file-picker').addEventListener('change',event=>{addFiles(event.target.files);event.target.value=''});
    layer.addEventListener('paste',event=>{const files=[...event.clipboardData.files];if(files.length){event.preventDefault();addFiles(files)}});
    layer.addEventListener('dragover',event=>{if([...event.dataTransfer.types].includes('Files')){event.preventDefault();layer.classList.add('dragging')}});
    layer.addEventListener('dragleave',event=>{if(!layer.contains(event.relatedTarget))layer.classList.remove('dragging')});
    layer.addEventListener('drop',event=>{event.preventDefault();layer.classList.remove('dragging');addFiles(event.dataTransfer.files)});
    layer.querySelector('form').addEventListener('submit',event=>{event.preventDefault();save()});
    renderFiles();layer.querySelector('textarea')?.focus();
  }
  function status(message,bad=false){const node=document.querySelector('#scene-editor-status');if(node){node.textContent=message;node.classList.toggle('bad',bad)}}
  function renderFiles(){
    const list=document.querySelector('#scene-file-list');if(!list||!editor)return;
    list.innerHTML=editor.scene.media.map(ref=>`<div class="scene-file-row" data-media-id="${ref.id}"><button type="button" class="icon-btn scene-file-grip" aria-label="拖动素材排序" data-tip="拖动素材排序">${icon('grip-vertical')}</button>${assets([ref])}<span>${esc(ref.name)} <small>${ref.size<1024*1024?`${Math.ceil(ref.size/1024)} KB`:`${(ref.size/1024/1024).toFixed(2)} MB`}</small></span>${action('hero',editor.scene.heroMedia.includes(ref.id)?'取消主素材':'设为主素材',`data-id="${ref.id}" aria-pressed="${editor.scene.heroMedia.includes(ref.id)}"`)}${action('detach','移除素材',`data-id="${ref.id}"`)}</div>`).join('');
  }
  function setBusy(value){busy=value;document.querySelectorAll('#scene-editor button').forEach(button=>button.disabled=value)}
  async function addFiles(fileList){
    if(!editor||busy)return;
    const files=[...fileList];if(!files.length)return;
    setBusy(true);status('正在读取素材…');let added=0;const errors=[];
    try{
      for(const file of files){
        if(editor.scene.media.length>=SceneData.MAX_FILES){errors.push('每个场景最多 6 个素材。');break}
        try{const ref=await SceneData.putFile(file);if(!editor.scene.media.some(item=>item.id===ref.id)){if(!editor.scene.media.length)editor.scene.heroMedia=[ref.id];editor.scene.media.push(ref);added++}}
        catch(error){errors.push(`${file.name||'文件'}：${error.message}`)}
      }
      renderFiles();status([added?`已添加 ${added} 个素材。`:'没有新增素材。',...errors].join(' '),Boolean(errors.length));
    }finally{setBusy(false)}
  }
  async function close(force=false){
    if(busy)return;
    const value=readForm();if(!editor)return;
    const form=document.querySelector('#scene-editor-form');
    const otherChanges=form?.elements.sourceUrl?.value.trim()!==editor.scene.sourceUrl||(!editor.historyId&&form?.elements.entryTitle?.value.trim()!==editor.query);
    if(!force&&(JSON.stringify(value)!==editor.initial||otherChanges)){
      if(!await askConfirm('尚未保存的文字和素材选择不会写入词条。确认放弃？','放弃场景修改'))return;
    }
    document.querySelector('#scene-editor')?.remove();editor=null;
    if(!document.querySelector('.modal-layer.open,.confirm-layer.open'))document.body.classList.remove('modal-open');
    if(returnFocus?.isConnected)returnFocus.focus();
  }
  function saveToHistory(id,scene){
    const item=historyItem(id);if(!item)throw new Error('词条已被删除，场景尚未保存。');
    const data=SceneData.reconcile([...(item.scenes||[]).filter(row=>row.id!==scene.id),scene],item.sceneTombstones);
    if(!setHistory(getHistory().map(row=>String(row.id)===String(id)?{...row,scenes:data.items,sceneTombstones:data.tombstones,updatedAt:new Date(Math.max(Date.now(),Date.parse(row.updatedAt)||0,Date.parse(scene.updatedAt)||0)).toISOString()}:row)))throw new Error('未能保存场景，请检查浏览器空间后重试。');
    refreshFragmentPinViews(id);
    if(document.getElementById('review-modal')?.classList.contains('open'))root.renderReview?.();
  }
  function persistSceneOrder(container){
    if(container.id==='scene-file-list'){
      const ids=[...container.children].map(node=>node.dataset.mediaId);
      editor.scene.media=ids.map(id=>editor.scene.media.find(ref=>ref.id===id)).filter(Boolean);return;
    }
    const id=container.closest('[data-history-id]')?.dataset.historyId,item=historyItem(id);if(!item)return;
    const ids=[...container.children].map(node=>node.dataset.sceneId).filter(Boolean);
    const all=scenes(item),visible=new Set(ids),remaining=[...ids];
    const ordered=all.map(scene=>visible.has(scene.id)?remaining.shift():scene.id);
    const now=new Date(Math.max(Date.now(),...all.map(scene=>(Date.parse(scene.updatedAt)||0)+1))).toISOString();
    const records=ordered.map((key,order)=>({...all.find(scene=>scene.id===key),order,updatedAt:now}));
    if(setHistory(getHistory().map(row=>String(row.id)===String(id)?{...row,scenes:records,updatedAt:now}:row)))refreshFragmentPinViews(id);
  }
  let sceneDrag=null;
  document.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.scene-order-handle,.scene-file-grip');if(!handle||event.button>0)return;
    const item=handle.closest('.scene-record,.scene-file-row');
    const state=sceneDrag={item,handle,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,active:false,ghost:null,initial:[...item.parentElement.children]};
    state.activate=()=>{if(sceneDrag!==state)return;state.active=true;item.classList.add('dragging');document.body.classList.add('reorder-active');state.ghost=createReorderGhost(item,event);handle.setPointerCapture?.(event.pointerId)};
    if(event.pointerType!=='mouse')state.timer=setTimeout(state.activate,180);
  });
  document.addEventListener('pointermove',event=>{
    const state=sceneDrag;if(!state||state.pointerId!==event.pointerId)return;
    const distance=Math.hypot(event.clientX-state.startX,event.clientY-state.startY);
    if(!state.active&&event.pointerType==='mouse'&&distance>5)state.activate();
    if(!state.active&&event.pointerType!=='mouse'&&distance>18){cancelPendingPointerDrag(state);sceneDrag=null;return}
    if(!state.active)return;
    event.preventDefault();positionReorderGhost(state.ghost,event);
    const container=state.item.parentElement;
    autoScrollDuringDrag(event.clientY,state.item.closest('.scene-editor-body,.modal-body')||document.scrollingElement);
    const candidates=[...container.children].filter(node=>node!==state.item);
    const target=candidates.reduce((best,node)=>{const rect=node.getBoundingClientRect(),distance=Math.abs(event.clientY-rect.top-rect.height/2);return !best||distance<best.distance?{node,rect,distance}:best},null);
    if(target)animateDomReorder(container,state.item,target.node,event.clientY>target.rect.top+target.rect.height/2);
  },{passive:false});
  function endSceneDrag(event){
    const state=sceneDrag;if(!state||state.pointerId!==event.pointerId)return;
    const container=state.item.parentElement;cancelPendingPointerDrag(state);sceneDrag=null;
    if(event.type==='pointercancel'){state.initial.forEach(node=>container.append(node));return}
    if(state.active)persistSceneOrder(container);
  }
  document.addEventListener('pointerup',endSceneDrag);document.addEventListener('pointercancel',endSceneDrag);
  document.addEventListener('keydown',event=>{
    const handle=event.target.closest('.scene-order-handle,.scene-file-grip');
    if(!handle||!['ArrowUp','ArrowDown'].includes(event.key))return;
    const item=handle.closest('.scene-record,.scene-file-row'),target=event.key==='ArrowUp'?item.previousElementSibling:item.nextElementSibling;
    if(target){event.preventDefault();animateDomReorder(item.parentElement,item,target,event.key==='ArrowDown');persistSceneOrder(item.parentElement)}
  });
  function createEntry(query,records){
    const now=new Date().toISOString();
    const result={meta:{origin:query,query,normalized:query,authored:true,entryType:query.includes(' ')?'phrase':'word'},headword:{title:query,coreMeaning:records[0]?.translation||'',summary:''},senses:[],collocations:[],register:{},confusions:[]};
    const item={id:Date.now(),query,result,scenes:records,createdAt:now,updatedAt:now,model:'个人创作',modelSource:'自建词条',folderIds:normalizeSelectableFolderIds(lookupFolderIds).filter(id=>id!==FOLDER_LIKED_ID),favorite:lookupFolderIds.includes(FOLDER_LIKED_ID)};
    if(!addHistory(item))throw new Error('未能创建词条，场景没有写入。');
    return item.id;
  }
  async function save(manual=false){
    if(!editor||busy)return;
    const form=new FormData(document.querySelector('#scene-editor-form'));
    const scene=readForm();
    if(!scene.title&&!scene.quote&&!scene.note&&!scene.media.length){status('请添加场景内容、笔记或素材。',true);return}
    const rawUrl=String(form.get('sourceUrl')||'').trim();if(rawUrl&&!scene.sourceUrl){status('来源网址需使用 http 或 https，不能包含账号密码。',true);return}
    const query=String(form.get('entryTitle')||editor.query).trim();
    if(!editor.historyId&&!query){status('请填写词条。',true);return}
    const latest=scenes(historyItem(editor.historyId)).find(row=>row.id===scene.id);
    scene.updatedAt=new Date(Math.max(Date.now(),(Date.parse(latest?.updatedAt)||0)+1,(Date.parse(scene.updatedAt)||0)+1)).toISOString();
    setBusy(true);
    try{
      let id=editor.historyId;
      if(!id&&manual){
        const existing=findHistoryByQuery(query);
        if(existing)id=existing.id;
        else id=createEntry(query,[scene]);
      }
      if(id)saveToHistory(id,scene);
      else{
        await SceneData.putDraft(`pending:${normalizeSearch(query)}`,scene);
        const input=document.querySelector('#query-input');if(input){input.value=query;input.dispatchEvent(new Event('input',{bubbles:true}))}
      }
      setBusy(false);await close(true);
      if(manual&&id){currentHistoryId=id;currentFollowups=historyItem(id)?.followups||[];renderResult(historyItem(id).result)}
      notify(id?'场景已保存。':'场景已暂存，查询完成后自动加入词条。','good','场景记忆');
      if(id&&cloudUser)syncScene(id,scene.id,false);
    }catch(error){status(error.message,true)}finally{setBusy(false)}
  }
  async function attachPending(id,query){
    try{const key=`pending:${normalizeSearch(query)}`,scene=await SceneData.getDraft(key);if(scene){saveToHistory(id,scene);await SceneData.deleteDraft(key)}}
    catch(error){notify(`词条已保存，但场景仍在本机草稿中：${error.message}`,'warn','场景记忆')}
  }
  async function remove(id,sceneId){
    const item=historyItem(id),scene=scenes(item).find(row=>row.id===sceneId);if(!scene)return;
    const now=new Date(Math.max(Date.now(),(Date.parse(scene.updatedAt)||0)+1)).toISOString();
    const data=SceneData.reconcile(item.scenes,[...(item.sceneTombstones||[]),{key:sceneId,deletedAt:now}]);
    if(!setHistory(getHistory().map(row=>String(row.id)===String(id)?{...row,scenes:data.items,sceneTombstones:data.tombstones,updatedAt:now}:row)))return;
    refreshFragmentPinViews(id);
    notify('场景已移除。','good','场景记忆',true,{label:'撤销',run:()=>saveToHistory(id,{...scene,updatedAt:new Date(Math.max(Date.now(),Date.parse(now)+1)).toISOString()})});
  }
  async function loadAsset(node){
    const id=node.dataset.sceneAsset;if(!id||node.dataset.loading)return;
    node.dataset.loading='true';node.setAttribute('aria-busy','true');
    try{
      const ref=getHistory().flatMap(item=>scenes(item)).flatMap(scene=>scene.media).find(item=>item.id===id);
      const file=ref?await SceneMedia.resolve(ref):await SceneData.getFile(id);if(!file?.blob)throw new Error('本机尚无此素材');
      node.removeAttribute('title');
      let url=urls.get(id);if(!url){url=URL.createObjectURL(file.blob);urls.set(id,url)}
      const video=file.ref.mime.startsWith('video/');
      node.innerHTML=video?`<video controls playsinline preload="metadata" src="${url}"></video>`:`<img loading="lazy" src="${url}" alt="${esc(file.ref.name)}">`;
      node.querySelector('video,img').addEventListener('error',()=>{
        if(node.querySelector('.scene-asset-error'))return;
        const message=document.createElement('p');message.className='scene-asset-error';message.textContent=video?'当前浏览器无法播放此编码，可下载原文件后打开。':'图片无法显示，可下载原文件检查。';node.append(message);
      },{once:true});
      const caption=document.createElement('figcaption');caption.textContent=file.ref.name;node.append(caption);
      const download=document.createElement('button');download.type='button';download.className='icon-btn scene-download';download.dataset.sceneAction='download';download.dataset.id=id;download.setAttribute('aria-label','下载原始素材');download.setAttribute('data-tip','下载原始素材');download.innerHTML=icon('download');node.append(download);
      const enlarge=document.createElement('button');enlarge.type='button';enlarge.className='icon-btn scene-enlarge';enlarge.dataset.sceneAction='enlarge';enlarge.dataset.id=id;enlarge.setAttribute('aria-label','放大素材');enlarge.setAttribute('data-tip','放大素材');enlarge.innerHTML=icon('maximize-2');node.append(enlarge);
      if(!video)node.querySelector('img').addEventListener('click',()=>openViewer(id));
    }catch(error){node.innerHTML=`<p class="scene-asset-error">${esc(error.message)}</p><button class="plain-btn" type="button" data-scene-action="load" data-id="${esc(id)}">重试加载</button>`;node.title=error.message}
    finally{delete node.dataset.loading;node.removeAttribute('aria-busy')}
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);loadAsset(entry.target)}},{rootMargin:'200px'});
  async function openViewer(id){
    document.querySelector('#scene-viewer')?.close();document.querySelector('#scene-viewer')?.remove();
    const dialog=document.createElement('dialog');dialog.id='scene-viewer';dialog.className='scene-viewer';dialog.setAttribute('aria-label','场景素材预览');
    dialog.innerHTML=`<header><span>场景素材</span>${action('viewer-close','关闭素材预览')}</header><div class="scene-viewer-content">${assets([{id,mime:'',name:'素材'}])}</div>`;
    dialog.addEventListener('close',()=>{dialog.remove();document.body.classList.remove('scene-viewing')});document.body.append(dialog);dialog.showModal();document.body.classList.add('scene-viewing');
    await loadAsset(dialog.querySelector('[data-scene-asset]'));
  }
  new MutationObserver(records=>{
    for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){
      if(node.matches('[data-scene-asset]'))observer.observe(node);
      node.querySelectorAll('[data-scene-asset]').forEach(el=>observer.observe(el));
    }
    clearTimeout(cleanupTimer);
    cleanupTimer=setTimeout(()=>{
      const active=new Set([...document.querySelectorAll('[data-scene-asset]')].map(node=>node.dataset.sceneAsset));
      for(const [id,url] of urls)if(!active.has(id)){URL.revokeObjectURL(url);urls.delete(id)}
    },200);
  }).observe(document.documentElement,{childList:true,subtree:true});
  const queryMenu=document.getElementById('scene-query-menu');
  const menuToggle=document.querySelector('.scene-menu-toggle');
  // Avoid grid stretching and transformed sticky ancestors in mobile WebKit.
  if(queryMenu)document.body.append(queryMenu);
  queryMenu?.addEventListener('toggle',()=>{
    const shown=queryMenu.matches(':popover-open');menuToggle.setAttribute('aria-expanded',String(shown));
    if(shown){
      const anchor=menuToggle.getBoundingClientRect();
      const viewport=window.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
      queryMenu.style.maxHeight=`${Math.max(40,Math.min(240,height-24))}px`;
      queryMenu.style.left=`${Math.max(left+12,Math.min(left+width-queryMenu.offsetWidth-12,anchor.right-queryMenu.offsetWidth))}px`;
      queryMenu.style.top=`${Math.max(top+12,Math.min(top+height-queryMenu.offsetHeight-12,anchor.bottom+8))}px`;
    }
  });
  addEventListener('resize',()=>queryMenu?.hidePopover());
  window.visualViewport?.addEventListener('resize',()=>queryMenu?.hidePopover());
  document.addEventListener('scroll',event=>{if(!queryMenu?.contains(event.target)&&queryMenu?.matches(':popover-open'))queryMenu.hidePopover()},true);
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-scene-action]');if(!button)return;
    event.preventDefault();event.stopPropagation();
    const name=button.dataset.sceneAction,parent=button.closest('[data-history-id]'),card=button.closest('[data-scene-id]');
    if(name==='menu'){queryMenu.togglePopover();return}
    if(queryMenu?.matches(':popover-open'))queryMenu.hidePopover();
    if(name==='open')open();
    else if(name==='import')pickBackup();
    else if(name==='backup')exportBackup(parent?.dataset.historyId);
    else if(name==='add')open(parent?.dataset.historyId,parent?.dataset.sceneTarget||'');
    else if(name==='edit')open(parent?.dataset.historyId,'',card?.dataset.sceneId);
    else if(name==='remove')remove(parent?.dataset.historyId,card?.dataset.sceneId);
    else if(name==='sync')syncScene(parent?.dataset.historyId,card?.dataset.sceneId,true);
    else if(name==='close')close();
    else if(name==='pick')document.querySelector('#scene-file-picker').click();
    else if(name==='detach'&&editor){editor.scene.media=editor.scene.media.filter(row=>row.id!==button.dataset.id);renderFiles()}
    else if(name==='save'||name==='manual')save(name==='manual');
    else if(name==='load')loadAsset(button.closest('[data-scene-asset]'));
    else if(name==='download')downloadAsset(button.dataset.id);
    else if(name==='enlarge')openViewer(button.dataset.id);
    else if(name==='viewer-close')document.querySelector('#scene-viewer')?.close();
    else if(name==='feature'){
      const scene=scenes(historyItem(parent?.dataset.historyId)).find(row=>row.id===card?.dataset.sceneId);
      if(scene)try{saveToHistory(parent.dataset.historyId,{...scene,featured:!scene.featured,updatedAt:new Date(Math.max(Date.now(),Date.parse(scene.updatedAt)+1)).toISOString()})}catch(error){notify(error.message,'bad','场景保存失败')}
    }
    else if(name==='hero'&&editor){
      const id=button.dataset.id;editor.scene.heroMedia=editor.scene.heroMedia.includes(id)?editor.scene.heroMedia.filter(value=>value!==id):[...editor.scene.heroMedia,id];renderFiles();
    }
  },true);
  document.addEventListener('keydown',event=>{
    const viewer=document.querySelector('#scene-viewer[open]');
    if(viewer&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();viewer.close();return}
    const layer=document.querySelector('#scene-editor');if(!layer||document.querySelector('.confirm-layer.open'))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return}
    if(event.key==='Tab'){
      const nodes=[...layer.querySelectorAll('button:not(:disabled),input:not([hidden]),textarea,summary')].filter(node=>node.getClientRects().length);
      const first=nodes[0],last=nodes.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  },true);
  async function receiveOutsideEditor(event,files){
    if(editor||!files.length)return;
    const target=event.target.closest?.('#workspace,#modal-card-page');
    if(!target)return;
    event.preventDefault();event.stopPropagation();
    const query=document.querySelector('#query-input')?.value.trim()||'';
    const id=target.id==='modal-card-page'?modalHistoryId:currentHistoryId&&(event.target.closest?.('#result-card')||normalizeSearch(historyItem(currentHistoryId)?.query)===normalizeSearch(query))?currentHistoryId:null;
    const key=event.target.closest?.('[data-fragment-key]')?.dataset.fragmentKey||'';
    await open(id,key);await addFiles(files);
  }
  document.addEventListener('paste',event=>{
    if(!editor)receiveOutsideEditor(event,[...(event.clipboardData?.files||[])]);
  },true);
  document.addEventListener('dragover',event=>{
    if(!editor&&event.target.closest?.('#workspace,#modal-card-page')&&[...event.dataTransfer.types].includes('Files'))event.preventDefault();
  },true);
  document.addEventListener('drop',event=>{
    if(!editor)receiveOutsideEditor(event,[...(event.dataTransfer?.files||[])]);
  },true);
  addEventListener('pagehide',event=>{if(!event.persisted){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear()}});
  async function downloadAsset(id){
    try{
      const ref=getHistory().flatMap(item=>scenes(item)).flatMap(scene=>scene.media).find(item=>item.id===id);
      if(!ref)return;
      const record=await SceneMedia.resolve(ref),url=URL.createObjectURL(record.blob),link=document.createElement('a');
      link.href=url;link.download=ref.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(error){notify(error.message,'bad','素材下载')}
  }
  async function syncScene(id,sceneId,announce=false){
    const scene=scenes(historyItem(id)).find(item=>item.id===sceneId);if(!scene)return;
    if(!cloudUser){if(announce)notify('素材已在本机保存，登录后自动同步。','info','场景素材');return}
    const owner=cloudUser.id,key=syncKey(scene.id);
    const showError=message=>{
      if(cloudUser?.id!==owner)return;
      if(message)syncErrors.set(key,message);else syncErrors.delete(key);
      document.querySelectorAll(`[data-scene-id="${scene.id}"] [data-scene-sync-status]`).forEach(node=>{node.hidden=!message;node.innerHTML=syncErrorHTML(message)});
    };
    try{
      showError('');
      for(const ref of scene.media){
        if(cloudUser?.id!==owner)return;
        await SceneMedia.upload(ref);
      }
      showError('');if(announce&&cloudUser?.id===owner)notify('场景素材已同步。','good','场景记忆');
    }
    catch(error){showError(`素材同步失败：${error.message}`);if(announce)notify(error.message,'warn','素材尚未同步');else pushLog(error.message,'warn','素材尚未同步')}
  }
  let syncJob=null;
  function syncPending(){
    if(syncJob||!cloudUser)return syncJob;
    const owner=cloudUser.id;
    syncJob=(async()=>{
      for(const item of getHistory())for(const scene of scenes(item)){
        if(!scene.media.length||cloudUser?.id!==owner)continue;
        let pending=false;
        for(const ref of scene.media){
          const record=await SceneData.getFile(ref.id);
          if(record?.blob&&!record.uploadedFor?.includes(owner))pending=true;
        }
        if(pending)await syncScene(item.id,scene.id,false);
      }
    })().catch(error=>pushLog(error.message,'warn','素材同步')).finally(()=>{syncJob=null});
    return syncJob;
  }
  addEventListener('online',()=>syncPending());
  function renderReview(card){
    const item=historyItem(card.historyId);if(!item)return '';
    return scenes(item).filter(scene=>card.fragmentKey?scene.targetKey===card.fragmentKey:!scene.targetKey).map(scene=>renderCard(scene,item)).join('');
  }
  async function exportBackup(id){
    const item=historyItem(id);if(!item)return;
    try{
      const records=scenes(item),refs=[...new Map(records.flatMap(scene=>scene.media).map(ref=>[ref.id,ref])).values()];
      if(refs.reduce((sum,ref)=>sum+ref.size,0)>30*1024*1024)throw new Error('单次场景备份最多包含 30 MB 素材，请下载原文件或拆分词条。');
      const files=[];
      for(const ref of refs){
        const record=await SceneMedia.resolve(ref);
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(record.blob)});
        files.push({ref,data});
      }
      downloadText(`Lexi-scene-${item.query.replace(/[\\/:*?"<>|]/g,'_')}.json`,JSON.stringify({format:'lexi-scenes',version:1,query:item.query,scenes:records,files}),'application/json');
      notify('场景和原始素材已一起导出。','good','场景备份');
    }catch(error){notify(error.message,'bad','场景备份')}
  }
  function pickBackup(){
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.addEventListener('change',()=>{if(input.files[0])importBackup(input.files[0])},{once:true});input.click();
  }
  async function importBackup(file){
    try{
      if(file.size>45*1024*1024)throw new Error('场景备份过大（最多 45 MB）。');
      const data=JSON.parse(await file.text());
      if(data.format!=='lexi-scenes'||data.version!==1||typeof data.query!=='string'||!data.query.trim()||!Array.isArray(data.scenes)||!data.scenes.length||data.scenes.length>100||!Array.isArray(data.files)||data.files.length>100)throw new Error('不是有效的场景备份。');
      const records=data.scenes.map(SceneData.normalizeScene);if(records.some(scene=>!scene))throw new Error('场景标识无效。');
      if(records.some((scene,index)=>(data.scenes[index].media||[]).length!==scene.media.length))throw new Error('场景素材引用无效，不能静默忽略。');
      const refs=[...new Map(records.flatMap(scene=>scene.media).map(ref=>[ref.id,ref])).values()];
      if(refs.reduce((sum,ref)=>sum+ref.size,0)>30*1024*1024)throw new Error('素材总量超过备份限制。');
      const validated=[];
      for(const ref of refs){
        const source=data.files.find(row=>row?.ref?.id===ref.id);
        if(typeof source?.data!=='string'||source.data.length!==Math.ceil(ref.size/3)*4||!/^[A-Za-z0-9+/]+={0,2}$/.test(source.data))throw new Error('备份缺少素材，或素材数据已损坏。');
        const raw=atob(source.data),bytes=new Uint8Array(raw.length);for(let index=0;index<raw.length;index++)bytes[index]=raw.charCodeAt(index);
        const checked=await SceneData.inspectFile(new Blob([bytes],{type:ref.mime}));
        if(checked.ref.id!==ref.id||checked.ref.mime!==ref.mime)throw new Error('备份素材完整性校验失败。');
        validated.push({ref,blob:checked.blob,uploadedFor:[]});
      }
      if(!await askConfirm(`将导入「${data.query.slice(0,180)}」的 ${records.length} 个场景及 ${refs.length} 个素材。已有同名词条会合并，不覆盖较新场景。`,'导入场景备份'))return;
      for(const record of validated)if(!await SceneData.getFile(record.ref.id))await SceneData.putRecord(record.ref.id,record);
      const item=findHistoryByQuery(data.query.trim());let id;
      if(item){
        const merged=SceneData.reconcile([...(item.scenes||[]),...records],item.sceneTombstones);
        if(!setHistory(getHistory().map(row=>row.id===item.id?{...row,scenes:merged.items,sceneTombstones:merged.tombstones,updatedAt:new Date().toISOString()}:row)))throw new Error('导入写入失败。');id=item.id;
      }else id=createEntry(data.query.trim(),records);
      openHistoryModal(id);syncPending();notify('场景备份已导入。','good','场景记忆');
    }catch(error){notify(error.message,'bad','场景导入失败')}
  }
  root.SceneUI={render,open,attachPending,syncPending,renderReview};
})(globalThis);
