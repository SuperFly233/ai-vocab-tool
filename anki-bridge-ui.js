(function(root){
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={awaiting_device:'等待电脑接收',awaiting_confirmation:'待电脑确认',running:'写入中',partial:'部分完成',complete:'已写入 Anki',error:'失败',cancelled:'已取消'};
 const sha=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 async function request(action,args={}){
  if(!cloudUser)throw new Error('请先登录 Lexi，再发送到 Anki。');
  const account=cloudUser.id,token=await cloudAccessToken();if(cloudUser?.id!==account)throw new Error('账号已切换。');
  const result=await fetch('/api/anki-jobs',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({action,args}),signal:AbortSignal.timeout(20000)});
  const value=await result.json();if(cloudUser?.id!==account)throw new Error('账号已切换，请重新打开。');if(!result.ok)throw new Error(value.error||'Anki 请求未完成。');return value.data;
 }
 function dialog(title){const node=document.createElement('dialog');node.className='scene-study-dialog anki-dialog';node.innerHTML=`<header><h2>${esc(title)}</h2><button class="icon-btn" aria-label="关闭" data-tip="关闭">${icon('x')}</button></header><div class="scene-dialog-body"></div><p class="scene-dialog-status" role="status"></p>`;node.querySelector('header button').onclick=()=>node.close();node.onclose=()=>node.remove();document.body.append(node);node.showModal();return node}
 function error(node,value){const status=node.querySelector('[role=status]');if(status)status.textContent=value}
 async function openGroup(groupId,entryId=''){
  const group=SceneUI.sceneGroups().find(group=>group.scene.groupId===groupId);if(!group)return;
  const node=dialog('发送到 Anki'),body=node.querySelector('.scene-dialog-body'),account=cloudUser?.id;
  try{
   const devices=await request('devices');if(!node.isConnected)return;
   if(!devices.length){body.innerHTML='<p>尚未登记电脑。请先启动 Anki Bridge、登录同一账号并登记这台电脑。</p>';return}
   const links=group.links.filter(item=>!entryId||String(item.id)===String(entryId));
   if(!links.length){body.innerHTML='<p>先为场景关联一个词条，再选择需要学习的内容。</p>';return}
   const entries=links.map(item=>{const scene=SceneStudy.link(item,groupId),result=displayedResultForHistory(item.id,item),bound=scene.targetKey?findFragmentInResult(result,'sense',scene.targetKey):null;return {item,meanings:[...(bound?[{name:'场景绑定义项',value:bound.meaning||''}]:[]),{name:'核心义',value:SceneStudy.meaning(item)},...(result?.senses||[]).map((sense,i)=>({name:`义项 ${i+1} · ${sense.shortestLabel||''}`,value:sense.meaning||''}))]}});
   body.innerHTML=`<label class="scene-field"><span>接收电脑</span><select name="device">${devices.map(device=>`<option value="${esc(device.id)}">${esc(device.name)}</option>`).join('')}</select></label><div class="anki-send-list">${entries.map(({item,meanings},index)=>`<div class="anki-send-row"><label><input type="checkbox" data-entry="${index}" ${index<20?'checked':''}><strong>${esc(historyDisplayTitle(item))}</strong></label><select data-meaning="${index}" aria-label="${esc(historyDisplayTitle(item))} 卡片释义">${meanings.map((meaning,i)=>`<option value="${i}">${esc(meaning.name)}</option>`).join('')}</select><p data-meaning-preview="${index}">${esc(meanings[0].value)}</p></div>`).join('')}</div><p class="anki-send-note">提交后由电脑预览确认；尚未写入 Anki，也不代表 Anki 云同步完成。</p><footer><span data-send-count></span><button class="plain-btn primary-btn" data-submit-anki>${icon('send')}提交制卡任务</button></footer>`;
   function count(){const n=body.querySelectorAll('[data-entry]:checked').length;body.querySelector('[data-send-count]').textContent=`已选 ${n} 张`;body.querySelector('[data-submit-anki]').disabled=!n||n>20}
   body.querySelectorAll('[data-entry]').forEach(box=>box.onchange=count);count();body.querySelectorAll('[data-meaning]').forEach(select=>select.onchange=()=>body.querySelector(`[data-meaning-preview="${select.dataset.meaning}"]`).textContent=entries[Number(select.dataset.meaning)].meanings[Number(select.value)].value);
   let pending=false;
   body.querySelector('[data-submit-anki]').onclick=async()=>{
    if(pending)return;pending=true;body.querySelector('[data-submit-anki]').disabled=true;
    try{
     if(cloudUser?.id!==account)throw new Error('账号已切换。');error(node,'正在准备素材与卡片快照…');
     const indexes=[...body.querySelectorAll('[data-entry]:checked')].map(box=>Number(box.dataset.entry));if(!indexes.length||indexes.length>20)throw new Error('每批选择 1–20 张卡片。');
     const scene=structuredClone(group.scene),media=structuredClone(scene.media);
     for(const ref of [...media].filter(ref=>ref.mime.startsWith('video/'))){const blob=await ScenePreview.get(ref);blob.name='场景视频封面.jpg';media.push(await SceneData.putFile(blob))}
     if(media.length>10||[...new Map(media.map(ref=>[ref.id,ref])).values()].reduce((sum,ref)=>sum+ref.size,0)>50*1024*1024)throw new Error('单张卡含封面最多 10 份素材，单批最多 50 MB。');
     const cards=[];
     for(const index of indexes){const {item,meanings}=entries[index],associated=SceneStudy.link(item,groupId);cards.push({key:await sha(JSON.stringify(['lexi',groupId,String(item.id)])),sourceType:'lexi',sceneId:groupId,entryId:String(item.id),title:historyDisplayTitle(item),origin:item.query,quote:scene.quote,translation:scene.translation,meaning:meanings[Number(body.querySelector(`[data-meaning="${index}"]`).value)].value,note:scene.note,sourceTitle:[scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · '),sourceUrl:scene.sourceUrl,exampleHighlights:[...associated.exampleHighlights],translationHighlights:[...associated.translationHighlights],media})}
     for(const [index,ref] of [...new Map(media.map(ref=>[ref.id,ref])).values()].entries()){if(cloudUser?.id!==account)throw new Error('账号已切换。');error(node,`同步素材 ${index+1} / ${media.length}…`);await SceneMedia.upload(ref)}
     if(cloudUser?.id!==account)throw new Error('账号已切换。');
     const job=await request('submit',{deviceId:body.querySelector('[name=device]').value,payload:{version:1,cards}});
     body.innerHTML=`<h3>${esc(labels[job.status]||job.status)}</h3><p>${cards.length} 张卡片，电脑逐批确认后写入。</p><button class="plain-btn" data-view-jobs>查看任务</button>`;error(node,'');body.querySelector('[data-view-jobs]').onclick=()=>{node.close();manage()};
    }catch(e){error(node,e.message);pending=false;if(body.querySelector('[data-submit-anki]'))count()}
   };
  }catch(e){error(node,e.message)}
 }
 async function manage(){const node=dialog('Anki 制卡任务'),body=node.querySelector('.scene-dialog-body');
  async function refresh(){try{const jobs=await request('list');if(!node.isConnected)return;body.innerHTML=`<button class="icon-btn" data-refresh-anki aria-label="刷新任务" data-tip="刷新任务">${icon('refresh-cw')}</button><div>${jobs.map(job=>`<section class="anki-task-row"><div><strong>${esc(job.payload.cards[0]?.title||'场景制卡')}</strong><p>${job.payload.cards.length} 张 · ${esc(job.cancel_requested&&job.status==='running'?'正在停止，已完成内容保留':labels[job.status]||job.status)}</p></div><div class="scene-actions"><button class="icon-btn" data-results="${esc(job.id)}" aria-label="查看逐项回执" data-tip="查看逐项回执">${icon('list')}</button>${['error','partial','cancelled'].includes(job.status)?`<button class="icon-btn" data-retry="${esc(job.id)}" aria-label="重新排队未完成项" data-tip="重新排队未完成项">${icon('refresh-cw')}</button>`:''}${!['complete','cancelled'].includes(job.status)?`<button class="icon-btn" data-cancel="${esc(job.id)}" aria-label="取消剩余任务" data-tip="取消剩余任务">${icon('x')}</button>`:''}</div></section>`).join('')||'<p>暂无制卡任务。</p>'}</div><div data-receipts></div>`;body.querySelector('[data-refresh-anki]').onclick=refresh;for(const action of ['retry','cancel'])body.querySelectorAll(`[data-${action}]`).forEach(button=>button.onclick=async()=>{button.disabled=true;try{await request(action,{jobId:button.dataset[action]});await refresh()}catch(e){error(node,e.message);button.disabled=false}});body.querySelectorAll('[data-results]').forEach(button=>button.onclick=async()=>{try{const rows=await request('results',{jobId:button.dataset.results}),job=jobs.find(job=>job.id===button.dataset.results);body.querySelector('[data-receipts]').innerHTML=`<h3>逐项回执</h3>${rows.map(row=>`<p><strong>${esc(job.payload.cards.find(card=>card.key===row.card_key)?.title||'关联词条')}</strong> · ${esc(({complete:'已写入',skipped:'已存在，跳过',error:'失败',undone:'已撤销'})[row.status]||row.status)} ${esc(row.message)}</p>`).join('')||'<p>电脑尚未提交回执。</p>'}`}catch(e){error(node,e.message)}})}catch(e){error(node,e.message)}}
  await refresh();
 }
 document.addEventListener('click',event=>{const button=event.target.closest('[data-send-anki]');if(!button)return;const parent=button.closest('[data-history-id][data-scene-id]');if(!parent)return;const item=getHistory().find(item=>String(item.id)===parent.dataset.historyId),scene=SceneData.reconcile(item?.scenes||getSettings().sceneLibrary,item?.sceneTombstones||getSettings().sceneLibraryTombstones).items.find(scene=>scene.id===parent.dataset.sceneId);if(scene)openGroup(scene.groupId,item?.id||'')});
 document.getElementById('anki-task-manager')?.addEventListener('click',manage);
 function installButtons(){document.querySelectorAll('.scene-record,.scene-workbench,.scene-study-row').forEach(parent=>{const actions=parent.classList.contains('scene-workbench')?parent.querySelector(':scope>header .scene-actions'):parent.classList.contains('scene-study-row')?parent.querySelector('.scene-link-actions'):parent.querySelector('.scene-actions');if(actions&&!actions.querySelector('[data-send-anki]'))actions.insertAdjacentHTML('afterbegin',`<button class="icon-btn anki-send-command" data-send-anki aria-label="发送到 Anki" data-tip="发送到 Anki">${icon('send')}<span>Anki</span></button>`)})}
 let scheduled=false;new MutationObserver(()=>{if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;installButtons()})}}).observe(document.body,{childList:true,subtree:true});installButtons();
 root.AnkiBridge={openGroup,manage,request};
})(globalThis);
