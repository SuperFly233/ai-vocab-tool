(function(root){
  const D=root.EntryMaintenanceData,esc=value=>escapeHTML(String(value??'')),owner=()=>cloudUser?.id||'local';
  const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
  const fingerprint=item=>item?JSON.stringify(canonical(item)):null;
  const live=id=>getHistory().find(item=>String(item.id)===String(id));
  const draftKey=account=>'entry-maintenance-v1:'+account;
  let draftQueue=Promise.resolve();
  function resultFor(item){return structuredClone(getHistoryRolls(item)[0]?.result||item.result||{})}
  function apply(rows,account){
    if(owner()!==account)throw Error('账号已切换，未保存本批补遗。');
    if(!rows.length||rows.length>20)throw Error('每批请选择 1–20 条词条。');
    const before=new Map(),updates=new Map(),created=new Map();
    for(const row of rows){
      const item=live(row.id);if(!item||fingerprint(item)!==row.expected)throw Error('词条已更新或删除，请重新核对；本批未保存。');
      if(row.generatedParts&&row.parts.some(key=>!row.generatedParts.includes(key)))throw Error('补遗分区已改变，请先重新生成再核对。');
      const result=D.compose(row.original,row.proposal,row.parts,item.query||'');
      if(historyRollContentKey({result})===historyRollContentKey({result:row.original}))throw Error('建议没有产生内容变化，请调整所选分区。');
      const now=new Date(Math.max(Date.now(),(Date.parse(item.updatedAt)||0)+1)).toISOString();
      const roll=makeHistoryRoll(result,now,null,{name:'补遗 · '+formatHistoryTime(now),model:row.model||'手动补遗',modelSource:row.modelSource||'unknown',supplement:{version:1,baseRollId:getHistoryRolls(item)[0]?.id||'',sections:[...row.parts],generatedAt:row.generatedAt||'',reviewedAt:now,provenance:'ai-reviewed'}});
      const rolls=[roll,...getHistoryRolls(item)];before.set(String(item.id),structuredClone(item));created.set(String(item.id),roll.id);
      updates.set(String(item.id),{...item,result,rolls,rollOrder:rolls.map(value=>String(value.id)),rollOrderUpdatedAt:now,updatedAt:now});
    }
    if(!setHistory(getHistory().map(item=>updates.get(String(item.id))||item)))throw Error('写入失败，建议与原文均保留，可重试。');
    const expected=new Map([...updates.keys()].map(id=>[id,fingerprint(live(id))]));
    return ()=>{
      if(owner()!==account)throw Error('账号已切换，不能撤销本批补遗。');
      if([...expected].some(([id,version])=>fingerprint(live(id))!==version))throw Error('补遗后已有修改、关联或同步更新，未覆盖后续内容。');
      const now=new Date(Math.max(Date.now(),...[...expected.keys()].map(id=>(Date.parse(live(id)?.updatedAt)||0)+1))).toISOString();
      const history=getHistory().map(item=>{const previous=before.get(String(item.id));if(!previous)return item;return {...previous,updatedAt:now,rollOrderUpdatedAt:now,rollTombstones:HistoryData.normalizeTombstones(previous.rollTombstones,[{key:String(created.get(String(item.id))),deletedAt:now}])}});
      if(!setHistory(history))throw Error('撤销写入失败，当前内容保持不变。');
      refresh();
    };
  }
  function refresh(){
    if(typeof currentHistoryId!=='undefined'&&currentHistoryId){const item=live(currentHistoryId);if(item){currentResult=item.result;renderResult(item.result)}}
    if(typeof modalHistoryId!=='undefined'&&modalHistoryId&&els.historyModal?.classList.contains('open'))openHistoryModal(modalHistoryId);
    SceneUI.renderHub();
  }
  async function open(scope='history',restored=null){
    const existing=document.getElementById('entry-maintenance');if(existing){existing.focus();return}
    const account=owner(),initialItems=scope==='folders'?filteredFolderEntries().filter(item=>!item.__scene):filterAndSortHistory(getHistory());
    const records=initialItems.filter(item=>item.result).map(item=>({id:String(item.id),title:historyDisplayTitle(item),expected:fingerprint(item),original:resultFor(item),origin:item.query||'',parts:D.scan(resultFor(item)),missing:D.scan(resultFor(item)),selected:false,proposal:null,status:'未调用模型',revision:0})).filter(row=>row.missing.length);
    let active=records[0]?.id,running=false,controller=null,saved=false,writeQueue=Promise.resolve(),persistError='',timer=null;
    const node=document.createElement('dialog');node.id='entry-maintenance';node.className='entry-maintenance-dialog';node.setAttribute('aria-labelledby','entry-maintenance-title');
    node.innerHTML='<header><h2 id="entry-maintenance-title">词条检查与补遗</h2><button class="icon-btn" aria-label="关闭词条补遗">'+icon('x')+'</button></header><div class="entry-maintenance-layout"><nav class="entry-maintenance-list" aria-label="待补遗词条"></nav><section class="entry-maintenance-preview"></section></div><p class="entry-maintenance-status" role="status"></p><footer><span class="entry-maintenance-count"></span><button class="plain-btn" data-entry-generate>'+icon('sparkles')+'生成所选建议</button><button class="plain-btn primary-btn" data-entry-apply>采用为新版本</button></footer>';
    document.body.append(node);node.showModal();const status=text=>node.querySelector('[role=status]').textContent=text;
    const valid=()=>node.isConnected&&node.open&&owner()===account;
    const snapshot=()=>records.filter(row=>row.selected||row.proposal).map(row=>structuredClone(row));
    function persist(){
      clearTimeout(timer);const value={version:1,account,scope,active,rows:snapshot()};
      writeQueue=draftQueue=draftQueue.catch(()=>{}).then(async()=>{if(owner()!==account)return;await SceneData.putDraft(draftKey(account),value)});
      return writeQueue.then(()=>{persistError='';return true},()=>{persistError='补遗草稿保存失败；当前内容仍在，请导出建议后重试，不要清除站点数据。';if(valid())status(persistError);return false});
    }
    function changed(){clearTimeout(timer);timer=setTimeout(persist,150);counts()}
    function counts(){const chosen=records.filter(row=>row.selected);node.querySelector('.entry-maintenance-count').textContent='已选 '+chosen.length+' / 20 条';node.querySelector('[data-entry-generate]').disabled=running||!chosen.length||chosen.some(row=>!row.parts.length);node.querySelector('[data-entry-apply]').disabled=running||!chosen.some(row=>row.proposal&&row.parts.length)||chosen.some(row=>row.proposal&&row.generatedParts&&row.parts.some(key=>!row.generatedParts.includes(key)))}
    function list(){
      const host=node.querySelector('nav');host.innerHTML=records.map(row=>'<div class="entry-maintenance-choice '+(row.id===active?'active':'')+'"><input type="checkbox" data-entry-check="'+esc(row.id)+'" aria-label="选择 '+esc(row.title)+'" '+(row.selected?'checked':'')+'><button type="button" data-entry-open="'+esc(row.id)+'"><strong>'+esc(row.title)+'</strong><small>未填写 '+row.missing.map(key=>D.sections[key]).join('、')+'</small><small>'+esc(row.status)+'</small></button></div>').join('')||'<p class="entry-maintenance-intro">当前范围未发现结构缺项。内容较短不代表需要补齐。</p>';
      host.querySelectorAll('[data-entry-check]').forEach(input=>input.onchange=()=>{const row=records.find(row=>row.id===input.dataset.entryCheck);if(input.checked&&records.filter(row=>row.selected).length>=20){input.checked=false;status('每批最多选择 20 条。');return}row.selected=input.checked;changed()});
      host.querySelectorAll('[data-entry-open]').forEach(button=>button.onclick=()=>{active=button.dataset.entryOpen;node.dataset.detail='';list();preview();changed()});counts();
    }
    function input(path,label,value){return '<label><span>'+esc(label)+'</span><textarea data-entry-field="'+path+'" aria-label="'+esc(label)+'">'+esc(value)+'</textarea></label>'}
    function originalView(row){try{return LearningContent.render(LearningContent.snapshot({...row.original,headword:{...row.original.headword,title:row.original.headword?.title||row.title}},D.keys,''))}catch{return '<p>旧内容的结构或长度无法直接预览。原文仍保留，可导出本机建议备份；不会自动裁剪或改写。</p>'}}
    function preview(){
      const row=records.find(row=>row.id===active),host=node.querySelector('.entry-maintenance-preview');if(!row){host.innerHTML='<p>当前范围没有待补遗词条。</p>';return}
      const settings=currentApiSettings(),model=settings.model||configInfo?.model||'未配置';
      host.innerHTML='<button class="plain-btn entry-maintenance-back">'+icon('arrow-left')+'返回列表</button><h3>'+esc(row.title)+'</h3><p class="entry-maintenance-model">生成模型：'+esc(model)+' · 使用当前查询配置</p><p class="entry-maintenance-intro">只补所选分区；未填写不一定是缺陷。不需要的分区可以取消。</p><div class="entry-maintenance-sections">'+D.keys.map(key=>'<label><input type="checkbox" data-entry-part="'+key+'" '+(row.parts.includes(key)?'checked':'')+'>'+D.sections[key]+'</label>').join('')+'</div><details class="entry-maintenance-original" open><summary>原有内容</summary><div class="lexi-learning">'+(row.original.headword?.coreMeaning?'<p>'+esc(row.original.headword.coreMeaning)+'</p>':'')+originalView(row)+'</div></details><section class="entry-maintenance-proposal"><h3>拟补充内容</h3><p class="entry-maintenance-ai">'+(row.proposal?'AI 生成建议 · 未经词典或语录库核验 · 尚未保存':'选择词条与分区后生成；不会自动保存或制卡。')+'</p><div data-entry-fields></div><button class="plain-btn" data-entry-retry>'+icon('sparkles')+(row.proposal?'重新生成此条…':'生成此条建议')+'</button><button class="plain-btn" data-entry-export>'+icon('download')+'导出本机建议</button></section>';
      host.querySelector('.entry-maintenance-back').onclick=()=>node.removeAttribute('data-detail');
      host.querySelectorAll('[data-entry-part]').forEach(input=>input.onchange=()=>{row.parts=D.keys.filter(key=>host.querySelector('[data-entry-part="'+key+'"]').checked);row.revision++;if(row.proposal){if(row.parts.some(key=>!row.generatedParts?.includes(key))){row.status='新增分区尚未生成';status('新增分区尚未生成，请重新生成并核对；已有建议仍保留。')}else{row.status='建议已生成，待核对';status('分区选择已更新；已有建议保留，核对后可采用。')}}changed();fields()});
      host.querySelector('[data-entry-retry]').onclick=async()=>{if(running)return;if(row.proposal&&!await UIOverlays.confirmDiscard('重新生成将替换此条尚未采用的建议；正式版本不受影响。'))return;if(!valid())return;if(!row.selected&&records.filter(row=>row.selected).length>=20)return status('每批最多选择 20 条。');row.selected=true;await generate([row],true)};
      host.querySelector('[data-entry-export]').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,kind:'lexi-entry-supplement-drafts',rows:snapshot()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='lexi-supplement-drafts.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
      fields();
    }
    function fields(){
      const row=records.find(row=>row.id===active),host=node.querySelector('[data-entry-fields]');if(!host||!row)return;host.replaceChildren();if(!row.proposal)return;
      const p=row.proposal;
      const textFields={senses:['partOfSpeech','shortestLabel','meaning'],collocations:['phrase','meaning','note'],confusions:['term','difference','usage']};
      const labels={partOfSpeech:'词性',shortestLabel:'义项标题',meaning:'释义',phrase:'搭配',note:'说明',term:'易混词',difference:'区别',usage:'用法',example:'例句',translation:'译文',style:'语体',tone:'语气',environment:'使用环境'};
      for(const key of row.parts){
        let html='';if(key==='core'||key==='summary')html=input('headword.'+(key==='core'?'coreMeaning':'summary'),D.sections[key],p.headword[key==='core'?'coreMeaning':'summary']);
        else if(key==='register')html=['style','tone','environment'].map(field=>input('register.'+field,labels[field],p.register[field])).join('');
        else if(key==='examples')html=['senses','collocations'].map(type=>p[type].map((value,index)=>'<div class="entry-maintenance-item"><b>'+D.sections[type]+' '+(index+1)+'</b>'+['example','translation'].map(field=>input(type+'.'+index+'.'+field,labels[field],value[field])).join('')+'</div>').join('')).join('');
        else html=p[key].map((value,index)=>'<div class="entry-maintenance-item"><b>'+(index+1)+'</b>'+textFields[key].map(field=>input(key+'.'+index+'.'+field,labels[field],value[field])).join('')+'</div>').join('');
        host.insertAdjacentHTML('beforeend','<fieldset class="entry-maintenance-fields"><legend>'+D.sections[key]+'</legend>'+html+'</fieldset>');
      }
      host.querySelectorAll('[data-entry-field]').forEach(field=>field.oninput=()=>{const parts=field.dataset.entryField.split('.');let target=p;for(const part of parts.slice(0,-1))target=target[part];target[parts.at(-1)]=field.value;row.revision++;changed()});
    }
    async function generate(rows,replace=false){
      if(running||!valid())return;
      if(!rows.length||rows.length>20||rows.some(row=>!row.parts.length))return status('请选择 1–20 条词条及补遗分区。');
      if(!replace&&rows.some(row=>row.proposal&&row.parts.some(key=>!row.generatedParts?.includes(key)))&&!await UIOverlays.confirmDiscard('新增分区需要重新生成，将替换对应词条尚未采用的建议；正式版本不变。'))return;
      if(!await persist()||!valid())return;
      const settings=currentApiSettings(),local=Boolean(settings.apiUrl&&settings.apiKey&&settings.model),model=local?settings.model:configInfo?.model;
      if(!local&&!(cloudUser?.id&&configInfo?.hasApiUrl&&configInfo?.hasApiKey&&configInfo?.model&&!settings.apiUrl&&!settings.apiKey))return status('请先在设置中配置文字模型；未调用 API。');
      running=true;counts();status('正在生成所选建议；正式版本不会改变。');
      let completed=0;
      try{for(const row of rows){
        if(!valid())break;if(row.proposal&&!replace&&row.parts.every(key=>row.generatedParts?.includes(key)))continue;
        if(fingerprint(live(row.id))!==row.expected){row.status='词条已有更新，请重新检查';list();continue}
        const revision=row.revision;row.status='生成中';list();controller=new AbortController();const timeout=setTimeout(()=>controller?.abort(),90000);
        try{
          D.validate({...row.original,headword:{...row.original.headword,title:row.original.headword?.title||row.title}},row.origin);
          const response=await modelRequest('followup',{purpose:'entry-supplement',question:'补齐已选择的词条分区，返回完整结构 JSON',result:{...row.original,headword:{...row.original.headword,title:row.original.headword?.title||row.title}},origin:row.origin,sections:[...row.parts],stream:false,apiUrl:local?settings.apiUrl:'',apiKey:local?settings.apiKey:'',model},{signal:controller.signal});
          const value=await response.json();controller.signal.throwIfAborted();if(!response.ok)throw Error(value.error||'HTTP '+response.status);
          const proposal=D.parse(value.answer,row.origin);D.compose(row.original,proposal,row.parts,row.origin);
          if(!valid())break;if(fingerprint(live(row.id))!==row.expected)throw Error('生成期间词条已有更新，未采用此结果。');
          if(row.revision!==revision){row.status='保留生成期间的手动修改；本次结果未覆盖';continue}
          row.proposal=proposal;row.generatedParts=[...row.parts];row.model=model||'部署文字模型';row.modelSource=local?'local':'environment';row.generatedAt=new Date().toISOString();row.status='建议已生成，待核对';completed++;if(active===row.id)preview();
        }catch(error){if(valid())row.status=error.name==='AbortError'?'已取消或超时，可单独重试':String(error.message).slice(0,240)}
        finally{clearTimeout(timeout);controller=null;if(valid()){list();await persist()}}
      }}finally{running=false;if(valid()){counts();status(persistError||'本轮生成 '+completed+' 条建议；正式内容未改动。已有建议保留，失败项可单独重试。')}}
    }
    node.querySelector('[data-entry-generate]').onclick=()=>generate(records.filter(row=>row.selected));
    node.querySelector('[data-entry-apply]').onclick=async()=>{
      if(running||!valid())return;const chosen=records.filter(row=>row.selected&&row.proposal&&row.parts.length);if(!chosen.length)return;
      running=true;counts();try{if(!await persist()||!valid())return;const undo=apply(chosen,account);saved=true;await writeQueue.catch(()=>{});await SceneData.deleteDraft(draftKey(account)).catch(()=>{});node.close();refresh();notify('已新增 '+chosen.length+' 个补遗版本；原版本保留。','good','词条补遗',true,{label:'撤销',run:()=>{try{undo();notify('已撤销本批补遗版本。','info','词条补遗')}catch(error){notify(error.message,'warn','未撤销')}}})}catch(error){status(error.message)}finally{running=false;if(node.isConnected)counts()}
    };
    UIOverlays.guardDialog(node,{getState:snapshot,initialState:[],canRestore:()=>owner()===account&&records.filter(row=>row.selected||row.proposal).every(row=>fingerprint(live(row.id))===row.expected),restore:values=>open(scope,values)});
    node.addEventListener('close',()=>{controller?.abort();clearTimeout(timer);if(!saved)draftQueue=draftQueue.catch(()=>{}).then(()=>SceneData.deleteDraft(draftKey(account)));draftQueue.catch(()=>{});node.remove()},{once:true});
    list();status('正在读取本机补遗草稿…');
    try{
      const previous=restored?{rows:restored}:await SceneData.getDraft(draftKey(account));if(!valid())return;
      if(previous?.rows?.length){if(previous.rows.length>20)throw Error('旧草稿数量异常，未自动恢复。');for(const old of previous.rows){if(!old||typeof old.id!=='string'||!Array.isArray(old.parts)||old.parts.some(key=>!D.keys.includes(key)))throw Error('旧草稿格式无效，未改动正式词条。');if(old.proposal)D.validate(old.proposal,old.origin||'');const index=records.findIndex(row=>row.id===old.id),row=structuredClone(old);row.status=fingerprint(live(row.id))!==row.expected?'原词条已更新；草稿保留，采用已阻止':row.status==='生成中'?'上次生成已中断，可重试':row.status;if(index<0)records.push(row);else records[index]=row}active=previous.active||records.find(row=>row.selected)?.id||active;status('已恢复本机草稿；没有自动调用模型。')}else status('扫描完成；未填写不一定是缺陷，选择需要补充的词条与分区。');
    }catch(error){status('草稿读取失败：'+error.message+'；正式内容未改变。')}
    if(valid()){list();preview()}
  }
  function enhanceControls(){
    for(const [selector,scope] of [['#view-history .section-head .action-row','history'],['.folder-head-actions','folders']]){
      document.querySelectorAll(selector).forEach(host=>{
        if(!host.querySelector('[data-entry-maintenance]')){const button=document.createElement('button');button.type='button';button.className='icon-btn';button.dataset.entryMaintenance=scope;button.setAttribute('aria-label','检查与补遗词条');button.innerHTML=icon('sparkles');button.onclick=()=>open(scope);host.append(button)}
        if(scope==='history')SharedUI.more(host,'button[aria-label="导出历史"],[data-entry-maintenance]');
      });
    }
  }
  root.EntryMaintenance={open,apply,enhanceControls,fingerprint};
})(globalThis);
