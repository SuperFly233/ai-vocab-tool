(function(root){
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const owner=()=>cloudUser?.id||'local';
  const labels={new:'未学习',review:'待回顾',mastered:'已掌握'};
  const records=item=>SceneData.reconcile(item?.scenes,item?.sceneTombstones).items;
  const entry=id=>getHistory().find(row=>String(row.id)===String(id));
  const link=(item,gid)=>records(item).find(scene=>scene.groupId===gid);
  const state=(item,gid)=>link(item,gid)?.studyState||'new';
  const meaning=(item,gid='')=>{const scene=gid?link(item,gid):null,target=scene?.learningTargets?.find(v=>v.entryId===String(item.id)||[item.query,historyDisplayTitle(item)].some(text=>String(text||'').trim().toLocaleLowerCase()===v.phrase.toLocaleLowerCase()));return target?.meaning||displayedResultForHistory(item.id,item)?.headword?.coreMeaning||''};
  function refresh(id){if(id)refreshFragmentPinViews(id);root.SceneWorkspace?.render()}
  function update(id,gid,changes,{expected=null,undo=true,restore=null}={}){
    const item=entry(id),before=records(item).filter(scene=>scene.groupId===gid),account=owner();
    if(!item||!before.length)throw new Error('词条或场景关联已不存在。');
    if(expected&&JSON.stringify(before)!==expected)throw new Error('关联已更新，请重新打开后编辑。');
    const clock=new Date(Math.max(Date.now(),...before.map(row=>Date.parse(row.studyUpdatedAt)||0),...before.map(row=>Date.parse(row.updatedAt)||0))+1).toISOString();
    const next=before.map(scene=>({...scene,...(restore?.get(scene.id)||changes),...('studyState' in changes?{studyUpdatedAt:clock}:{updatedAt:clock})}));
    const nextById=new Map(next.map(scene=>[scene.id,scene]));
    if(!setHistory(getHistory().map(row=>row.id===item.id?{...row,scenes:records(row).map(scene=>nextById.get(scene.id)||scene),updatedAt:clock}:row)))throw new Error('保存失败，请检查本机存储。');
    refresh(item.id);
    if(undo)notify('关联设置已保存。','good','场景学习',true,{label:'撤销',run:()=>{
      if(account!==owner())return notify('账号已切换，未恢复其他账号的数据。','warn','撤销');
      const current=records(entry(id)).filter(scene=>scene.groupId===gid);
      if(JSON.stringify(current)!==JSON.stringify(next))return notify('关联已有后续修改，未覆盖。','warn','撤销');
      const restored=new Map(before.map(scene=>[scene.id,Object.fromEntries(Object.keys(changes).map(key=>[key,scene[key]]))]));
      try{update(id,gid,changes,{expected:JSON.stringify(current),undo:false,restore:restored})}catch(error){notify(error.message,'warn','撤销')}
    }});
  }
  function setState(id,gid,value){if(!(value in labels))return;update(id,gid,{studyState:value})}
  function dialog(title){
    const node=document.createElement('dialog');node.className='scene-study-dialog';node.innerHTML=`<header><h2>${esc(title)}</h2><button type="button" class="icon-btn" aria-label="关闭" data-tip="关闭">${icon('x')}</button></header><div class="scene-dialog-body"></div><p class="scene-dialog-status" role="status"></p>`;
    node.querySelector('header button').onclick=()=>node.close();node.addEventListener('close',()=>node.remove());document.body.append(node);node.showModal();return node;
  }
  async function associate(gid,ids){
    const group=SceneUI.sceneGroups().find(row=>row.scene.groupId===gid);if(!group)throw new Error('原场景已不存在。');
    const chosen=new Set(ids.map(String)),added=[],clock=new Date().toISOString(),account=owner();
    const history=getHistory().map(item=>{
      if(!chosen.has(String(item.id))||link(item,gid))return item;
      const baseline=SceneData.reconcile(getSettings().sceneLibrary,getSettings().sceneLibraryTombstones).items.find(scene=>scene.groupId===gid);
      const {highlightPairs,...plainScene}=group.scene;const scene=SceneData.normalizeScene({...plainScene,...(baseline&&Object.hasOwn(baseline,'highlightPairs')?{highlightPairs:baseline.highlightPairs}:{}),id:crypto.randomUUID(),targetKey:'',targetLabel:'',featured:group.scene.featured,exampleHighlights:baseline?.exampleHighlights||[],translationHighlights:baseline?.translationHighlights||[],studyState:'new',studyUpdatedAt:'',createdAt:group.scene.createdAt||clock,updatedAt:group.scene.updatedAt||clock});
      added.push({id:item.id,scene});return {...item,scenes:[...records(item),scene],updatedAt:clock};
    });
    if(!added.length)return 0;
    if(!setHistory(history))throw new Error('关联未能保存，请检查本机存储。');
    added.forEach(row=>refreshFragmentPinViews(row.id));refresh();
    notify(`已关联 ${added.length} 个词条。`,'good','场景学习',true,{label:'撤销',run:()=>{
      if(account!==owner())return notify('账号已切换，未撤销。','warn','撤销');
      const now=new Date(Math.max(Date.now(),Date.parse(clock)+1)).toISOString();let skipped=0;
      const next=getHistory().map(item=>{
        const addition=added.find(row=>row.id===item.id);if(!addition)return item;
        const current=records(item).find(scene=>scene.id===addition.scene.id);if(JSON.stringify(current)!==JSON.stringify(addition.scene)){skipped++;return item}
        const data=SceneData.reconcile(records(item),[...(item.sceneTombstones||[]),{key:current.id,deletedAt:now}]);return {...item,scenes:data.items,sceneTombstones:data.tombstones,updatedAt:now};
      });
      if(!setHistory(next))return notify('撤销未能保存。','warn','撤销');added.forEach(row=>refreshFragmentPinViews(row.id));refresh();if(skipped)notify('已保留有后续修改的关联。','info','撤销');
    }});return added.length;
  }
  function openPicker(gid,draft=[]){
    const node=dialog('关联已有词条'),account=owner(),chosen=new Set();
    node.id='scene-association-picker';node.querySelector('.scene-dialog-body').innerHTML=`<label class="history-search search-field"><span>${icon('search')}</span><input type="search" placeholder="搜索词条或核心义" aria-label="搜索已有词条" autocomplete="off"></label><div class="scene-picker-list"></div><footer><span data-chosen-count>已选 0 个</span><button class="plain-btn primary-btn" data-associate-confirm disabled>确认关联</button></footer>`;
    const input=node.querySelector('input'),list=node.querySelector('.scene-picker-list'),confirm=node.querySelector('[data-associate-confirm]');
    draft.forEach(id=>chosen.add(String(id)));confirm.disabled=!chosen.size;node.querySelector('[data-chosen-count]').textContent=`已选 ${chosen.size} 个`;
    UIOverlays.guardDialog(node,{getState:()=>[...chosen].sort(),initialState:[],canRestore:()=>SceneUI.sceneGroups().some(row=>row.scene.groupId===gid),restore:values=>openPicker(gid,values)});
    function render(){
      const query=normalizeSearch(input.value),rows=getHistory().filter(item=>normalizeSearch(`${historyDisplayTitle(item)} ${meaning(item)}`).includes(query));
      list.innerHTML=rows.map(item=>{const linked=Boolean(link(item,gid));return `<label class="scene-picker-row"><input type="checkbox" value="${esc(item.id)}" ${linked||chosen.has(String(item.id))?'checked':''} ${linked?'disabled':''}><span><strong>${esc(historyDisplayTitle(item))}</strong><small>${esc(meaning(item))}</small></span>${linked?'<small>已关联</small>':''}</label>`}).join('')||'<p>没有匹配的词条</p>';
      list.querySelectorAll('input').forEach(box=>box.onchange=()=>{box.checked?chosen.add(box.value):chosen.delete(box.value);confirm.disabled=!chosen.size;node.querySelector('[data-chosen-count]').textContent=`已选 ${chosen.size} 个`});
    }
    input.addEventListener('input',event=>{if(!event.isComposing)render()});input.addEventListener('compositionend',render);render();
    confirm.onclick=async()=>{confirm.disabled=true;try{if(owner()!==account)throw new Error('账号已切换，请重新打开。');await associate(gid,[...chosen]);node.close()}catch(error){node.querySelector('[role="status"]').textContent=error.message;confirm.disabled=false}};
  }
  function openHighlights(id,gid,draft=null){
    const item=entry(id),scene=link(item,gid);if(!scene)return;
    const expected=JSON.stringify(records(item).filter(row=>row.groupId===gid)),account=owner(),node=dialog(`高亮 · ${historyDisplayTitle(item)}`);node.id='scene-highlight-editor';
    const content=node.querySelector('.scene-dialog-body');content.innerHTML='<div class="scene-highlight-preview"></div><div data-highlight-editor></div><footer><button class="plain-btn primary-btn" data-save-pairs>保存高亮</button></footer>';let pairs=HighlightPairsData.fromScene(draft?{...scene,highlightPairs:draft.highlightPairs}:scene);const draw=()=>content.querySelector('.scene-highlight-preview').innerHTML=HighlightPairs.block({...scene,highlightPairs:pairs},{scope:false});const widget=HighlightPairs.mount(content.querySelector('[data-highlight-editor]'),{scene:{...scene,highlightPairs:pairs},read:()=>scene,scope:content,onChange:values=>{pairs=values;draw()}});draw();UIOverlays.guardDialog(node,{getState:()=>widget.get(),initialState:pairs,canRestore:()=>JSON.stringify(records(entry(id)).filter(row=>row.groupId===gid))===expected,restore:values=>openHighlights(id,gid,{highlightPairs:values})});content.querySelector('[data-save-pairs]').onclick=()=>{try{if(account!==owner())throw Error('账号已切换，请重新打开。');const highlightPairs=widget.get();update(id,gid,{highlightPairs,...HighlightPairsData.compatibility(highlightPairs)},{expected});node.close()}catch(error){node.querySelector(':scope>.scene-dialog-status').textContent=error.message}};return;
  }
  function exportData(groups){
    return {format:'lexi-scene-learning',version:1,exportedAt:new Date().toISOString(),scenes:groups.map(({scene,links})=>({scene:SceneData.normalizeScene(scene),entries:links.map(item=>{const associated=link(item,scene.groupId);return {id:item.id,title:historyDisplayTitle(item),origin:item.query,coreMeaning:meaning(item),studyState:state(item,scene.groupId),...(associated&&Object.hasOwn(associated,'highlightPairs')?{highlightPairs:associated.highlightPairs}:{}),exampleHighlights:associated?.exampleHighlights||[],translationHighlights:associated?.translationHighlights||[]}})}))};
  }
  function exportList(groups,format){
    const data=exportData(groups);
    if(format==='json')return downloadText('Lexi-scene-learning.json',JSON.stringify(data,null,2),'application/json');
    const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>Lexi 场景学习清单</title><style>body{font:16px/1.6 system-ui;margin:24px auto;padding:0 18px;max-width:900px;color:#222}section{border-top:1px solid #ddd;padding:20px 0}h1,h2,h3{line-height:1.3}blockquote{margin:12px 0}small{color:#666}mark{background:#ffecaa;overflow-wrap:anywhere}p,blockquote,a{overflow-wrap:anywhere}li{margin:16px 0}</style><h1>场景学习清单</h1>${data.scenes.map(({scene,entries})=>`<section><h2>${esc(scene.title||scene.sourceTitle||'未命名场景')}</h2><blockquote>${esc(scene.quote)}</blockquote><p>${esc(scene.translation)}</p><small>${esc([scene.sourceTitle,scene.chapter,scene.timeRange].filter(Boolean).join(' · '))}</small>${SceneData.sourceUrl(scene.sourceUrl)?`<p><a href="${esc(SceneData.sourceUrl(scene.sourceUrl))}">打开来源</a></p>`:''}<p>${esc(scene.note)}</p>${scene.media.length?`<p>素材需配合原始场景备份：${scene.media.map(ref=>esc(ref.name)).join('、')}</p>`:''}<ul>${entries.length?entries.map(item=>`<li><h3>${esc(item.title)}</h3><p>${esc(item.coreMeaning)}</p><small>${esc(labels[item.studyState])}</small><blockquote>${highlightText(scene.quote,item.exampleHighlights)}</blockquote><p>${highlightText(scene.translation,item.translationHighlights)}</p></li>`).join(''):'<li>尚未关联词条</li>'}</ul></section>`).join('')}</html>`;
    downloadText('Lexi-scene-learning.html',html,'text/html');
  }
  root.SceneStudy={state,labels,link,meaning,setState,update,associate,openPicker,openHighlights,exportData,exportList};
})(globalThis);
