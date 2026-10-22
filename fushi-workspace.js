(function(root){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function waitDevice(node,id){
  for(let n=0;n<60;n++){
   if(!node.isConnected)throw new Error('窗口已关闭，设备请求仍可完成。');
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
 async function open(draft=null){
  const node=AnkiBridge.dialog('从 Fushi 选取场景'),body=node.querySelector('.scene-dialog-body'),account=cloudUser?.id,rows=new Map((draft?.rows||[]).map(row=>[row.id,row])),chosen=new Set(rows.keys());let pending=false;
  try{
   const devices=await AnkiBridge.request('devices');if(!node.isConnected)return;
   if(!devices.length){body.innerHTML='<p>尚未登记接收电脑。</p>';return}
   node.classList.add('fushi-source-dialog');
   body.innerHTML=`<div class="fushi-read-controls"><label class="scene-field"><span>接收电脑</span><select name="device">${devices.map(d=>`<option value="${esc(d.id)}">${esc(d.name)}</option>`).join('')}</select></label><label class="scene-field"><span>读取范围</span><select name="scope"><option value="favorites">收藏句</option><option value="staged">当前视频暂存</option><option value="pending">制卡队列摘要</option></select></label><label class="scene-field"><span>数量上限</span><select name="limit"><option>5</option><option>10</option><option selected>20</option></select></label><button class="plain-btn" data-read-fushi>${icon('refresh-cw')}读取范围</button></div><label class="history-search search-field"><span>${icon('search')}</span><input type="search" aria-label="搜索 Fushi 来源" placeholder="搜索原句或来源" autocomplete="off"></label><div class="fushi-source-workbench"><div class="fushi-source-list"></div><section class="fushi-source-preview" aria-label="来源预览"></section></div><footer><span data-fushi-count>已选 0 条</span><button class="plain-btn primary-btn" data-import-fushi disabled>${icon('file-up')}导入为场景</button></footer>`;
   const list=body.querySelector('.fushi-source-list'),preview=body.querySelector('.fushi-source-preview'),search=body.querySelector('input'),button=body.querySelector('[data-import-fushi]');
   function show(row){preview.replaceChildren();if(!row)return;const h=document.createElement('h3'),quote=document.createElement('p'),source=document.createElement('p'),boundary=document.createElement('p');h.textContent=row.title||'原句';quote.textContent=row.quote||'此队列项目仅提供词组摘要，没有原句。';source.textContent=[row.sourceTitle,row.chapter].filter(Boolean).join(' · ');boundary.textContent=row.mediaAvailable?'素材随所选来源处理':'官方列表未提供素材文件';source.className=boundary.className='scene-source-line';preview.append(h,quote,source,boundary)}
   function render(){
    const query=normalizeSearch(search.value),filtered=[...rows.values()].filter(row=>normalizeSearch(`${row.title} ${row.quote} ${row.sourceTitle}`).includes(query));
    list.innerHTML=filtered.map(row=>`<div class="fushi-source-row"><label><input type="checkbox" data-fushi-source="${esc(row.id)}" ${chosen.has(row.id)?'checked':''} ${row.quote?.trim()?'':'disabled'}><span><strong>${esc(row.title||row.quote||'词组摘要')}</strong><span>${esc(row.quote)}</span><small>${esc(row.sourceTitle)}${row.queued?' · 已在 Fushi 制卡流程中':''}${!row.quote?.trim()?' · 缺少原句':''}</small></span></label><button class="icon-btn" data-preview-fushi="${esc(row.id)}" aria-label="预览来源" data-tip="预览来源">${icon('scan-eye')}</button></div>`).join('')||'<p>当前范围没有可显示的来源。</p>';
    list.querySelectorAll('[data-fushi-source]').forEach(box=>box.onchange=()=>{if(box.checked&&chosen.size>=20){box.checked=false;node.querySelector('[role=status]').textContent='每次最多选取 20 条。';return}box.checked?chosen.add(box.dataset.fushiSource):chosen.delete(box.dataset.fushiSource);show(rows.get(box.dataset.fushiSource));count()});
    list.querySelectorAll('[data-preview-fushi]').forEach(b=>b.onclick=()=>show(rows.get(b.dataset.previewFushi)));count();
   }
   function count(){body.querySelector('[data-fushi-count]').textContent=`已选 ${chosen.size} 条`;button.disabled=!chosen.size||pending}
   UIOverlays.guardDialog(node,{getState:()=>[...chosen].sort().map(id=>rows.get(id)),initialState:[],restore:values=>open({rows:values})});
   search.oninput=e=>{if(!e.isComposing)render()};search.oncompositionend=render;
   const readButton=body.querySelector('[data-read-fushi]');
   readButton.onclick=async()=>{
    if(pending)return;const scope=body.querySelector('[name=scope]'),limit=Number(body.querySelector('[name=limit]').value),deviceId=body.querySelector('[name=device]').value;
    if(!await AnkiBridge.confirmIntent(`将「${scope.selectedOptions[0].text}」前 ${limit} 条原句、来源和状态发送至当前 Lexi 账号供你选取。不会修改或消费 Fushi 原队列，未选内容不会导入场景。`,'读取选定 Fushi 范围','确认读取'))return;
    pending=true;readButton.disabled=true;count();
    try{await command(node,{deviceId,kind:'fushi_read',scope:scope.value,limit,confirmed:true},result=>{for(const row of result.items||[])if(!chosen.has(row.id))rows.set(row.id,row);if(rows.size>40)for(const id of rows.keys()){if(rows.size<=40)break;if(!chosen.has(id))rows.delete(id)}render();show([...rows.values()][0])})}catch(e){node.querySelector('[role=status]').textContent=e.message}finally{pending=false;if(node.isConnected){readButton.disabled=false;count()}}
   };
   button.onclick=()=>{if(pending)return;pending=true;count();try{const result=SceneUI.importFushi([...chosen].map(id=>rows.get(id)),account);node.close();if(!result.added)notify(`已跳过 ${result.skipped} 个已有或已删除来源。`,'info','Fushi')}catch(e){node.querySelector('[role=status]').textContent=e.message;pending=false;count()}};
   render();show([...rows.values()][0]);
  }catch(e){node.querySelector('[role=status]').textContent=e.message}
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
