(function attachSceneUI(root){
  let editor=null,busy=false,returnFocus=null;
  const urls=new Map();
  const syncErrors=new Map();
  const syncKey=sceneId=>`${cloudUser?.id||''}:${sceneId}`;
  let cleanupTimer=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const historyItem=id=>getHistory().find(item=>String(item.id)===String(id));
  const scenes=item=>SceneData.reconcile(item?.scenes,item?.sceneTombstones).items;
  const library=()=>SceneData.reconcile(getSettings().sceneLibrary,getSettings().sceneLibraryTombstones).items;
  const findScene=(id,sceneId)=>(id==='library'?library():scenes(historyItem(id))).find(row=>row.id===sceneId);
  function saveLibrary(scene){
    const settings=getSettings(),data=SceneData.reconcile([...(settings.sceneLibrary||[]),scene],settings.sceneLibraryTombstones);
    if(!setSettings({...settings,sceneLibrary:data.items,sceneLibraryTombstones:data.tombstones,updatedAt:new Date().toISOString()}))throw new Error('场景未能写入本机。');
    if(activeView==='scenes')renderHub();
  }
  function action(name,label,attributes=''){
    const glyph={add:'image-plus','new-library':'image-plus',edit:'pencil',remove:'trash-2',download:'download',backup:'download',close:'x',detach:'trash-2',sync:'refresh-cw',import:'file-up',feature:'star',hero:'star',enlarge:'maximize-2',controls:'sliders-horizontal',tools:'settings-2',query:'search','viewer-close':'x'}[name]||'plus';
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
      <header><div>${scene.title?`<h4>${esc(scene.title)}</h4>`:''}${scene.targetLabel?`<small>${esc(scene.targetLabel)}</small>`:''}${timeMeta(scene)}</div><div class="scene-actions"><button class="icon-btn scene-order-handle" type="button" aria-label="拖动场景排序" data-tip="拖动场景排序">${icon('grip-vertical')}</button>${action('query','从场景查另一个词条')}${action('feature',scene.featured?'取消主场景':'设为主场景',`aria-pressed="${scene.featured}"`)}${action('edit','编辑场景')}${action('remove','删除场景')}</div></header>
      <div class="scene-sync-error" data-scene-sync-status role="status" ${syncError?'':'hidden'}>${syncErrorHTML(syncError)}</div>
      <div class="scene-context">
      ${scene.quote?`<blockquote>${quote}</blockquote>`:''}${scene.translation?`<p class="scene-translation">${translation}</p>`:''}
      ${scene.note?`<p class="scene-note">${esc(scene.note)}</p>`:''}
      ${source||scene.sourceUrl?`<details class="scene-source" open><summary>${icon('chevron-down')}来源与备注</summary>${source?`<p>${esc(source)}</p>`:''}${scene.sourceUrl?`<a href="${esc(scene.sourceUrl)}" target="_blank" rel="noopener noreferrer">打开来源 ${icon('arrow-up-right')}</a>`:''}</details>`:''}</div>
      ${hero.length?`<button type="button" class="scene-splitter" role="separator" aria-orientation="vertical" aria-label="调整文字与素材宽度，双击复位" aria-valuemin="25" aria-valuemax="65" aria-valuenow="38" data-tip="拖动调整宽度，双击复位"><span class="scene-splitter-rail"></span>${icon('grip-vertical')}</button><div class="scene-media">${assets(hero)}</div>`:''}
      ${scene.media.some(ref=>!hero.includes(ref))?`<details class="scene-more-media"><summary>其他素材 · ${scene.media.length-hero.length}</summary><div class="scene-media">${assets(scene.media.filter(ref=>!hero.includes(ref)))}</div></details>`:''}
    </article>`;
  }
  function render(item,targetKey=''){
    if(!item?.id)return '';
    const all=scenes(item);
    if(!targetKey&&!all.length)return `<div class="scene-empty-entry" data-history-id="${esc(item.id)}"><button class="scene-link" type="button" data-scene-action="add">${icon('image-plus')}<span>添加场景</span></button></div>`;
    const selected=targetKey?all.filter(scene=>scene.targetKey===targetKey):all.filter(scene=>scene.featured);
    if(targetKey)return `<div class="scene-fragment" data-history-id="${esc(item.id)}" data-scene-target="${esc(targetKey)}"><button type="button" class="scene-link" data-scene-action="add">${icon('image-plus')}<span>场景${selected.length?` · ${selected.length}`:''}</span></button>${selected.map(scene=>renderCard(scene,item)).join('')}</div>`;
    const other=all.filter(scene=>!scene.featured&&!scene.targetKey);
    return `<section class="block scene-section" data-history-id="${esc(item.id)}"><div class="scene-section-head"><h3><button class="scene-hub-link" data-scene-action="hub" data-tip="打开场景库">场景记忆${all.length?` <small>${all.length}</small>`:''}</button></h3><div class="scene-actions">${all.length?action('backup','导出场景备份（含素材）'):''}${action('add','添加场景')}</div></div><div class="scene-record-list">${selected.map(scene=>renderCard(scene,item)).join('')}</div>${other.length?`<details class="scene-library"><summary>其他场景 · ${other.length}</summary><div class="scene-record-list">${other.map(scene=>renderCard(scene,item)).join('')}</div></details>`:''}</section>`;
  }
  const fieldHints={
    title:['场景名称 · 可选','仅用于识别场景，不会修改词条标题；留空时显示原句摘要。','原神 · 冬夜对白'],
    entryTitle:['词条标题','自建词条时填写要学习的单词或词组；不是场景名称。','clock'],
    quote:['原句 / 场景内容','填写看到的完整句子或简短上下文；也可以只添加素材。','I clocked the detail.'],
    translation:['译文 · 可选','填写对应原句的译文，不是词条的通用释义。','我注意到了这个细节。'],
    exampleHighlights:['原句高亮 · 可选','复制原句中实际出现的片段；多个用顿号或换行分隔，留空沿用词条自动匹配。','clocked、the detail'],
    translationHighlights:['译文高亮 · 可选','复制译文中实际出现的片段；多个用顿号或换行分隔，留空不强制高亮。','注意到、细节'],
    featured:['在词条中优先展示','开启后直接显示在词条的场景记忆区（位于核心义之后），不是覆盖词条标题；关闭仍在其他场景或绑定义项下查看。','用于优先回顾的场景开启，其余场景关闭。'],
    note:['我的笔记 · 可选','记录自己的联想或学习心得，不会作为 AI 释义。','clock 在这里不是时钟，而是“注意到”。'],
    sourceTitle:['作品 / 来源标题 · 可选','填写作品、课程、视频或网站名称；最近来源可快速填入后再修改。','原神'],
    chapter:['章节 / 集数 · 可选','填写可再次找到场景的位置。','第七章 · 第四幕'],
    timeRange:['素材时间段 · 可选','这是来源视频中的位置，不是场景的创建或修改时间。','00:07:18–00:07:21'],
    sourceUrl:['来源网址 · 可选','使用完整 http:// 或 https:// 链接，不允许脚本地址。','https://example.com/watch?t=438'],
    mediaName:['素材文件名','修改显示与下载文件名，不改素材内容、格式或哈希；保存场景后生效。','冬夜对白.png'],
  };
  function field(key,label,value='',multiline=false){
    return `<label class="scene-field visual-field-hinted"><span>${label}</span>${multiline?`<textarea name="${key}" rows="${key==='note'?3:2}" maxlength="${key==='note'?12000:4000}">${esc(value)}</textarea>`:`<input name="${key}" value="${esc(value)}" maxlength="${key==='sourceUrl'?2048:4000}" ${key==='sourceUrl'?'type="url"':'type="text"'}>`}${visualHintHTML(key,fieldHints)}</label>`;
  }
  function timeMeta(scene,mode='both'){
    const keys=mode==='created'?['createdAt']:mode==='updated'?['updatedAt']:['createdAt','updatedAt'];
    return `<div class="scene-time-meta">${keys.filter(key=>formatHistoryTime(scene[key])).map(key=>`<span>${key==='createdAt'?'创建':'修改'} <time datetime="${esc(scene[key])}">${esc(formatHistoryTime(scene[key]))}</time></span>`).join('')}</div>`;
  }
  function readForm(){
    const form=document.querySelector('#scene-editor-form');
    if(!editor||!form)return null;
    const data=Object.fromEntries(new FormData(form));
    return SceneData.normalizeScene({...editor.scene,...data,exampleHighlights:splitVisualList(data.exampleHighlights),translationHighlights:splitVisualList(data.translationHighlights),featured:form.elements.featured.checked,media:editor.scene.media});
  }
  function recentSources(){
    const unique=new Map();
    for(const scene of [...library(),...getHistory().flatMap(scenes)].sort((a,b)=>(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0))){
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
    const account=cloudUser?.id||'local';
    const standalone=id==='library',item=id&&!standalone?historyItem(id):null;
    if(id&&!standalone&&!item)return notify('词条已被删除。','info','场景记忆');
    returnFocus=document.activeElement;
    const now=new Date().toISOString();
    let scene=findScene(id,sceneId);
    const query=item?.query||(!standalone?document.querySelector('#query-input')?.value.trim():'')||'';
    if(!scene&&!item&&!standalone){
      try{scene=await SceneData.getDraft(`pending:${normalizeSearch(query)}`)}catch{}
    }
    if(editor||account!==(cloudUser?.id||'local'))return;
    let targetLabel='';
    if(targetKey&&item){
      for(const kind of ['sense','collocation','confusion']){
        const fragment=findFragmentInResult(displayedResultForHistory(id,item),kind,targetKey);
        if(fragment){targetLabel=fragmentPinShape(kind,fragment).title||'';break}
      }
    }
    scene=SceneData.normalizeScene(scene||{id:crypto.randomUUID(),targetKey,targetLabel,createdAt:now,updatedAt:now,media:[]});
    const sources=recentSources();
    const featuredHints=standalone?{featured:['新关联词条时优先展示','这是新关联词条的展示默认值，不会批量改动已有词条。已有词条可在各自场景中单独调整。','常用场景开启；补充材料关闭。']}:fieldHints;
    editor={historyId:item?.id||null,standalone,query,scene,newScene:!sceneId,owner:cloudUser?.id||'local',base:sceneId?JSON.stringify(scene):null};
    const layer=document.createElement('div');layer.id='scene-editor';layer.className='scene-editor-layer modal-layer open';
    layer.innerHTML=`<section class="scene-editor" role="dialog" aria-modal="true" aria-labelledby="scene-editor-title"><header><div><h2 id="scene-editor-title">${sceneId?'编辑':'添加'}场景</h2><p>${esc(targetLabel||scene.targetLabel||query||'独立记录')}</p></div>${action('close','关闭场景编辑')}</header>
      <form id="scene-editor-form"><div class="scene-editor-body">
      ${!item&&!standalone?field('entryTitle','词条',query):''}${field('title','场景名称（可选）',scene.title)}<label class="scene-feature-switch visual-field-hinted"><input type="checkbox" role="switch" name="featured" ${scene.featured?'checked':''}><span>${standalone?'新关联词条时优先展示':'在词条中优先展示'}</span>${visualHintHTML('featured',featuredHints)}</label>
      ${field('quote','原句 / 场景内容',scene.quote,true)}${field('translation','译文（可选）',scene.translation,true)}
      <div class="scene-field-grid scene-highlights">${field('exampleHighlights','原句高亮（可选）',scene.exampleHighlights.join('、'))}${field('translationHighlights','译文高亮（可选）',scene.translationHighlights.join('、'))}</div>
      <div class="scene-drop" tabindex="0" role="group" aria-label="场景素材"><button type="button" class="plain-btn" data-scene-action="pick">${icon('image-plus')}添加图片、GIF 或视频</button><small>PNG / JPEG / GIF / WebP · MP4 / WebM · 每文件 20 MB</small><input id="scene-file-picker" type="file" accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm" multiple hidden><div id="scene-file-list"></div></div>
      ${field('note','我的笔记',scene.note,true)}<details class="scene-source-fields" open><summary>${icon('chevron-down')}来源信息</summary>${sources.length?`<label class="scene-field"><span>最近来源</span><select id="scene-source-recent"><option value="">选择已用来源</option>${sources.map((source,index)=>`<option value="${index}">${esc([source.sourceTitle||source.sourceUrl||'来源',source.chapter,source.timeRange].filter(Boolean).join(' · ').slice(0,160))}</option>`).join('')}</select></label>`:''}<div class="scene-field-grid">${field('sourceTitle','作品 / 来源标题',scene.sourceTitle)}${field('chapter','章节 / 集数',scene.chapter)}${field('timeRange','时间段',scene.timeRange)}${field('sourceUrl','来源网址',scene.sourceUrl)}</div></details>
      </div><p id="scene-editor-status" role="status"></p><footer>${!item&&!standalone?'<button type="button" class="plain-btn" data-scene-action="manual">保存为自建词条</button><button type="button" class="plain-btn" data-scene-action="standalone">独立保存场景</button>':''}<button type="button" class="plain-btn primary-btn" data-scene-action="save">${item||standalone?'保存场景':'随查词保存'}</button></footer></form></section>`;
    document.body.append(layer);document.body.classList.add('modal-open');
    const body=layer.querySelector('.scene-editor-body'),primary=document.createElement('section'),secondary=document.createElement('section');
    primary.className='scene-editor-section';secondary.className='scene-editor-section';
    primary.innerHTML='<h3>素材与原句</h3>';secondary.innerHTML='<h3>场景信息</h3>';
    for(const node of [body.querySelector('.scene-drop'),body.querySelector('[name="quote"]').closest('label'),body.querySelector('[name="exampleHighlights"]').closest('label'),body.querySelector('[name="translation"]').closest('label'),body.querySelector('[name="translationHighlights"]').closest('label')])primary.append(node);
    body.querySelector('.scene-highlights').remove();
    primary.querySelector('[name="exampleHighlights"]').closest('label').classList.add('scene-highlight-field');primary.querySelector('[name="translationHighlights"]').closest('label').classList.add('scene-highlight-field');
    while(body.firstChild)secondary.append(body.firstChild);body.append(primary,secondary);
    layer.querySelector('.scene-editor').classList.toggle('hints-pinned',normalizeBooleanSetting(getSettings().visualHintsPinned,false));
    if(!editor.newScene)layer.querySelector('.scene-editor>header>div').insertAdjacentHTML('beforeend',timeMeta(scene));
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
    renderFiles();editor.initial=editorState();layer.querySelector('textarea')?.focus();
  }
  function editorState(){
    const form=document.querySelector('#scene-editor-form');if(!form||!editor)return '';
    const fields=[...form.elements].filter(node=>node.name&&node.type!=='file').map(node=>[node.name,node.type==='checkbox'?node.checked:node.value]);
    return JSON.stringify({fields,media:editor.scene.media,heroMedia:editor.scene.heroMedia});
  }
  async function restoreEditor(snapshot){
    if((cloudUser?.id||'local')!==snapshot.owner)return notify('账号已切换，未恢复其他账号的草稿。','info','恢复草稿');
    if(editor)return notify('请先关闭当前编辑器，再恢复上一份草稿。','info','恢复草稿',true,{label:'恢复草稿',run:()=>restoreEditor(snapshot)});
    const latest=findScene(snapshot.standalone?'library':snapshot.historyId,snapshot.scene.id);
    if(!snapshot.newScene&&JSON.stringify(latest)!==snapshot.base)return notify('原场景已更新或删除，未恢复过期草稿。','warn','恢复草稿');
    await open(snapshot.standalone?'library':snapshot.historyId,snapshot.scene.targetKey,snapshot.newScene?'':snapshot.scene.id);
    if(!editor)return;
    editor.scene=structuredClone(snapshot.scene);
    const form=document.querySelector('#scene-editor-form');
    for(const [name,value] of snapshot.fields){const input=form.elements.namedItem(name);if(input){if(input.type==='checkbox')input.checked=value;else input.value=value}}
    renderFiles();status('已恢复未保存的修改。');
  }
  function status(message,bad=false){const node=document.querySelector('#scene-editor-status');if(node){node.textContent=message;node.classList.toggle('bad',bad)}}
  function renderFiles(){
    const list=document.querySelector('#scene-file-list');if(!list||!editor)return;
    list.innerHTML=editor.scene.media.map(ref=>`<div class="scene-file-row" data-media-id="${ref.id}"><button type="button" class="icon-btn scene-file-grip" aria-label="拖动素材排序" data-tip="拖动素材排序">${icon('grip-vertical')}</button>${assets([ref])}<label class="scene-file-name visual-field-hinted"><span>素材文件名</span><input type="text" name="mediaName_${ref.id}" data-media-name="${ref.id}" value="${esc(ref.name)}" maxlength="180" aria-label="素材文件名"><small>${ref.mime.split('/')[1].toUpperCase()} · ${ref.size<1024*1024?`${Math.ceil(ref.size/1024)} KB`:`${(ref.size/1024/1024).toFixed(2)} MB`}</small>${visualHintHTML('mediaName',fieldHints)}</label><div class="scene-file-actions">${action('hero',editor.scene.heroMedia.includes(ref.id)?'取消主素材':'设为主素材',`data-id="${ref.id}" aria-pressed="${editor.scene.heroMedia.includes(ref.id)}"`)}${action('detach','移除素材',`data-id="${ref.id}"`)}</div></div>`).join('');
    list.querySelectorAll('[data-media-name]').forEach(input=>input.oninput=()=>{const ref=editor.scene.media.find(ref=>ref.id===input.dataset.mediaName);if(ref)ref.name=input.value.trim().replace(/[\\/\x00-\x1f]/g,'_').slice(0,180)||'素材'});
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
    if(!editor)return;
    const form=document.querySelector('#scene-editor-form');
    const changed=editorState()!==editor.initial,closing=editor;
    let snapshot=null;
    if(!force&&changed){
      if(!await askConfirm('尚未保存的文字和素材选择不会写入词条。确认放弃？','放弃场景修改'))return;
      if(editor!==closing)return;
      snapshot={historyId:editor.historyId,standalone:editor.standalone,newScene:editor.newScene,base:editor.base,scene:structuredClone(editor.scene),owner:editor.owner,fields:[...form.elements].filter(node=>node.name&&node.type!=='file').map(node=>[node.name,node.type==='checkbox'?node.checked:node.value])};
    }
    document.querySelector('#scene-editor')?.remove();editor=null;
    if(!document.querySelector('.modal-layer.open,.confirm-layer.open'))document.body.classList.remove('modal-open');
    if(returnFocus?.isConnected)returnFocus.focus();
    if(snapshot)notify('已放弃未保存的场景修改。','info','场景',true,{label:'撤销',run:()=>restoreEditor(snapshot)});
  }
  function saveToHistory(id,scene,{share=false}={}){
    const item=historyItem(id);if(!item)throw new Error('词条已被删除，场景尚未保存。');
    const data=SceneData.reconcile([...(item.scenes||[]).filter(row=>row.id!==scene.id),scene],item.sceneTombstones);
    const fields=['title','quote','translation','note','sourceTitle','chapter','timeRange','sourceUrl','media','heroMedia'];
    const shared=Object.fromEntries(fields.map(key=>[key,scene[key]])),changed=[];
    const history=getHistory().map(row=>{
      let records=String(row.id)===String(id)?data.items:scenes(row),touched=String(row.id)===String(id);
      if(share)records=records.map(linked=>{if(linked.groupId!==scene.groupId)return linked;touched=true;return {...linked,...shared,updatedAt:scene.updatedAt}});
      if(!touched)return row;changed.push(row.id);
      return {...row,scenes:records,sceneTombstones:String(row.id)===String(id)?data.tombstones:row.sceneTombstones,updatedAt:new Date(Math.max(Date.now(),Date.parse(row.updatedAt)||0,Date.parse(scene.updatedAt)||0)).toISOString()};
    });
    const independent=share?library().find(row=>row.groupId===scene.groupId):null;
    const settings=getSettings(),libraryData=independent?SceneData.reconcile([...(settings.sceneLibrary||[]),{...independent,...shared,updatedAt:scene.updatedAt}],settings.sceneLibraryTombstones):null;
    const persisted=libraryData?setHistoryAndSettings(history,{...settings,sceneLibrary:libraryData.items,sceneLibraryTombstones:libraryData.tombstones,updatedAt:new Date().toISOString()}):setHistory(history);
    if(!persisted)throw new Error('未能保存场景，请检查浏览器空间后重试。');
    changed.forEach(key=>refreshFragmentPinViews(key));
    if(activeView==='scenes')renderHub();
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
  async function save(manual=false,standalone=false){
    if(!editor||busy)return;
    if(editor.owner!==(cloudUser?.id||'local')){status('账号已切换，请关闭后重新打开场景。',true);return}
    if(!editor.newScene&&JSON.stringify(findScene(editor.standalone?'library':editor.historyId,editor.scene.id))!==editor.base){status('场景已在其他位置更新或删除，请保留草稿文字，重新打开后编辑。',true);return}
    const form=new FormData(document.querySelector('#scene-editor-form'));
    const scene=readForm();
    if(!scene.title&&!scene.quote&&!scene.note&&!scene.media.length){status('请添加场景内容、笔记或素材。',true);return}
    const rawUrl=String(form.get('sourceUrl')||'').trim();if(rawUrl&&!scene.sourceUrl){status('来源网址需使用 http 或 https，不能包含账号密码。',true);return}
    const query=String(form.get('entryTitle')||editor.query).trim();
    if(!editor.historyId&&!editor.standalone&&!standalone&&!query){status('请填写词条。',true);return}
    const latest=scenes(historyItem(editor.historyId)).find(row=>row.id===scene.id);
    scene.updatedAt=new Date(Math.max(Date.now(),(Date.parse(latest?.updatedAt)||0)+1,(Date.parse(scene.updatedAt)||0)+1)).toISOString();
    setBusy(true);
    try{
      if(editor.standalone||standalone){
        const linked=getHistory().flatMap(item=>scenes(item).map(row=>({item,row}))).find(({row})=>row.groupId===scene.groupId);
        if(linked)saveToHistory(linked.item.id,{...scene,id:linked.row.id,targetKey:linked.row.targetKey,targetLabel:linked.row.targetLabel,featured:linked.row.featured,order:linked.row.order,exampleHighlights:linked.row.exampleHighlights,translationHighlights:linked.row.translationHighlights},{share:true});
        saveLibrary(scene);setBusy(false);await close(true);renderHub();syncPending();notify('场景已独立保存，可继续摘取词组。','good','场景');return;
      }
      let id=editor.historyId;
      if(!id&&manual){
        const existing=findHistoryByQuery(query);
        if(existing)id=existing.id;
        else id=createEntry(query,[scene]);
      }
      if(id)saveToHistory(id,scene,{share:true});
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
  async function attachPending(id,query,groupId=''){
    try{const key=`pending:${normalizeSearch(query)}`,scene=groupId?[...library(),...getHistory().flatMap(scenes)].find(row=>row.groupId===groupId):await SceneData.getDraft(key);if(groupId&&!scene)throw new Error('原场景已不存在');if(scene){if(!scenes(historyItem(id)).some(row=>row.groupId===scene.groupId))saveToHistory(id,groupId?{...scene,id:crypto.randomUUID(),targetKey:'',targetLabel:'',featured:scene.featured}:scene);if(!groupId)await SceneData.deleteDraft(key)}return true}
    catch(error){notify(`词条已保存，但场景尚未关联：${error.message}`,'warn','场景记忆');return false}
  }
  async function remove(id,sceneId){
    const owner=cloudUser?.id||'local',before=JSON.stringify(findScene(id,sceneId));
    if(id==='library'){
      const scene=findScene(id,sceneId);if(!scene||!await askConfirm('删除独立场景？已有词条的关联仍然保留。','删除场景'))return;
      if(owner!==(cloudUser?.id||'local')||JSON.stringify(findScene(id,sceneId))!==before)return notify('场景或账号已变化，未执行删除。','warn','删除场景');
      const settings=getSettings(),now=new Date(Math.max(Date.now(),(Date.parse(scene.updatedAt)||0)+1)).toISOString();
      const data=SceneData.reconcile(library(),[...(settings.sceneLibraryTombstones||[]),{key:sceneId,deletedAt:now}]);
      if(!setSettings({...settings,sceneLibrary:data.items,sceneLibraryTombstones:data.tombstones,updatedAt:now}))return;
      renderHub();notify('独立场景已删除。','good','场景',true,{label:'撤销',run:()=>{
        if(owner!==(cloudUser?.id||'local')||findScene(id,sceneId)||!getSettings().sceneLibraryTombstones.some(row=>row.key===sceneId&&row.deletedAt===now))return notify('场景已再次变化，未恢复过期删除。','warn','撤销');
        saveLibrary({...scene,updatedAt:new Date(Math.max(Date.now(),Date.parse(now)+1)).toISOString()});
      }});return;
    }
    let item=historyItem(id),scene=scenes(item).find(row=>row.id===sceneId);if(!scene)return;
    if(!await askConfirm('从此词条移除这个场景？其他词条的关联不受影响。','删除场景'))return;
    if(owner!==(cloudUser?.id||'local')||JSON.stringify(findScene(id,sceneId))!==before)return notify('场景或账号已变化，未执行移除。','warn','删除场景');
    item=historyItem(id);scene=scenes(item).find(row=>row.id===sceneId);if(!scene)return;
    const now=new Date(Math.max(Date.now(),(Date.parse(scene.updatedAt)||0)+1)).toISOString();
    const data=SceneData.reconcile(item.scenes,[...(item.sceneTombstones||[]),{key:sceneId,deletedAt:now}]);
    if(!setHistory(getHistory().map(row=>String(row.id)===String(id)?{...row,scenes:data.items,sceneTombstones:data.tombstones,updatedAt:now}:row)))return;
    refreshFragmentPinViews(id);
    if(activeView==='scenes')renderHub();
    notify('场景已移除。','good','场景记忆',true,{label:'撤销',run:()=>{
      if(owner!==(cloudUser?.id||'local')||findScene(id,sceneId)||!historyItem(id)?.sceneTombstones?.some(row=>row.key===sceneId&&row.deletedAt===now))return notify('关联已再次变化，未恢复过期删除。','warn','撤销');
      saveToHistory(id,{...scene,updatedAt:new Date(Math.max(Date.now(),Date.parse(now)+1)).toISOString()});
    }});
  }
  async function loadAsset(node){
    const id=node.dataset.sceneAsset;if(!id||node.dataset.loading)return;
    node.dataset.loading='true';node.setAttribute('aria-busy','true');
    try{
      const ref=[...library(),...getHistory().flatMap(scenes)].flatMap(scene=>scene.media).find(item=>item.id===id);
      const file=ref?await SceneMedia.resolve(ref):await SceneData.getFile(id);if(!file?.blob)throw new Error('本机尚无此素材');
      node.removeAttribute('title');
      let url=urls.get(id);if(!url){url=URL.createObjectURL(file.blob);urls.set(id,url)}
      const video=file.ref.mime.startsWith('video/'),displayName=node.getAttribute('aria-label')||ref?.name||file.ref.name;
      node.innerHTML=video?`<video ${getSettings().mediaControls===false?'':'controls'} playsinline preload="metadata" src="${url}"></video>`:`<img loading="lazy" src="${url}" alt="${esc(displayName)}">`;
      node.querySelector('video,img').addEventListener('error',()=>{
        if(node.querySelector('.scene-asset-error'))return;
        const message=document.createElement('p');message.className='scene-asset-error';message.textContent=video?'当前浏览器无法播放此编码，可下载原文件后打开。':'图片无法显示，可下载原文件检查。';node.append(message);
      },{once:true});
      const caption=document.createElement('figcaption');caption.innerHTML=`<span>${esc(displayName)}</span><div class="scene-media-tools">${action('enlarge','放大素材',`data-id="${esc(id)}" data-name="${esc(displayName)}"`)}${action('download','下载原始素材',`data-id="${esc(id)}" data-name="${esc(displayName)}"`)}${video?action('controls','显示或隐藏视频控件'):''}</div>${action('tools','显示或隐藏素材工具')}`;node.append(caption);
      if(!video)node.querySelector('img').addEventListener('click',()=>openViewer(id,displayName));
      root.ExperienceUI?.mediaReady(node,node.querySelector('video,img'));
      root.ScenePreview?.fromLoaded(id,node.querySelector('video,img'));
    }catch(error){node.innerHTML=`<p class="scene-asset-error">${esc(error.message)}</p><button class="plain-btn" type="button" data-scene-action="load" data-id="${esc(id)}">重试加载</button>`;node.title=error.message}
    finally{delete node.dataset.loading;node.removeAttribute('aria-busy')}
  }
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);loadAsset(entry.target)}},{rootMargin:'200px'});
  async function openViewer(id,name='素材'){
    const origin=[...document.querySelectorAll('[data-scene-asset]')].find(node=>node.dataset.sceneAsset===id&&node.querySelector('video'))?.querySelector('video');
    const position=origin?.currentTime||0,playing=origin&&!origin.paused,muted=origin?.muted??true;
    document.querySelectorAll('.scene-asset video').forEach(video=>video.pause());
    document.querySelector('#scene-viewer')?.close();document.querySelector('#scene-viewer')?.remove();
    const dialog=document.createElement('dialog');dialog.id='scene-viewer';dialog.className='scene-viewer';dialog.setAttribute('aria-label','场景素材预览');
    dialog.innerHTML=`<header><span>场景素材</span>${action('viewer-close','关闭素材预览')}</header><div class="scene-viewer-content">${assets([{id,mime:'',name}])}</div>`;
    dialog.addEventListener('close',()=>{const video=dialog.querySelector('video');if(video){video.pause();if(origin?.isConnected)try{origin.currentTime=video.currentTime}catch{}}dialog.remove();document.body.classList.remove('scene-viewing')});document.body.append(dialog);dialog.showModal();document.body.classList.add('scene-viewing');
    await loadAsset(dialog.querySelector('[data-scene-asset]'));
    const preview=dialog.querySelector('video');
    if(preview){preview.controls=true;preview.muted=muted;const resume=()=>{try{preview.currentTime=position}catch{}if(playing)preview.play().catch(()=>{})};if(preview.readyState>=1)resume();else preview.addEventListener('loadedmetadata',resume,{once:true})}
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
    if(name==='hub'){if(queryMenu?.matches(':popover-open'))queryMenu.hidePopover();if(els.historyModal.classList.contains('open'))closeHistoryModal();showView('scenes');return}
    if(name==='open-entry'){openHistoryModal(button.dataset.id);return}
    if(queryMenu?.matches(':popover-open'))queryMenu.hidePopover();
    if(name==='open')open();
    else if(name==='import')pickBackup();
    else if(name==='backup')exportBackup(parent?.dataset.historyId);
    else if(name==='add')open(parent?.dataset.historyId,parent?.dataset.sceneTarget||'');
    else if(name==='new-library')open('library');
    else if(name==='edit')open(parent?.dataset.historyId,'',card?.dataset.sceneId);
    else if(name==='remove')remove(parent?.dataset.historyId,card?.dataset.sceneId);
    else if(name==='sync')syncScene(parent?.dataset.historyId,card?.dataset.sceneId,true);
    else if(name==='close')close();
    else if(name==='pick')document.querySelector('#scene-file-picker').click();
    else if(name==='detach'&&editor)detachMedia(button.dataset.id);
    else if(name==='save'||name==='manual')save(name==='manual');
    else if(name==='standalone')save(false,true);
    else if(name==='load')loadAsset(button.closest('[data-scene-asset]'));
    else if(name==='download')downloadAsset(button.dataset.id,button.dataset.name);
    else if(name==='enlarge')openViewer(button.dataset.id,button.dataset.name);
    else if(name==='tools'){const asset=button.closest('.scene-asset'),style=getComputedStyle(asset.querySelector('.scene-media-tools'));asset.dataset.tools=style.display==='none'||Number(style.opacity)===0?'shown':'hidden'}
    else if(name==='controls'){const video=button.closest('.scene-asset').querySelector('video');if(video)video.controls=!video.controls}
    else if(name==='query')queryFromScene(parent?.dataset.historyId,card?.dataset.sceneId);
    else if(name==='viewer-close')document.querySelector('#scene-viewer')?.close();
    else if(name==='feature'){
      const scene=scenes(historyItem(parent?.dataset.historyId)).find(row=>row.id===card?.dataset.sceneId);
      if(scene)try{saveToHistory(parent.dataset.historyId,{...scene,featured:!scene.featured,updatedAt:new Date(Math.max(Date.now(),Date.parse(scene.updatedAt)+1)).toISOString()})}catch(error){notify(error.message,'bad','场景保存失败')}
    }
    else if(name==='hero'&&editor){
      const id=button.dataset.id;editor.scene.heroMedia=editor.scene.heroMedia.includes(id)?editor.scene.heroMedia.filter(value=>value!==id):[...editor.scene.heroMedia,id];renderFiles();
    }
  },true);
  async function detachMedia(id){
    const owner=editor,ref=owner?.scene.media.find(row=>row.id===id);if(!ref)return;
    if(!await askConfirm('从当前场景草稿移除素材？原文件不会被立即删除。','移除素材')||editor!==owner)return;
    const featured=owner.scene.heroMedia.includes(id);owner.scene.media=owner.scene.media.filter(row=>row.id!==id);owner.scene.heroMedia=owner.scene.heroMedia.filter(value=>value!==id);renderFiles();
    notify('素材已从草稿移除。','good','场景',true,{label:'撤销',run:()=>{if(editor!==owner)return notify('原编辑草稿已关闭。','info','撤销');if(!owner.scene.media.some(row=>row.id===id)){owner.scene.media.push(ref);if(featured)owner.scene.heroMedia.push(id);renderFiles()}}});
  }
  document.addEventListener('keydown',event=>{
    if(UIOverlays.topDialog())return;
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
    const target=event.target.closest?.('#workspace,#modal-card-page,#scene-hub');
    if(!target)return;
    event.preventDefault();event.stopPropagation();
    const query=document.querySelector('#query-input')?.value.trim()||'';
    const id=target.id==='scene-hub'?'library':target.id==='modal-card-page'?modalHistoryId:currentHistoryId&&(event.target.closest?.('#result-card')||normalizeSearch(historyItem(currentHistoryId)?.query)===normalizeSearch(query))?currentHistoryId:null;
    const key=event.target.closest?.('[data-fragment-key]')?.dataset.fragmentKey||'';
    await open(id,key);await addFiles(files);
  }
  document.addEventListener('paste',event=>{
    if(!editor)receiveOutsideEditor(event,[...(event.clipboardData?.files||[])]);
  },true);
  document.addEventListener('dragover',event=>{
    if(!editor&&event.target.closest?.('#workspace,#modal-card-page,#scene-hub')&&[...event.dataTransfer.types].includes('Files'))event.preventDefault();
  },true);
  document.addEventListener('drop',event=>{
    if(!editor)receiveOutsideEditor(event,[...(event.dataTransfer?.files||[])]);
  },true);
  addEventListener('pagehide',event=>{if(!event.persisted){for(const url of urls.values())URL.revokeObjectURL(url);urls.clear()}});
  async function downloadAsset(id,name=''){
    try{
      const ref=[...library(),...getHistory().flatMap(scenes)].flatMap(scene=>scene.media).find(item=>item.id===id);
      if(!ref)return;
      const record=await SceneMedia.resolve(ref),url=URL.createObjectURL(record.blob),link=document.createElement('a');
      link.href=url;link.download=name||ref.name;link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    }catch(error){notify(error.message,'bad','素材下载')}
  }
  async function syncScene(id,sceneId,announce=false){
    const scene=findScene(id,sceneId);if(!scene)return;
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
      for(const scene of library())if(cloudUser?.id===owner)await syncScene('library',scene.id,false);
    })().catch(error=>pushLog(error.message,'warn','素材同步')).finally(()=>{syncJob=null});
    return syncJob;
  }
  addEventListener('online',()=>syncPending());
  function renderReview(card){
    const item=historyItem(card.historyId);if(!item)return '';
    return scenes(item).filter(scene=>card.fragmentKey?scene.targetKey===card.fragmentKey:!scene.targetKey).map(scene=>renderCard(scene,item)).join('');
  }
  async function exportBackup(id){
    const item=id==='library'?{query:'场景库',scenes:library()}:historyItem(id);if(!item)return;
    try{
      const records=scenes(item),refs=[...new Map(records.flatMap(scene=>scene.media).map(ref=>[ref.id,ref])).values()];
      if(refs.reduce((sum,ref)=>sum+ref.size,0)>30*1024*1024)throw new Error('单次场景备份最多包含 30 MB 素材，请下载原文件或拆分词条。');
      const files=[];
      for(const ref of refs){
        const record=await SceneMedia.resolve(ref);
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(record.blob)});
        files.push({ref,data});
      }
      downloadText(`Lexi-scene-${item.query.replace(/[\\/:*?"<>|]/g,'_')}.json`,JSON.stringify({format:'lexi-scenes',version:1,standalone:id==='library',query:item.query,scenes:records,files}),'application/json');
      notify('场景和原始素材已一起导出。','good','场景备份');
    }catch(error){notify(error.message,'bad','场景备份')}
  }
  async function queryFromScene(id,sceneId){
    const scene=findScene(id,sceneId);if(!scene)return;
    const selection=getSelection(),selectionScene=selection?.anchorNode?.parentElement?.closest('[data-scene-id]');
    const selected=selectionScene?.dataset.sceneId===sceneId?String(selection).trim().slice(0,200):'';
    if(els.historyModal.classList.contains('open'))closeHistoryModal();
    showView('scenes');root.SceneWorkspace?.select(scene.groupId);
    if(selected)root.SceneWorkspace?.addQueries(scene.groupId,selected);
  }
  let taskOwner='',tasks=new Map();
  function restoreTasks(){
    const owner=cloudUser?.id||'local';if(taskOwner===owner)return;
    taskOwner=owner;tasks=new Map();
    try{for(const task of JSON.parse(sessionStorage.getItem(`lexi-scene-tasks:${owner}`)||'[]'))if(task?.request?.sceneGroupId&&typeof task.request.query==='string')tasks.set(`${task.request.sceneGroupId}:${normalizeSearch(task.request.query)}`,{...task,status:['queued','running'].includes(task.status)?'error':task.status,message:['queued','running'].includes(task.status)?'任务中断，检查队列或重试。':task.message})}catch{}
  }
  function taskResult(request,status,message=''){
    if(!request.sceneGroupId&&!request.batchId)return;
    restoreTasks();tasks.set(`${request.sceneGroupId||request.batchId}:${normalizeSearch(request.query)}`,{request:{query:request.query,sceneGroupId:request.sceneGroupId||request.batchId},status,message});
    try{sessionStorage.setItem(`lexi-scene-tasks:${taskOwner}`,JSON.stringify([...tasks.values()].slice(-200)))}catch{}
    if(activeView==='scenes')renderHub();
  }
  function sceneGroups(){
    const groups=new Map();
    for(const scene of library())groups.set(scene.groupId,{scene,item:{id:'library'},links:[]});
    for(const item of getHistory())for(const scene of scenes(item)){
      const group=groups.get(scene.groupId)||{scene,item,links:[]};
      if(group.item.id!=='library'&&Date.parse(scene.updatedAt)>Date.parse(group.scene.updatedAt)){group.scene=scene;group.item=item}
      if(!group.links.some(row=>row.id===item.id))group.links.push(item);groups.set(scene.groupId,group);
    }
    return [...groups.values()].sort((a,b)=>Date.parse(b.scene.updatedAt)-Date.parse(a.scene.updatedAt));
  }
  async function queueSceneQueries(groupId,queries){
    const group=sceneGroups().find(row=>row.scene.groupId===groupId);if(!group)throw new Error('场景已不存在。');
    const {scene}=group;saveLibrary(scene);
    const accepted=[],failed=[];
    for(const query of queries){
      try{
      const request={query,sceneGroupId:groupId,direction:els.direction.value,note:`场景原句：${scene.quote}\n解释「${query}」在该场景中的含义，并保留必要的其他常见用法。`,folderIds:lookupFolderIds};
      const existing=findHistoryByQuery(query);
      if(existing){const linked=await attachPending(existing.id,query,groupId);taskResult(request,linked?'complete':'error',linked?'':'场景关联尚未完成');(linked?accepted:failed).push(query);continue}
      if(lookupQueue.some(row=>lookupRequestSignature(row)===lookupRequestSignature(request))||activeLookupSignature===lookupRequestSignature(request)){accepted.push(query);continue}
      taskResult(request,'queued');enqueueLookup(request,{silent:true});
      accepted.push(query);
      }catch(error){failed.push(query);taskResult({query,sceneGroupId:groupId},'error',error.message)}
    }
    processNextLookup();renderHub();return {accepted,failed};
  }
  async function retrySceneTask(key){
    restoreTasks();
    const task=tasks.get(key);if(!task)return;
    try{await queueSceneQueries(task.request.sceneGroupId,[task.request.query])}catch(error){taskResult(task.request,'error',error.message)}
  }
  function renderHub(){root.SceneWorkspace?.render()}
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
      if(data.standalone){records.forEach(saveLibrary);renderHub();syncPending();notify('独立场景备份已导入。','good','场景');return}
      const item=findHistoryByQuery(data.query.trim());let id;
      if(item){
        const merged=SceneData.reconcile([...(item.scenes||[]),...records],item.sceneTombstones);
        if(!setHistory(getHistory().map(row=>row.id===item.id?{...row,scenes:merged.items,sceneTombstones:merged.tombstones,updatedAt:new Date().toISOString()}:row)))throw new Error('导入写入失败。');id=item.id;
      }else id=createEntry(data.query.trim(),records);
      openHistoryModal(id);syncPending();notify('场景备份已导入。','good','场景记忆');
    }catch(error){notify(error.message,'bad','场景导入失败')}
  }
  root.SceneUI={render,open,field,timeMeta,attachPending,syncPending,renderReview,renderHub,queryFromScene,taskResult,sceneGroups,queueSceneQueries,retrySceneTask,assets,action,tasks:()=>{restoreTasks();return [...tasks.entries()]},syncError:id=>syncErrors.get(syncKey(id))||''};
  if(typeof activeView!=='undefined'&&activeView==='scenes')renderHub();
})(globalThis);
