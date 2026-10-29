(function(root){
 'use strict';
 const owner=()=>cloudUser?.id||'local',esc=v=>escapeHTML(String(v??''));
 const key=account=>'exercise-capture:'+account;
 let enabled=false,sessionOwner='',node=null,current='',revision=0,tail=Promise.resolve(),applying=false,settleAgain=false,querying=false,renderTimer=0,choosing=null,summaryMode=false,returnView='home',routeTask=null;
 const visible=()=>node?.isConnected&&activeView==='exercise';
 const busyImports=new Set(),urls=new Set();
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
    if(job?.result){await apply(job,account);continue}
    if(job){const live=getSettings().apiProfiles.find(p=>p.id===job.profileId);if(!live||await SceneAITasks.fingerprint(profile)!==job.profileHash)throw Error('恢复需使用原模型配置；可先在设置中恢复配置。');if(!job.bound)await SceneAITasks.bind(job.id,scene,SceneUI.supplementVersion(scene.groupId));}
    else{
     job=await SceneAITasks.create(profile,scene,{capture:true,manual:data.manual,point:item.point||null,useImage:true});
     await change(account,pool=>{const row=pool.items.find(v=>v.id===item.id);row.jobId=job.id;row.error=''});
     await SceneAITasks.bind(job.id,scene,SceneUI.supplementVersion(scene.groupId));
    }
    // Execution is intentionally detached from the dialog and from subsequent imports.
    SceneAITasks.execute(job,profile).then(()=>settle()).catch(error=>{status(error.message);schedule()});
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
     const bitmap=await createImageBitmap(inspected.blob);try{if(bitmap.width*bitmap.height>24000000)throw Error('图片超过2400万像素，请先缩小。')}finally{bitmap.close()}
     const ref=await SceneData.putFile(file);if(account!==owner())break;
     const id=crypto.randomUUID(),now=new Date().toISOString(),scene=SceneData.normalizeScene({id,groupId:id,title:'截图 '+new Date().toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}),media:[ref],createdAt:now,updatedAt:now});
     const item={id,scene,createdAt:now,sessionId:data.session?.id||'',jobId:'',error:''};
     await change(account,pool=>{if(pool.items.length>=100)throw Error('采集池已满，未接收此文件。');pool.items.unshift(item)});
     current=id;
     try{saveRaw(item,account)}catch(error){await change(account,pool=>{pool.items.find(v=>v.id===id).error=error.message});schedule();continue}
     ids.push(id);status(`已收下 ${ids.length} 张`);schedule();
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
  if(!job.bound?.expected||SceneUI.supplementVersion(scene.groupId)!==job.bound.expected)throw Error('场景已被修改，未覆盖；可打开场景编辑，或在 AI 任务中采用建议。');
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
 async function render(){
  if(!visible())return;const account=sessionOwner,stamp=++revision,data=await read(account),jobs=await SceneAITasks.list(account);
  if(!visible()||account!==owner()||stamp!==revision)return;
  if(summaryMode){renderSummary(data,jobs);return}
  if(!data.items.some(v=>v.id===current))current=data.items[0]?.id||'';
  const list=node.querySelector('[data-ex-list]'),detail=node.querySelector('[data-ex-detail]');
  list.innerHTML=data.items.map((item,index)=>{const job=jobs.find(v=>v.id===item.jobId),state=item.error?'保存／分析待重试':job?.captureError?'内容变化':job?.state==='check'&&!job.result?.selectedDialogueId?'请选择一句':labels[job?.state||'saved']||'待处理';return `<button type="button" class="exercise-task ${current===item.id?'active':''}" data-ex-item="${item.id}" aria-pressed="${current===item.id}"><strong>${data.items.length-index}</strong><span>${esc(state)}${job&&['running','queued'].includes(job.state)?'<span class="lexi-progress-spinner" aria-hidden="true"></span>':''}</span></button>`}).join('');
  list.querySelectorAll('[data-ex-item]').forEach(button=>button.onclick=()=>{current=button.dataset.exItem;schedule()});
  node.querySelector('[data-ex-manual]').checked=data.manual;
  if(detail.dataset.item===current&&detail.contains(document.activeElement)&&document.activeElement.matches('input,textarea'))return;
  clearURLs();const item=data.items.find(v=>v.id===current);detail.dataset.item=current;
  if(!item){detail.innerHTML='<p class="exercise-empty">粘贴截图，或选择图片</p>';return}
  const job=jobs.find(v=>v.id===item.jobId),scene=savedScene(item.scene.groupId)||item.scene,rows=job?.result?.dialogues||[],selected=job?.captureSelection||job?.result?.selectedDialogueId;
  detail.innerHTML=`<div class="exercise-picture"><img alt="当前采集截图"><div data-ex-boxes></div></div><div class="exercise-lines">${rows.length>1||rows.length===1&&!selected?rows.map((row,i)=>`<button class="exercise-line ${selected===row.id?'active':''}" data-ex-line="${row.id}"><b>${i+1}</b><span>${esc(row.quote)}</span></button>`).join(''):''}</div><p class="exercise-quote">${esc(scene.quote||(!rows.length?'截图已保存，分析后显示句子':'点击要学习的一句'))}</p>${scene.translation?`<p class="exercise-translation">${esc(scene.translation)}</p>`:''}<div class="exercise-targets">${(scene.learningTargets||[]).map(v=>`<button class="exercise-target" data-ex-term="${esc(v.phrase)}"><strong>${esc(v.phrase)}</strong><span>${esc(v.meaning)}</span></button>`).join('')}</div><p class="exercise-error" role="status">${esc(item.error||job?.captureError||job?.error||'')}</p><details class="exercise-extra"><summary>更多操作</summary><div><button class="plain-btn" data-ex-analyze>${job?.state==='interrupted'?'确认恢复分析（可能重复计费）':'分析此图'}</button><button class="plain-btn" data-ex-edit>编辑场景</button><button class="plain-btn" data-ex-pool>AI 任务与建议</button><button class="plain-btn danger-icon" data-ex-remove>移出采集池</button></div>${scene.sourceTitle?`<p>来源线索：${esc(scene.sourceTitle)} · ${scene.aiAnalysis?.sourceBasis==='visual'?'画面推测':'未验证'}</p>`:''}</details>`;
  const reading=document.createElement('div');reading.className='exercise-reading';while(detail.children.length>1)reading.append(detail.children[1]);detail.append(reading);
  if(selected&&rows.length>1){const list=detail.querySelector('.exercise-lines'),choices=document.createElement('details'),summary=document.createElement('summary');choices.className='exercise-lines';summary.textContent='换一句';choices.append(summary,...list.children);list.replaceWith(choices)}
  const record=await SceneData.getFile(item.scene.media[0].id);if(!visible()||stamp!==revision)return;
  if(record?.blob){const url=URL.createObjectURL(record.blob);urls.add(url);const img=detail.querySelector('img');img.onload=()=>img.parentElement.style.setProperty('--ex-ratio',img.naturalWidth/img.naturalHeight);img.src=url}
  const choose=async id=>{try{if(account!==owner())return;await apply(job,account,id);schedule()}catch(error){await SceneAITasks.update(account,job.id,{captureCandidate:id,captureError:error.message});status(error.message)}};
  if(item.error||['error','interrupted','cancelled'].includes(job?.state)){const retry=document.createElement('button');retry.className='plain-btn';retry.textContent=job?.state==='interrupted'?'恢复分析（可能再次计费）':'重试此项';retry.onclick=()=>start([item.id],{retry:true});detail.querySelector('.exercise-error').after(retry)}
  if(job?.captureError&&job.result){const review=document.createElement('button');review.className='plain-btn';review.textContent='检查已有建议';review.onclick=()=>{const candidate=rows.find(v=>v.id===(job.captureCandidate||selected));if(!candidate)return status('请先点选一句。');const base=savedScene(scene.groupId);if(!base)return status('场景已删除，建议仍保留。');const patch={...candidate,model:job.result.model,generatedAt:job.result.generatedAt};SceneAI.openSupplement([{id:base.groupId,scene:structuredClone(base),expected:SceneUI.supplementVersion(base.groupId),selected:true,patch,use:SceneAIData.reviewFields(patch).filter(k=>SceneAIData.defaultUse(k,base[k],patch[k])),status:'已有分析，无需重新调用',taskId:job.id}])};detail.querySelector('.exercise-error').after(review)}
  for(const [index,row] of rows.entries())if(row.rect){const box=document.createElement('button');box.className='exercise-box';box.setAttribute('aria-label',`选择第${index+1}句：${row.quote}`);box.textContent=String(index+1);box.style.cssText=`left:${row.rect.x*100}%;top:${row.rect.y*100}%;width:${row.rect.width*100}%;height:${row.rect.height*100}%`;box.onclick=()=>choose(row.id);detail.querySelector('[data-ex-boxes]').append(box)}
  detail.querySelectorAll('[data-ex-line]').forEach(b=>b.onclick=()=>choose(b.dataset.exLine));
  detail.querySelectorAll('[data-ex-term]').forEach(b=>b.onclick=()=>query([b.dataset.exTerm]));
  detail.querySelector('[data-ex-analyze]').onclick=()=>start([item.id],{retry:true});
  detail.querySelector('[data-ex-edit]').onclick=()=>{leave('scenes');SceneUI.open('library','',scene.id)};
  detail.querySelector('[data-ex-pool]').onclick=()=>SceneAITasks.open();
  detail.querySelector('[data-ex-remove]').onclick=async()=>{if(job&&['queued','running'].includes(job.state)){status('请先在 AI 任务中停止或等待完成，场景不会删除。');return}await change(account,pool=>{pool.items=pool.items.filter(v=>v.id!==item.id)});schedule()};
 }
 async function query(terms){
  if(querying)return;const account=sessionOwner,data=await read(account),item=data.items.find(v=>v.id===current),input=node?.querySelector('[data-ex-query]'),submitted=input?.value;if(!item||account!==owner())return;
  if(!savedScene(item.scene.groupId)?.quote){status('先选择一句，再关联查词。');return}
  const clean=[...new Set(terms.map(v=>v.trim()).filter(Boolean))];if(!clean.length)return;if(clean.length>20||clean.some(v=>v.length>200)){status('每次最多20个词组，每个不超过200字。');return}
  const button=node.querySelector('[data-ex-submit]');button.disabled=true;querying=true;
  try{const accepted=[];for(const term of clean){const candidates=getHistory().filter(row=>[row.query,historyDisplayTitle(row)].some(v=>normalizeSearch(v)===normalizeSearch(term)));let entry;
    if(candidates.length>1){entry=await chooseEntry(candidates,term);if(entry===null)continue}
    if(account!==owner())return;
    const result=await SceneUI.queueSceneQueries(item.scene.groupId,[term],{entryIds:entry?{[normalizeSearch(term)]:entry}:{},direction:'',note:''});accepted.push(...result.accepted);
   }status(accepted.length?`已提交 ${accepted.length} 个词组`:'未提交，输入已保留');if(input&&input.value===submitted&&accepted.length===clean.length){input.value='';await change(account,pool=>{if(pool.quickInput===submitted)pool.quickInput=''})}
  }catch(error){status(error.message)}finally{querying=false;if(button.isConnected)button.disabled=false}
 }
 function chooseEntry(entries,term){return new Promise(resolve=>{const account=owner(),dialog=AnkiBridge.dialog('选择已有词条：'+term),body=dialog.querySelector('.scene-dialog-body');let done=false;body.innerHTML=entries.map(row=>`<button class="plain-btn" data-ex-existing="${esc(row.id)}">${esc(historyDisplayTitle(row))} · ${esc(displayedResultForHistory(row.id,row)?.headword?.coreMeaning||row.query)}</button>`).join('');body.querySelectorAll('[data-ex-existing]').forEach(b=>b.onclick=()=>{done=true;resolve(account===owner()?b.dataset.exExisting:null);dialog.close()});dialog.addEventListener('close',()=>{if(!done)resolve(null)},{once:true})})}
 function leave(view=returnView){revision++;clearURLs();showView(view==='exercise'?'home':view)}
 function renderSummary(data,jobs){
  const items=data.items.filter(v=>v.sessionId===data.session?.id),jobFor=v=>jobs.find(j=>j.id===v.jobId),counts={saved:items.filter(v=>savedScene(v.id)).length,running:items.filter(v=>['queued','running'].includes(jobFor(v)?.state)).length,choose:items.filter(v=>jobFor(v)?.state==='check'&&!jobFor(v).result?.selectedDialogueId).length,failed:items.filter(v=>v.error||jobFor(v)?.captureError||['error','interrupted','cancelled'].includes(jobFor(v)?.state)).length,waiting:items.filter(v=>!v.jobId&&!v.error).length};
  node.innerHTML=`<header class="exercise-page-head"><h1>${icon('run')}采集已结束</h1><button class="plain-btn" data-ex-back>返回学习</button></header><section class="exercise-summary"><h2>本次采集</h2><dl>${[['saved','已保存'],['running','分析中'],['choose','待选句'],['failed','需处理'],['waiting','尚未分析']].map(([key,label])=>`<div><dt>${label}</dt><dd>${counts[key]}</dd></div>`).join('')}</dl>${data.quickInput?`<p>未提交词组：${esc(data.quickInput)}</p>`:''}<p>已提交的分析继续；关闭浏览器可能中断，重开后需明确恢复。</p><div><button class="plain-btn primary-btn" data-ex-review>处理待办</button><button class="plain-btn" data-ex-continue>继续采集</button><button class="plain-btn" data-ex-queries>查看查词任务</button></div></section>`;
  node.querySelector('[data-ex-back]').onclick=()=>leave();node.querySelector('[data-ex-review]').onclick=()=>{current=items.find(v=>v.error||jobFor(v)?.captureError||['check','error','interrupted','cancelled'].includes(jobFor(v)?.state)||!v.jobId)?.id||items[0]?.id||current;summaryMode=false;open({navigate:false,review:true})};node.querySelector('[data-ex-continue]').onclick=()=>{summaryMode=false;open({navigate:false,newSession:true})};node.querySelector('[data-ex-queries]').onclick=()=>leave('home');
 }
 async function open({navigate=true,review=false,newSession=false}={}){
  await SceneAITasks.ready;if(navigate&&activeView!=='exercise'){returnView=activeView;showView('exercise');return routeTask}
  const account=owner();sessionOwner=account;node=document.querySelector('#view-exercise');if(!node)return;
  if(summaryMode&&!newSession){await render();return}
  enabled=false;summaryMode=false;
  const previous=await read(account);if(account!==owner()||activeView!=='exercise')return;if(previous.session?.finishedAt&&!review&&!newSession){enabled=false;summaryMode=true;await render();return}
  await change(account,data=>{if(newSession||!data.session)data.session={id:crypto.randomUUID(),startedAt:new Date().toISOString()}});
  const data=await read(account);if(account!==owner()||activeView!=='exercise')return;
  enabled=!review;
  node.innerHTML=`<header class="exercise-page-head"><h1>${icon('run')}运动采集</h1><div><button class="plain-btn" data-ex-back>返回</button><button class="plain-btn" data-ex-end>${enabled?'结束':'采集小结'}</button></div></header><div class="exercise-body"><header class="exercise-toolbar">${enabled?`<label class="plain-btn">${icon('image-plus')}添加截图<input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-ex-files></label>`:'<button class="plain-btn" data-ex-continue>继续采集</button>'}<p>粘贴截图，自动保存；点词即可查询</p><details><summary>偏好</summary><label><input type="checkbox" data-ex-manual>每次手选句子</label><button class="plain-btn" data-ex-profile>模型配置</button></details></header><div class="exercise-columns"><nav data-ex-list aria-label="最近截图"></nav><section data-ex-detail></section></div><form class="exercise-query"><textarea class="content-editor" rows="1" data-ex-query aria-label="输入要查的词组，每行一个" placeholder="老师提到的词，输入后回车"></textarea><button class="plain-btn primary-btn" data-ex-submit aria-label="查询输入的词组">${icon('search')}查词</button></form><p data-ex-status role="status"></p></div>`;
  const body=node.querySelector('.exercise-body');
  const filePicker=body.querySelector('[data-ex-files]');if(filePicker)filePicker.onchange=e=>{receive(e.target.files);e.target.value=''};
  body.querySelector('[data-ex-manual]').onchange=async e=>{try{await change(sessionOwner,pool=>{pool.manual=e.target.checked})}catch(error){status(error.message)}};
  body.querySelector('[data-ex-profile]').onclick=()=>SceneAI.chooseProfile(true);
  node.querySelector('[data-ex-back]').onclick=()=>leave();
  node.querySelector('[data-ex-end]').onclick=async()=>{enabled=false;await change(sessionOwner,pool=>{pool.session.finishedAt=new Date().toISOString()});summaryMode=true;await render()};
  body.querySelector('[data-ex-continue]')?.addEventListener('click',()=>open({navigate:false,newSession:true}));
  const input=body.querySelector('[data-ex-query]');input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();query(input.value.split(/\n/))}};
  input.placeholder='老师提到的词';input.value=data.quickInput||'';input.addEventListener('input',()=>change(sessionOwner,pool=>{pool.quickInput=input.value}).catch(error=>status(error.message)));
  body.querySelector('form').onsubmit=e=>{e.preventDefault();query(input.value.split(/\n/))};
  await render();
 }
 function receiving(){return enabled&&visible()&&sessionOwner===owner()&&!document.querySelector('#scene-editor')&&!document.querySelector('.media-editor[open]')&&!document.querySelector('.exercise-summary')}
 function buttons(){for(const host of document.querySelectorAll('.topbar-actions,.scene-library-head>.scene-actions')){if(host.querySelector('[data-exercise-open]'))continue;const button=document.createElement('button');button.className='icon-btn';button.type='button';button.dataset.exerciseOpen='';button.setAttribute('aria-label','运动采集');button.dataset.tip='运动采集';button.innerHTML=icon('run');button.onclick=()=>open().catch(e=>notify(e.message,'warn','运动采集'));host.prepend(button)}}
 document.addEventListener('dragover',event=>{if(receiving()&&[...(event.dataTransfer?.types||[])].includes('Files'))event.preventDefault()},true);
 document.addEventListener('lexi-auth-context',()=>{enabled=false;summaryMode=false;clearURLs();if(node)node.replaceChildren();sessionOwner='';current='';if(activeView==='exercise')leave('home')});
 SceneAITasks.subscribe(()=>{settle().catch(error=>status(error.message));schedule()});
 SceneAITasks.ready.then(()=>{settle();if(activeView==='exercise')open({navigate:false})}).catch(()=>{});
 new MutationObserver(buttons).observe(document.body,{childList:true,subtree:true});buttons();
 root.ExerciseCapture=Object.freeze({open,receive,receiving,leave,onRoute(){if(!routeTask)routeTask=open({navigate:false}).finally(()=>{routeTask=null});return routeTask}});
})(globalThis);
