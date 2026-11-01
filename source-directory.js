(function(root){
 'use strict';
 const account=()=>cloudUser?.id||'local',esc=v=>escapeHTML(String(v??'')),key='sources:catalog';
 let owner='',rows=[],loaded=false,fetched=false,pending=null,serial=0,serviceError='',batchRunning=false;
 const live=()=>rows.filter(s=>!s.deleted),same=(a,b)=>SourceData.normalize(a)===SourceData.normalize(b);
 function changed(){serial++;document.dispatchEvent(new Event('lexi-source-directory'))}
 async function load(){
  const who=account();if(owner!==who){owner=who;rows=[];loaded=false;fetched=false;pending=null}
  if(!loaded){const saved=await LearningStore.read(who,key);if(who!==account())throw Error('账号已切换。');rows=(saved||[]).map(SourceData.source);loaded=true;changed()}return rows;
 }
 async function ensure(refresh=false){
  await load();if(!cloudUser||fetched&&!refresh)return rows;
  if(pending)return pending;
  const who=account();fetched=true;pending=(async()=>{try{const data=await SourceWorkspace.request('catalog');if(who!==account())throw Error('账号已切换。');rows=data.map(SourceData.source);serviceError='';await LearningStore.write(who,key,rows);changed();return rows}catch(e){serviceError=e.message;throw e}finally{pending=null}})();return pending;
 }
 async function localMutation(action,args){
  const who=account();return LearningStore.atomic(who,[key,'sources:confirmations'],values=>{
   const catalog=(values.get(key)||[]).map(SourceData.source),receipts=values.get('sources:confirmations')||{};let result;
   if(action==='node'){
    const work=catalog.find(s=>s.id===args.workId&&!s.deleted);if(!work)throw Error('作品已不存在。');work.nodes||=[];
    const parent=args.parentId?work.nodes.find(n=>n.id===args.parentId):null;if(args.parentId&&(!parent||parent.parentId))throw Error('章节父级无效，最多两级。');
    const old=args.id?work.nodes.find(n=>n.id===args.id):work.nodes.find(n=>n.parentId===(args.parentId||null)&&n.kind===args.kind&&same(n.name,args.name));
    if(args.id&&(!old||old.revision!==args.expectedRevision))throw Error('章节已有更新，未覆盖。');
    if(old&&!args.id)result=old;
    else{if(work.nodes.some(n=>n!==old&&n.parentId===(args.parentId||null)&&n.kind===args.kind&&same(n.name,args.name)))throw Error('同级章节名称已存在。');const n=SourceData.node({id:old?.id||crypto.randomUUID(),workId:work.id,parentId:args.parentId||null,name:args.name,kind:args.kind,revision:(old?.revision||0)+1});if(old)Object.assign(old,n);else work.nodes.push(n);result=n}
   }else{
    const previous=action==='confirm'&&receipts[args.requestKey],existing=catalog.find(s=>s.id===(previous||args.existingId||args.id)&&!s.deleted);
    if(previous){if(!existing)throw Error('作品确认记录已有变化。');result=existing}
    else{
     if(action==='save'&&(!existing||existing.revision!==args.expectedRevision))throw Error('作品已有更新，未覆盖。');
     const input=SourceData.source({id:existing?.id||args.id||crypto.randomUUID(),name:args.existingId?existing.name:args.name,type:args.existingId?existing.type:args.type,aliases:[...new Set([...(args.existingId?existing.aliases:[]),...(args.aliases||[])])],revision:(existing?.revision||0)+1,nodes:existing?.nodes||[]});
     const names=[input.name,...input.aliases];if(catalog.some(s=>!s.deleted&&s.id!==input.id&&[s.name,...s.aliases].some(n=>names.some(v=>same(v,n)))))throw Error('名称或别名已被其他作品使用，请选择已有作品。');
     if(existing)Object.assign(existing,input);else catalog.push(input);if(action==='confirm')receipts[args.requestKey]=input.id;result=input;
    }
   }
   return {writes:[[key,catalog],['sources:confirmations',receipts]],result};
  });
 }
 async function mutate(action,args){
  const who=account();await load();const value=cloudUser?await SourceWorkspace.request(action,args):await localMutation(action,args);if(who!==account())throw Error('账号已切换，结果未采用。');
  if(action==='node'){const work=rows.find(s=>s.id===value.workId);if(work){work.nodes=[...(work.nodes||[]).filter(n=>n.id!==value.id),SourceData.node(value)]}}
  else{const src=SourceData.source(action==='save'&&!value.name?{...args,revision:value.revision,nodes:rows.find(s=>s.id===args.id)?.nodes||[]}:value.source||value);rows=[...rows.filter(s=>s.id!==src.id),src];await LearningStore.write(who,key,rows);changed();return src}
  await LearningStore.write(who,key,rows);changed();return value.source||value;
 }
 function resolve(scene){
  const match=SourceData.match(scene,live());if(match.candidates.length===1&&['identity','name','alias'].includes(match.method))return {work:match.candidates[0],method:match.method};
  const legacy=SourceData.legacy(scene.sourceTitle),h=SourceData.hint(legacy.name),known=live().filter(s=>[s.name,...s.aliases].some(n=>same(n,h?.name||legacy.name)));if(known.length===1)return {work:known[0],method:'alias'};
  const proposed=live().find(s=>s.id===scene.sourceSuggestion?.workId);
  if(proposed&&!scene.sourceRef&&(!scene.sourceTitle||match.candidates.length===0))return {work:proposed,method:'identity'};
  return {work:null,method:match.method};
 }
 function describe(scene){
  const {work}=resolve(scene),p=SourceData.proposal(scene),path=work&&scene.sourcePath&&scene.sourcePath.workId===work.id&&(!scene.chapter||scene.sourcePath.nodes.at(-1)?.name===scene.chapter)?scene.sourcePath:null,nodes=path?(path.nodes||[]).map(n=>(work.nodes||[]).find(v=>v.id===n.id)||n):[];
  return {work,key:work?'work:'+work.id:p?'proposal:'+p.key:'unknown',name:work?.name||p?.name||'未填写来源',nodes,locator:scene.timeRange||'',pending:!work&&Boolean(p)};
 }
 function prompt(scene){const {work}=resolve(scene),candidates=[...(work?[work]:[]),...live().filter(s=>s!==work)].slice(0,20),out=[];for(const s of candidates){const row={id:s.id,name:s.name,type:s.type,aliases:s.aliases.slice(0,8),nodes:(s.nodes||[]).slice(0,8).map(n=>({id:n.id,parentId:n.parentId,kind:n.kind,name:n.name}))};if(JSON.stringify([...out,row]).length>14000)break;out.push(row)}return out}
 async function nodeFor(work,parentId,input,signal){
  if(signal?.aborted)throw Error('来源处理已停止。');
  const found=(work.nodes||[]).find(n=>n.parentId===(parentId||null)&&n.kind===input.kind&&same(n.name,input.name));if(found)return found;
  return mutate('node',{workId:work.id,parentId:parentId||null,name:input.name,kind:input.kind});
 }
 async function enrich(result,before={},options={}){
  const who=account();try{await ensure()}catch{}
  if(who!==account()||options.signal?.aborted)throw Error('账号或分析任务已变化。');
  const protectedWork=before.sourceRef?resolve(before).work:before.sourceTitle?resolve({sourceTitle:before.sourceTitle}).work:null;
  const choice=protectedWork?{work:protectedWork,method:before.sourceRef?'identity':'name'}:before.sourceTitle?resolve({sourceTitle:before.sourceTitle}):resolve(result);
  if(!choice.work)return result;
  const work=choice.work,suggest=before.sourceSuggestion?.basis==='manual'?before.sourceSuggestion:result.sourceSuggestion;
  const patch={...result,sourceTitle:work.name,...(result.sourceTitle&&result.sourceTitle!==work.name?{sourceOriginal:result.sourceOriginal||result.sourceTitle}:{}),sourceRef:{id:work.id,name:work.name,method:choice.method==='alias'?'alias':choice.method==='name'?'name':'identity'}};
  if(suggest&&['manual','visible'].includes(suggest.basis)){
   const path=[];try{if(suggest.parent)path.push(await nodeFor(work,null,suggest.parent,options.signal));if(suggest.chapter)path.push(await nodeFor(work,path[0]?.id||null,suggest.chapter,options.signal));if(path.length){patch.sourcePath=SourceData.path({workId:work.id,nodes:path,basis:suggest.basis});patch.chapter=path.at(-1).name}}catch(e){if(who!==account()||options.signal?.aborted)throw e;patch.warnings=[...(patch.warnings||[]),'章节目录暂未保存，原来源线索保留。']}
  }
  return patch;
 }
 async function prepare(scene){await load();const {work,method}=resolve(scene);if(!work)return scene;return {...scene,sourceTitle:work.name,...(scene.sourceTitle!==work.name?{sourceOriginal:scene.sourceOriginal||scene.sourceTitle}:{}),sourceRef:{id:work.id,name:work.name,method:method==='alias'?'alias':method==='name'?'name':'identity'}}}
 async function completeSaved(scene){try{const who=account();if((await SceneAITasks.list()).some(j=>j.bound?.groupId===scene.groupId&&['running','queued'].includes(j.state)))return;const expected=SceneUI.supplementVersion(scene.groupId),result=await enrich(scene,scene);if(who!==account()||SceneUI.supplementVersion(scene.groupId)!==expected)return;const patch=Object.fromEntries(['sourceRef','sourcePath','sourceTitle','chapter','sourceOriginal'].filter(k=>Object.hasOwn(result,k)&&JSON.stringify(result[k])!==JSON.stringify(scene[k])).map(k=>[k,result[k]]));if(Object.keys(patch).length)SceneUI.applySupplement([{id:scene.groupId,expected,patch}],who)}catch{}}
 function proposals(groups=SceneUI.sceneGroups()){
  const out=new Map();for(const group of groups){if(resolve(group.scene).work)continue;const p=SourceData.proposal(group.scene);if(!p)continue;const row=out.get(p.key)||{...p,groups:[]};row.groups.push(group);out.set(p.key,row)}return [...out.values()];
 }
 async function applyGroups(groups,work){
  const who=account(),snapshots=groups.map(g=>({id:g.scene.groupId,scene:structuredClone(g.scene),expected:SceneUI.supplementVersion(g.scene.groupId)})),changes=[];let skipped=0;
  for(const row of snapshots){
   const moving=row.scene.sourceRef&&row.scene.sourceRef.id!==work.id,legacy=SourceData.legacy(row.scene.sourceTitle),oldChapter=row.scene.chapter||legacy.chapter;
   const oldHint=!row.scene.sourceSuggestion&&oldChapter&&oldChapter.length<=200?{workId:work.id,parent:null,chapter:{name:oldChapter,kind:work.type==='game'?'quest':work.type==='animation'?'episode':'chapter'},basis:'manual'}:row.scene.sourceSuggestion;
   const combined={...row.scene,sourceRef:{id:work.id,name:work.name,method:'manual'},sourceTitle:work.name,sourcePath:null,sourceSuggestion:moving?null:oldHint};
   const filled=await enrich(combined,combined);if(who!==account())throw Error('账号已切换。');
   if(SceneUI.supplementVersion(row.id)!==row.expected){skipped++;continue}
   changes.push({id:row.id,expected:row.expected,patch:{sourceRef:filled.sourceRef,sourcePath:filled.sourcePath||null,sourceSuggestion:moving?null:filled.sourceSuggestion||null,sourceTitle:work.name,sourceOriginal:row.scene.sourceOriginal||row.scene.sourceTitle,chapter:filled.chapter||row.scene.chapter},before:row.scene});
  }
  const undo=[];for(let i=0;i<changes.length;i+=20){const batch=changes.slice(i,i+20);SceneUI.applySupplement(batch,who);for(const row of batch)undo.push({id:row.id,expected:SceneUI.supplementVersion(row.id),patch:{sourceRef:row.before.sourceRef||null,sourcePath:row.before.sourcePath||null,sourceSuggestion:row.before.sourceSuggestion||null,sourceTitle:row.before.sourceTitle,chapter:row.before.chapter,sourceOriginal:row.before.sourceOriginal||''}})}
  if(undo.length)notify('已整理 '+undo.length+' 个场景'+(skipped?'；'+skipped+' 个有后续修改，已跳过。':'。'),'good','来源',true,{label:'撤销',run:()=>{try{if(who!==account()||undo.some(v=>SceneUI.supplementVersion(v.id)!==v.expected))throw Error('场景或账号已有变化，未覆盖后续修改。');for(let i=0;i<undo.length;i+=20)SceneUI.applySupplement(undo.slice(i,i+20),who,{undo:true})}catch(e){notify(e.message,'warn','未撤销')}}});return {saved:undo.length,skipped};
 }
 function attachEditor(layer,options){
  const form=layer.querySelector('form'),input=form.elements.sourceTitle,chapter=form.elements.chapter;if(!input||!chapter)return;
  layer.querySelector('#scene-source-recent')?.closest('label')?.remove();
  const field=input.closest('label'),caption=field.querySelector(':scope>span');caption.textContent='作品／来源';const button=document.createElement('button');button.type='button';button.className='icon-btn scene-ai-field-command';button.setAttribute('aria-label','管理作品与别名');button.dataset.tip='管理作品与别名';button.innerHTML=icon('settings-2');caption.append(button);button.onclick=()=>open();
  const parentField=document.createElement('label');parentField.className='scene-field';parentField.innerHTML='<span>季／卷／任务线（可选）</span><input name="sourceParent" maxlength="200" autocomplete="off">';chapter.closest('label').before(parentField);const parent=form.elements.sourceParent;
  parent.value=options.read().sourcePath?.nodes.length===2?options.read().sourcePath.nodes[0].name:options.read().sourceSuggestion?.parent?.name||'';
  const lists=[];for(const [control,suffix] of [[input,'work'],[parent,'parent'],[chapter,'chapter']]){const list=document.createElement('datalist');list.id='source-options-'+suffix+'-'+crypto.randomUUID();control.setAttribute('list',list.id);control.after(list);lists.push(list)}
  function renderOptions(){if(!layer.isConnected)return;lists[0].innerHTML=live().map(s=>'<option value="'+esc(s.name)+'" label="'+esc(s.aliases.join(' / '))+'"></option>').join('');const work=resolve({sourceTitle:input.value}).work;lists[1].innerHTML=(work?.nodes||[]).filter(n=>!n.parentId).map(n=>'<option value="'+esc(n.name)+'"></option>').join('');const p=(work?.nodes||[]).find(n=>!n.parentId&&same(n.name,parent.value));lists[2].innerHTML=(work?.nodes||[]).filter(n=>n.parentId===(p?.id||null)).map(n=>'<option value="'+esc(n.name)+'"></option>').join('')}
  const edited=()=>{
   const work=resolve({sourceTitle:input.value}).work,kind=work?.type==='game'?['arc','quest']:work?.type==='animation'?['season','episode']:work?.type==='book'?['volume','chapter']:['part','section'];
   options.set({sourceRef:work?{id:work.id,name:work.name,method:'manual'}:null,sourcePath:null,sourceSuggestion:{workId:work?.id||null,basis:'manual',parent:parent.value.trim()?{name:parent.value.trim(),kind:kind[0]}:null,chapter:chapter.value.trim()?{name:chapter.value.trim(),kind:kind[1]}:null}});renderOptions();
  };
  for(const control of [input,parent,chapter])control.addEventListener('input',event=>{if(event.isTrusted)edited()});for(const control of [input,parent,chapter])control.addEventListener('change',edited);
  load().then(renderOptions).catch(()=>{});ensure().then(renderOptions).catch(()=>{});return {refresh:renderOptions};
 }
 async function analyzeMissing(groups,status){
  if(batchRunning)return status('来源分析正在后台进行，请在分析记录查看。');
  const who=account(),batchKey='sources:analysis-batch',previous=await LearningStore.read(who,batchKey),jobs=await SceneAITasks.list();
  const finished=new Set([...(previous?.done||[]),...jobs.filter(j=>j.options?.only==='source'&&j.result).map(j=>j.bound?.groupId)]);
  const underway=new Set(jobs.filter(j=>['queued','running'].includes(j.state)).map(j=>j.bound?.groupId));
  const chosen=groups.filter(g=>!g.scene.sourceRef&&!g.scene.sourceTitle&&g.scene.media.length&&!finished.has(g.scene.groupId)&&!underway.has(g.scene.groupId)).slice(0,20);
  if(!chosen.length)return status('没有需要重新生成的来源。已有线索可直接确认，成功结果保留在分析记录。');
  const profile=await SceneAI.chooseProfile();if(!profile||who!==account())return;
  if(!await askConfirm('使用 '+profile.name+' 分析 '+chosen.length+' 个场景的来源；刷新后不会自动重发，成功项不重复生成。','补全来源'))return;
  const execute=async lock=>{
   if(!lock)return status('另一标签页正在分析来源。');
   batchRunning=true;
   const batch={owner:who,remaining:chosen.map(g=>g.scene.groupId),done:[...finished],failed:[],jobs:{...(previous?.jobs||{})}};
   try{await LearningStore.write(who,batchKey,batch);
    for(const group of chosen){if(who!==account())break;
     try{const scene=SceneUI.sceneGroups().find(g=>g.scene.groupId===group.scene.groupId)?.scene;if(!scene)continue;
      const prior=(await SceneAITasks.list()).find(j=>j.id===batch.jobs[scene.groupId]);
      if(prior?.result||prior&&['queued','running'].includes(prior.state))continue;
      const job=await SceneAITasks.create(profile,scene,{only:'source',useImage:true});
      batch.jobs[scene.groupId]=job.id;await LearningStore.write(who,batchKey,batch);
      await SceneAITasks.bind(job.id,scene,SceneUI.supplementVersion(scene.groupId));await SceneAITasks.execute(job,profile);batch.done.push(scene.groupId);
     }catch(e){batch.failed.push({id:group.scene.groupId,error:e.message});if(/HTTP\\s*(401|403|429)/.test(e.message))break}
     finally{batch.remaining=batch.remaining.filter(id=>id!==group.scene.groupId);await LearningStore.write(who,batchKey,batch);status('本批已处理 '+(chosen.length-batch.remaining.length)+' / '+chosen.length)}
    }
    status('本批完成，失败 '+batch.failed.length+' 个；成功结果保留，未完成项可再次点补全来源。');
   }finally{batchRunning=false}
  };
  return navigator.locks?navigator.locks.request('source-analysis:'+who,{ifAvailable:true},execute):execute(true);
 }
 async function open(initial='',restored=null){
  await load();const initialScene=SceneUI.sceneGroups().find(g=>g.scene.groupId===initial)?.scene;if(initialScene)initial=resolve(initialScene).work?.id||SourceData.proposal(initialScene)?.key||'';const who=account(),node=AnkiBridge.dialog('作品与来源'),body=node.querySelector('.scene-dialog-body');node.classList.add('source-directory');let active=initial,busy=false,baseline='',draftRevision=serial;
  const snapshot=()=>{const detail=body.querySelector('[data-dir-detail]');return {active,fields:[...(detail?.querySelectorAll('input,textarea,select')||[])].map(n=>({key:n.getAttribute('data-node-name')||[...n.attributes].find(a=>a.name.startsWith('data-dir-'))?.name,value:n.value}))}},dirty=()=>baseline&&JSON.stringify(snapshot())!==baseline;
  const navigate=async next=>{if(dirty()&&!await UIOverlays.confirmDiscard('当前作品有未保存修改，是否放弃后切换？'))return;active=next;detail()};
  const valid=()=>node.open&&who===account(),status=t=>{if(valid())node.querySelector(':scope>.scene-dialog-status').textContent=t};
  body.innerHTML='<div class="directory-tools"><label class="scene-field"><span>搜索作品或别名</span><input data-dir-search type="search"></label><button class="icon-btn" data-dir-refresh aria-label="刷新来源目录" data-tip="刷新">'+icon('refresh-cw')+'</button><button class="plain-btn" data-dir-new>'+icon('plus')+'添加作品</button></div><div class="directory-layout"><nav data-dir-list aria-label="作品目录"></nav><section data-dir-detail></section></div><footer><button class="plain-btn" data-dir-organize>整理已有来源</button><button class="plain-btn" data-dir-analyze>'+icon('sparkles')+'补全缺失来源</button></footer>';
  const run=async callback=>{if(busy)return;busy=true;try{await callback()}catch(e){status(e.message)}finally{busy=false;if(valid())render()}};
  function render(){
   if(!valid())return;const pendingRows=proposals(),q=SourceData.normalize(body.querySelector('[data-dir-search]').value),works=live().filter(s=>[s.name,...s.aliases].some(n=>SourceData.normalize(n).includes(q)));
   const list=body.querySelector('[data-dir-list]');list.innerHTML=(pendingRows.length?'<h3>新作品 · '+pendingRows.length+'</h3>':'')+pendingRows.filter(p=>SourceData.normalize(p.name).includes(q)).map(p=>'<button class="directory-row" data-dir-proposal="'+esc(p.key)+'"><strong>'+esc(p.name)+'</strong><small>'+p.groups.length+' 个场景 · 确认一次即可复用</small></button>').join('')+'<h3>已有作品 · '+works.length+'</h3>'+works.map(s=>'<button class="directory-row" data-dir-id="'+esc(s.id)+'"><strong>'+esc(s.name)+'</strong><small>'+SceneUI.sceneGroups().filter(g=>resolve(g.scene).work?.id===s.id).length+' 个场景 · '+esc(s.aliases.join(' / '))+'</small></button>').join('');
   list.querySelectorAll('[data-dir-proposal]').forEach(b=>b.onclick=()=>{navigate(b.dataset.dirProposal)});list.querySelectorAll('[data-dir-id]').forEach(b=>b.onclick=()=>{navigate(b.dataset.dirId)});
   if(!active)active=pendingRows[0]?.key||works[0]?.id||'new';detail();
  }
  function detail(){
   if(!valid())return;const proposal=proposals().find(p=>p.key===active),work=live().find(s=>s.id===active),isNew=!work,detail=body.querySelector('[data-dir-detail]');
   const aliases=[...new Set([...(work?.aliases||proposal?.aliases||[]),...(proposal?.groups.map(g=>SourceData.legacy(g.scene.sourceTitle).name)||[])])].filter(n=>!same(n,work?.name||proposal?.name||''));
   detail.innerHTML='<h3>'+esc(work?'作品设置':proposal?'确认新作品':'添加作品')+'</h3>'+(proposal?'<p>'+proposal.groups.length+' 个场景已保存；确认一次后统一关联。</p>':'')+(isNew?'<label class="scene-field"><span>复用已有作品</span><select data-dir-existing><option value="">建立新作品</option>'+live().map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label>':'')+'<label class="scene-field"><span>规范名称</span><input data-dir-name maxlength="200" value="'+esc(work?.name||proposal?.name||'')+'"></label><label class="scene-field"><span>类型</span><select data-dir-type><option value="game">游戏</option><option value="animation">动画</option><option value="book">书籍</option><option value="video">视频／影视</option><option value="other">其他</option></select></label><label class="scene-field"><span>别名 · 每行一个</span><textarea class="content-editor" rows="3" data-dir-alias maxlength="6030">'+esc(aliases.join('\n'))+'</textarea></label><div class="directory-actions"><button type="button" class="plain-btn primary-btn" data-dir-save>'+icon('check')+'保存作品</button></div>'+(work?'<h3>章节目录</h3><div data-dir-nodes></div><label class="scene-field"><span>将本作品场景改归到</span><select data-dir-move><option value="">选择其他作品</option>'+live().filter(s=>s.id!==work.id).map(s=>'<option value="'+s.id+'">'+esc(s.name)+'</option>').join('')+'</select></label><button class="plain-btn" data-dir-move-run>修改场景归属</button>':'');
   detail.querySelector('[data-dir-type]').value=work?.type||proposal?.type||'other';SharedUI.enhanceSelects(detail);
   detail.querySelector('[data-dir-save]').onclick=()=>run(async()=>{
    const name=detail.querySelector('[data-dir-name]').value.trim(),type=detail.querySelector('[data-dir-type]').value,accepted=detail.querySelector('[data-dir-alias]').value.split('\n').map(s=>s.trim()).filter(Boolean),existingId=detail.querySelector('[data-dir-existing]')?.value;
    if(!name&&!existingId)throw Error('请填写规范名称。');
    const saved=await mutate(isNew?'confirm':'save',isNew?{requestKey:proposal?.key||'manual:'+SourceData.normalize(name),name,type,aliases:accepted,existingId:existingId||undefined}:{id:work.id,name,type,aliases:[...new Set([...accepted,...(!same(name,work.name)?[work.name]:[])])],expectedRevision:work.revision});
    if(!valid())return;active=saved.id;if(proposal)await applyGroups(proposal.groups,saved);status('作品已保存；以后自动复用此身份。');
    if(work){const before=structuredClone(work);notify('作品已更新。','good','来源',true,{label:'撤销',run:async()=>{try{await mutate('save',{id:saved.id,name:before.name,type:before.type,aliases:before.aliases,expectedRevision:saved.revision})}catch(e){notify(e.message,'warn','未撤销')}}})}
   });
   if(work){
    const nodes=detail.querySelector('[data-dir-nodes]');nodes.innerHTML=(work.nodes||[]).map(n=>'<label class="directory-node '+(n.parentId?'directory-child':'')+'"><span>'+esc(({season:'季',volume:'卷',arc:'任务线',part:'部分',episode:'集',chapter:'章',quest:'任务',section:'节'})[n.kind]||n.kind)+'</span><input value="'+esc(n.name)+'" maxlength="200" data-node-name="'+n.id+'"><button class="icon-btn" data-node-save="'+n.id+'" aria-label="保存章节名称" data-tip="保存名称">'+icon('check')+'</button></label>').join('')||'<p>识别或填写明确章节后自动收录。</p>';
    nodes.querySelectorAll('[data-node-save]').forEach(button=>button.onclick=()=>run(()=>{const n=work.nodes.find(n=>n.id===button.dataset.nodeSave);return mutate('node',{...n,name:nodes.querySelector('[data-node-name="'+n.id+'"]').value,expectedRevision:n.revision})}));
    detail.querySelector('[data-dir-move-run]').onclick=()=>run(async()=>{const target=live().find(s=>s.id===detail.querySelector('[data-dir-move]').value);if(!target)return;const groups=SceneUI.sceneGroups().filter(g=>resolve(g.scene).work?.id===work.id);if(!await askConfirm('将 '+groups.length+' 个场景改归到「'+target.name+'」？正文、素材和收藏夹保留。','修改来源归属'))return;await applyGroups(groups,target)});
   }
   baseline=JSON.stringify(snapshot());draftRevision=serial;
  }
  const classify=document.createElement('button');classify.className='plain-btn';classify.type='button';classify.textContent='个人分类';classify.onclick=async()=>{if(dirty()&&!await UIOverlays.confirmDiscard('当前作品有未保存修改，是否放弃后打开个人分类？'))return;node.close();SourceWorkspace.classify()};body.querySelector('footer').prepend(classify);
  body.querySelector('[data-dir-search]').oninput=()=>{if(!dirty())render()};body.querySelector('[data-dir-new]').onclick=()=>navigate('new');body.querySelector('[data-dir-refresh]').onclick=()=>run(async()=>{await ensure(true);status('来源目录已刷新。')});
  body.querySelector('[data-dir-organize]').onclick=()=>run(async()=>{const groups=SceneUI.sceneGroups(),works=live();let count=0;for(const work of works){const matching=groups.filter(g=>resolve(g.scene).work?.id===work.id&&(!g.scene.sourceRef||g.scene.sourceTitle!==work.name));if(matching.length)count+=(await applyGroups(matching,work)).saved}status('已整理 '+count+' 个场景；新作品在上方集中确认，无需逐张操作。')});
  body.querySelector('[data-dir-analyze]').onclick=()=>run(()=>analyzeMissing(SceneUI.sceneGroups(),status));render();ensure().then(()=>{if(valid()){if(!dirty())render();status('同一作品只需确认一次，截图保存不受影响。')}}).catch(e=>status(e.message+' 已有场景仍可保存。'));
  if(restored?.fields){active=restored.active;detail();for(const field of restored.fields){const control=[...body.querySelector('[data-dir-detail]').querySelectorAll('input,textarea,select')].find(n=>(n.getAttribute('data-node-name')||[...n.attributes].find(a=>a.name.startsWith('data-dir-'))?.name)===field.key);if(control)control.value=field.value}}
  UIOverlays.guardDialog(node,{getState:()=>dirty()?snapshot():null,initialState:null,restore:saved=>open(saved.active,saved),canRestore:()=>who===account()&&draftRevision===serial});
  const guardedClose=node.requestClose;node.requestClose=()=>busy?status('正在保存，请稍后关闭。'):guardedClose();
  const auth=()=>{if(who!==account())node.close()};document.addEventListener('lexi-auth-context',auth);node.addEventListener('close',()=>document.removeEventListener('lexi-auth-context',auth),{once:true});return node;
 }
 document.addEventListener('lexi-auth-context',()=>{owner='';rows=[];loaded=false;fetched=false;pending=null;changed()});
 root.SourceDirectory={load,ensure,resolve,describe,prompt,enrich,prepare,completeSaved,proposals,applyGroups,mutate,attachEditor,open,get revision(){return serial},get sources(){return live()},get error(){return serviceError}};
 load().then(()=>{if(activeView==='scenes')ensure().catch(()=>{})}).catch(()=>{});
})(globalThis);
