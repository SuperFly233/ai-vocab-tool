(function(root){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function waitDevice(node,id){
  for(let n=0;n<60;n++){
   if(!node.isConnected||document.hidden)throw new Error('窗口已关闭或不可见，已暂停检查；设备请求仍可完成。');
   const data=await AnkiBridge.request('device_status',{requestId:id});
   if(data.status==='error')throw new Error(data.error||'设备执行失败。');
   if(data.status==='complete')return data.result;
   node.querySelector('[role=status]').textContent=data.status==='working'?'电脑正在处理所选请求…':'等待接收电脑上线…';
   await new Promise(resolve=>setTimeout(resolve,2000));
  }
  throw new Error('电脑暂未完成请求。可继续检查，不会重复发送。');
 }
 async function command(node,args,onResult){
  const request=await AnkiBridge.request('device_request',args);
  async function resume(){try{const result=await waitDevice(node,request.id);if(node.isConnected){node.querySelector('[role=status]').textContent='';await onResult(result,request.id)}}catch(e){if(!node.isConnected)return;node.querySelector('[role=status]').textContent=e.message;let button=node.querySelector('[data-resume-device]');if(!button){button=document.createElement('button');button.className='plain-btn';button.dataset.resumeDevice='';button.textContent='继续检查';node.querySelector('.scene-dialog-body').append(button)}button.onclick=async()=>{button.remove();await resume()}}}
  await resume();
 }
 const scopeNames={favorites:'收藏句',staged:'当前视频暂存',pending:'制卡队列摘要'},sessionMemory=new Map();
 const uuid=value=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value||'');
 function sessionKey(account){return 'lexi-fushi-session-v1:'+account}
 function readSession(account){
  let raw=sessionMemory.get(account);try{raw=JSON.parse(sessionStorage.getItem(sessionKey(account))||'null')||raw}catch{}
  const value=raw?.version===1?raw:{};
  return {version:1,deviceId:uuid(value.deviceId)?value.deviceId:'',scope:scopeNames[value.scope]?value.scope:'favorites',limit:[1,5,10,20].includes(value.limit)?value.limit:5,query:typeof value.query==='string'?value.query.slice(0,2000):'',
   selected:Array.isArray(value.selected)?value.selected.filter(id=>typeof id==='string'&&id.length<=160).slice(0,20):[],
   requests:Array.isArray(value.requests)?value.requests.filter(row=>uuid(row.clientRequestId)&&uuid(row.deviceId)&&scopeNames[row.scope]&&[1,5,10,20].includes(row.limit)&&(!row.requestId||uuid(row.requestId))).slice(-24):[]};
 }
 function writeSession(account,value){sessionMemory.set(account,structuredClone(value));try{sessionStorage.setItem(sessionKey(account),JSON.stringify(value));return true}catch{return false}}
 async function open(draft=null){
  const account=cloudUser?.id;if(!account)return notify('请先登录 Lexi。','warn','Fushi');
  const session=readSession(account),rows=new Map((draft?.rows||[]).map(row=>[row.id,row]));
  if(draft?.rows){session.selected=draft.ids||draft.rows.map(row=>row.id);session.deviceId=draft.rows[0]?.deviceId||session.deviceId}
  const chosen=new Set(session.selected),node=AnkiBridge.dialog('从 Fushi 选取场景',{closeHint:false}),body=node.querySelector('.scene-dialog-body');
  node.classList.add('fushi-source-dialog');
  let activeId='',phase='choose',receipts=[],sequence=0,controller=null,timer=null,pending=false,storageWarning=false,selectionRevision=0,leaving=false,importUndo=null,closedSession=null;
  const alive=()=>node.isConnected&&cloudUser?.id===account;
  function persist(){if(cloudUser?.id!==account)return;session.selected=[...chosen];if(!writeSession(account,session)&&!storageWarning){storageWarning=true;setStatus('会话存储不可用；当前选择仍可使用，但刷新后无法恢复。')}}
  function setStatus(text){if(node.isConnected)node.querySelector('.scene-dialog-status').textContent=text}
  function stop(){sequence++;controller?.abort();controller=null;clearTimeout(timer);timer=null;pending=false}
  function selectedRows(){return [...chosen].map(id=>rows.get(id)).filter(Boolean)}
  function selectionDraft(){return {ids:[...chosen],rows:selectedRows(),session:structuredClone(session)}}
  function currentRequest(){return session.requests.findLast(row=>row.deviceId===session.deviceId&&row.scope===session.scope&&row.limit===session.limit)}
  function stamp(value){const date=new Date(value==null?'':value);return Number.isFinite(date.getTime())?formatHistoryTime(date.toISOString()):'未知'}
  try{
   const devices=await AnkiBridge.request('devices');if(!alive())return node.close();
   if(!devices.length){body.innerHTML='<p>尚未登记接收电脑，请在设置中连接学习伴侣。</p>';return}
   if(!devices.some(row=>row.id===session.deviceId))session.deviceId=devices[0].id;
   body.innerHTML='<div class="fushi-read-controls"><label class="scene-field"><span>接收电脑</span><select name="device"></select></label><label class="scene-field"><span>读取范围</span><select name="scope"></select></label><label class="scene-field"><span>数量上限</span><select name="limit"><option>1</option><option>5</option><option>10</option><option>20</option></select></label><button class="plain-btn" data-read-fushi></button></div><p class="fushi-read-state" data-read-state role="status"></p><label class="history-search search-field"><span>'+icon('search')+'</span><input type="search" aria-label="搜索 Fushi 来源" placeholder="搜索原句、来源或章节" autocomplete="off"></label><div class="fushi-source-workbench"><div class="fushi-source-list"></div><section class="fushi-source-preview" aria-label="来源预览"></section></div><section class="fushi-selection" aria-label="待导入选取篮"><header><strong data-basket-count></strong><button class="icon-btn" data-clear-fushi aria-label="清空待导入" data-tip="清空待导入">'+icon('x')+'</button></header><div data-fushi-basket></div></section><section class="fushi-import-plan" hidden></section>';
   const footer=document.createElement('footer');footer.innerHTML='<span data-fushi-count></span><button class="plain-btn primary-btn" data-import-fushi disabled></button>';node.insertBefore(footer,node.querySelector('.scene-dialog-status'));
   const list=body.querySelector('.fushi-source-list'),preview=body.querySelector('.fushi-source-preview'),search=body.querySelector('input'),button=footer.querySelector('[data-import-fushi]'),readButton=body.querySelector('[data-read-fushi]'),deviceSelect=body.querySelector('[name=device]'),scopeSelect=body.querySelector('[name=scope]'),limitSelect=body.querySelector('[name=limit]'),planHost=body.querySelector('.fushi-import-plan');
   deviceSelect.innerHTML=devices.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.name)+'</option>').join('');scopeSelect.innerHTML=Object.entries(scopeNames).map(([key,value])=>'<option value="'+key+'">'+value+'</option>').join('');
   deviceSelect.value=session.deviceId;scopeSelect.value=session.scope;limitSelect.value=String(session.limit);search.value=session.query;
   function show(row,mobile=false){
    activeId=row?.id||'';preview.replaceChildren();node.classList.toggle('fushi-preview-open',Boolean(mobile&&row));
    if(!row){preview.innerHTML='<p class="muted">选择一条来源查看原句。</p>';return}
    const back=document.createElement('button');back.className='plain-btn fushi-preview-back';back.innerHTML=icon('arrow-left')+'返回来源';back.onclick=()=>node.classList.remove('fushi-preview-open');
    const heading=document.createElement('h3'),quote=document.createElement('blockquote'),details=document.createElement('dl');
    heading.textContent=row.title||'原句';quote.textContent=row.quote||'此项目仅提供摘要，缺少原句，不能导入。';
    for(const [label,value] of [['来源',row.sourceTitle||'未填写来源'],['章节',row.chapter||'未填写'],['原来源时间',stamp(row.createdAt)],['读取时间',stamp(row.capturedAt)],['范围',scopeNames[row.scope]||'未知'],['原队列',row.queued?'已在 Fushi 制卡流程中':'收藏句，不消费原记录']]){
     const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;details.append(dt,dd);
    }
    const boundary=document.createElement('p');boundary.className='scene-source-line';boundary.textContent='素材可在导入后补充；不会自动读取原媒体。';preview.append(back,heading,quote,details,boundary);
   }
   function changed(){selectionRevision++;phase='choose';persist();render()}
   function render(){
    if(!alive())return;
    const query=normalizeSearch(search.value),filtered=[...rows.values()].filter(row=>row.deviceId===session.deviceId&&row.scope===session.scope&&normalizeSearch(row.title+' '+row.quote+' '+row.sourceTitle+' '+row.chapter).includes(query));
    list.innerHTML=filtered.map(row=>'<div class="fushi-source-row"><label><input type="checkbox" data-fushi-source="'+esc(row.id)+'" '+(chosen.has(row.id)?'checked':'')+' '+(row.quote?.trim()?'':'disabled')+'><span><strong>'+esc(row.title||row.quote||'词组摘要')+'</strong><span>'+esc(row.quote)+'</span><small>'+esc(row.sourceTitle)+(row.queued?' · 已在 Fushi 制卡流程中':'')+(!row.quote?.trim()?' · 缺少原句':'')+'</small></span></label><button class="icon-btn" data-preview-fushi="'+esc(row.id)+'" aria-label="预览来源" data-tip="预览来源">'+icon('scan-eye')+'</button></div>').join('')||'<p class="muted">当前范围没有可显示的来源。</p>';
    list.querySelectorAll('[data-fushi-source]').forEach(box=>box.onchange=()=>{if(box.checked&&chosen.size>=20){box.checked=false;setStatus('每次最多选取 20 条。');return}box.checked?chosen.add(box.dataset.fushiSource):chosen.delete(box.dataset.fushiSource);show(rows.get(box.dataset.fushiSource));changed()});
    list.querySelectorAll('[data-preview-fushi]').forEach(b=>b.onclick=()=>show(rows.get(b.dataset.previewFushi),true));
    body.querySelector('[data-basket-count]').textContent='待导入 '+chosen.size+' 条';
    body.querySelector('[data-fushi-basket]').innerHTML=[...chosen].map(id=>'<button class="plain-btn" data-remove-selected="'+esc(id)+'" aria-label="移除所选来源"><span>'+esc(rows.get(id)?.title||rows.get(id)?.quote||'等待恢复来源')+'</span>'+icon('x')+'</button>').join('')||'<span class="muted">尚未选择来源</span>';
    body.querySelectorAll('[data-remove-selected]').forEach(b=>b.onclick=()=>{chosen.delete(b.dataset.removeSelected);changed()});body.querySelector('[data-clear-fushi]').disabled=!chosen.size;
    const request=currentRequest(),outstanding=request&&!['complete','error'].includes(request.status);
    readButton.innerHTML=icon(outstanding?'refresh-cw':'download')+(outstanding?'继续检查':'读取范围');readButton.disabled=pending||phase!=='choose';
    body.querySelector('[data-read-state]').textContent=request?({complete:'读取完成',error:'读取失败',working:'电脑正在读取',waiting:'等待电脑上线',submitting:'等待确认提交结果'})[request.status]||'请求待检查':pending?'等待确认读取范围…':'尚未读取来源';
    footer.querySelector('[data-fushi-count]').textContent=phase==='receipt'?'本次导入回执':phase==='review'?'核对后再保存':'已选 '+chosen.size+' 条';
    button.innerHTML=icon(phase==='receipt'?'arrow-left':'file-up')+(phase==='receipt'?'继续选取':phase==='review'?'确认导入':'核对并导入');
    button.disabled=pending||(phase!=='receipt'&&(!chosen.size||selectedRows().length!==chosen.size));
    planHost.hidden=phase==='choose';body.classList.toggle('fushi-plan-active',phase!=='choose');
    if(phase==='review'){
     const plan=SceneUI.planFushi(selectedRows(),account),labels={new:'将新增',existing:'已存在',deleted:'已删除，不恢复',invalid:'缺少完整原句或格式无效'};
     planHost.innerHTML='<h3>导入前核对</h3><p>新增 '+plan.filter(row=>row.status==='new').length+' · 已有 '+plan.filter(row=>row.status==='existing').length+' · 已删除 '+plan.filter(row=>row.status==='deleted').length+'</p>'+plan.map(row=>'<section><strong>'+esc(row.title)+'</strong><span>'+labels[row.status]+'</span></section>').join('');button.disabled=plan.some(row=>row.status==='invalid');
    }else if(phase==='receipt'){
     planHost.innerHTML='<h3>导入结果</h3>'+receipts.map(row=>'<section><strong>'+esc(row.title)+'</strong><span>'+({new:'已新增',existing:'已有，未覆盖',deleted:'已删除，未恢复'})[row.status]+'</span>'+(row.status==='deleted'?'':'<div class="fushi-receipt-actions"><button class="plain-btn" data-open-import="'+esc(row.id)+'">打开场景</button><button class="icon-btn" data-edit-import="'+esc(row.id)+'" aria-label="补充译文与素材" data-tip="补充译文与素材">'+icon('image-plus')+'</button><button class="icon-btn" data-associate-import="'+esc(row.id)+'" aria-label="关联已有词条" data-tip="关联已有词条">'+icon('list-plus')+'</button><button class="icon-btn" data-review-import="'+esc(row.id)+'" aria-label="回顾场景" data-tip="回顾场景">'+icon('play')+'</button></div>')+'</section>').join('');
     for(const kind of ['open','edit','associate','review'])planHost.querySelectorAll('[data-'+kind+'-import]').forEach(b=>b.onclick=()=>openImported(b.dataset[kind+'Import'],kind));
     if(importUndo){const undo=document.createElement('button');undo.className='plain-btn';undo.textContent='撤销本批导入';undo.onclick=()=>{const run=importUndo;importUndo=null;run();phase='choose';render()};planHost.prepend(undo)}
    }
   }
   function openImported(id,kind){
    if(!SceneUI.sceneGroups().some(group=>group.scene.groupId===id)){setStatus('场景已更新或删除，请重新查看。');return}
    leaving=true;node.close();showView('scenes',null,{focus:false});SceneWorkspace.select(id);
    if(kind==='edit')SceneUI.open('library','',id);else if(kind==='associate')SceneStudy.openPicker(id);else if(kind==='review')SceneWorkspace.startReview([id]);
   }
   function applyResult(record,data){
    if(data.device_id&&data.device_id!==record.deviceId)throw Error('返回设备与原请求不一致。');
    if(data.payload&&(data.payload.scope!==record.scope||data.payload.limit!==record.limit))throw Error('返回范围与原请求不一致。');
    record.status=data.status;
    if(data.status==='error')throw Error(data.error||'设备读取失败。');
    if(data.status==='complete'){
     for(const raw of data.result?.items||[]){
      if(typeof raw.id!=='string'||!/^[a-f0-9]{64}$/.test(raw.key))throw Error('来源身份无效，未导入。');
      rows.set(raw.id,{...raw,deviceId:record.deviceId,scope:record.scope,requestId:record.requestId,capturedAt:data.updated_at||record.capturedAt});
     }
    }
   }
   async function inspect(record,{submit=false}={}){
    stop();const run=sequence;controller=new AbortController();pending=true;render();setStatus('');
    try{
     if(submit&&!record.requestId){
      const value=await AnkiBridge.request('device_request',{deviceId:record.deviceId,kind:'fushi_read',scope:record.scope,limit:record.limit,confirmed:true,clientRequestId:record.clientRequestId},{signal:controller.signal});
      if(!alive()||run!==sequence)return;record.requestId=value.id;record.status=value.status||'waiting';persist();
     }
     if(!record.requestId){setStatus('提交结果未确认，请继续检查同一次请求。');return}
     for(let attempt=0;attempt<60;attempt++){
      if(!alive()||run!==sequence||document.hidden)return;
      const value=await AnkiBridge.request('device_status',{requestId:record.requestId},{signal:controller.signal});
      if(!alive()||run!==sequence)return;applyResult(record,value);persist();render();
      if(value.status==='complete'){show(rows.get(activeId)||[...rows.values()].find(row=>row.deviceId===session.deviceId&&row.scope===session.scope));return}
      await new Promise(resolve=>{timer=setTimeout(resolve,2000);controller.signal.addEventListener('abort',resolve,{once:true})});
     }
     setStatus('电脑暂未完成读取。继续检查会复用原请求，不会重复排队。');
    }catch(error){if(alive()&&run===sequence&&error.name!=='AbortError')setStatus(error.message)}
    finally{if(run===sequence&&alive()){pending=false;persist();render()}}
   }
   async function recover(){
    stop();const run=sequence;
    for(const record of session.requests.filter(row=>row.deviceId===session.deviceId&&row.requestId)){
     if(!alive()||document.hidden||run!==sequence)return;
     if(record.status==='complete'){
      controller=new AbortController();
      try{const value=await AnkiBridge.request('device_status',{requestId:record.requestId},{signal:controller.signal});if(!alive()||run!==sequence)return;applyResult(record,value)}catch(error){if(alive()&&run===sequence)setStatus(error.message)}
     }
    }
    if(!alive()||run!==sequence)return;render();show(rows.get(activeId)||[...rows.values()].find(row=>row.deviceId===session.deviceId&&row.scope===session.scope));
    const record=currentRequest();if(record&&!['complete','error'].includes(record.status)&&record.requestId)await inspect(record);
   }
   search.oninput=event=>{if(event.isComposing)return;session.query=search.value;persist();render()};search.oncompositionend=()=>{session.query=search.value;persist();render()};
   scopeSelect.onchange=()=>{stop();session.scope=scopeSelect.value;phase='choose';persist();render();recover()};limitSelect.onchange=()=>{stop();session.limit=Number(limitSelect.value);persist();render();recover()};
   deviceSelect.onchange=async()=>{
    const next=deviceSelect.value,previous=session.deviceId;stop();
    if(chosen.size&&!await AnkiBridge.confirmIntent('切换电脑将清空当前待导入选择，不会删除已保存的场景。','切换接收电脑','切换电脑')){deviceSelect.value=previous;render();return}
    chosen.clear();rows.clear();session.deviceId=next;phase='choose';activeId='';persist();render();recover();
   };
   readButton.onclick=async()=>{
    if(pending||!alive())return;
    const previous=currentRequest();if(previous&&!['complete','error'].includes(previous.status)){await inspect(previous,{submit:!previous.requestId});return}
    pending=true;render();
    const deviceId=session.deviceId,scope=session.scope,limit=session.limit;
    const confirmed=await AnkiBridge.confirmIntent('将「'+scopeNames[scope]+'」前 '+limit+' 条原句、来源和状态发送至当前 Lexi 账号供选取；仅最终勾选项成为场景，不修改 Fushi 原记录或队列。','读取选定 Fushi 范围','确认读取');
    pending=false;if(!confirmed||!alive()||deviceId!==session.deviceId||scope!==session.scope||limit!==session.limit){render();return}
    const record={clientRequestId:crypto.randomUUID(),deviceId,scope,limit,status:'submitting',capturedAt:new Date().toISOString()};
    session.requests.push(record);
    while(session.requests.length>24){const remove=session.requests.findIndex(row=>!selectedRows().some(item=>item.requestId===row.requestId));session.requests.splice(Math.max(0,remove),1)}
    persist();await inspect(record,{submit:true});
   };
   body.querySelector('[data-clear-fushi]').onclick=()=>{
    const saved=[...chosen],revision=++selectionRevision;chosen.clear();phase='choose';persist();render();
    notify('已清空待导入选择。','info','Fushi',true,{label:'撤销',run:()=>{
     if(cloudUser?.id!==account||selectionRevision!==revision||!alive())return notify('账号或当前选择已有变化，未恢复旧选择。','warn','撤销');
     saved.forEach(id=>chosen.add(id));changed();
    }});
   };
   button.onclick=()=>{
    if(pending||!alive())return;
    if(phase==='receipt'){phase='choose';render();return}
    try{
     if(phase==='choose'){phase='review';render();return}
     const result=SceneUI.importFushi(selectedRows(),account,{silent:true});receipts=result.items;importUndo=result.undo||importUndo;chosen.clear();selectionRevision++;phase='receipt';persist();render();node.classList.remove('fushi-preview-open');
    }catch(error){setStatus(error.message);render()}
   };
   UIOverlays.guardDialog(node,{getState:()=>chosen.size?selectionDraft():null,initialState:null,restore:value=>{writeSession(account,{...value.session,selected:value.ids});open({rows:value.rows,ids:value.ids})},canRestore:()=>cloudUser?.id===account&&closedSession!==null&&JSON.stringify(readSession(account))===closedSession});
   function visibility(){if(document.hidden){stop();if(alive()){setStatus('窗口不可见，已暂停检查；返回后继续原请求。');render()}}else if(alive())recover()}
   function pagehide(){persist();stop()}
   document.addEventListener('visibilitychange',visibility);addEventListener('pagehide',pagehide);
   const accountObserver=new MutationObserver(()=>{if(node.isConnected&&cloudUser?.id!==account)node.close()});accountObserver.observe(document.body,{childList:true,subtree:true});
   node.addEventListener('close',()=>{stop();document.removeEventListener('visibilitychange',visibility);removeEventListener('pagehide',pagehide);accountObserver.disconnect();if(!leaving&&cloudUser?.id===account){chosen.clear();persist();closedSession=JSON.stringify(readSession(account))}if(importUndo&&cloudUser?.id===account){const run=importUndo;importUndo=null;notify('场景导入已保存。','good','Fushi',true,{label:'撤销',run})}},{once:true});
   render();persist();await recover();
  }catch(error){if(alive())setStatus(error.message)}
 }
 document.addEventListener('click',event=>{if(event.target.closest('[data-fushi-browser]'))open()});
 async function remoteAction(kind,id,cardKey=''){
  let job=null,deviceId=id;
  if(kind!=='diagnostics'){
   const jobs=await AnkiBridge.request('list');job=jobs.find(job=>job.id===id);
   if(!job)throw new Error('原制卡任务已不可用。');deviceId=job.device_id;
  }
  if(kind==='undo'&&!await AnkiBridge.confirmIntent('只撤销此电脑记录的本批写入；已学习、被修改或来源不匹配的卡片将保留。取消剩余任务不会删除已建卡片。','安全撤销本批写入','确认安全撤销'))return;
  const node=AnkiBridge.dialog(kind==='diagnostics'?'电脑连接诊断':kind==='undo'?'本批撤销结果':'在 Anki 中打开'),body=node.querySelector('.scene-dialog-body');
  await command(node,{deviceId,kind,...(job?{jobId:job.id}:{}),...(kind==='undo'?{confirmed:true}:{}),...(cardKey?{cardKey}:{})},result=>{
   if(kind==='diagnostics')body.innerHTML=`<div class="integration-status-list">${[['cloud','Lexi 云任务'],['anki','AnkiConnect'],['fushi','Fushi'],['dictionary','本机词典']].map(([key,label])=>{const row=result[key]||{ok:false,message:'未返回检测结果'};return `<section data-connection-ok="${row.ok===true}"><h3>${esc(label)}</h3><p>${row.ok===true?'可用':esc(row.message)}${row.ok===true&&row.detail?.profile?` · ${esc(row.detail.profile)}`:''}${key==='dictionary'&&row.ok===true?` · ${Array.isArray(row.names)?row.names.length:0} 本已启用`:''}</p></section>`}).join('')}</div>`;
   else if(kind==='open_note'){if(result.opened!==true)throw new Error('电脑未确认打开笔记。');body.innerHTML='<p>已在接收电脑的 Anki 中打开。</p>'}
   else body.innerHTML=`<div class="anki-remote-results">${(result.rows||[]).map(row=>`<section><strong>${esc(job.payload.cards.find(card=>card.key===row.key)?.title||'关联卡片')}</strong><p>${esc(({undone:'已撤销',error:'未撤销',skipped:'保留原卡片'})[row.status]||row.status)}${row.message?` · ${esc(row.message)}`:''}</p></section>`).join('')||'<p>没有可安全撤销的本批记录。</p>'}</div>`;
  });
 }
 document.addEventListener('click',event=>{
  const undo=event.target.closest('[data-remote-undo]'),open=event.target.closest('[data-open-remote]'),diagnose=event.target.closest('[data-diagnose-device]');
  if(!undo&&!open&&!diagnose)return;
  remoteAction(undo?'undo':open?'open_note':'diagnostics',undo?.dataset.remoteUndo||open?.dataset.openRemote||diagnose.dataset.diagnoseDevice,open?.dataset.cardKey||'').catch(e=>notify(e.message,'warn','学习联动'));
 });
  root.FushiWorkspace={open,command};
})(globalThis);
