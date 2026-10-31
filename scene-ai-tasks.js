(function(root){
 'use strict';
 const owner=()=>cloudUser?.id||'local',active=new Map(),listeners=new Set(),controllers=new Map(),emergency=new Map(),applying=new Set();let tail=Promise.resolve(),slot=0;
 const labels={queued:'等待分析',running:'正在分析',check:'已生成',reviewed:'已保存',rejected:'已结束',interrupted:'分析中断',error:'分析失败',cancelled:'已停止',reverted:'已撤销保存'};
 const terminal=job=>['check','reviewed','rejected','cancelled','reverted'].includes(job.state);
 const storage=account=>'scene-ai-task-pool:'+account,blockedCaptureProfiles=new Set();
 let channel=null;try{if(typeof BroadcastChannel==='function')channel=new BroadcastChannel('lexi-scene-ai-tasks')}catch{}
 const signal=account=>{for(const listener of listeners)listener();channel?.postMessage({owner:account})};
 channel?.addEventListener('message',event=>{if(event.data?.owner!==owner())return;if(event.data.cancel)controllers.get(event.data.id)?.abort();for(const listener of listeners)listener()});
 const fingerprint=async profile=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(SceneAIData.identity(profile)))),v=>v.toString(16).padStart(2,'0')).join('');
 async function list(account=owner()){
  const pool=await SceneData.getDraft(storage(account)),removed=new Set(pool?.removed||[]),rows=new Map((Array.isArray(pool?.jobs)?pool.jobs:[]).filter(j=>!removed.has(j.id)).map(j=>[j.id,j]));
  for(const job of emergency.values())if(job.owner===account&&!removed.has(job.id))rows.set(job.id,job);return [...rows.values()];
 }
 async function change(account,run){
  const write=async()=>{const pool=await SceneData.getDraft(storage(account))||{},jobs=await list(account),value=run(jobs,pool);await SceneData.putDraft(storage(account),{...pool,version:2,jobs});for(const job of jobs)emergency.delete(job.id);signal(account);return value};
  if(navigator.locks)return navigator.locks.request(storage(account),write);
  const result=tail.catch(()=>{}).then(write);tail=result;return result;
 }
 async function create(profile,scene,options={}){
  const account=owner(),job={id:crypto.randomUUID(),owner:account,scene:structuredClone(SceneData.normalizeScene(scene)),options:structuredClone(options),profileId:profile.id,model:profile.model,profileHash:await fingerprint(profile),state:'queued',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),result:null,error:'',bound:null};
  if(JSON.stringify(job).length>600000)throw Error('单次场景分析上下文过长，请减少关联词条；没有发送请求。');
  if(account!==owner())throw Error('账号已切换，未建立分析任务。');
  await change(account,jobs=>{if(jobs.filter(j=>['queued','running'].includes(j.state)).length>=20)throw Error('当前有20项分析正在处理，完成后可继续添加。');jobs.unshift(job)});return job;
 }
 async function update(account,id,fields){return change(account,jobs=>{const job=jobs.find(v=>v.id===id);if(!job)throw Error('分析记录已删除。');Object.assign(job,fields,{updatedAt:new Date().toISOString()});return structuredClone(job)})}
 function resultPatch(job,current){
  const result=job.draft?.result||job.result;if(!result)return {};
  const baseline=job.bound?.scene||job.scene,patch={};
  for(const key of SceneAIData.reviewFields(result)){
   if(Array.isArray(job.draft?.selected)&&!job.draft.selected.includes(key))continue;
   if(job.options?.only&&key!==job.options.only)continue;
   if(JSON.stringify(current[key]??'')!==JSON.stringify(baseline[key]??''))continue;
   if(job.options?.only||SceneAIData.defaultUse(key,current[key],result[key]))patch[key]=structuredClone(result[key]);
  }
  const quote=patch.quote??current.quote;
  if(result.quote!==quote)for(const key of ['translation','exampleHighlights','translationHighlights','highlightPairs','learningTargets'])delete patch[key];
  patch.aiAnalysis={model:result.model||job.model,generatedAt:result.generatedAt,translationOrigin:result.translationOrigin,sourceEvidence:result.sourceEvidence,sourceCandidates:result.sourceCandidates,sourceBasis:result.sourceBasis,warnings:result.warnings};
  return SceneAIData.validatePatch(patch,current);
 }
 async function settleResult(id,account=owner()){
  const key=account+':'+id;if(applying.has(key))return;applying.add(key);
  try{
   const job=(await list(account)).find(j=>j.id===id);
   if(!job?.result||job.options?.capture||job.options?.autoApply===false||job.state!=='check'||!job.bound||account!==owner())return;
   const current=SceneUI.sceneGroups().find(g=>g.scene.groupId===job.bound.groupId)?.scene;
   if(!current)return update(account,id,{saveError:'场景已删除，分析结果仍保留。'});
   if(current.aiAnalysis?.generatedAt&&current.aiAnalysis.generatedAt===job.result.generatedAt)return update(account,id,{state:'reviewed',saveError:''});
   if(JSON.stringify(current.media?.map(v=>v.id))!==JSON.stringify(job.scene.media?.map(v=>v.id)))return update(account,id,{saveError:'素材已有变化，未将旧图片的分析填入当前场景。'});
   if(SceneUI.supplementVersion(job.bound.groupId)!==job.bound.expected)return update(account,id,{saveError:'场景已有修改，未覆盖；可打开结果继续编辑。'});
   const patch=resultPatch(job,current),before=Object.fromEntries(Object.keys(patch).map(k=>[k,k==='highlightPairs'?HighlightPairsData.fromScene(current):current[k]??(k==='aiAnalysis'?null:k.endsWith('Highlights')||k==='learningTargets'?[]:'')]));
   SceneUI.applySupplement([{id:job.bound.groupId,expected:job.bound.expected,patch}],account);
   await update(account,id,{state:'reviewed',saveError:'',autoSaved:true,undo:{id:job.bound.groupId,expected:SceneUI.supplementVersion(job.bound.groupId),patch:before}});
  }catch(error){await update(account,id,{saveError:error.message}).catch(()=>{})}finally{applying.delete(key)}
 }
 async function execute(job,profile,{resume=false}={}){
  if(active.has(job.id))return active.get(job.id);
  if(resume&&job.options?.capture)blockedCaptureProfiles.delete(job.owner+':'+job.profileHash);
  const controller=new AbortController();controllers.set(job.id,controller);
  const work=async()=>{
   const account=job.owner;let claimed=false;
   try{
    if(controller.signal.aborted)throw Error('分析已停止，原件和记录保留。');
    if(account!==owner()||await fingerprint(profile)!==job.profileHash)throw Error('账号或模型配置已变化，未发送旧任务。');
    await change(account,jobs=>{const live=jobs.find(v=>v.id===job.id);if(!live||!['queued','interrupted','error','cancelled'].includes(live.state)||live.state==='cancelled'&&job.state!=='cancelled')throw Error('任务已停止或由其他页面处理，请刷新状态。');live.state='running';live.startedAt=new Date().toISOString();live.updatedAt=live.startedAt});claimed=true;
    if(account!==owner())throw Error('账号已切换，未发送旧任务。');
    if(job.options?.capture&&blockedCaptureProfiles.has(job.owner+':'+job.profileHash))throw Error('该模型因权限或限流响应已暂停本批分析；截图已保留，请检查后手动重试。');
    const result=await SceneAIClient.analyze(profile,job.scene,{...job.options,signal:controller.signal});
    if(controller.signal.aborted||account!==owner())throw Error('分析已停止，原件和记录保留。');
    if(await fingerprint(getSettings().apiProfiles.find(v=>v.id===profile.id))!==job.profileHash)throw Error('模型配置已变化，旧响应未采用。');
    try{await update(account,job.id,{result,state:'check',error:'',saveError:''})}catch(error){const current=(await list(account)).find(j=>j.id===job.id);if(!current)throw Error('分析记录已删除，结果未采用。');emergency.set(job.id,{...current,result,state:'check',error:'分析已返回，但本机写入失败。请导出记录，不要刷新。'});signal(account);return result}
    await settleResult(job.id,account);return result;
   }catch(error){if(job.options?.capture&&/HTTP\s*(429|401|403)/.test(error.message))blockedCaptureProfiles.add(job.owner+':'+job.profileHash);if(claimed)await update(account,job.id,{state:controller.signal.aborted?'cancelled':'error',error:error.message}).catch(()=>{});throw error}
   finally{controllers.delete(job.id);active.delete(job.id)}
  };
  const lane=slot++%2,promise=navigator.locks?navigator.locks.request('scene-ai-runtime:'+job.id,{ifAvailable:true},lock=>{if(!lock)throw Error('另一标签页正在执行此任务，请勿重复请求。');return navigator.locks.request('scene-ai-slot:'+lane,work)}):Promise.reject(Error('当前浏览器缺少安全任务锁，请更新浏览器后再分析。'));
  active.set(job.id,promise);promise.finally(()=>{active.delete(job.id);if(controllers.get(job.id)===controller)controllers.delete(job.id)}).catch(()=>{});return promise;
 }
 async function bind(id,scene,expected=SceneUI.supplementVersion(scene.groupId)){
  const account=owner();await change(account,jobs=>{if(account!==owner())throw Error('账号已切换，未绑定旧任务。');const job=jobs.find(v=>v.id===id);if(!job)throw Error('分析记录已删除。');job.bound={groupId:scene.groupId,expected,scene:structuredClone(scene)};if(job.result?.generatedAt&&scene.aiAnalysis?.generatedAt===job.result.generatedAt){job.state='reviewed';job.saveError='';job.error=''}job.updatedAt=new Date().toISOString()});await settleResult(id,account);
 }
 function cancel(id){controllers.get(id)?.abort();channel?.postMessage({owner:owner(),id,cancel:true});return change(owner(),jobs=>{const job=jobs.find(j=>j.id===id);if(job?.state==='queued')job.state='cancelled'}).catch(()=>{})}
 async function reviewed(ids,account=owner()){if(owner()!==account)throw Error('账号已切换。');return change(account,jobs=>{for(const job of jobs)if(ids.includes(job.id)&&job.state==='check'){const scene=SceneUI.sceneGroups().find(v=>v.scene.groupId===job.bound?.groupId)?.scene;if(scene?.aiAnalysis?.generatedAt===job.result?.generatedAt){job.state='reviewed';job.captureError=''}}})}
 async function remove(ids,account=owner()){
  if(account!==owner())throw Error('账号已切换，未删除记录。');const chosen=new Set(ids);
  const removed=await change(account,(jobs,pool)=>{if(account!==owner())throw Error('账号已切换。');const rows=jobs.filter(j=>chosen.has(j.id));pool.removed=[...new Set([...(pool.removed||[]),...rows.map(j=>j.id)])];for(let i=jobs.length-1;i>=0;i--)if(chosen.has(jobs[i].id))jobs.splice(i,1);return structuredClone(rows)});
  for(const job of removed){emergency.delete(job.id);controllers.get(job.id)?.abort();channel?.postMessage({owner:account,id:job.id,cancel:true})}return removed;
 }
 async function restoreRecords(rows,account){
  if(owner()!==account)throw Error('账号已切换，未恢复记录。');await change(account,(jobs,pool)=>{if(owner()!==account)throw Error('账号已切换。');const removed=new Set(pool.removed||[]);for(const row of rows){if(!removed.has(row.id)||jobs.some(j=>j.id===row.id))throw Error('记录已有后续变化，未覆盖。')}for(const row of rows){jobs.push({...row,...(['queued','running'].includes(row.state)?{state:'interrupted',error:'分析已停止，恢复记录不会重新请求模型。'}:{})});removed.delete(row.id)}pool.removed=[...removed]});
 }
 async function restoreSession(){const account=owner();for(const row of await list(account))if(['running','queued'].includes(row.state)&&!active.has(row.id)&&navigator.locks)await navigator.locks.request('scene-ai-runtime:'+row.id,{ifAvailable:true},async lock=>{if(!lock)return;await change(account,jobs=>{const job=jobs.find(j=>j.id===row.id);if(job&&['running','queued'].includes(job.state)&&!active.has(job.id)){job.state='interrupted';job.error='网页上次已关闭或刷新，重新请求可能产生重复费用。'}})})}
 const esc=v=>escapeHTML(String(v??''));
 async function open(selected=''){
  const account=owner(),node=AnkiBridge.dialog('分析记录'),body=node.querySelector('.scene-dialog-body');node.classList.add('scene-ai-pool');let limit=50,revision=0;
  body.innerHTML=`<div class="ai-record-tools"><span data-pool-summary></span><div><button type="button" class="icon-btn" data-pool-export aria-label="导出分析记录" data-tip="导出记录">${icon('download')}</button><button type="button" class="plain-btn danger-icon" data-pool-clear>${icon('trash-2')}清理已完成</button></div></div><div class="ai-record-list" data-pool-list></div><p class="ai-pool-status" role="status"></p>`;
  const valid=()=>node.open&&owner()===account,status=text=>{if(valid())body.querySelector('.ai-pool-status').textContent=text};
  async function erase(ids){if(!ids.length||!valid())return;if(!await askConfirm(`删除 ${ids.length} 条分析记录？场景、图片、词条和已保存的学习内容均保留。进行中的分析会停止。`,'删除分析记录')||!valid())return;try{const rows=await remove(ids,account);notify(`已删除 ${rows.length} 条分析记录。`,'good','分析记录',true,{label:'撤销',run:async()=>{try{await restoreRecords(rows,account)}catch(e){notify(e.message,'warn','撤销')}}});await render()}catch(e){status(e.message)}}
  async function showResult(job){
   if(!valid())return;try{
    node.close();if(!await SceneUI.closeEditor()||account!==owner())return;
    const group=SceneUI.sceneGroups().find(g=>g.scene.groupId===(job.bound?.groupId||job.scene.groupId));
    if(job.options?.capture){node.close();await ExerciseCapture.open();return}
    if(job.result&&job.state!=='reviewed'){
     const current=group?.scene||job.scene,draft={...structuredClone(current),...resultPatch(job,current)};
     node.close();await SceneUI.open(group?.item.id||'library','',group?.scene.id||'',{initialScene:draft,analysisTaskId:job.id});return;
    }
    if(!group)throw Error('原场景已删除；分析记录可单独导出。');node.close();await SceneUI.open(group.item.id,'',group.scene.id);
   }catch(e){notify(e.message,'warn','分析记录',false)}
  }
  async function render(){
   const stamp=++revision,jobs=await list(account);if(!valid()||stamp!==revision)return;
   const running=jobs.filter(j=>['queued','running'].includes(j.state)).length,finished=jobs.filter(terminal);
   body.querySelector('[data-pool-summary]').textContent=`${running} 项分析中 · ${jobs.length} 条记录`;
   body.querySelector('[data-pool-clear]').disabled=!finished.length;
   const host=body.querySelector('[data-pool-list]');host.innerHTML=jobs.slice(0,limit).map(j=>`<article class="ai-record-row" data-pool-id="${esc(j.id)}"><div><strong>${esc(j.result?.title||j.bound?.scene.title||j.scene.title||j.scene.quote||'素材场景')}</strong><small>${['queued','running'].includes(j.state)?'<span class="lexi-progress-spinner" aria-hidden="true"></span>':''}${esc(labels[j.state]||'已生成')} · ${esc(j.model||'AI')}</small>${j.saveError||j.error?`<p>${esc(j.saveError||j.error)}</p>`:''}</div><div class="ai-record-actions"><button type="button" class="plain-btn" data-pool-open>${j.options?.capture?'打开采集':j.result&&j.state!=='reviewed'?'打开结果':'打开场景'}</button>${['error','interrupted','cancelled'].includes(j.state)?`<button type="button" class="icon-btn" data-pool-resume aria-label="重新分析" data-tip="重新分析">${icon('refresh-cw')}</button>`:''}${j.undo?`<button type="button" class="icon-btn" data-pool-undo aria-label="撤销自动保存" data-tip="撤销自动保存">${icon('undo-2')}</button>`:''}<button type="button" class="icon-btn danger-icon" data-pool-remove aria-label="删除分析记录" data-tip="删除记录">${icon('trash-2')}</button></div></article>`).join('')||'<p class="ai-record-empty">暂无分析记录</p>';
   if(jobs.length>limit){const more=document.createElement('button');more.className='plain-btn';more.textContent=`继续显示 ${Math.min(50,jobs.length-limit)} 条`;more.onclick=()=>{limit+=50;render()};host.append(more)}
   for(const row of host.querySelectorAll('[data-pool-id]')){
    const job=jobs.find(j=>j.id===row.dataset.poolId);row.querySelector('[data-pool-open]').onclick=()=>showResult(job);row.querySelector('[data-pool-remove]').onclick=()=>erase([job.id]);
    row.querySelector('[data-pool-resume]')?.addEventListener('click',async()=>{try{if(!await askConfirm('重新分析可能再次计费，保留原截图和内容。','重新分析')||!valid())return;const profile=await SceneAI.chooseProfile();if(!profile||!valid())return;await execute(job,profile,{resume:true})}catch(e){status(e.message)}});
    row.querySelector('[data-pool-undo]')?.addEventListener('click',async()=>{try{if(!valid())return;SceneUI.applySupplement([job.undo],account,{undo:true});await update(account,job.id,{state:'reverted',undo:null})}catch(e){status(e.message)}});
   }
   body.querySelector('[data-pool-clear]').onclick=()=>erase(finished.map(j=>j.id));
   if(selected){host.querySelector(`[data-pool-id="${CSS.escape(selected)}"]`)?.scrollIntoView({block:'nearest'});selected=''}
  }
  body.querySelector('[data-pool-export]').onclick=async()=>{try{const jobs=await list(account);if(valid())downloadText('Lexi-analysis-records.json',JSON.stringify({version:2,jobs},null,2))}catch(e){status(e.message)}};
  const changed=()=>render().catch(e=>status(e.message));listeners.add(changed);node.addEventListener('close',()=>listeners.delete(changed),{once:true});await render();
 }
 document.addEventListener('lexi-auth-context',()=>{for(const c of controllers.values())c.abort();document.querySelectorAll('.scene-ai-pool[open]').forEach(n=>n.close());restoreSession().catch(()=>{})});
 const ready=Promise.resolve(typeof appReady==='undefined'?null:appReady).then(restoreSession).catch(()=>{});let pendingCount=0;
 function buttons(){for(const host of document.querySelectorAll('.topbar-actions,.scene-library-head>.scene-actions,.result-toolbar>.result-icons')){if(host.querySelector('[data-scene-ai-pool]'))continue;const button=document.createElement('button');button.type='button';button.className='icon-btn';button.dataset.sceneAiPool='';button.dataset.pending=String(Math.min(pendingCount,99));button.setAttribute('aria-label','分析记录');button.dataset.tip='分析记录';button.innerHTML=icon('list');button.onclick=()=>open();host.append(button)}}
 async function badges(){const account=owner(),jobs=await list(account);if(owner()!==account)return;const running=jobs.filter(j=>['queued','running'].includes(j.state)).length;pendingCount=running;for(const b of document.querySelectorAll('[data-scene-ai-pool]')){b.dataset.pending=String(Math.min(running,99));b.dataset.running=String(Boolean(running));b.dataset.tip=running?`分析记录 · ${running} 项分析中`:'分析记录';b.setAttribute('aria-label',b.dataset.tip)}}
 listeners.add(()=>badges().catch(()=>{}));ready.then(()=>badges()).catch(()=>{});new MutationObserver(buttons).observe(document.body,{childList:true,subtree:true});buttons();
 root.SceneAITasks={create,execute,bind,cancel,reviewed,list,open,ready,fingerprint,update,remove,restoreRecords,settleResult,resultPatch,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener)}};
})(globalThis);
