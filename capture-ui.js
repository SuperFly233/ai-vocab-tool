(function(root){
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  let active=null,opening=false,epoch=0;
  const account=()=>cloudUser?.id||'local';
  const clone=value=>structuredClone(value);
  function sessionKey(owner){const key=`lexi-capture-session:${owner}`;let id;try{id=sessionStorage.getItem(key);if(!id){id=crypto.randomUUID();sessionStorage.setItem(key,id)}}catch{id=crypto.randomUUID()}return `capture-v1:${owner}:${id}`}
  async function preview(ref){
    const record=await SceneData.getFile(ref.id);if(!record?.blob)throw Error('本机缺少原截图，请重新添加原文件。');
    const bitmap=await createImageBitmap(record.blob);
    try{
      if(bitmap.width*bitmap.height>24000000)throw Error('截图像素超过 2400 万，请先缩小后导入。');
      const factor=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      const result=canvas.toDataURL('image/jpeg',.86);if(result.length>2000000)throw Error('识别副本仍过大，请先缩小截图。');return result;
    }finally{bitmap.close()}
  }
  async function open(restored=null){
    if(active||opening)return;opening=true;
    const owner=account(),key=sessionKey(owner),token=++epoch;
    try{
      const saved=restored||await SceneData.getDraft(key);if(owner!==account()||token!==epoch)return;
      const state={version:1,items:CaptureData.restore(saved),selected:saved?.selected||'',profileId:saved?.profileId||'',instruction:saved?.instruction||''};
      const initial=clone(state),node=document.createElement('dialog');node.className='capture-dialog';
      const context={owner,key,node,state,token,abort:new AbortController(),urls:new Map(),running:false,adding:false,saving:false,tail:Promise.resolve(),nonce:crypto.randomUUID(),baseline:initial};active=context;
      const valid=()=>active===context&&account()===owner&&node.open&&!context.closing&&!context.abort.signal.aborted;
      const profile=()=>getSettings().apiProfiles.find(row=>row.id===state.profileId);
      const snapshot=()=>clone(state);
      const persist=(value=snapshot())=>{const draft={...value,nonce:context.nonce};context.tail=context.tail.catch(()=>{}).then(()=>SceneData.putDraft(key,draft));return context.tail};
      const status=message=>{node.querySelector('[data-capture-status]').textContent=message};
      const sources=()=>[...new Set(SceneUI.sceneGroups().map(row=>row.scene.sourceTitle).filter(Boolean))];
      node.innerHTML=`<header><div><h2>截图学习 <small>预览</small></h2><p data-capture-count></p></div><button class="icon-btn" aria-label="关闭截图学习">${icon('x')}</button></header>
      <div class="capture-toolbar"><details class="capture-options"><summary>${icon('chevron-down')}识图设置 <small data-capture-config-label></small></summary><div class="capture-connection"><label>识图配置<select data-capture-profile><option value="">选择已保存的接口配置</option>${getSettings().apiProfiles.filter(row=>row.apiUrl&&row.apiKey&&row.model).map(row=>`<option value="${esc(row.id)}">${esc(row.name)} · ${esc(row.model)}</option>`).join('')}</select></label><button class="plain-btn" data-vision-probe>${icon('scan-text')}验证图片能力</button></div>
      <p class="capture-privacy">识图通过浏览器直连所选服务商，可能产生费用。验证只发送随机测试图；识别只发送你导入的截图副本，不自动换服务商。原件保留在本机，保存场景后按现有规则同步。</p>
      <label class="capture-instruction">指定原句或词组（可选）<input data-capture-instruction maxlength="2000" value="${esc(state.instruction)}" placeholder="例如：关注 make a difference，其余自动判断"></label></details><button class="plain-btn" data-capture-run>${icon('scan-search')}识别待处理</button></div>
      <div class="capture-layout"><nav class="capture-list" aria-label="截图列表"><button class="plain-btn" data-capture-pick>${icon('image-plus')}添加截图</button><input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden data-capture-files><div data-capture-items></div></nav><section class="capture-detail" aria-label="截图核对"></section></div>
      <p class="capture-status" data-capture-status role="status"></p><footer><button class="plain-btn capture-mobile-back" data-capture-back>${icon('arrow-left')}截图列表</button><span data-capture-local>本机草稿</span><div><button class="plain-btn" data-capture-save>保存场景</button><button class="plain-btn primary-btn" data-capture-query>保存并查词</button></div></footer>`;
      const profiles=node.querySelector('[data-capture-profile]');profiles.value=state.profileId;
      if(!profiles.value)state.profileId='';
      function updateButtons(){
        const row=state.items.find(item=>item.id===state.selected),locked=context.running||context.adding||context.saving||!valid();
        node.querySelector('[data-capture-save]').disabled=locked||!row||row.status==='saved'||!!row.invalid||!row.quote?.trim();
        node.querySelector('[data-capture-query]').disabled=locked||!row||row.status==='saved'||!!row.invalid||!row.quote?.trim()||!row.terms?.length;
        node.querySelector('[data-capture-run]').disabled=locked||!profile()||!state.items.some(row=>row.status!=='saved');
        node.querySelector('[data-vision-probe]').disabled=locked||!profile();profiles.disabled=locked;
        node.querySelector('[data-capture-pick]').disabled=locked;node.querySelector('[data-capture-instruction]').disabled=locked;
        node.querySelector('[data-capture-count]').textContent=`${state.items.length} 张 · ${state.items.filter(row=>row.status==='saved').length} 已保存`;
        node.querySelector('[data-capture-config-label]').textContent=profile()?.name||'未选择';
      }
      function renderList(){
        node.querySelector('[data-capture-items]').innerHTML=state.items.map((item,index)=>`<button type="button" class="capture-item" data-capture-select="${esc(item.id)}" aria-current="${item.id===state.selected?'true':'false'}"><span class="capture-item-number">${index+1}</span><span><strong>${esc(item.title||item.ref.name)}</strong><small>${esc(({pending:'待识别',running:'识别中',ready:'待核对',error:'待重试',saved:'已保存'})[item.status])}</small><span>${esc(item.quote||item.message||'尚未提取原句')}</span></span></button>`).join('')||'<p class="capture-empty">添加 PNG、JPEG 或 WebP 截图</p>';
        updateButtons();
      }
      function fields(row){return `<label class="capture-field"><span>原句</span><textarea data-capture-field="quote" maxlength="4000" rows="3">${esc(row.quote||'')}</textarea></label><label class="capture-field"><span>原句高亮</span><textarea data-capture-field="exampleHighlights" rows="2" maxlength="4000">${esc((row.exampleHighlights||[]).join('\n'))}</textarea></label><label class="capture-field"><span>译文 <small>${esc(({visible:'截图中的译文',machine:'机器翻译，待核对',manual:'手动填写',none:'尚无译文'})[row.translationOrigin||'none'])}</small></span><textarea data-capture-field="translation" maxlength="4000" rows="3">${esc(row.translation||'')}</textarea></label><label class="capture-field"><span>译文高亮</span><textarea data-capture-field="translationHighlights" rows="2" maxlength="4000">${esc((row.translationHighlights||[]).join('\n'))}</textarea></label><div class="capture-meta"><label class="capture-field"><span>场景名称</span><input data-capture-field="title" maxlength="400" value="${esc(row.title||'')}"></label><label class="capture-field"><span>确认来源</span><input data-capture-field="sourceTitle" maxlength="400" list="capture-known-sources" value="${esc(row.sourceTitle||'')}"><datalist id="capture-known-sources">${sources().map(value=>`<option value="${esc(value)}"></option>`).join('')}</datalist></label></div><div class="capture-evidence">${row.sourceSuggestion?`<p>模型来源建议（未匹配）：${esc(row.sourceSuggestion)}</p>`:''}${row.sourceEvidence?.length?`<p>截图可见线索：${esc(row.sourceEvidence.join(' · '))}</p>`:''}${row.warnings?.length?`<p>需核对：${esc(row.warnings.join('；'))}</p>`:''}</div><label class="capture-field"><span>待查词组 <small>顿号或换行分隔</small></span><textarea data-capture-field="terms" rows="2" maxlength="4000">${esc((row.terms||[]).join('、'))}</textarea></label><label class="capture-field"><span>我的笔记</span><textarea data-capture-field="note" maxlength="12000" rows="2">${esc(row.note||'')}</textarea></label>`}
      async function renderDetail(){
        const pane=node.querySelector('.capture-detail'),row=state.items.find(item=>item.id===state.selected);
        node.dataset.detail=row?'true':'false';
        if(!row){pane.innerHTML='<div class="capture-empty"><h3>从截图开始</h3><p>选择文件，也可以粘贴或拖入截图。</p></div>';updateButtons();return}
        pane.innerHTML=`<div class="capture-image"><img alt="${esc(row.ref.name)}"><span>${esc(row.ref.name)}</span></div><div class="capture-copy"><div class="capture-row-head"><h3>${row.status==='saved'?'已保存场景':'核对内容'}</h3><button class="icon-btn" data-capture-remove aria-label="从待处理移除截图" data-tip="从待处理移除截图">${icon('trash-2')}</button></div>${fields(row)}<p class="capture-item-error" role="status">${esc(row.message||'')}</p></div>`;
        if(row.termsText!==undefined)pane.querySelector('[data-capture-field="terms"]').value=row.termsText;
        if(row.status==='saved'&&row.sceneId){const button=document.createElement('button');button.className='plain-btn';button.innerHTML=`${icon('arrow-up-right')}打开场景继续学习`;button.onclick=async()=>{await node.requestClose();if(!node.open){showView('scenes',null,{focus:false});SceneWorkspace.select(row.sceneId)}};pane.querySelector('.capture-copy').append(button)}
        pane.querySelectorAll('[data-capture-field]').forEach(input=>{input.disabled=context.running||context.saving||row.status==='saved';input.addEventListener('input',event=>{
          if(event.isComposing)return;readField(input,row);
        });input.addEventListener('compositionend',()=>readField(input,row))});
        pane.querySelector('[data-capture-remove]').disabled=context.running;
        pane.querySelector('[data-capture-remove]').onclick=async()=>{
          if(!await UIOverlays.confirmDiscard('从待处理列表移除此截图？已保存场景及原件不受影响。')||!valid())return;
          state.items=state.items.filter(item=>item!==row);state.selected=state.items[0]?.id||'';await checkpoint();renderList();renderDetail();
        };
        try{let url=context.urls.get(row.id);if(!url){const record=await SceneData.getFile(row.ref.id);if(!valid()||state.selected!==row.id)return;if(!record?.blob)throw Error('本机原截图缺失，请重新添加原文件。');url=URL.createObjectURL(record.blob);context.urls.set(row.id,url)}if(valid()&&state.selected===row.id)pane.querySelector('img').src=url}catch(error){if(valid())status(error.message)}
        updateButtons();
      }
      function readField(input,row){
        if(!valid()||context.running||context.saving||row.status==='saved')return;
        const field=input.dataset.captureField;
        row.manualFields={...row.manualFields,[field]:true};if(field==='terms')row.termsText=input.value;
        try{row[field]=field==='terms'?CaptureData.terms(input.value):field.endsWith('Highlights')?SceneData.highlights(input.value):input.value;
          if(field==='translation'){row.translationOrigin='manual';input.closest('label').querySelector('small').textContent='手动填写'}status('');checkpoint();updateButtons();
        }catch(error){status(error.message);row.invalid=field;checkpoint();updateButtons();return}
        if(row.invalid===field){delete row.invalid;checkpoint();updateButtons()}
      }
      async function checkpoint(){try{await persist();if(valid())node.querySelector('[data-capture-local]').textContent='草稿已保存在本机'}catch{if(valid()){node.querySelector('[data-capture-local]').textContent='草稿未保存';status('本机空间不足或存储不可用。原输入仍在当前窗口，请勿刷新。')}}}
      async function addFiles(files){
        if(!valid()||context.adding||context.running||context.saving)return;context.adding=true;updateButtons();let skipped=0;
        try{
          for(const file of files){
            if(!valid())break;
            if(file.size>CaptureData.MAX_BYTES)throw Error('每张截图最多 8 MB。GIF／视频请继续使用场景编辑器，动画编辑尚未交付。');
            const checked=await SceneData.inspectFile(file);if(!valid())break;
            if(!['image/png','image/jpeg','image/webp'].includes(checked.ref.mime))throw Error('批量截图当前支持 PNG、JPEG、WebP；不会把 GIF 或视频静默变成静态图。');
            CaptureData.dimensions(new Uint8Array(await checked.blob.arrayBuffer()),checked.ref.mime);if(!valid())break;
            if(state.items.some(row=>row.id===checked.ref.id)){skipped++;continue}
            if(state.items.length>=CaptureData.MAX_ITEMS||state.items.reduce((sum,row)=>sum+row.ref.size,0)+checked.ref.size>CaptureData.MAX_BATCH_BYTES)throw Error('每批最多 20 张、合计 40 MB，已添加部分仍保留。');
            let decoded;try{decoded=await createImageBitmap(checked.blob)}catch{throw Error('截图无法解码，请重新导出为 PNG 或 JPEG。已添加的其他截图仍保留。')}finally{decoded?.close()}
            if(!valid())break;
            if(!await SceneData.getFile(checked.ref.id))await SceneData.putRecord(checked.ref.id,{...checked,uploadedFor:[]});
            if(!valid())break;
            state.items.push({id:checked.ref.id,ref:checked.ref,status:'pending',quote:'',translation:'',translationOrigin:'none',terms:[],exampleHighlights:[],translationHighlights:[]});
            state.selected=checked.ref.id;await checkpoint();renderList();
          }
          if(valid()){status(skipped?`跳过 ${skipped} 张相同截图。`:'');await renderDetail()}
        }catch(error){if(valid()){status(error.message);renderList();await renderDetail()}}finally{context.adding=false;if(valid())updateButtons()}
      }
      async function run(probeOnly){
        if(context.running||context.adding||context.saving||!valid())return;const selectedProfile=clone(profile()||{}),profileBase=JSON.stringify(selectedProfile);
        context.running=true;renderList();await renderDetail();
        const current=()=>valid()&&JSON.stringify(profile()||{})===profileBase;
        try{
          if(probeOnly){status('正在验证随机测试图片…');await VisionClient.probe(selectedProfile,{signal:context.abort.signal});if(current())status('测试图片读取通过；实际截图仍需核对。');return}
          if(!await VisionClient.hasValidation(selectedProfile))throw Error('先点击“验证图片能力”，确认这条服务商通道实际支持图片。');
          const rows=state.items.filter(row=>['pending','error'].includes(row.status));
          if(!rows.length)throw Error('没有待识别项。已核对内容不会被自动重写。');
          for(const row of rows){
            if(!current())break;row.status='running';row.message='';await checkpoint();renderList();
            try{
              const image=await preview(row.ref);if(!current())break;
              const requested=[state.instruction,row.manualFields?.quote?`User-specified original sentence: ${row.quote}`:'',row.manualFields?.terms?`User-specified query terms: ${row.termsText||row.terms.join('、')}`:''].filter(Boolean).join('\n');
              const result=await VisionClient.recognize(selectedProfile,image,{signal:context.abort.signal,instruction:requested});
              if(!current()||!state.items.includes(row))break;
              for(const [key,value] of Object.entries(result))if(!row.manualFields?.[key]&&!(key==='translationOrigin'&&row.manualFields?.translation))row[key]=value;
              Object.assign(row,{sourceTitle:row.sourceTitle||'',status:'ready',model:selectedProfile.model,profileId:selectedProfile.id,userInstruction:requested,recognizedAt:new Date().toISOString()});
            }catch(error){if(!current())break;row.status='error';row.message=error.message}
            await checkpoint();renderList();if(state.selected===row.id)await renderDetail();
          }
          if(current())status('识别结束。原句、译文和来源请核对后保存；模型来源建议不等于数据库匹配。');
        }catch(error){if(current())status(error.message)}finally{context.running=false;if(valid()){renderList();renderDetail()}}
      }
      async function save(query){
        if(context.running||context.adding||context.saving||!valid())return;const row=state.items.find(row=>row.id===state.selected);if(!row||row.status==='saved')return;
        if(row.invalid){status('请先修正待查词组输入。');return}
        context.saving=true;updateButtons();node.querySelectorAll('[data-capture-field]').forEach(input=>input.disabled=true);
        try{
          if(!row.quote?.trim())throw Error('请先填写完整原句。');
          if(query&&!row.terms?.length)throw Error('请先填写想查的词组。');
          const exact=CaptureData.sourceMatch(row.sourceTitle,sources());if(exact)row.sourceTitle=exact;
          const record=await SceneData.getFile(row.ref.id);if(!valid())return;if(!record?.blob)throw Error('本机原截图缺失，未保存场景。');
          const result=SceneUI.importCapture(clone(row),owner);row.status='saved';row.sceneId=result.scene.groupId;row.message=result.existing?'相同截图已存在，未覆盖已有编辑。':'场景已保存。';
          context.baseline.items=context.baseline.items.filter(item=>item.id!==row.id).concat([clone(row)]);context.baseline.selected=row.id;
          await checkpoint();if(account()!==owner)return;
          if(result.undo)notify('截图场景已保存。','good','截图学习',true,{label:'撤销',run:result.undo});
          if(query){const accepted=await SceneUI.queueSceneQueries(row.sceneId,row.terms);if(valid())status(accepted.failed.length?`场景已保存，${accepted.failed.length} 个词组未能入队，请从场景继续查询。`:`已接收 ${accepted.accepted.length} 个词组，继续使用原查询队列。`)}else status(row.message);
        }catch(error){if(valid())status(error.message)}finally{context.saving=false;if(valid()){renderList();await renderDetail()}}
      }
      profiles.onchange=()=>{state.profileId=profiles.value;checkpoint();updateButtons()};
      node.querySelector('[data-capture-instruction]').oninput=event=>{state.instruction=event.target.value;checkpoint()};
      node.querySelector('[data-capture-pick]').onclick=()=>node.querySelector('[data-capture-files]').click();
      node.querySelector('[data-capture-files]').onchange=event=>{const files=[...event.target.files];event.target.value='';addFiles(files)};
      node.querySelector('[data-vision-probe]').onclick=()=>run(true);node.querySelector('[data-capture-run]').onclick=()=>run(false);
      node.querySelector('[data-capture-save]').onclick=()=>save(false);node.querySelector('[data-capture-query]').onclick=()=>save(true);
      node.querySelector('[data-capture-back]').onclick=()=>{state.selected='';renderDetail();renderList();checkpoint()};
      node.querySelector('[data-capture-items]').onclick=event=>{const button=event.target.closest('[data-capture-select]');if(button){state.selected=button.dataset.captureSelect;renderList();renderDetail();checkpoint()}};
      const paste=event=>{if(!valid()||event.target.closest('input,textarea,[contenteditable]'))return;const files=[...(event.clipboardData?.files||[])];if(files.length){event.preventDefault();addFiles(files)}};
      node.addEventListener('paste',paste);node.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault()});node.addEventListener('drop',event=>{const files=[...(event.dataTransfer?.files||[])];if(files.length){event.preventDefault();addFiles(files)}});
      let closing=false;const dismiss=async()=>{
        if(closing)return;closing=true;
        try{
          const discarded=snapshot(),changed=JSON.stringify(discarded)!==JSON.stringify(context.baseline);
          if(changed&&!await UIOverlays.confirmDiscard('未保存为场景的修改将被放弃，关闭后可撤销恢复。'))return;
          if(account()!==owner){node.close();return}if(!valid())return;
          if(!changed){node.close();return}
          const baseline=clone(context.baseline);context.closing=true;context.nonce=crypto.randomUUID();await persist(baseline);const nonce=context.nonce;node.close();
          if(changed)notify('已放弃未保存的截图修改。','info','截图学习',true,{label:'撤销',run:async()=>{
            if(active||account()!==owner||epoch!==token)return notify('账号或工作区已变化，未恢复过期草稿。','warn','撤销');
            const latest=await SceneData.getDraft(key);if(latest?.nonce!==nonce)return notify('草稿已变化，未覆盖后续修改。','warn','撤销');
            await open(discarded);
          }});
        }catch(error){context.closing=false;if(node.open){status('无法安全保存关闭状态，窗口保持打开。请检查浏览器空间，原输入仍保留。');renderList();renderDetail()}}finally{closing=false}
      };
      // Use the same top-layer Esc/backdrop dispatch as the other study dialogs.
      node.requestClose=dismiss;UIOverlays.setDialogDismiss(node,dismiss);
      node.querySelector('header button').addEventListener('click',event=>{event.stopImmediatePropagation();dismiss()},true);
      const accountChanged=()=>{if(account()!==owner)node.close()};document.addEventListener('lexi-account-state',accountChanged);
      node.addEventListener('close',()=>{document.removeEventListener('lexi-account-state',accountChanged);context.abort.abort();for(const url of context.urls.values())URL.revokeObjectURL(url);if(active===context)active=null;node.remove()},{once:true});
      document.body.append(node);node.showModal();renderList();await renderDetail();
    }catch(error){if(active?.token===token){active.node.remove();active=null}notify(error.message,'bad','截图学习')}finally{opening=false}
  }
  document.addEventListener('click',event=>{if(event.target.closest('[data-capture-open]'))open()});
  root.CaptureUI=Object.freeze({open});
})(globalThis);
