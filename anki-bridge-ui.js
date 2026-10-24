(function(root){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={awaiting_device:'等待电脑接收',awaiting_confirmation:'待网页确认',running:'写入中',partial:'部分完成',complete:'已写入 Anki',error:'失败',cancelled:'已取消'};
 const sha=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 async function request(action,args={},options={}){
  if(!cloudUser)throw new Error('请先登录 Lexi，再发送到 Anki。');
  const account=cloudUser.id,token=await cloudAccessToken();if(cloudUser?.id!==account)throw new Error('账号已切换。');
  const timeout=AbortSignal.timeout(20000),signal=options.signal?AbortSignal.any([timeout,options.signal]):timeout;
  const result=await fetch('/api/anki-jobs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,args}),signal});
  const value=await result.json();if(cloudUser?.id!==account)throw new Error('账号已切换，请重新打开。');if(!result.ok)throw new Error(value.error||'Anki 请求未完成。');return value.data;
 }
 function dialog(title,{closeHint=true}={}){const node=document.createElement('dialog');node.className='scene-study-dialog anki-dialog';node.innerHTML=`<header><h2>${esc(title)}</h2><button class="icon-btn" aria-label="关闭" ${closeHint?'data-tip="关闭"':''}>${icon('x')}</button></header><div class="scene-dialog-body"></div><p class="scene-dialog-status" role="status"></p>`;node.querySelector('header button').onclick=()=>node.close();node.onclose=()=>node.remove();document.body.append(node);node.showModal();return node}
 function error(node,value){const status=node.querySelector('[role=status]');if(status)status.textContent=value}
 function confirmIntent(message,title,label='确认'){
  return new Promise(resolve=>{const node=dialog(title),body=node.querySelector('.scene-dialog-body');body.innerHTML=`<p></p><footer><button class="plain-btn" data-cancel-intent>取消</button><button class="plain-btn primary-btn" data-accept-intent>${esc(label)}</button></footer>`;body.querySelector('p').textContent=message;body.querySelector('[data-cancel-intent]').onclick=()=>node.close();body.querySelector('[data-accept-intent]').onclick=()=>node.close('confirm');node.addEventListener('close',()=>resolve(node.returnValue==='confirm'),{once:true})});
 }
 async function openGroup(groupId,entryId=''){
  const group=SceneUI.sceneGroups().find(group=>group.scene.groupId===groupId);if(!group)return;
  if(group.scene.externalSource?.queued&&!await confirmIntent('导入时此来源已在 Fushi 制卡流程中。继续会另建 Lexi 专用卡片，不会替换现有 Fushi 卡片或消费原队列。','确认另建 Lexi 卡片','继续准备'))return;
  if(root.LearningCards)return LearningCards.openGroup(groupId,entryId);
  const node=dialog('发送到 Anki'),body=node.querySelector('.scene-dialog-body'),account=cloudUser?.id;
  try{
   const devices=await request('devices');if(!node.isConnected)return;
   if(!devices.length){body.innerHTML='<p>尚未登记电脑。请先启动 Anki Bridge、登录同一账号并登记这台电脑。</p>';return}
   const links=group.links.filter(item=>!entryId||String(item.id)===String(entryId));
   if(!links.length){body.innerHTML='<p>先为场景关联一个词条，再选择需要学习的内容。</p>';return}
   const entries=links.map(item=>{const scene=SceneStudy.link(item,groupId),result=displayedResultForHistory(item.id,item),bound=scene.targetKey?findFragmentInResult(result,'sense',scene.targetKey):null;return {item,meanings:[...(bound?[{name:'场景绑定义项',value:bound.meaning||''}]:[]),{name:'核心义',value:SceneStudy.meaning(item)},...(result?.senses||[]).map((sense,i)=>({name:`义项 ${i+1} · ${sense.shortestLabel||''}`,value:sense.meaning||''}))]}});
   body.innerHTML=`<label class="scene-field"><span>接收电脑</span><select name="device">${devices.map(device=>`<option value="${esc(device.id)}">${esc(device.name)}</option>`).join('')}</select></label><div class="anki-send-list">${entries.map(({item,meanings},index)=>`<div class="anki-send-row"><label><input type="checkbox" data-entry="${index}" ${index<20?'checked':''}><strong>${esc(historyDisplayTitle(item))}</strong></label><select data-meaning="${index}" aria-label="${esc(historyDisplayTitle(item))} 卡片释义">${meanings.map((meaning,i)=>`<option value="${i}">${esc(meaning.name)}</option>`).join('')}</select><p data-meaning-preview="${index}">${esc(meanings[0].value)}</p></div>`).join('')}</div><p class="anki-send-note">电脑准备预览后，在此网页确认写入；不代表 Anki 自身云同步完成。</p><footer><span data-send-count></span><button class="plain-btn primary-btn" data-submit-anki>${icon('send')}提交制卡任务</button></footer>`;
   function count(){const n=body.querySelectorAll('[data-entry]:checked').length;body.querySelector('[data-send-count]').textContent=`已选 ${n} 张`;body.querySelector('[data-submit-anki]').disabled=!n||n>20}
   body.querySelectorAll('[data-entry]').forEach(box=>box.onchange=count);count();body.querySelectorAll('[data-meaning]').forEach(select=>select.onchange=()=>body.querySelector(`[data-meaning-preview="${select.dataset.meaning}"]`).textContent=entries[Number(select.dataset.meaning)].meanings[Number(select.value)].value);
   const dictionaryChoices=new Map();
   if(root.DictionaryUI)for(const [index,{item}] of entries.entries()){
    const values=await DictionaryUI.snapshots(historyDisplayTitle(item),{refresh:true}).catch(()=>[]);
    if(!node.isConnected||cloudUser?.id!==account)return;
    if(!values.length)continue;dictionaryChoices.set(index,values);
    const row=body.querySelector(`[data-entry="${index}"]`).closest('.anki-send-row'),label=document.createElement('label'),select=document.createElement('select');label.className='scene-field';const title=document.createElement('span');title.textContent='词典义项快照';select.dataset.dictionary=String(index);select.setAttribute('aria-label',`${historyDisplayTitle(item)} 词典义项`);select.add(new Option('不带入词典',''));
    for(const snapshot of values)select.add(new Option(`${snapshot.payload.dictionary} · ${snapshot.payload.senses.length} 个义项`,snapshot.id));select.value=values[0].id;label.append(title,select);row.append(label);
   }
   let pending=false;
   body.querySelector('[data-submit-anki]').onclick=async()=>{
    if(pending)return;pending=true;body.querySelector('[data-submit-anki]').disabled=true;
    try{
     if(cloudUser?.id!==account)throw new Error('账号已切换。');error(node,'正在准备素材与卡片快照…');
     const indexes=[...body.querySelectorAll('[data-entry]:checked')].map(box=>Number(box.dataset.entry));if(!indexes.length||indexes.length>20)throw new Error('每批选择 1–20 张卡片。');
     const scene=structuredClone(group.scene),media=structuredClone(scene.media);
     for(const ref of [...media].filter(ref=>ref.mime.startsWith('video/'))){const blob=await ScenePreview.get(ref);blob.name='场景视频封面.jpg';media.push(await SceneData.putFile(blob))}
     if(media.length>10||[...new Map(media.map(ref=>[ref.id,ref])).values()].reduce((sum,ref)=>sum+ref.size,0)>50*1024*1024)throw new Error('单张卡含封面最多 10 份素材，单批最多 50 MB。');
     const cards=[],sourceType=scene.externalSource?.type==='fushi'?'fushi':'lexi',sourceId=scene.externalSource?.id||groupId;
     for(const index of indexes){const {item,meanings}=entries[index],associated=SceneStudy.link(item,groupId);cards.push({key:await sha(JSON.stringify(['lexi',groupId,String(item.id)])),sourceType,sourceId,sceneId:groupId,entryId:String(item.id),title:historyDisplayTitle(item),origin:item.query,quote:scene.quote,translation:scene.translation,meaning:meanings[Number(body.querySelector(`[data-meaning="${index}"]`).value)].value,note:scene.note,sourceTitle:[scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · '),sourceUrl:scene.sourceUrl,exampleHighlights:[...associated.exampleHighlights],translationHighlights:[...associated.translationHighlights],media})}
     for(const [position,index] of indexes.entries()){const id=body.querySelector(`[data-dictionary="${index}"]`)?.value,snapshot=dictionaryChoices.get(index)?.find(value=>value.id===id);if(snapshot)cards[position].dictionaryRef={id:snapshot.id,hash:snapshot.hash}}
     for(const [index,ref] of [...new Map(media.map(ref=>[ref.id,ref])).values()].entries()){if(cloudUser?.id!==account)throw new Error('账号已切换。');error(node,`同步素材 ${index+1} / ${media.length}…`);await SceneMedia.upload(ref)}
     if(cloudUser?.id!==account)throw new Error('账号已切换。');
     const job=await request('submit',{deviceId:body.querySelector('[name=device]').value,payload:{version:cards.some(card=>card.dictionaryRef)?3:2,cards}});
     body.innerHTML=`<h3>${esc(labels[job.status]||job.status)}</h3><p>${cards.length} 张卡片，电脑准备预览后在网页确认。</p><button class="plain-btn" data-view-jobs>查看任务</button>`;error(node,'');body.querySelector('[data-view-jobs]').onclick=()=>{node.close();manage()};
    }catch(e){error(node,e.message);pending=false;if(body.querySelector('[data-submit-anki]'))count()}
   };
  }catch(e){error(node,e.message)}
 }
 async function manage(){
  const node=dialog('Anki 制卡任务'),body=node.querySelector('.scene-dialog-body'),account=cloudUser?.id;
  body.innerHTML=`<div class="anki-task-toolbar"><span data-task-status role="status">正在获取任务…</span><button class="icon-btn" data-refresh-anki aria-label="刷新任务" data-tip="刷新任务">${icon('refresh-cw')}</button></div><div data-task-list></div><section data-receipts aria-live="polite"></section>`;
  const list=body.querySelector('[data-task-list]'),receipts=body.querySelector('[data-receipts]'),status=body.querySelector('[data-task-status]');
  let jobs=[],timer=null,pending=false,failures=0,selected='',receiptKey='',controller=null;
  function available(){if(node.isConnected&&cloudUser?.id!==account){node.close();return false}return node.isConnected&&node.open&&!document.hidden&&(!root.UIOverlays?.topDialog()||root.UIOverlays.topDialog()===node)}
  function schedule(){clearTimeout(timer);if(node.isConnected)timer=setTimeout(()=>refresh(),Math.min(30000,3000*2**failures))}
  function rowHTML(job){
   const terminal=['complete','partial','error','cancelled'].includes(job.status),web=job.payload.confirmationMode==='web';
   return `<div><strong>${esc(job.payload.cards[0]?.title||'场景制卡')}</strong><p>${job.payload.cards.length} 张 · ${esc(job.cancel_requested&&job.status==='running'?'正在停止，已完成内容保留':labels[job.status]||job.status)}</p></div><div class="scene-actions">${web&&terminal?`<button class="icon-btn" data-remote-undo="${esc(job.id)}" aria-label="安全撤销本批写入" data-tip="安全撤销本批写入">${icon('rotate-ccw')}</button>`:''}${web&&job.status==='awaiting_confirmation'?`<button class="plain-btn" data-review-job="${esc(job.id)}">${icon('scan-eye')}预览与确认</button>`:''}<button class="icon-btn" data-results="${esc(job.id)}" aria-label="查看逐项回执" data-tip="查看逐项回执" aria-pressed="${selected===job.id}">${icon('list')}</button>${['error','partial','cancelled'].includes(job.status)?`<button class="icon-btn" data-retry="${esc(job.id)}" aria-label="重新排队未完成项" data-tip="重新排队未完成项">${icon('refresh-cw')}</button>`:''}${!['complete','cancelled'].includes(job.status)?`<button class="icon-btn" data-cancel="${esc(job.id)}" aria-label="取消剩余任务" data-tip="取消剩余任务">${icon('x')}</button>`:''}</div>`;
  }
  function renderJobs(){
   const previous=new Map([...list.querySelectorAll('[data-task-id]')].map(row=>[row.dataset.taskId,row])),scroll=body.scrollTop;
   list.querySelector('.anki-task-empty')?.remove();
   for(const job of jobs){
    const row=previous.get(job.id)||document.createElement('section'),html=rowHTML(job);previous.delete(job.id);
    row.className='anki-task-row';row.dataset.taskId=job.id;
    if(row._content!==html){const focused=row.contains(document.activeElement)?document.activeElement?.getAttribute('aria-label'):null;row.innerHTML=html;row._content=html;if(focused)[...row.querySelectorAll('[aria-label]')].find(button=>button.getAttribute('aria-label')===focused)?.focus({preventScroll:true})}
    const at=list.children[[...jobs].indexOf(job)];if(at!==row)list.insertBefore(row,at||null);
   }
   for(const row of previous.values())row.remove();
   if(!jobs.length)list.innerHTML='<p class="anki-task-empty">暂无制卡任务。</p>';
   body.scrollTop=scroll;
  }
  async function renderReceipts(signal){
   const job=jobs.find(job=>job.id===selected);if(!job){receipts.replaceChildren();receiptKey='';return}
   const rows=await request('results',{jobId:selected},{signal});if(!available())return;
   const key=JSON.stringify([job.id,rows]);if(receiptKey===key)return;receiptKey=key;
   receipts.innerHTML=`<h3>逐项回执</h3>${rows.map(row=>`<p><strong>${esc(job.payload.cards.find(card=>card.key===row.card_key)?.title||'关联词条')}</strong> · ${esc(({complete:'已写入 Anki',skipped:'已存在，跳过',error:'失败',undone:'已撤销'})[row.status]||row.status)} ${esc(row.message)}${row.note_id&&['complete','skipped'].includes(row.status)?` <button class="icon-btn" data-open-remote="${esc(job.id)}" data-card-key="${esc(row.card_key)}" aria-label="在 Anki 中打开" data-tip="在 Anki 中打开">${icon('arrow-up-right')}</button>`:''}</p>`).join('')||'<p>电脑尚未提交回执。</p>'}`;
  }
  async function refresh(){
   if(pending||!available()){schedule();return}
   pending=true;controller=new AbortController();
   try{jobs=await request('list',{}, {signal:controller.signal});if(!available())return;renderJobs();await renderReceipts(controller.signal);failures=0;status.textContent='任务与回执已更新';error(node,'')}
   catch(e){if(node.isConnected&&!controller.signal.aborted){failures=Math.min(failures+1,4);status.textContent='连接暂不可用，将自动重试';error(node,e.message)}}
   finally{pending=false;schedule()}
  }
  body.querySelector('[data-refresh-anki]').onclick=refresh;
  list.addEventListener('click',async event=>{
   const button=event.target.closest('[data-results],[data-retry],[data-cancel]');if(!button||pending)return;
   if(button.dataset.results){selected=button.dataset.results;receiptKey='';await refresh();return}
   const action=button.dataset.retry?'retry':'cancel';button.disabled=true;pending=true;
   try{await request(action,{jobId:button.dataset[action]});receiptKey=''}catch(e){error(node,e.message)}finally{pending=false;if(button.isConnected)button.disabled=false;await refresh()}
  });
  const onVisibility=()=>{if(document.hidden)controller?.abort();else refresh()};document.addEventListener('visibilitychange',onVisibility);
  node.addEventListener('close',()=>{clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',onVisibility)},{once:true});
  await refresh();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-send-anki]');if(!button)return;const parent=button.closest('[data-history-id][data-scene-id]');if(!parent)return;const item=getHistory().find(item=>String(item.id)===parent.dataset.historyId),scene=SceneData.reconcile(item?.scenes||getSettings().sceneLibrary,item?.sceneTombstones||getSettings().sceneLibraryTombstones).items.find(scene=>scene.id===parent.dataset.sceneId);if(scene)openGroup(scene.groupId,item?.id||'')});
 document.getElementById('anki-task-manager')?.addEventListener('click',manage);
 async function connections(){
  const node=dialog('学习联动'),body=node.querySelector('.scene-dialog-body');
  body.innerHTML=`<div class="integration-status-list"><section><h3>Fushi</h3><p>通过电脑学习伴侣读取官方 CLI；网页不直接访问本机端口。</p><span>连接状态请在电脑检查</span><button class="plain-btn" data-fushi-browser>${icon('book-open')}选取 Fushi 来源</button></section><section><h3>Anki</h3><p>需要运行 Anki 与 AnkiConnect。首次使用专用“Lexi 验收”牌库，逐批确认后写入。</p><span>未从网页检测本地软件</span></section><section><h3>云端任务与接收电脑</h3><p data-integration-cloud>尚未检查</p><div data-integration-devices></div></section></div><footer><button class="plain-btn" data-check-integration>${icon('refresh-cw')}检查云端</button><button class="plain-btn" data-open-jobs>${icon('list')}查看任务</button></footer>`;
  body.querySelector('[data-open-jobs]').onclick=()=>{node.close();manage()};
  body.querySelector('[data-check-integration]').onclick=async()=>{const button=body.querySelector('[data-check-integration]');button.disabled=true;try{const health=await request('health'),devices=await request('devices');if(!node.isConnected)return;body.querySelector('[data-integration-cloud]').textContent=`云任务接口可用 · Bridge ${health.bridgeVersion||'未知版本'}`;body.querySelector('[data-integration-devices]').innerHTML=devices.length?devices.map(d=>`<p>${icon('monitor')}${esc(d.name)} · ${d.last_seen?esc(formatHistoryTime(d.last_seen)):'尚无在线记录'} <button class="plain-btn" data-diagnose-device="${esc(d.id)}">检查电脑</button></p>`).join(''):'<p>尚无接收电脑。请在电脑启动学习伴侣，独立登录同一账号并登记。</p>'}catch(e){body.querySelector('[data-integration-cloud]').textContent=e.message}finally{button.disabled=false}};
 }
 document.getElementById('learning-integrations')?.addEventListener('click',connections);
 function installButtons(){document.querySelectorAll('.scene-record,.scene-workbench,.scene-study-row').forEach(parent=>{const actions=parent.classList.contains('scene-workbench')?parent.querySelector('.scene-learning-actions'):parent.classList.contains('scene-study-row')?parent.querySelector('.scene-link-actions'):parent.querySelector('.scene-actions');if(actions&&!actions.querySelector('[data-send-anki]'))actions.insertAdjacentHTML('beforeend',`<button class="${parent.classList.contains('scene-workbench')?'plain-btn':'icon-btn anki-send-command'}" data-send-anki aria-label="发送到 Anki" ${parent.classList.contains('scene-workbench')?'':'data-tip="发送到 Anki"'}>${icon('send')}<span>${parent.classList.contains('scene-workbench')?'发送到 Anki':'Anki'}</span></button>`)})}
 let capabilityOwner='',capabilityTime=0,capabilityPending=false;
 async function refreshAvailability(){
  const account=cloudUser?.id||'';if(account!==capabilityOwner){capabilityOwner=account;capabilityTime=0;document.body.classList.remove('integrations-ready')}
  if(!account||capabilityPending||Date.now()-capabilityTime<30000)return;
  capabilityPending=true;capabilityTime=Date.now();
  try{const value=await request('health');if(cloudUser?.id===account)document.body.classList.toggle('integrations-ready',Boolean(value))}catch{if(cloudUser?.id===account)document.body.classList.remove('integrations-ready')}finally{capabilityPending=false}
 }
 let scheduled=false;new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;installButtons();refreshAvailability()})}}).observe(document.body,{childList:true,subtree:true});installButtons();refreshAvailability();
 addEventListener('online',()=>{capabilityTime=0;refreshAvailability()});
 function previewText(value){
  if(root.DictionaryUI)return DictionaryUI.safeHTML(String(value??'')).textContent.trim();
  const doc=new DOMParser().parseFromString(String(value??''),'text/html');doc.querySelectorAll('script,style').forEach(node=>node.remove());return doc.body.textContent.trim();
 }
 function changesHTML(row){
  const names={Expression:'词头',Origin:'原始输入 Origin',Sentence:'原句',Translation:'译文',Meaning:'释义',Notes:'备注',Source:'来源',DictionarySource:'词典来源',Dictionary:'词典内容',CoreMeaning:'核心义',AIContent:'完整 AI 正文',AIContentSource:'AI 来源'};
  const changes=Array.isArray(row.changes)?row.changes:Object.entries(row.previous||{}).filter(([field])=>names[field]).map(([field,value])=>({field,before:previewText(value),legacy:true}));
  if(!changes.length)return '<p class="muted">仅素材或格式发生变化；请核对上方卡面。</p>';
  return `<section class="anki-review-diff"><h3>本次变化</h3>${changes.map(change=>`<section class="anki-change-row"><h4>${esc(names[change.field]||'内容')}</h4><div><span>原内容</span><p>${esc(change.before||'无')}${change.beforeTruncated?'… <small>仅显示摘要</small>':''}</p></div><div><span>新内容</span><p>${change.legacy?'请核对上方卡面；此电脑未提供逐字段差异':esc(change.after||'无')}${change.afterTruncated?'… <small>仅显示摘要；完整新内容见上方</small>':''}</p></div></section>`).join('')}</section>`;
 }
 async function reviewJob(job){
  const node=dialog('确认写入 Anki',{closeHint:false}),body=node.querySelector('.scene-dialog-body');let current=null,index=0,pending=false,urls=[],generation=0,dictionaryReady=false;
  node.classList.add('anki-review-dialog');
  function release(){urls.forEach(URL.revokeObjectURL);urls=[]}
  node.addEventListener('close',release,{once:true});
  async function show(){
   const version=++generation;dictionaryReady=!job.payload.cards.some(card=>card.dictionaryRef);release();const data=current,card=job.payload.cards[index],row=data.snapshot.rows.find(row=>row.key===card.key);
   const counts=data.snapshot.rows.reduce((value,item)=>(value[item.operation]=(value[item.operation]||0)+1,value),{create:0,update:0,skip:0});
   dictionaryReady=false;
   body.innerHTML=`<div class="anki-review-target"><label>目标牌库<select data-review-deck>${data.snapshot.decks.map(deck=>`<option ${deck===data.snapshot.deck?'selected':''}>${esc(deck)}</option>`).join('')}</select></label><span>电脑配置 ${esc(data.snapshot.profile)}</span></div><p class="anki-review-counts">新增 ${counts.create} · 更新 ${counts.update} · 跳过 ${counts.skip}</p><div class="anki-review-navigation"><button class="icon-btn" data-review-prev aria-label="上一张" ${index?'':'disabled'}>${icon('chevron-left')}</button><span>${index+1} / ${job.payload.cards.length} · ${esc(({create:'新增',update:'更新已有卡片',skip:'内容未变，跳过'})[row.operation])}</span><button class="icon-btn" data-review-next aria-label="下一张" ${index+1<job.payload.cards.length?'':'disabled'}>${icon('chevron-right')}</button></div><div class="anki-web-faces"><section><span>正面</span><h3>${esc(card.title)}</h3><p>${highlightText(card.quote,card.exampleHighlights)}</p><div data-review-media></div></section><section><span>背面</span><p>${highlightText(card.translation,card.translationHighlights)}</p><strong>${esc(card.meaning)}</strong>${card.note?`<p>${esc(card.note)}</p>`:''}<p class="scene-source-line">${esc(card.sourceTitle)}</p></section></div>${row.operation==='update'?changesHTML(row):''}<footer><span data-review-state>${data.approved?'已确认，等待电脑执行':'正在校验词典与素材…'}</span><button class="plain-btn primary-btn" data-review-approve disabled>${icon('check')}确认本批 ${job.payload.cards.length} 张</button></footer>`;
   node.querySelector(':scope>footer')?.remove();node.insertBefore(body.querySelector('footer'),node.querySelector('.scene-dialog-status'));
   body.querySelector('[data-review-prev]').onclick=()=>{index--;show()};body.querySelector('[data-review-next]').onclick=()=>{index++;show()};
   body.querySelector('[data-review-deck]').onchange=async event=>{if(pending)return;const select=event.currentTarget;pending=true;select.disabled=true;try{await request('review_target',{jobId:job.id,revision:data.revision,deck:select.value});await refresh()}catch(e){select.value=data.snapshot.deck;error(node,e.message)}finally{pending=false;select.disabled=false}};
   const approve=node.querySelector('[data-review-approve]');approve.disabled=Boolean(data.approved)||!dictionaryReady;
   approve.onclick=async event=>{if(pending||!dictionaryReady)return;const button=event.currentTarget;pending=true;button.disabled=true;try{await request('review_approve',{jobId:job.id,revision:data.revision});if(node.isConnected)node.querySelector('[data-review-state]').textContent='已确认，等待电脑执行。可在任务列表查看逐项回执。'}catch(e){error(node,e.message);button.disabled=false}finally{pending=false}};
   if(!dictionaryReady){
    try{
     if(job.payload.version===4){
      if(!root.LearningCards)throw Error('网页完整内容组件尚未加载。');
      const content=new Map();for(const item of job.payload.cards){if(!item.contentRef)throw Error('缺少完整释义快照。');const value=await LearningCards.readSnapshot(item.contentRef);if(!node.isConnected||version!==generation)return;content.set(item.key,value)}
      const value=content.get(card.key),front=body.querySelector('.anki-web-faces>section:first-child'),back=body.querySelector('.anki-web-faces>section:last-child');front.classList.add('lexi-learning');back.classList.add('lexi-learning');
      const frontTitle=front.querySelector('h3');if(frontTitle){const heading=document.createElement('h2');heading.textContent=frontTitle.textContent;frontTitle.replaceWith(heading)}
      back.innerHTML='<span>背面</span><h2>'+esc(card.title)+'</h2>'+(card.quote?'<p>'+highlightText(card.quote,card.exampleHighlights)+'</p>':'')+'<div class="media" data-review-media-back></div><p class="learning-translation">'+highlightText(card.translation,card.translationHighlights)+'</p>'+(value.result.headword.coreMeaning?'<div class="learning-core">'+esc(value.result.headword.coreMeaning)+'</div>':'')+LearningContent.render(value)+'<div data-review-dictionary></div>'+(card.note?'<section class="learning-section"><h3>我的笔记</h3>'+esc(card.note)+'</section>':'')+'<footer class="learning-source">'+esc(card.sourceTitle)+(card.sourceUrl?'<p>'+esc(card.sourceUrl)+'</p>':'')+'<p>'+esc([value.result.meta.model,value.result.meta.generatedAt].filter(Boolean).join(' · '))+'</p><p>Origin: '+esc(card.origin)+'</p></footer>';
      const tabs=document.createElement('div');tabs.className='learning-face-controls';tabs.innerHTML='<button class="plain-btn" aria-pressed="false" data-view-face="front">正面</button><button class="plain-btn active" aria-pressed="true" data-view-face="back">背面</button>';body.querySelector('.anki-web-faces').before(tabs);front.hidden=true;body.querySelector('.anki-web-faces').classList.add('learning-review-faces');tabs.querySelectorAll('button').forEach(button=>button.onclick=()=>{front.hidden=button.dataset.viewFace!=='front';back.hidden=!front.hidden;tabs.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button))})});
     }
     const saved=new Map();for(const item of job.payload.cards.filter(item=>item.dictionaryRef)){
      const ref=item.dictionaryRef;if(saved.has(ref.id))continue;
      const snapshot=await request('dictionary_get',{snapshotId:ref.id});if(!node.isConnected||version!==generation)return;
      if(!root.DictionaryUI||snapshot.hash!==ref.hash||!await DictionaryUI.valid(snapshot))throw Error('词典快照不可用，未允许确认写入。');saved.set(ref.id,snapshot);
     }
     if(card.dictionaryRef){const section=document.createElement('section');section.className='dictionary-reading';DictionaryUI.renderSnapshot(section,saved.get(card.dictionaryRef.id));(body.querySelector('[data-review-dictionary]')||body.querySelector('.anki-web-faces>section:last-child')).append(section)}
    }catch(e){if(node.isConnected&&version===generation)error(node,e.message);return}
   }
   const host=body.querySelector('[data-review-media]');
   const files=new Map();
   try{
    for(const ref of new Map(job.payload.cards.flatMap(item=>item.media).map(ref=>[ref.id,ref])).values()){
     const file=await SceneMedia.resolve(ref);if(!node.isConnected||version!==generation)return;
     await SceneMedia.verify(ref,file.blob);if(!node.isConnected||version!==generation)return;files.set(ref.id,file);
    }
   }catch(e){if(node.isConnected&&version===generation){error(node,`素材校验未通过：${e.message}`);node.querySelector('[data-review-state]').textContent='未允许确认，请检查素材后重新打开预览。'}return}
   dictionaryReady=true;approve.disabled=Boolean(data.approved);node.querySelector('[data-review-state]').textContent=data.approved?'已确认，等待电脑执行':'尚未写入 Anki；确认后仅更新本集成负责的字段。';
   for(const ref of card.media){
    if(!ref.mime.startsWith('image/')){const text=document.createElement('p');text.textContent=ref.mime.startsWith('video/')?'视频原文件随卡保存；终端播放支持另行验证。':ref.name;host.append(text);continue}
    try{const file=files.get(ref.id);if(!node.isConnected||body.querySelector('[data-review-media]')!==host)return;const url=URL.createObjectURL(file.blob);urls.push(url);const img=document.createElement('img');img.src=url;img.alt=ref.name;host.append(img)}catch(e){if(host.isConnected){const text=document.createElement('p');text.textContent=`素材加载失败：${e.message}`;host.append(text)}}
   }
   const backMedia=body.querySelector('[data-review-media-back]');if(backMedia)backMedia.replaceChildren(...[...host.childNodes].map(n=>n.cloneNode(true)));
  }
  async function refresh(){try{current=await request('review_get',{jobId:job.id});if(!node.isConnected)return;error(node,'');if(!current.valid){release();dictionaryReady=false;node.querySelector(':scope>footer')?.remove();body.innerHTML='<p>等待电脑准备当前目标的预览。连接助手需保持运行。</p><button class="plain-btn" data-wait-review>重新检查</button>';body.querySelector('[data-wait-review]').onclick=refresh;return}await show()}catch(e){error(node,e.message)}}
  await refresh();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-review-job]');if(!button)return;request('list').then(jobs=>{const job=jobs.find(job=>job.id===button.dataset.reviewJob);if(job)reviewJob(job)}).catch(e=>notify(e.message,'warn','Anki'))});
 root.AnkiBridge={openGroup,manage,request,connections,reviewJob,dialog,confirmIntent};
})(globalThis);
