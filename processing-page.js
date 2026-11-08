(function(root){
 'use strict';
 const owner=()=>cloudUser?.id||'local',storage='processing:inbox:v1',esc=v=>escapeHTML(String(v??''));
 const labels={ready:'原件已保存',running:'正在分析',collecting:'正在收集',complete:'已收集',skipped:'未发现完整对话',attention:'需处理',error:'处理失败',interrupted:'待恢复',archived:'已归档'};
 let node,tab='inbox',selected=new Set(),run=null,renderTimer=0,stamp=0,busyImport=false,starting=false,limit=100,archived=false,urls=new Map();
 const visible=()=>activeView==='processing'&&node?.isConnected;
 const empty=()=>({version:1,rows:[],runs:[]});
 const read=async(account=owner())=>(await LearningStore.read(account,storage))||empty();
 async function change(account,mutate){if(account!==owner())throw Error('账号已切换，未修改处理记录。');const result=await LearningStore.atomic(account,[storage],values=>{if(account!==owner())throw Error('账号已切换。');const data=values.get(storage)||empty(),result=mutate(data);return {writes:[[storage,data]],result}});schedule();return result}
 const rowUpdate=(account,id,patch)=>change(account,data=>{const row=data.rows.find(r=>r.id===id);if(!row)throw Error('记录已移除。');Object.assign(row,patch,{updatedAt:new Date().toISOString()});return structuredClone(row)});
 function status(text){if(visible())node.querySelector('[data-processing-status]').textContent=text}
 function schedule(){clearTimeout(renderTimer);renderTimer=setTimeout(()=>{if(visible())render().catch(e=>status(e.message))},60)}
 function release(){urls.forEach(URL.revokeObjectURL);urls.clear()}
 async function open(){try{return await openView()}catch(e){status(e.message)}}
 async function openView(){
  node=document.querySelector('#view-processing');const account=owner();selected.clear();release();
  node.innerHTML=`<header class="learning-page-head"><div><h1>素材处理</h1><p data-processing-count></p></div><div class="action-row"><button class="plain-btn" data-processing-study>${icon('book-open')}去学习</button><button class="plain-btn primary-btn" data-processing-import>${icon('image-plus')}导入图片</button></div></header><nav class="learning-tabs" aria-label="素材来源"><button data-processing-tab="inbox">处理列表</button><button data-processing-tab="records">过往分析</button><button data-processing-tab="scenes">已有场景</button></nav><section class="processing-controls"><label><input type="checkbox" data-processing-all>选择当前列表</label><label><input type="checkbox" data-processing-auto-query>自动查词（本批最多20次）</label><button class="plain-btn" data-processing-model>${icon('sliders-horizontal')}模型配置</button><button class="plain-btn primary-btn" data-processing-start>${icon('play')}开始处理</button><button class="plain-btn" data-processing-pause hidden>${icon('pause')}暂停后续任务</button></section><p class="processing-model" data-processing-model-label></p><div data-processing-list></div><p class="learning-status" role="status" data-processing-status></p><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-processing-files>`;
  node.querySelector('[data-processing-import]').onclick=()=>node.querySelector('[data-processing-files]').click();node.querySelector('[data-processing-files]').onchange=e=>{const files=[...e.target.files];e.target.value='';receive(files).catch(e=>status(e.message))};
  node.querySelector('[data-processing-study]').onclick=()=>showView('study');
  const more=document.createElement('button');more.type='button';more.className='icon-btn';more.setAttribute('aria-label','处理记录更多操作');more.dataset.tip='更多操作';more.innerHTML=icon('ellipsis');node.querySelector('.learning-page-head .action-row').prepend(more);more.onclick=()=>SharedUI.menu(more,[{label:archived?'返回处理列表':'查看已归档记录',icon:'archive',run:()=>{tab='inbox';archived=!archived;selected.clear();render()}},{label:'导出处理记录（不含图片文件）',icon:'download',run:async()=>{try{const data=await read(account);if(account===owner())downloadText('Lexi-processing-records.json',JSON.stringify({format:'lexi-processing',...data},null,2))}catch(e){status(e.message)}}}]);
  node.querySelector('[data-processing-model]').onclick=async()=>{await SceneAI.chooseProfile(true);schedule()};
  node.querySelector('[data-processing-start]').onclick=()=>start().catch(e=>status(e.message));node.querySelector('[data-processing-pause]').onclick=()=>{if(run){run.paused=true;status('已暂停后续任务，正在进行的分析会完成并保存。');schedule()}};
  node.querySelectorAll('[data-processing-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.processingTab;selected.clear();render()});node.querySelector('[data-processing-all]').onchange=e=>{node.querySelectorAll('[data-processing-select]').forEach(input=>{input.checked=e.target.checked;input.checked?selected.add(input.dataset.processingSelect):selected.delete(input.dataset.processingSelect)});schedule()};
  const data=await read(account);if(account!==owner())return;if(!run)await change(account,d=>{for(const row of d.rows)if(['running','collecting'].includes(row.state)){row.state='interrupted';row.error='上次处理未完成，点击开始处理恢复；已有结果不会重复生成。'}});
  await render();if(data.rows.some(r=>r.state==='interrupted'))status('未完成项已保留。开始处理前可选择恢复范围。');
 }
 async function receive(files){
  if(busyImport)return status('正在保存上一批原件，请稍候。');const account=owner();busyImport=true;let saved=0,duplicates=0,failed=0;const seen=new Set();
  try{for(const file of files){if(account!==owner())break;try{
   const checked=await SceneData.inspectFile(file);if(!['image/png','image/jpeg','image/webp'].includes(checked.ref.mime))throw Error('批量识图支持PNG、JPEG、WebP，原文件未修改。');
   if(seen.has(checked.ref.id)){duplicates++;continue}seen.add(checked.ref.id);
   const bitmap=await createImageBitmap(checked.blob);try{if(bitmap.width*bitmap.height>24000000)throw Error('图片超过2400万像素，请缩小后导入。')}finally{bitmap.close()}
   const ref=await SceneData.putFile(file);if(account!==owner())break;const id=crypto.randomUUID(),at=new Date().toISOString(),scene=SceneData.normalizeScene({id,groupId:id,title:file.name,media:[ref],createdAt:at,updatedAt:at});
   await change(account,data=>data.rows.unshift({id,scene,name:file.name,state:'ready',createdAt:at,updatedAt:at,outputs:[],jobId:'',submitted:[]}));saved++;if(selected.size<20)selected.add(id);status(`已保存 ${saved} 张原件`);
  }catch(e){failed++;status(e.message)}}
  tab='inbox';archived=false;await render();status(`已保存 ${saved} 张原件${duplicates?' · 同批重复 '+duplicates+' 张':''}${failed?' · '+failed+' 张未导入，请保留原文件':''}。每次处理20项；其余原件保留，完成后可继续下一批。`);
  }finally{busyImport=false}
 }
 async function sources(account){
  if(tab==='records'){const used=new Set((await read(account)).rows.map(r=>r.jobId));return (await SceneAITasks.list(account)).filter(j=>!used.has(j.id)).map(j=>({id:'record:'+j.id,name:j.result?.title||j.scene.title||j.scene.quote||'过往分析',scene:j.scene,job:j,state:j.state,outputs:[]}))}
  if(tab==='scenes')return SceneUI.sceneGroups().map(g=>({id:'scene:'+g.scene.groupId,name:g.scene.title||g.scene.quote||'场景',scene:g.scene,state:'existing',outputs:[]}));
  return (await read(account)).rows.filter(r=>archived?r.state==='archived':r.state!=='archived');
 }
 async function render(){
  if(!visible())return;const account=owner(),token=++stamp,data=await read(account),rows=await sources(account);if(!visible()||account!==owner()||stamp!==token)return;
  node.querySelector('[data-processing-count]').textContent=`原件与记录 ${data.rows.length} · 分析中 ${data.rows.filter(r=>r.state==='running').length} · 已收集 ${data.rows.filter(r=>r.state==='complete').length} · 需处理 ${data.rows.filter(r=>['error','attention','interrupted'].includes(r.state)).length}`;
  const settings=getSettings(),vision=settings.apiProfiles.find(p=>p.id===settings.sceneAI?.profileId),lookup=currentApiSettings(settings);
  node.querySelector('[data-processing-model-label]').textContent=`识图：${vision?.name||'尚未选择'}${vision?.model?' · '+vision.model:''}　查词：${lookup.apiProfileName||'未配置'}${lookup.model?' · '+lookup.model:''}${run?' · 本批已预留 '+run.used+'/20 次查询':''}`;
  node.querySelectorAll('[data-processing-tab]').forEach(b=>b.classList.toggle('active',b.dataset.processingTab===tab));node.querySelector('[data-processing-start]').disabled=!!run;node.querySelector('[data-processing-start]').textContent=tab==='inbox'?'开始处理':'加入处理列表';node.querySelector('[data-processing-pause]').hidden=!run;
  const host=node.querySelector('[data-processing-list]');if(host.contains(document.activeElement)||getSelection()?.toString()&&host.contains(getSelection().anchorNode))return;
  host.innerHTML=rows.slice(0,limit).map(row=>`<article class="processing-row" data-processing-row="${esc(row.id)}"><input type="checkbox" aria-label="选择 ${esc(row.name)}" data-processing-select="${esc(row.id)}" ${selected.has(row.id)?'checked':''}><div class="processing-thumb" data-processing-thumb="${esc(row.scene.media?.[0]?.id||'')}">${icon('images')}</div><div class="processing-copy"><strong>${esc(row.name)}</strong><span>${esc(labels[row.state]||({check:'已有结果',reviewed:'已保存',existing:'已有场景'})[row.state]||row.state)}${row.outputs?.length?' · '+row.outputs.length+' 个场景':''}</span>${row.error?'<p class="processing-error">'+esc(row.error)+'</p>':''}${row.scene.sourceTitle?'<small>'+esc(row.scene.sourceTitle)+'</small>':''}</div><div class="processing-actions">${row.outputs?.length?'<button class="plain-btn" data-processing-result>打开场景</button>':''}${row.jobId?'<button class="icon-btn" data-processing-record aria-label="查看分析结果" data-tip="查看分析结果">'+icon('list')+'</button>':''}${tab==='inbox'?'<button class="icon-btn" data-processing-archive aria-label="归档记录，不删除素材" data-tip="归档记录">'+icon('archive')+'</button>':''}</div></article>`).join('')||'<section class="learning-empty"><h2>'+ (tab==='inbox'?'批量收集学习素材':'当前没有记录')+'</h2><p>导入截图，或从过往分析和已有场景加入处理列表。</p></section>';
  if(rows.length>limit){const more=document.createElement('button');more.type='button';more.className='plain-btn';more.textContent=`显示全部 ${rows.length} 条记录`;more.onclick=()=>{limit=rows.length;render()};host.append(more)}
  host.querySelectorAll('[data-processing-row]').forEach(article=>{const row=rows.find(r=>r.id===article.dataset.processingRow),input=article.querySelector('input');input.onchange=()=>{input.checked?selected.add(row.id):selected.delete(row.id)};
   let details;if(row.outputs?.length>1){details=document.createElement('details');details.className='processing-scenes';const summary=document.createElement('summary');summary.textContent='查看 '+row.outputs.length+' 个场景';details.append(summary);for(const id of row.outputs){const scene=SceneUI.sceneGroups().find(g=>g.scene.groupId===id)?.scene;if(!scene)continue;const button=document.createElement('button');button.type='button';button.className='processing-scene-link';button.textContent=scene.quote;button.onclick=()=>SceneUI.openWorkspace(id);details.append(button)}article.querySelector('.processing-copy').append(details)}
   if(row.submitted?.length){const queries=SceneUI.tasks().map(v=>v[1]).filter(v=>row.outputs?.includes(v.request.sceneGroupId)),line=document.createElement('small');line.textContent=`查词：${queries.filter(v=>v.status==='complete').length} 已完成 · ${queries.filter(v=>['queued','running'].includes(v.status)).length} 处理中${queries.some(v=>v.status==='error')?' · 有未完成项':''}`;article.querySelector('.processing-copy').append(line)}
   const recovery=lookupQueue.find(v=>v.recovered&&v.processingLookupId&&v.processingOwner===account&&row.outputs?.includes(v.sceneGroupId));if(recovery){const button=document.createElement('button');button.type='button';button.className='plain-btn';button.textContent='恢复查词';button.onclick=()=>resumeQueuedLookup(recovery.id);article.querySelector('.processing-actions').prepend(button)}
   const thumb=article.querySelector('[data-processing-thumb]'),id=thumb.dataset.processingThumb;if(id){if(urls.has(id)){const image=new Image();image.src=urls.get(id);image.alt='';thumb.replaceChildren(image)}else SceneData.getFile(id).then(record=>{if(!record?.blob||!article.isConnected||account!==owner())return;const url=urls.get(id)||URL.createObjectURL(record.blob);urls.set(id,url);const image=new Image();image.src=url;image.alt='';thumb.replaceChildren(image)}).catch(()=>{})}
   article.querySelector('[data-processing-result]')?.addEventListener('click',()=>{if(details){details.open=!details.open;details.querySelector('button')?.focus()}else SceneUI.openWorkspace?.(row.outputs[0])});
   article.querySelector('[data-processing-record]')?.addEventListener('click',()=>SceneAITasks.open(row.jobId));
   const archive=article.querySelector('[data-processing-archive]');if(archive&&row.state==='archived'){archive.setAttribute('aria-label','恢复处理记录');archive.dataset.tip='恢复记录';archive.innerHTML=icon('undo-2')}
   archive?.addEventListener('click',async()=>{try{if(run?.ids.includes(row.id))return status('此项正在本批处理中，请先暂停并等待当前项完成。');await rowUpdate(account,row.id,row.state==='archived'?{state:row.previousState||'ready'}:{state:'archived',previousState:row.state});selected.delete(row.id);if(row.state!=='archived')notify('处理记录已归档，场景和原件保留。','good','素材处理',true,{label:'撤销',run:()=>rowUpdate(account,row.id,{state:row.state})})}catch(e){status(e.message)}});
  });node.querySelector('[data-processing-all]').checked=rows.length>0&&rows.slice(0,limit).every(r=>selected.has(r.id));
 }
 async function stage(){const account=owner(),rows=(await sources(account)).filter(r=>selected.has(r.id));if(!rows.length)throw Error('请先选择内容。');if(rows.length>20)throw Error('每次最多加入20项。');await change(account,data=>{for(const row of rows){if(row.job&&data.rows.some(r=>r.jobId===row.job.id)||!row.job&&data.rows.some(r=>r.existingId===row.scene.groupId))continue;data.rows.unshift({id:crypto.randomUUID(),scene:structuredClone(row.scene),existingId:SceneUI.sceneGroups().some(g=>g.scene.groupId===row.scene.groupId)?row.scene.groupId:'',expected:SceneUI.supplementVersion(row.scene.groupId),jobId:row.job?.id||'',name:row.name,state:'ready',outputs:[],submitted:[],createdAt:new Date().toISOString()})}});selected.clear();tab='inbox';await render();status('已加入处理列表。选择项目后点击开始处理；已有结果会复用。')}
 async function start(){
  if(run||starting)return;starting=true;
  try{if(!navigator.locks)throw Error('浏览器缺少安全任务锁，未启动重复处理。');return await navigator.locks.request('lexi-processing:'+owner(),{ifAvailable:true},lock=>{if(!lock)throw Error('另一个标签页正在处理此账号的素材。');return startRun()})}finally{starting=false}
 }
 async function startRun(){
  if(run)return;if(tab!=='inbox')return stage();const account=owner(),data=await read(account);if(!selected.size&&!archived)data.rows.filter(r=>r.state==='ready').slice(0,20).forEach(r=>selected.add(r.id));const rows=data.rows.filter(r=>selected.has(r.id)&&r.state!=='archived'&&r.state!=='complete');if(!rows.length)throw Error('当前没有选中的未完成项，请选择需恢复的记录。');if(rows.length>20)throw Error('每次最多处理20项，其余原件已保留。');
  const requiresModel=[];for(const row of rows){const job=row.jobId&&(await SceneAITasks.list(account)).find(j=>j.id===row.jobId);if(!job?.result)requiresModel.push(row)}
  const profile=requiresModel.length?await SceneAI.chooseProfile():null;if(requiresModel.length&&!profile||account!==owner())return;
  const autoQuery=node.querySelector('[data-processing-auto-query]').checked,lookup=currentApiSettings(),lookupHash=await SceneAITasks.fingerprint({id:lookup.activeApiProfileId,...lookup});
  if(autoQuery&&(!lookup.apiUrl||!lookup.apiKey||!lookup.model))throw Error('自动查词需要完整的当前查词模型配置。');
  const batch={id:crypto.randomUUID(),ids:rows.map(r=>r.id),owner:account,used:0,autoQuery,lookupHash,paused:false};await change(account,data=>data.runs.push({id:batch.id,ids:batch.ids,autoQuery,used:0,createdAt:new Date().toISOString()}));run=batch;schedule();let offset=0;
  const worker=async()=>{while(offset<rows.length&&!batch.paused&&account===owner()){const row=rows[offset++];try{await process(row,profile,batch)}catch(e){if(account!==owner())break;await rowUpdate(account,row.id,{state:'error',error:e.message}).catch(()=>{});if(/HTTP\s*(401|403|429)|未取得可读|限流|额度/.test(e.message))batch.paused=true}}};
  try{await Promise.all([worker(),worker()])}finally{if(run===batch)run=null;if(account===owner()){for(const id of batch.ids)selected.delete(id);await change(account,data=>{const r=data.runs.find(r=>r.id===batch.id);if(r){r.finishedAt=new Date().toISOString();r.paused=batch.paused}}).catch(()=>{});await render();status(batch.paused?'已暂停，原件与成功结果保留。未开始项需手动继续。':'本批处理结束，已收集内容可进入学习；还有待处理原件时可再次开始下一批。')}}
 }
 async function process(row,profile,batch){
  const account=batch.owner;let job=row.jobId&&(await SceneAITasks.list(account)).find(j=>j.id===row.jobId);
  if(row.state==='complete')return;
  if(!job?.result){
   if(job&&['running','queued'].includes(job.state))throw Error('此分析任务已在其他入口执行，完成后可复用结果。');
   if(job&&await SceneAITasks.fingerprint(profile)!==job.profileHash)throw Error('原任务模型配置不同，请选择原配置恢复。');
   if(!job){job=await SceneAITasks.create(profile,row.scene,{capture:true,useImage:!!row.scene.media?.length,autoApply:false,batch:true});await rowUpdate(account,row.id,{jobId:job.id})}
   await rowUpdate(account,row.id,{state:'running',error:''});await SceneAITasks.execute(job,profile,{resume:true});job=(await SceneAITasks.list(account)).find(j=>j.id===job.id);
  }
  if(account!==owner())return;const result=job?.result;if(!result)throw Error('分析结果未保存，未收集场景。');await rowUpdate(account,row.id,{state:'collecting',error:''});
  const candidates=result.dialogues||[result],seen=new Set(),eligible=candidates.filter(v=>{const signature=JSON.stringify([v.quote,v.translation,v.speaker]);if(!v.quote?.trim()||v.complete===false||seen.has(signature))return false;seen.add(signature);return true}),outputs=[];
  if(!eligible.length){await rowUpdate(account,row.id,{state:candidates.length?'attention':'skipped',error:candidates.length?'句子不完整，原件和候选保留，可打开分析结果选择。':'',outputs:[]});return}
  if(row.existingId){
   const group=SceneUI.sceneGroups().find(g=>g.scene.groupId===row.existingId);if(!group)throw Error('原场景已移除，未重新创建。');
   const current=group.scene,exact=eligible.find(v=>v.quote===current.quote),chosen=exact||eligible.length===1&&eligible[0];if(!chosen)throw Error('已有场景对应多句，未自动替换，请打开结果选择。');
   const generated=job.bound?.scene||job.scene;const safe={...job,result:{...chosen,model:result.model,generatedAt:result.generatedAt},options:{autoApply:false},bound:{scene:generated}};
   if(row.expected&&SceneUI.supplementVersion(row.existingId)!==row.expected)throw Error('场景已有人工修改，建议保留在原分析中。');
   SceneUI.applySupplement([{id:row.existingId,expected:row.expected,patch:SceneAITasks.resultPatch(safe,current)}],account);outputs.push(row.existingId);
  }else{
   const now=new Date().toISOString(),records=eligible.map((value,i)=>{const patch=result.dialogues?ExerciseData.patch(result,value.id):{...value,aiAnalysis:{model:result.model,generatedAt:result.generatedAt}},id='batch-'+row.id+'-'+i;return SceneData.normalizeScene({...row.scene,...patch,id,groupId:id,createdAt:row.createdAt,updatedAt:now})});
   SceneUI.collectScenes(records,account);outputs.push(...records.map(s=>s.groupId));
  }
  await rowUpdate(account,row.id,{outputs,state:'complete',error:eligible.length<candidates.length?'部分不完整句子保留在分析结果中。':''});
  if(batch.autoQuery&&!batch.paused){
   for(const id of outputs){
    if(account!==owner()||batch.paused)break;if(await SceneAITasks.fingerprint({id:currentApiSettings().activeApiProfileId,...currentApiSettings()})!==batch.lookupHash)throw Error('查词配置已变化，已保存场景，未继续自动查询。');
    const scene=SceneUI.sceneGroups().find(g=>g.scene.groupId===id)?.scene;if(!scene)continue;
    for(const target of scene.learningTargets||[]){if(!target.phrase||!scene.quote.includes(target.phrase)||target.kind==='sentence')continue;
     const signature=id+'\0'+normalizeSearch(target.phrase),stored=(await read(account)).rows.find(r=>r.id===row.id);if(stored?.submitted?.includes(signature))continue;
     const matches=getHistory().filter(v=>[v.query,historyDisplayTitle(v)].some(q=>normalizeSearch(q)===normalizeSearch(target.phrase)));if(matches.length>1){await rowUpdate(account,row.id,{error:'存在多个已有词条，请在场景中选择关联；其他项目继续。'});continue}
     if(batch.used>=20){await rowUpdate(account,row.id,{error:'本批20次查询预算已用完，其余学习重点保留。'});break}
     const reserved=await change(account,data=>{const rowLive=data.rows.find(r=>r.id===row.id),r=data.runs.find(r=>r.id===batch.id);if(!rowLive||!r||rowLive.state==='archived')throw Error('处理记录已改变。');rowLive.submitted=rowLive.submitted||[];if(r.used>=20||rowLive.submitted.includes(signature))return false;rowLive.submitted.push(signature);r.used++;batch.used=r.used;return true});if(!reserved){await rowUpdate(account,row.id,{error:'本批查询预算已用完或此项已提交，其他学习重点保留。'});break}
     try{const accepted=await SceneUI.queueSceneQueries(id,[target.phrase],{direction:'',note:'批量素材学习，重点解释此语境。',processingLookupId:crypto.randomUUID(),processingOwner:account,processingProfileHash:batch.lookupHash,entryIds:matches.length===1?{[normalizeSearch(target.phrase)]:matches[0].id}:{}});if(accepted.failed.length)throw Error('查词未提交，场景已保留，可从场景重试。');await waitForQuery(account,id,target.phrase)}catch(error){batch.paused=true;throw error}
    }
   }
  }
 }
 function waitForQuery(account,groupId,query){return new Promise((resolve,reject)=>{
  const cleanup=()=>{clearTimeout(timer);document.removeEventListener('lexi-scene-task',check);document.removeEventListener('lexi-auth-context',check)},finish=error=>{cleanup();error?reject(error):resolve()},check=()=>{if(account!==owner())return finish(Error('账号已切换。'));const task=SceneUI.tasks().map(v=>v[1]).find(v=>v.request.sceneGroupId===groupId&&normalizeSearch(v.request.query)===normalizeSearch(query));if(task?.status==='complete')finish();else if(task?.status==='error')finish(Error(task.message||'查词未完成，本批暂停，场景和结果保留。'))},timer=setTimeout(()=>finish(Error('查询仍未完成，已暂停后续自动查询；现有任务保留。')),120000);
  document.addEventListener('lexi-scene-task',check);document.addEventListener('lexi-auth-context',check);check();
 })}
 document.addEventListener('paste',e=>{if(!visible()||e.target.closest('input,textarea,[contenteditable]')||document.querySelector('dialog[open]'))return;const files=[...(e.clipboardData?.files||[])];if(files.length){e.preventDefault();receive(files).catch(err=>status(err.message))}},true);
 document.addEventListener('dragover',e=>{if(visible()&&[...(e.dataTransfer?.types||[])].includes('Files'))e.preventDefault()},true);
 document.addEventListener('drop',e=>{if(!visible()||document.querySelector('dialog[open]'))return;const files=[...(e.dataTransfer?.files||[])];if(files.length){e.preventDefault();receive(files).catch(err=>status(err.message))}},true);
 document.addEventListener('lexi-auth-context',()=>{if(run)run.paused=true;selected.clear();release();stamp++;if(node)node.replaceChildren();if(activeView==='processing')open()});
 SceneAITasks.subscribe(schedule);
 root.ProcessingPage=Object.freeze({open,receive,read,start,refresh:schedule,openSource(value){tab=['inbox','records','scenes'].includes(value)?value:'inbox';if(activeView==='processing')open();else showView('processing')}});if(activeView==='processing')open();
})(globalThis);
