(function(root){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const request=(...args)=>AnkiBridge.request(...args),keys=Object.keys(LearningContent.sections);
 const digest=async value=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(v=>v.toString(16).padStart(2,'0')).join('');
 async function readSnapshot(ref){const value=await request('content_get',{snapshotId:ref.id});if(value.hash!==ref.hash||await digest(value.canonical)!==ref.hash||JSON.stringify(JSON.parse(value.canonical))!==JSON.stringify(value.payload))throw Error('完整释义快照校验失败。');return LearningContent.normalize(value.payload)}
 async function open(entries,{groupId='',saved=null}={}){
  if(!cloudUser)return notify('请先登录 Lexi。','warn','制卡');
  const account=cloudUser.id,node=AnkiBridge.dialog('完整内容制卡',{closeHint:false}),body=node.querySelector('.scene-dialog-body');node.classList.add('learning-send-dialog');
  let pending=false,submitted=false,active=0,previewGeneration=0,previewUrls=[];const status=node.querySelector('[role=status]');
  const releasePreview=()=>{previewUrls.forEach(URL.revokeObjectURL);previewUrls=[]};node.addEventListener('close',()=>{previewGeneration++;releasePreview()},{once:true});
  const values=entries.slice(0,20).map(item=>({item:structuredClone(item),result:structuredClone(displayedResultForHistory(item.id,item)),selected:[...keys],checked:true,sceneId:groupId,dictionaryId:''}));
  try{
   const [health,devices]=[await request('health'),await request('devices')];if(!node.isConnected||cloudUser?.id!==account)return;
   if(!health.learningContent){body.innerHTML='<p>云端完整内容制卡尚未开放，旧任务不受影响。</p>';return}
   const eligible=devices.filter(d=>d.capabilities?.payloadVersions?.includes(4));
   if(!eligible.length){body.innerHTML='<p>此功能需要 Bridge 0.4。请先从托盘退出旧版，再启动新版并登记电脑。</p><a href="https://github.com/SuperFly233/ai-vocab-tool/releases/latest" target="_blank" rel="noopener noreferrer">下载连接助手</a>';return}
   if(!values.length)throw Error('没有可制卡的已保存词条。');
   for(const value of values){const roll=getHistoryRolls(value.item).find(r=>historyRollContentKey(r)===historyRollContentKey({result:value.result}));value.result.meta={...value.result.meta,model:roll?.model||value.result.meta?.model||'',generatedAt:roll?.createdAt||value.item.createdAt||'',source:roll?.modelSource||''};value.groups=SceneUI.sceneGroups().filter(g=>g.links.some(i=>String(i.id)===String(value.item.id)));if(!value.groups.some(g=>g.scene.groupId===value.sceneId))value.sceneId=!groupId&&value.groups.length===1?value.groups[0].scene.groupId:'';value.dictionaries=root.DictionaryUI?await DictionaryUI.snapshots(historyDisplayTitle(value.item),{refresh:true}).catch(()=>[]):[];value.dictionaryId=value.dictionaries[0]?.id||'';value.initial={id:value.item.id,selected:[...keys],checked:true,scene:value.sceneId,dictionary:value.dictionaryId};const previous=saved?.find(v=>String(v.id)===String(value.item.id));if(previous){value.selected=previous.selected.filter(k=>keys.includes(k));value.checked=previous.checked;value.sceneId=value.groups.some(g=>g.scene.groupId===previous.scene)?previous.scene:'';value.dictionaryId=value.dictionaries.some(d=>d.id===previous.dictionary)?previous.dictionary:''}}
   if(!node.isConnected||cloudUser?.id!==account)return;
   body.innerHTML='<div class="learning-send-controls"><label class="scene-field"><span>接收电脑</span><select data-learning-device>'+eligible.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.name)+'</option>').join('')+'</select></label><p>Lexi Learning v3 · 每词条一张卡，保留已有 Lapis 和旧版卡片。</p></div><div class="learning-send-layout"><aside><div data-learning-entries></div><section class="learning-selection"><h3>卡片内容</h3><div class="learning-selection-presets"><button class="plain-btn" data-content-preset="all">全选</button><button class="plain-btn" data-content-preset="core">仅核心义</button><button class="icon-btn" data-content-preset="all" aria-label="恢复默认内容" data-tip="恢复默认内容">'+icon('rotate-ccw')+'</button></div><div data-learning-sections></div></section><label class="scene-field"><span>场景 · 可选</span><select data-learning-scene></select></label><label class="scene-field"><span>词典快照 · 可选</span><select data-learning-dictionary></select></label></aside><section class="learning-card-pane"><div class="learning-face-controls" role="group" aria-label="卡片预览面"><button class="plain-btn" data-learning-face="front" aria-pressed="false">正面</button><button class="plain-btn active" data-learning-face="back" aria-pressed="true">背面</button></div><div data-learning-preview></div></section></div>';
   const footer=document.createElement('footer');footer.innerHTML='<span data-learning-count></span><button class="plain-btn primary-btn" data-submit-learning>'+icon('layers')+'准备 Anki 预览</button>';node.insertBefore(footer,status);
   let face='back';
   function preview(){
    const generation=++previewGeneration;releasePreview();
    const value=values[active],data=LearningContent.snapshot(value.result,value.selected,value.item.query||''),scene=value.groups.find(g=>g.scene.groupId===value.sceneId)?.scene;
    body.querySelector('[data-learning-preview]').innerHTML='<article class="lexi-learning"><h2>'+esc(data.result.headword.title)+'</h2>'+(scene?.quote?'<p>'+LearningContent.highlight(scene.quote,SceneStudy.link(value.item,scene.groupId)?.exampleHighlights||scene.exampleHighlights)+'</p>':'')+(face==='back'?(scene?.translation?'<p class="learning-translation">'+LearningContent.highlight(scene.translation,SceneStudy.link(value.item,scene.groupId)?.translationHighlights||scene.translationHighlights)+'</p>':'')+(data.result.headword.coreMeaning?'<div class="learning-core">'+esc(data.result.headword.coreMeaning)+'</div>':'')+LearningContent.render(data):'')+'<div data-learning-media></div></article>';
    const host=body.querySelector('[data-learning-media]');host.className='media';
    if(scene&&root.SceneMedia)for(const ref of scene.media)SceneMedia.resolve(ref).then(file=>{if(!host.isConnected||generation!==previewGeneration||cloudUser?.id!==account)return;const url=URL.createObjectURL(file.blob);previewUrls.push(url);const element=document.createElement(ref.mime.startsWith('image/')?'img':ref.mime.startsWith('audio/')?'audio':'video');element.src=url;if(element.tagName==='IMG')element.alt=ref.name;else{element.controls=true;element.preload='metadata'}host.append(element)}).catch(e=>{if(host.isConnected&&generation===previewGeneration){const p=document.createElement('p');p.textContent='素材暂未显示：'+e.message;host.append(p)}});
    const dictionary=value.dictionaries.find(s=>s.id===value.dictionaryId);if(face==='back'&&dictionary){const section=document.createElement('section');section.className='dictionary-reading';DictionaryUI.renderSnapshot(section,dictionary);body.querySelector('[data-learning-preview] article').append(section)}
   }
   function counts(){const n=values.filter(v=>v.checked).length;footer.querySelector('[data-learning-count]').textContent='已选 '+n+' 张 · 正文默认完整带入';footer.querySelector('[data-submit-learning]').disabled=pending||!n||values.some(v=>v.checked&&!v.selected.length)}
   function render(){
    const value=values[active];body.querySelector('[data-learning-entries]').innerHTML=values.map((v,i)=>'<div class="learning-entry-choice"><input type="checkbox" aria-label="选择 '+esc(historyDisplayTitle(v.item))+'" data-learning-check="'+i+'" '+(v.checked?'checked':'')+'><button class="plain-btn '+(i===active?'active':'')+'" data-learning-entry="'+i+'">'+esc(historyDisplayTitle(v.item))+'</button></div>').join('');
    body.querySelectorAll('[data-learning-check]').forEach(n=>n.onchange=()=>{values[Number(n.dataset.learningCheck)].checked=n.checked;counts()});body.querySelectorAll('[data-learning-entry]').forEach(n=>n.onclick=()=>{active=Number(n.dataset.learningEntry);render()});
    body.querySelector('[data-learning-sections]').innerHTML=Object.entries(LearningContent.sections).map(([key,label])=>'<label><input type="checkbox" data-content-part="'+key+'" '+(value.selected.includes(key)?'checked':'')+'><span>'+label+(Array.isArray(value.result[key])?' · '+value.result[key].length:'')+'</span></label>').join('');
    body.querySelectorAll('[data-content-part]').forEach(n=>n.onchange=()=>{value.selected=keys.filter(k=>body.querySelector('[data-content-part="'+k+'"]').checked);try{preview();status.textContent=''}catch(e){status.textContent=e.message}counts()});
    const sceneSelect=body.querySelector('[data-learning-scene]');sceneSelect.innerHTML='<option value="">不带场景</option>'+value.groups.map(g=>'<option value="'+esc(g.scene.groupId)+'">'+esc(g.scene.title||g.scene.quote||'素材场景')+'</option>').join('');sceneSelect.value=value.sceneId;sceneSelect.onchange=()=>{value.sceneId=sceneSelect.value;preview()};
    const dictionary=body.querySelector('[data-learning-dictionary]');dictionary.innerHTML='<option value="">不带词典</option>'+value.dictionaries.map(s=>'<option value="'+esc(s.id)+'">'+esc(s.payload.dictionary)+' · '+s.payload.senses.length+' 个义项</option>').join('');dictionary.value=value.dictionaryId;dictionary.onchange=()=>{value.dictionaryId=dictionary.value;preview()};
    try{preview();status.textContent=''}catch(e){status.textContent=e.message}counts();
   }
   body.querySelectorAll('[data-content-preset]').forEach(n=>n.onclick=()=>{values[active].selected=n.dataset.contentPreset==='core'?['core']:[...keys];render()});
   body.querySelectorAll('[data-learning-face]').forEach(n=>n.onclick=()=>{face=n.dataset.learningFace;body.querySelectorAll('[data-learning-face]').forEach(b=>{b.classList.toggle('active',b===n);b.setAttribute('aria-pressed',String(b===n))});preview()});
   const initial=()=>values.map(v=>({id:v.item.id,selected:v.selected,checked:v.checked,scene:v.sceneId,dictionary:v.dictionaryId}));const baseline=values.map(v=>structuredClone(v.initial));
   UIOverlays.guardDialog(node,{getState:()=>submitted?baseline:initial(),initialState:baseline,canRestore:()=>cloudUser?.id===account&&values.every(v=>getHistory().some(i=>String(i.id)===String(v.item.id)&&i.updatedAt===v.item.updatedAt)),restore:saved=>open(entries,{groupId,saved})});
   footer.querySelector('[data-submit-learning]').onclick=async()=>{
    if(pending)return;pending=true;counts();status.textContent='正在保存完整释义快照…';
    try{
     if(cloudUser?.id!==account)throw Error('账号已切换。');
     const cards=[],mediaAll=new Map();
     for(const value of values.filter(v=>v.checked)){
      if(!getHistory().some(i=>String(i.id)===String(value.item.id)))throw Error('词条已删除，请重新选择。');
      const content=LearningContent.snapshot(value.result,value.selected,value.item.query||''),saved=await request('content_save',{payload:content});
      const scene=value.groups.find(g=>g.scene.groupId===value.sceneId)?.scene,live=scene&&SceneUI.sceneGroups().find(g=>g.scene.groupId===scene.groupId)?.scene;
      if(scene&&JSON.stringify(scene)!==JSON.stringify(live))throw Error('场景已有变化，请关闭后重新准备。');
      const associated=scene?SceneStudy.link(value.item,scene.groupId):null,media=structuredClone(scene?.media||[]);
      for(const ref of media.filter(r=>r.mime.startsWith('video/'))){const blob=await ScenePreview.get(ref);blob.name='场景视频封面.jpg';media.push(await SceneData.putFile(blob))}
      if(media.length>10)throw Error('素材连同视频封面最多10份。');for(const ref of media)mediaAll.set(ref.id,ref);
      const card={key:await digest(JSON.stringify(['lexi',scene?'scene':'entry',scene?.groupId||'',String(value.item.id)])),sourceKind:scene?'scene':'entry',sourceType:scene?.externalSource?.type==='fushi'?'fushi':'lexi',sourceId:scene?.externalSource?.id||String(value.item.id),sceneId:scene?.groupId||'',entryId:String(value.item.id),title:content.result.headword.title,origin:value.item.query||'',quote:scene?.quote||'',translation:scene?.translation||'',meaning:content.result.headword.coreMeaning||'',note:scene?.note||value.item.note||'',sourceTitle:[scene?.sourceTitle,scene?.chapter,scene?.timeRange].filter(Boolean).join(' · '),sourceUrl:scene?.sourceUrl||'',exampleHighlights:associated?.exampleHighlights||scene?.exampleHighlights||[],translationHighlights:associated?.translationHighlights||scene?.translationHighlights||[],media,contentRef:{id:saved.id,hash:saved.hash}};
      const dictionary=value.dictionaries.find(s=>s.id===value.dictionaryId);if(dictionary)card.dictionaryRef={id:dictionary.id,hash:dictionary.hash};cards.push(card);
     }
     if([...mediaAll.values()].reduce((n,r)=>n+r.size,0)>50*1024*1024)throw Error('单批素材最多50MB。');
     for(const ref of mediaAll.values()){status.textContent='正在同步所选素材…';await SceneMedia.upload(ref)}
     const job=await request('submit',{deviceId:body.querySelector('[data-learning-device]').value,payload:{version:4,cards}});submitted=true;footer.remove();
     body.innerHTML='<h3>等待电脑准备预览</h3><p>'+cards.length+' 张 · 尚未写入 Anki，确认当前牌库和卡面后才执行。</p><button class="plain-btn" data-open-learning-review>查看预览与任务</button>';status.textContent='';body.querySelector('[data-open-learning-review]').onclick=()=>{node.close();AnkiBridge.manage()};
    }catch(e){status.textContent=e.message;pending=false;counts()}
   };render();
  }catch(e){status.textContent=e.message}
 }
 async function entry(id){const item=getHistory().find(i=>String(i.id)===String(id));if(item)return open([item]);notify('词条已删除或尚未保存。','warn','制卡')}
 async function current(){let item=getCurrentHistoryItem();if(!item&&currentResult){const value=saveLookupResult({query:currentResult.meta?.query||currentResult.headword?.title||'',result:currentResult,modelInfo:currentResultModelInfo});if(!value.persisted)return notify('词条未能保存，尚未提交制卡。','warn','制卡');currentHistoryId=value.item.id;item=value.item}if(item)return open([item]);notify('请先完成并保存词条。','info','制卡')}
 function group(groupId,entryId=''){const value=SceneUI.sceneGroups().find(g=>g.scene.groupId===groupId);if(value)return open(value.links.filter(i=>!entryId||String(i.id)===String(entryId)),{groupId})}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-create-learning-card]');if(!b)return;e.stopPropagation();b.dataset.createLearningCard==='current'?current():entry(b.dataset.createLearningCard)});
 root.LearningCards={openEntry:entry,openGroup:group,readSnapshot};
})(globalThis);
