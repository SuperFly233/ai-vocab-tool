(function(root){
 'use strict';
 const owner=()=>cloudUser?.id||'local',esc=v=>escapeHTML(String(v??''));
 const key=account=>'exercise-capture:'+account;
 let enabled=false,sessionOwner='',node=null,current='',revision=0,tail=Promise.resolve(),applying=false,settleAgain=false,querying=false,renderTimer=0,choosing=null,summaryMode=false,returnView='home',routeTask=null,preferences=null;
 const visible=()=>node?.isConnected&&activeView==='exercise';
 const busyImports=new Set(),urls=new Set();
 const thumbnails=new Map();let thumbnailObserver=null,thumbnailEpoch=0,thumbnailTail=Promise.resolve();
 let unread=new Set(),allResults=false;
 const readingBusy=()=>Boolean(node?.querySelector('[data-ex-query]')?.value||getSelection()?.toString()||node?.querySelector('.exercise-extra[open]')||document.querySelector('#history-modal.open'));
 function selectItem(id){current=id;unread.delete(id);allResults=false;schedule()}
 async function lookupState(account,id,fields){await change(account,pool=>{const row=(pool.lookups||[]).find(v=>v.id===id);if(row)Object.assign(row,fields,{updatedAt:new Date().toISOString()})});schedule()}
 function renderLookups(data){
  const host=node.querySelector('[data-ex-results]');if(!host)return;
  for(const button of node.querySelectorAll('[data-ex-term]')){const row=(data.lookups||[]).findLast(v=>v.itemId===current&&normalizeSearch(v.query)===normalizeSearch(button.dataset.exTerm)),entry=row&&getHistory().find(v=>String(v.id)===String(row.entryId));let hint=button.querySelector('[data-ex-term-status]');if(!hint){hint=document.createElement('small');hint.dataset.exTermStatus='';button.append(hint)}hint.textContent=row?({queued:'等待查询',running:'正在查询',complete:entry?'查看完整释义':'词条已移除',error:'查询未完成',interrupted:'待恢复'})[row.state]||'':'';button.onclick=()=>entry?openHistoryModal(entry.id):query([button.dataset.exTerm]);}
  const rows=(data.lookups||[]).filter(v=>allResults?v.sessionId===data.session?.id:v.itemId===current),key=JSON.stringify(rows.map(v=>[v,getHistory().find(h=>String(h.id)===String(v.entryId))?.updatedAt]));host.hidden=!rows.length;if(host._key===key)return;host._key=key;
  host.innerHTML=`<h2>查词结果</h2>${rows.map(v=>{const entry=getHistory().find(h=>String(h.id)===String(v.entryId)),result=entry?displayedResultForHistory(entry.id,entry):null;return `<article class="exercise-lookup" data-ex-lookup="${esc(v.id)}"><div><strong>${esc(v.query)}</strong><span>${['queued','running'].includes(v.state)?'<span class="lexi-progress-spinner" aria-hidden="true"></span>':''}${esc(({queued:'等待查询',running:'正在查询',complete:entry?'查询完成':'词条已移除',error:'查询未完成',interrupted:'等待恢复'})[v.state]||'等待查询')}</span></div>${result?.headword?.coreMeaning?`<p>${esc(result.headword.coreMeaning)}</p>`:''}${v.message?`<p class="exercise-error">${esc(v.message)}</p>`:''}${entry?`<button class="plain-btn" data-ex-result-entry="${esc(entry.id)}">查看完整释义</button>`:''}${['error','interrupted'].includes(v.state)?`<button class="plain-btn" data-ex-retry-lookup="${esc(v.id)}">重新提交</button>`:''}</article>`}).join('')}`;
  host.querySelectorAll('[data-ex-result-entry]').forEach(b=>b.onclick=()=>openHistoryModal(b.dataset.exResultEntry));
  host.querySelectorAll('[data-ex-retry-lookup]').forEach(b=>b.onclick=async()=>{const row=rows.find(v=>v.id===b.dataset.exRetryLookup),account=sessionOwner;if(row&&await askConfirm('上次请求可能已产生费用，确认重新提交此词组？','重新提交')&&account===owner()){current=row.itemId||'';if(!resumeExerciseLookup(row.id))query([row.query],{retry:true})}});
 }
 const labels={saved:'已收下',queued:'等待分析',running:'正在分析',check:'分析完成',reviewed:'已保存',interrupted:'待恢复',error:'分析失败',cancelled:'已停止'};
 async function read(account=owner()){return await SceneData.getDraft(key(account))||{version:1,manual:false,items:[]}}
 async function change(account,run){
  const write=async()=>{if(account!==owner())throw Error('账号已切换，未修改旧采集。');const data=await read(account),value=await run(data);if(account!==owner())throw Error('账号已切换。');await SceneData.putDraft(key(account),data);return value};
  if(navigator.locks)return navigator.locks.request(key(account),write);
  const result=tail.catch(()=>{}).then(write);tail=result;return result;
 }
 function status(message){if(visible())node.querySelector('[data-ex-status]')?.replaceChildren(document.createTextNode(message))}
 function savedScene(id){return SceneUI.sceneGroups().find(g=>g.scene.groupId===id)?.scene}
 function saveRaw(item,account){
  if(account!==owner())throw Error('账号已切换。');
  const existing=savedScene(item.scene.groupId);if(existing)return existing;
  const settings=getSettings();if((settings.sceneLibraryTombstones||[]).some(t=>t.key===item.scene.id))throw Error('此场景已删除，不自动恢复。');
  const data=SceneData.reconcile([...(settings.sceneLibrary||[]),item.scene],settings.sceneLibraryTombstones);
  if(!setSettings({...settings,sceneLibrary:data.items,sceneLibraryTombstones:data.tombstones,updatedAt:new Date().toISOString()}))throw Error('场景保存失败；截图仍保留在采集池，可重试。');
  SceneWorkspace.render();return savedScene(item.scene.groupId)||item.scene;
 }
 async function start(ids,{retry=false}={}){
  const account=owner(),data=await read(account),items=data.items.filter(v=>ids.includes(v.id));
  if(!items.length)return;
  if(!choosing)choosing=SceneAI.chooseProfile().finally(()=>{choosing=null});const profile=await choosing;if(!profile||account!==owner())return;
  for(const item of items){
   if(account!==owner())break;
   try{
    const scene=saveRaw(item,account);await change(account,pool=>{const row=pool.items.find(v=>v.id===item.id);if(row)row.error=''});
    let job=item.jobId?(await SceneAITasks.list(account)).find(j=>j.id===item.jobId):null;
    if(job&&!retry)continue;
    if(job?.state==='running')continue;
    if(job?.result?.dialogues?.length===0&&retry)job=await SceneAITasks.update(account,job.id,{state:'error',result:null});
    if(job?.result){await apply(job,account);continue}
    if(job){const live=getSettings().apiProfiles.find(p=>p.id===job.profileId);if(!live||await SceneAITasks.fingerprint(profile)!==job.profileHash)throw Error('恢复需使用原模型配置；可先在设置中恢复配置。');if(!job.bound)await SceneAITasks.bind(job.id,scene,SceneUI.supplementVersion(scene.groupId));}
    else{
     job=await SceneAITasks.create(profile,scene,{capture:true,manual:data.manual,point:item.point||null,useImage:true});
     await change(account,pool=>{const row=pool.items.find(v=>v.id===item.id);row.jobId=job.id;row.error=''});
     await SceneAITasks.bind(job.id,scene,SceneUI.supplementVersion(scene.groupId));
    }
    // Execution is intentionally detached from the dialog and from subsequent imports.
    SceneAITasks.execute(job,profile,{resume:retry}).then(()=>settle()).catch(error=>{status(error.message);schedule()});
   }catch(error){await change(account,pool=>{const row=pool.items.find(v=>v.id===item.id);if(row)row.error=error.message}).catch(()=>{});status(error.message)}
  }
  schedule();
 }
 async function receive(files){
  const account=owner();if(!receiving())return;
  const batch=Array.from(files),token=crypto.randomUUID();busyImports.add(token);
  const ids=[];status('正在保存截图…');
  try{
   for(const file of batch){
    if(account!==owner())break;
    try{
     const data=await read(account);if(data.items.length>=100)throw Error('采集池已有100张，请先从更多操作移除已完成任务；剩余文件未接收，请保留原文件。');
     const inspected=await SceneData.inspectFile(file);
     if(!['image/png','image/jpeg','image/webp'].includes(inspected.ref.mime))throw Error('运动采集支持 PNG、JPEG、WebP；动画和视频请使用原素材编辑入口。');
     const bitmap=await createImageBitmap(inspected.blob),dimensions={width:bitmap.width,height:bitmap.height};try{if(bitmap.width*bitmap.height>24000000)throw Error('图片超过2400万像素，请先缩小。')}finally{bitmap.close()}
     const ref=await SceneData.putFile(file);if(account!==owner())break;
     const id=crypto.randomUUID(),now=new Date().toISOString(),scene=SceneData.normalizeScene({id,groupId:id,title:'截图 '+new Date().toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),media:[ref],createdAt:now,updatedAt:now});
     const item={id,scene,dimensions,createdAt:now,sessionId:data.session?.id||'',jobId:'',error:''};
     await change(account,pool=>{if(pool.items.length>=100)throw Error('采集池已满，未接收此文件。');pool.items.unshift(item)});
     if(readingBusy()){unread.add(id)}else current=id;
     try{saveRaw(item,account)}catch(error){await change(account,pool=>{pool.items.find(v=>v.id===id).error=error.message});schedule();continue}
     ids.push(id);status(`第 ${data.items.length+1} 张已收下`);schedule();
    }catch(error){status(error.message);notify(error.message,'warn','截图未全部接收',false);if((await read(account)).items.length>=100)break}
   }
   // All originals are persisted before the first configuration prompt or model call.
   if(ids.length)await start(ids.slice(0,20));
   if(ids.length>20){status(`已收下 ${ids.length} 张；本批前20张分析，其余保留，点“分析此图”继续。`)}
  }finally{busyImports.delete(token);schedule()}
 }
 async function apply(job,account,chosen=''){
  if(account!==owner()||!job.result)return;
  const selection=chosen||job.result.selectedDialogueId;if(!selection)return;
  const scene=savedScene(job.scene.groupId);if(!scene)throw Error('原场景已删除，分析结果仍保留。');
  if(job.state==='reviewed'&&!chosen)return;
  if(!job.bound?.expected||SceneUI.supplementVersion(scene.groupId)!==job.bound.expected)throw Error('场景已被修改，未覆盖；可打开场景编辑，或打开已有分析结果继续编辑。');
  const patch=ExerciseData.patch(job.result,selection);
  if(!patch.title?.trim())delete patch.title;
  SceneUI.applySupplement([{id:scene.groupId,expected:job.bound.expected,patch}],account);
  await SceneAITasks.bind(job.id,savedScene(scene.groupId));
  await SceneAITasks.update(account,job.id,{state:'reviewed',captureSelection:selection,captureError:''});
 }
 async function settle(){
  if(applying){settleAgain=true;return}applying=true;
  try{
   const account=owner();for(const job of await SceneAITasks.list(account)){
    if(account!==owner())break;
    if(!job.options?.capture||job.state!=='check'||job.captureError||!job.result?.selectedDialogueId)continue;
    try{await apply(job,account)}catch(error){await SceneAITasks.update(account,job.id,{captureError:error.message}).catch(()=>{})}
   }
  }finally{applying=false;schedule();if(settleAgain){settleAgain=false;queueMicrotask(()=>settle().catch(error=>status(error.message)))}}
 }
 function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>render().catch(error=>status(error.message)),60)}
 function clearURLs(){for(const url of urls)URL.revokeObjectURL(url);urls.clear()}
 function clearThumbnails(){thumbnailEpoch++;thumbnailObserver?.disconnect();thumbnailObserver=null;for(const url of thumbnails.values())URL.revokeObjectURL(url);thumbnails.clear()}
 function observeThumbnail(image,account){
  if(!thumbnailObserver)thumbnailObserver=new IntersectionObserver((entries,observer)=>{for(const entry of entries){if(!entry.isIntersecting)continue;const image=entry.target;observer.unobserve(image);const epoch=thumbnailEpoch;thumbnailTail=thumbnailTail.catch(()=>{}).then(async()=>{if(!visible()||!image.isConnected||account!==owner()||epoch!==thumbnailEpoch)return;const id=image.dataset.exThumb;if(thumbnails.has(id)){image.src=thumbnails.get(id);return}const record=await SceneData.getFile(id);if(!record?.blob)return;const bitmap=await createImageBitmap(record.blob,{resizeWidth:96,resizeQuality:'low'});try{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=64;const context=canvas.getContext('2d'),scale=Math.min(96/bitmap.width,64/bitmap.height);context.drawImage(bitmap,(96-bitmap.width*scale)/2,(64-bitmap.height*scale)/2,bitmap.width*scale,bitmap.height*scale);const blob=await new Promise(r=>canvas.toBlob(r,'image/webp',.7));if(!blob||account!==owner()||epoch!==thumbnailEpoch)return;const url=URL.createObjectURL(blob);thumbnails.set(id,url);if(image.isConnected)image.src=url}finally{bitmap.close()}}).catch(()=>{image.hidden=true})}},{root:node.querySelector('[data-ex-list]')});
  thumbnailObserver.observe(image);
 }
 function taskCounts(data,jobs){const result={running:0,queued:0,choose:0,failed:0,waiting:0};for(const item of data.items){const job=jobs.find(v=>v.id===item.jobId);if(item.error||job?.captureError||['error','interrupted','cancelled'].includes(job?.state)||job?.result?.dialogues?.length===0)result.failed++;else if(job?.state==='running')result.running++;else if(job?.state==='queued')result.queued++;else if(job?.state==='check'&&job.result?.dialogues?.length&&!job.captureSelection&&!job.result?.selectedDialogueId)result.choose++;else if(!job&&!savedScene(item.scene.groupId)?.aiAnalysis)result.waiting++}return result}
 async function openPreferences(trigger){
  if(preferences?.isConnected)return;const account=sessionOwner,data=await read(account);if(account!==owner()||!visible())return;
  const dialog=AnkiBridge.dialog('采集偏好');preferences=dialog;dialog.classList.add('exercise-preferences');
  dialog.querySelector('.scene-dialog-body').innerHTML=`<label class="scene-feature-switch"><span>每次手选句子</span><input type="checkbox" data-ex-manual ${data.manual?'checked':''}></label><button class="plain-btn" data-ex-profile>${icon('sliders-horizontal')}模型配置</button>`;
  dialog.querySelector('[data-ex-manual]').onchange=async event=>{try{await change(account,pool=>{pool.manual=event.target.checked})}catch(error){event.target.checked=!event.target.checked;dialog.querySelector('.scene-dialog-status').textContent=error.message}};
  dialog.querySelector('[data-ex-profile]').onclick=()=>{dialog.close();SceneAI.chooseProfile(true)};
  dialog.addEventListener('close',()=>{if(preferences===dialog)preferences=null;if(trigger.isConnected&&visible())trigger.focus({preventScroll:true})},{once:true});
  dialog.querySelector('header button').focus({preventScroll:true});
 }
 async function render(){
  if(!visible())return;const account=sessionOwner,stamp=++revision,data=await read(account),jobs=await SceneAITasks.list(account);
  if(!visible()||account!==owner()||stamp!==revision)return;
  if(summaryMode){renderSummary(data,jobs);return}
  if(!data.items.some(v=>v.id===current))current=data.items[0]?.id||'';
  const list=node.querySelector('[data-ex-list]'),detail=node.querySelector('[data-ex-detail]');
  if(!list||!detail)return;
  const total=taskCounts(data,jobs);node.dataset.empty=String(!data.items.length);list.hidden=!data.items.length;
  renderLookups(data);
  const arrival=node.querySelector('[data-ex-arrival]');if(arrival){arrival.hidden=!unread.size;arrival.textContent=`新收下 ${unread.size} 张`;arrival.onclick=()=>{selectItem(data.items.find(v=>unread.has(v.id))?.id||current);unread.clear();schedule()}}
  const at=data.items.findIndex(v=>v.id===current);for(const [action,step] of [['previous',1],['next',-1]]){const b=node.querySelector(`[data-ex-${action}]`);if(b){b.hidden=!data.items.length;b.disabled=!data.items[at+step];b.onclick=()=>selectItem(data.items[at+step]?.id||current)}}
  node.querySelector('[data-ex-add]').hidden=!data.items.length&&enabled;
  node.querySelector('[data-ex-count]').textContent=data.items.length?`已收下 ${data.items.length} 张`:'准备接收';
  node.querySelector('[data-ex-progress]').textContent=[total.running?`${total.running} 分析中`:'',total.queued?`${total.queued} 等待分析`:'',total.choose?`${total.choose} 待选句`:'',total.failed?`${total.failed} 需处理`:''].filter(Boolean).join(' · ');
  const previous=new Map([...list.children].map(row=>[row.dataset.exItem,row]));
  for(const [index,item] of data.items.entries()){
   const job=jobs.find(v=>v.id===item.jobId),state=item.error?'保存待重试':job?.captureError?'内容变化':job?.result?.dialogues?.length===0?'无可读对话':job?.state==='check'&&!job.captureSelection&&!job.result?.selectedDialogueId?'待选句':labels[job?.state||'saved']||'待处理';
   const row=previous.get(item.id)||document.createElement('button');previous.delete(item.id);row.type='button';row.className='exercise-task'+(current===item.id?' active':'');row.dataset.exItem=item.id;row.setAttribute('aria-pressed',String(current===item.id));
   const html=`<img data-ex-thumb="${item.scene.media[0].id}" alt=""><strong>${data.items.length-index}</strong><span>${esc(state)}${job&&['running','queued'].includes(job.state)?'<span class="lexi-progress-spinner" aria-hidden="true"></span>':''}</span>`;if(row._html!==html){row.innerHTML=html;row._html=html;observeThumbnail(row.querySelector('img'),account)}
   row.onclick=()=>selectItem(item.id);if(list.children[index]!==row)list.insertBefore(row,list.children[index]||null);
  }for(const row of previous.values())row.remove();
  const item=data.items.find(v=>v.id===current);node.querySelector('[data-ex-association]').textContent=item?`关联第 ${data.items.length-data.items.indexOf(item)} 张截图`:'普通查词';
  if(!item){if(detail.dataset.item!=='empty'){clearURLs();detail.dataset.item='empty';detail.innerHTML=`<div class="exercise-empty"><span class="exercise-empty-icon">${icon('image-plus')}</span><h2>${enabled?'粘贴截图':'本次暂无截图'}</h2><button class="plain-btn primary-btn" data-ex-pick ${enabled?'':'hidden'}>${icon('image-plus')}选择图片</button></div>`;detail.querySelector('[data-ex-pick]').onclick=()=>node.querySelector('[data-ex-files]').click()}return}
  const job=jobs.find(v=>v.id===item.jobId),scene=savedScene(item.scene.groupId)||item.scene,rows=job?.result?.dialogues||[],selected=job?.captureSelection||job?.result?.selectedDialogueId;
  const contentKey=JSON.stringify([scene,rows,selected,item.error,job?.state,job?.captureError,job?.error]);if(detail.dataset.item===current&&detail._contentKey===contentKey)return;
  const selection=getSelection();if(detail.dataset.item===current&&(detail.contains(document.activeElement)&&document.activeElement.matches('input,textarea')||selection&&!selection.isCollapsed&&detail.contains(selection.anchorNode))){detail.dataset.deferred='true';return}
  const focused=detail.contains(document.activeElement)?[...document.activeElement.attributes].find(a=>a.name.startsWith('data-ex-')):null;
  const same=detail.dataset.item===current,top=detail.getBoundingClientRect().top,extraOpen=detail.querySelector('.exercise-extra')?.open,linesOpen=detail.querySelector('details.exercise-lines')?.open;
  if(!same){clearURLs();detail.innerHTML='<div class="exercise-picture"><img alt="当前采集截图"><div data-ex-boxes></div></div><div class="exercise-reading"></div>'}
  detail.dataset.item=current;detail._contentKey=contentKey;delete detail.dataset.deferred;
  const reading=detail.querySelector('.exercise-reading');reading.innerHTML=`<div class="exercise-lines">${rows.length>1||rows.length===1&&!selected?rows.map((row,i)=>`<button class="exercise-line ${selected===row.id?'active':''}" data-ex-line="${row.id}"><b>${i+1}</b><span>${esc(row.quote)}</span></button>`).join(''):''}</div><span class="exercise-section-label">${scene.quote?'原句':'当前截图'}</span><p class="exercise-quote">${esc(scene.quote||(rows.length?'请选择要学习的一句':job?.state==='running'?'截图已收下，正在分析':job?.state==='queued'?'截图已收下，等待分析':job?.state==='error'?'截图已收下，分析未完成':job?.state==='interrupted'?'截图已收下，等待恢复':'截图已收下，尚未分析'))}</p>${scene.translation?`<p class="exercise-translation">${esc(scene.translation)}</p>`:''}<div class="exercise-targets">${(scene.learningTargets||[]).map(v=>`<button class="exercise-target" data-ex-term="${esc(v.phrase)}"><strong>${esc(v.phrase)}</strong><span>${esc(v.meaning)}</span>${icon('search')}</button>`).join('')}</div><p class="exercise-error" role="status">${esc(item.error||job?.captureError||job?.error||'')}</p><details class="exercise-extra"><summary data-ex-extra-toggle>更多操作</summary><div><button class="plain-btn" data-ex-analyze>${job?.state==='interrupted'?'确认恢复分析（可能重复计费）':'分析此图'}</button><button class="plain-btn" data-ex-edit>编辑场景</button><button class="plain-btn" data-ex-pool>AI 任务与建议</button><button class="plain-btn danger-icon" data-ex-remove>移出采集池</button></div>${scene.sourceTitle?`<p>来源线索：${esc(scene.sourceTitle)} · ${scene.aiAnalysis?.sourceBasis==='visual'?'画面推测':'未验证'}</p>`:''}</details>`;
  if(rows.length&&!selected)reading.querySelector('.exercise-lines').insertAdjacentHTML('afterbegin','<h2>选择一句</h2>');
  if(job?.result?.dialogues?.length===0){reading.querySelector('.exercise-quote').textContent='未识别到可读对话，截图已保存';const retry=document.createElement('button');retry.className='plain-btn';retry.textContent='重新分析';retry.onclick=()=>start([item.id],{retry:true});reading.querySelector('.exercise-quote').after(retry)}
  if(!job&&!item.error&&!scene.aiAnalysis){const analyze=document.createElement('button');analyze.className='plain-btn';analyze.textContent='开始分析';analyze.onclick=()=>start([item.id]);reading.querySelector('.exercise-quote').after(analyze)}
  if(same)reading.querySelector('.exercise-extra').open=extraOpen;
  if(selected&&rows.length>1){const list=detail.querySelector('.exercise-lines'),choices=document.createElement('details'),summary=document.createElement('summary');choices.className='exercise-lines';summary.dataset.exSwitch='';summary.textContent='换一句';choices.append(summary,...list.children);list.replaceWith(choices)}
  if(same&&linesOpen&&detail.querySelector('details.exercise-lines'))detail.querySelector('details.exercise-lines').open=true;
  detail.querySelector('[data-ex-boxes]').replaceChildren();
  const choose=async id=>{try{if(account!==owner())return;await apply(job,account,id);schedule()}catch(error){await SceneAITasks.update(account,job.id,{captureCandidate:id,captureError:error.message});status(error.message)}};
  if(item.error||['error','interrupted','cancelled'].includes(job?.state)){const retry=document.createElement('button');retry.className='plain-btn';retry.textContent=job?.state==='interrupted'?'恢复分析（可能再次计费）':'重试此项';retry.onclick=()=>start([item.id],{retry:true});detail.querySelector('.exercise-error').after(retry)}
  if(job?.captureError&&job.result){const edit=document.createElement('button');edit.className='plain-btn';edit.textContent='打开已有分析结果';edit.onclick=()=>{const candidate=rows.find(v=>v.id===(job.captureCandidate||selected));if(!candidate)return status('请先点选一句。');const group=SceneUI.sceneGroups().find(g=>g.scene.groupId===scene.groupId);if(!group)return status('场景已删除，结果仍保留。');const draft={...group.scene,...SceneAITasks.resultPatch({...job,result:{...candidate,model:job.result.model,generatedAt:job.result.generatedAt}},group.scene)};SceneUI.open(group.item.id,'',group.scene.id,{initialScene:draft,analysisTaskId:job.id})};detail.querySelector('.exercise-error').after(edit)}
  for(const [index,row] of rows.entries())if(row.rect){const box=document.createElement('button');box.className='exercise-box';box.setAttribute('aria-label',`选择第${index+1}句：${row.quote}`);box.textContent=String(index+1);box.style.cssText=`left:${row.rect.x*100}%;top:${row.rect.y*100}%;width:${row.rect.width*100}%;height:${row.rect.height*100}%`;box.onclick=()=>choose(row.id);detail.querySelector('[data-ex-boxes]').append(box)}
  detail.querySelectorAll('[data-ex-line]').forEach(b=>b.onclick=()=>choose(b.dataset.exLine));
  detail.querySelectorAll('[data-ex-term]').forEach(b=>b.onclick=()=>query([b.dataset.exTerm]));
  renderLookups(data);
  detail.querySelector('[data-ex-analyze]').onclick=()=>start([item.id],{retry:true});
  detail.querySelector('[data-ex-edit]').onclick=()=>{leave('scenes');SceneUI.open('library','',scene.id)};
  detail.querySelector('[data-ex-pool]').onclick=()=>SceneAITasks.open();
  detail.querySelector('[data-ex-remove]').onclick=async()=>{if(job&&['queued','running'].includes(job.state)){status('请先在 AI 任务中停止或等待完成，场景不会删除。');return}await change(account,pool=>{pool.items=pool.items.filter(v=>v.id!==item.id)});schedule()};
  if(focused)detail.querySelector(`[${focused.name}="${CSS.escape(focused.value)}"]`)?.focus({preventScroll:true});
  if(!same){const image=detail.querySelector('img'),picture=image.parentElement;if(item.dimensions?.width>0&&item.dimensions?.height>0)picture.style.aspectRatio=`${item.dimensions.width}/${item.dimensions.height}`;image.onload=()=>{picture.style.aspectRatio=`${image.naturalWidth}/${image.naturalHeight}`;picture.dataset.ready='true'};SceneData.getFile(item.scene.media[0].id).then(record=>{if(!visible()||account!==owner()||!image.isConnected||!detail.contains(image))return;if(record?.blob){const url=URL.createObjectURL(record.blob);urls.add(url);image.src=url}}).catch(error=>status(error.message))}
  if(same&&scrollY>0){const delta=detail.getBoundingClientRect().top-top;if(delta)scrollBy(0,delta)}
 }
 async function query(terms,{retry=false}={}){
  if(querying)return;const account=sessionOwner,target=current,input=node?.querySelector('[data-ex-query]'),submitted=input?.value;if(account!==owner())return;
  const clean=[...new Set(terms.map(v=>v.trim()).filter(Boolean))];if(!clean.length)return;if(clean.length>20||clean.some(v=>v.length>200)){status('每次最多20个词组，每个不超过200字。');return}
  const button=node.querySelector('[data-ex-submit]');button.disabled=true;querying=true;
  try{const data=await read(account),item=data.items.find(v=>v.id===target);if(account!==owner())return;const accepted=[],reused=[];for(const term of clean){const candidates=getHistory().filter(row=>[row.query,historyDisplayTitle(row)].some(v=>normalizeSearch(v)===normalizeSearch(term)));let entry;
    if(candidates.length>1){entry=await chooseEntry(candidates,term);if(entry===null)continue}
    if(account!==owner())return;
    const previous=(data.lookups||[]).find(v=>v.itemId===(item?.id||'')&&normalizeSearch(v.query)===normalizeSearch(term)&&(['queued','running'].includes(v.state)||v.state==='complete'&&getHistory().some(h=>String(h.id)===String(v.entryId))));if(previous&&(!retry||['queued','running'].includes(previous.state))){accepted.push(term);continue}
    const retryRow=retry?(data.lookups||[]).findLast(v=>v.itemId===(item?.id||'')&&normalizeSearch(v.query)===normalizeSearch(term)&&['error','interrupted'].includes(v.state)):null;
    const id=retryRow?.id||crypto.randomUUID(),request={exerciseLookupId:id,exerciseOwner:account};
    await change(account,pool=>{pool.lookups=pool.lookups||[];const row=pool.lookups.find(v=>v.id===id);if(row){row.state='queued';row.message='';row.entryId=null;row.createdAt=new Date().toISOString();delete row.signature}else pool.lookups.push({id,itemId:item?.id||'',sessionId:pool.session?.id,query:term,state:'queued',createdAt:new Date().toISOString()})});schedule();
    try{if(item){const result=await SceneUI.queueSceneQueries(item.scene.groupId,[term],{entryIds:entry?{[normalizeSearch(term)]:entry}:{},direction:'',note:'',exerciseLookupIds:{[normalizeSearch(term)]:id},exerciseOwner:account});accepted.push(...result.accepted);if(result.failed.length)await lookupState(account,id,{state:'error',message:'查询未提交，请重试此项。'})}else{const existing=getHistory().find(row=>String(row.id)===String(entry||candidates[0]?.id));if(existing){reused.push(existing.id);await lookupState(account,id,{state:'complete',entryId:existing.id})}else enqueueLookup({query:term,direction:'',note:'',folderIds:lookupFolderIds,...request},{silent:true});accepted.push(term)}}catch(error){await lookupState(account,id,{state:'error',message:error.message});throw error}
   }if(!item)processNextLookup();status(accepted.length?`已提交 ${accepted.length} 个词组${reused.length?` · 复用 ${reused.length} 个已有词条`:''}`:'未提交，输入已保留');if(reused.length)notify('已复用已有词条，没有重复调用模型。','good','查词',true,{label:'查看词条',run:()=>{if(owner()===account&&getHistory().some(v=>v.id===reused[0]))openHistoryModal(reused[0])}});const inputTerms=[...new Set((submitted||'').split('\n').map(v=>v.trim()).filter(Boolean))];if(input&&input.value===submitted&&JSON.stringify(clean)===JSON.stringify(inputTerms)&&accepted.length===clean.length){input.value='';await change(account,pool=>{if(pool.quickInput===submitted)pool.quickInput=''})}
  }catch(error){status(error.message)}finally{querying=false;if(button.isConnected)button.disabled=false}
 }
 function chooseEntry(entries,term){return new Promise(resolve=>{const account=owner(),dialog=AnkiBridge.dialog('选择已有词条：'+term),body=dialog.querySelector('.scene-dialog-body');let done=false;body.innerHTML=entries.map(row=>`<button class="plain-btn" data-ex-existing="${esc(row.id)}">${esc(historyDisplayTitle(row))} · ${esc(displayedResultForHistory(row.id,row)?.headword?.coreMeaning||row.query)}</button>`).join('');body.querySelectorAll('[data-ex-existing]').forEach(b=>b.onclick=()=>{done=true;resolve(account===owner()?b.dataset.exExisting:null);dialog.close()});dialog.addEventListener('close',()=>{if(!done)resolve(null)},{once:true})})}
 function leave(view=returnView){revision++;preferences?.close();clearURLs();clearThumbnails();showView(view==='exercise'?'home':view)}
 function renderSummary(data,jobs){
  const items=data.items.filter(v=>v.sessionId===data.session?.id),jobFor=v=>jobs.find(j=>j.id===v.jobId),counts={saved:items.length,...taskCounts({items},jobs)};
  const pending=Object.values(counts).slice(1).some(Boolean);
  if(!node.querySelector('.exercise-summary'))node.innerHTML=`<header class="exercise-page-head"><h1>${icon('run')}采集已结束</h1><button class="plain-btn" data-ex-back>返回学习</button></header><section class="exercise-summary"><span class="exercise-section-label">本次采集</span><dl></dl><p data-ex-unsent></p><p class="exercise-summary-note">已提交的分析继续；关闭浏览器可能中断，重开后需明确恢复。</p><div><button class="plain-btn primary-btn" data-ex-review>处理待办</button><button class="plain-btn" data-ex-continue>继续采集</button><button class="plain-btn" data-ex-queries>查看查词任务</button></div></section>`;
  const rows=[['saved','已收下'],['running','分析中'],['queued','等待分析'],['choose','待选句'],['failed','需处理'],['waiting','尚未分析']].filter(([key])=>key==='saved'||counts[key]);const html=rows.map(([key,label])=>`<div class="${key==='saved'?'exercise-summary-total':''}"><dt>${label}</dt><dd>${counts[key]}</dd></div>`).join(''),list=node.querySelector('.exercise-summary dl');if(list.innerHTML!==html)list.innerHTML=html;
  const unsent=node.querySelector('[data-ex-unsent]');unsent.textContent=data.quickInput?'未提交词组：'+data.quickInput:'';unsent.hidden=!data.quickInput;node.querySelector('[data-ex-review]').textContent=pending?'处理待办':'查看本次截图';
  const lookups=(data.lookups||[]).filter(v=>v.sessionId===data.session?.id),done=lookups.filter(v=>v.state==='complete').length;node.querySelector('[data-ex-queries]').textContent=`查看查词结果 · ${done}/${lookups.length}`;node.querySelector('[data-ex-queries]').disabled=!lookups.length;
  node.querySelector('[data-ex-back]').onclick=()=>leave();node.querySelector('[data-ex-review]').onclick=()=>{current=items.find(v=>v.error||jobFor(v)?.captureError||['check','error','interrupted','cancelled'].includes(jobFor(v)?.state)||!v.jobId)?.id||items[0]?.id||current;summaryMode=false;open({navigate:false,review:true})};node.querySelector('[data-ex-continue]').onclick=()=>{summaryMode=false;open({navigate:false,newSession:true})};node.querySelector('[data-ex-queries]').onclick=async()=>{summaryMode=false;allResults=true;await open({navigate:false,review:true});node.querySelector('[data-ex-results]')?.scrollIntoView({block:'start',behavior:'instant'})};
 }
 async function open({navigate=true,review=false,newSession=false}={}){
  root.LearningHelp?.suspendWelcome();
  await SceneAITasks.ready;if(navigate&&activeView!=='exercise'){returnView=activeView;showView('exercise');return routeTask}
  const account=owner();sessionOwner=account;node=document.querySelector('#view-exercise');if(!node)return;
  if(summaryMode&&!newSession){await render();return}
  enabled=false;summaryMode=false;
  await change(account,pool=>{for(const row of pool.lookups||[]){if(!['queued','running'].includes(row.state))continue;if(activeLookupRequest?.exerciseLookupId===row.id||lookupQueue.some(v=>v.exerciseLookupId===row.id&&!v.recovered))continue;const entry=row.signature&&getHistory().find(v=>v.lookupSignature===row.signature&&Date.parse(v.lookupCompletedAt)>=Date.parse(row.createdAt));if(entry){row.state='complete';row.entryId=entry.id;row.message=''}else{row.state='interrupted';row.message='上次查询是否完成未知；恢复前需确认，可能再次计费。'}}});
  const previous=await read(account);if(account!==owner()||activeView!=='exercise')return;if(previous.session?.finishedAt&&!review&&!newSession){enabled=false;summaryMode=true;await render();return}
  await change(account,data=>{if(newSession||!data.session)data.session={id:crypto.randomUUID(),startedAt:new Date().toISOString()}});
  const data=await read(account);if(account!==owner()||activeView!=='exercise')return;
  enabled=!review;
  clearThumbnails();
  node.innerHTML=`<header class="exercise-page-head"><div class="exercise-heading"><h1>${icon('run')}运动采集</h1><p><span data-ex-count>准备接收</span><span data-ex-progress></span></p></div><div class="exercise-header-actions"><button class="plain-btn" data-ex-back>返回</button><button class="plain-btn" data-ex-preferences aria-haspopup="dialog">${icon('sliders-horizontal')}偏好</button><button class="plain-btn" data-ex-end>${enabled?'结束':'采集小结'}</button></div></header><div class="exercise-body"><div class="exercise-recent"><nav data-ex-list aria-label="最近截图"></nav>${enabled?`<button class="plain-btn" data-ex-add>${icon('image-plus')}添加截图</button>`:'<button class="plain-btn" data-ex-add data-ex-continue>继续采集</button>'}</div><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-ex-files><div class="exercise-columns"><section data-ex-detail></section></div><form class="exercise-query"><label class="exercise-query-field"><span>快速查词<small data-ex-association>普通查词</small></span><textarea class="content-editor" rows="1" data-ex-query aria-label="输入要查的词组，每行一个" placeholder="老师提到的词"></textarea></label><button class="plain-btn primary-btn" data-ex-submit aria-label="查询输入的词组">${icon('search')}查词</button></form><p data-ex-status role="status" aria-live="polite"></p></div>`;
  const body=node.querySelector('.exercise-body');
  const navigation=document.createElement('div');navigation.className='exercise-navigation';navigation.innerHTML='<button class="plain-btn" data-ex-previous>上一张</button><button class="plain-btn" data-ex-arrival hidden></button><button class="plain-btn" data-ex-next>下一张</button>';body.querySelector('.exercise-recent').after(navigation);
  const results=document.createElement('section');results.dataset.exResults='';results.className='exercise-results';results.hidden=true;body.querySelector('.exercise-query').before(results);
  const filePicker=body.querySelector('[data-ex-files]');if(filePicker)filePicker.onchange=e=>{receive(e.target.files);e.target.value=''};
  node.querySelector('[data-ex-preferences]').onclick=e=>openPreferences(e.currentTarget).catch(error=>status(error.message));
  if(enabled)body.querySelector('[data-ex-add]').onclick=()=>filePicker.click();
  node.querySelector('[data-ex-back]').onclick=()=>leave();
  node.querySelector('[data-ex-end]').onclick=async()=>{enabled=false;await change(sessionOwner,pool=>{pool.session.finishedAt=new Date().toISOString()});summaryMode=true;await render();scrollTo({top:0,behavior:'instant'})};
  body.querySelector('[data-ex-continue]')?.addEventListener('click',()=>open({navigate:false,newSession:true}));
  const input=body.querySelector('[data-ex-query]');input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();query(input.value.split(/\n/))}};
  input.placeholder='老师提到的词';input.value=data.quickInput||'';input.addEventListener('input',()=>change(sessionOwner,pool=>{pool.quickInput=input.value}).catch(error=>status(error.message)));
  body.querySelector('form').onsubmit=e=>{e.preventDefault();query(input.value.split(/\n/))};
  await render();
 }
 function receiving(){return enabled&&visible()&&!preferences?.open&&sessionOwner===owner()&&!document.querySelector('#scene-editor')&&!document.querySelector('.media-editor[open]')&&!document.querySelector('.exercise-summary')}
 function buttons(){for(const host of document.querySelectorAll('.topbar-actions,.scene-library-head>.scene-actions')){if(host.querySelector('[data-exercise-open]'))continue;const button=document.createElement('button');button.className='icon-btn';button.type='button';button.dataset.exerciseOpen='';button.setAttribute('aria-label','运动采集');button.dataset.tip='运动采集';button.innerHTML=icon('run');button.onclick=()=>open().catch(e=>notify(e.message,'warn','运动采集'));host.prepend(button)}}
 document.addEventListener('dragover',event=>{if(receiving()&&[...(event.dataTransfer?.types||[])].includes('Files'))event.preventDefault()},true);
 document.addEventListener('lexi-exercise-lookup',event=>{const v=event.detail;if(v?.owner!==owner())return;lookupState(v.owner,v.id,{state:v.status,message:v.message||'',signature:v.signature,...(v.entryId!==null?{entryId:v.entryId}:{})}).catch(error=>status(error.message))});
 document.addEventListener('lexi-auth-context',()=>{enabled=false;summaryMode=false;unread.clear();allResults=false;preferences?.close();clearURLs();clearThumbnails();if(node)node.replaceChildren();sessionOwner='';current='';if(activeView==='exercise')leave('home')});
 document.addEventListener('selectionchange',()=>{if(visible()&&getSelection()?.isCollapsed&&node.querySelector('[data-deferred]'))schedule()});
 document.addEventListener('focusout',()=>{if(visible()&&node.querySelector('[data-deferred]'))schedule()});
 SceneAITasks.subscribe(()=>{settle().catch(error=>status(error.message));schedule()});
 SceneAITasks.ready.then(()=>{settle();if(activeView==='exercise')open({navigate:false})}).catch(()=>{});
 new MutationObserver(buttons).observe(document.body,{childList:true,subtree:true});buttons();
 root.ExerciseCapture=Object.freeze({open,receive,receiving,leave,onRoute(){if(!routeTask)routeTask=open({navigate:false}).finally(()=>{routeTask=null});return routeTask}});
})(globalThis);
