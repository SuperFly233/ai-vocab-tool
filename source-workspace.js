(function(root){
  'use strict';
  const esc=value=>escapeHTML(String(value??'')),owner=()=>cloudUser?.id||'local';
  async function request(action,args={},signal){
    if(!cloudUser)throw Error('请先登录以核对规范来源；离线时可继续浏览场景和原来源文字。');
    const account=owner(),token=await cloudAccessToken();
    if(owner()!==account)throw Error('账号已切换，未发送请求。');
    const response=await fetch('/api/sources',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,args}),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000)});
    const result=await response.json();if(account!==owner())throw Error('账号已切换，旧来源结果未采用。');if(!response.ok)throw Error(result.error||'来源服务未完成请求。');return result.data;
  }
  async function catalog(signal){
    const account=owner(),rows=(await request('list',{},signal)).map(SourceData.source);
    if(account!==owner())throw Error('账号已切换。');
    await LearningStore.write(account,'sources:catalog',rows);return rows;
  }
  async function open(initialId='',restored=null){
    if(document.querySelector('.source-workspace[open]'))return;
    const account=owner(),node=AnkiBridge.dialog('场景检查与整理'),body=node.querySelector('.scene-dialog-body'),controller=new AbortController();
    node.classList.add('source-workspace');node.querySelector('.scene-dialog-status').remove();
    const groups=SceneUI.sceneGroups(),drafts=new Map(),newFolders=new Map();
    let active=groups.find(v=>v.scene.groupId===initialId)||groups[0],sources=[],busy=false,url='',serial=0,writes=Promise.resolve(),retainDraft=false,cloudEnabled=false;
    const valid=()=>node.open&&account===owner(),assert=()=>{if(!valid())throw Error('账号或窗口已变化，未采用。')};
    body.innerHTML='<div class="source-head"><label><span>体检范围</span><select data-source-filter><option value="all">全部场景</option><option value="missing">有待整理项</option><option value="source">来源待整理</option><option value="folders">尚未分类</option></select></label><span data-source-coverage>正在读取检查状态…</span><button class="icon-btn" data-source-export hidden aria-label="导出来源目录" data-tip="导出来源目录">'+icon('download')+'</button></div><div class="source-columns"><nav data-source-list aria-label="待核对场景"></nav><section data-source-original></section><section data-source-check></section></div><footer class="source-footer"><span role="status">只读体检不会调用模型或修改记录。</span><button class="plain-btn primary-btn" data-source-apply disabled>保存采用</button></footer>';
    const status=text=>{if(valid())body.querySelector('[role=status]').textContent=text};
    const snapshot=()=>({rows:[...drafts.entries()].filter(([,d])=>d.dirty),folders:[...newFolders.values()]});
    const persist=()=>{const value=structuredClone(snapshot());writes=writes.then(()=>LearningStore.write(account,'sources:review',value)).catch(e=>status('核对草稿未落盘，请勿刷新。'+e.message));return writes};
    const organization=id=>JSON.stringify(SceneData.mergeOrganization(getSettings().sceneOrganization)[id]||{});
    const folders=()=>[...folderCatalog().filter(f=>f.selectable!==false&&f.id!==FOLDER_LIKED_ID),...newFolders.values()];
    function draft(group){
      if(!drafts.has(group.scene.groupId)){const s=group.scene,current=SceneOrganization.state(s.groupId);drafts.set(s.groupId,{expected:SceneUI.supplementVersion(s.groupId),orgExpected:organization(s.groupId),choice:s.sourceRef?.id||'',sourceRevision:sources.find(v=>v.id===s.sourceRef?.id)?.revision||0,chapter:s.chapter,translation:s.translation,sourceUrl:s.sourceUrl,evidence:s.sourceRef?.evidence||null,folderIds:current.folderIds,favorite:current.favorite,dirty:false,staged:false})}
      return drafts.get(group.scene.groupId);
    }
    function issues(group){const result=cloudEnabled?SourceData.health(group,sources):[...(!group.scene.quote?.trim()?['缺原句']:[]),...(!group.scene.learningTargets?.some(v=>v.meaning?.trim())?['缺语境义']:[]),...(!group.scene.sourceTitle?.trim()?['来源待整理']:[])];if(!SceneOrganization.state(group.scene.groupId).folderIds.length)result.push('尚未分类');return result}
    function list(){
      const filter=body.querySelector('[data-source-filter]').value;
      body.querySelector('[data-source-list]').innerHTML=groups.filter(g=>filter==='all'||filter==='missing'&&issues(g).length||filter==='source'&&issues(g).includes('来源待整理')||filter==='folders'&&issues(g).includes('尚未分类')).map(g=>'<button class="source-row '+(g===active?'active':'')+'" aria-current="'+(g===active)+'" data-source-id="'+esc(g.scene.groupId)+'"><strong>'+esc(g.scene.title||g.scene.quote||'未命名场景')+'</strong><span>'+esc(g.scene.quote||'素材场景')+'</span><small>'+esc(issues(g).join(' · ')||'基础字段齐全')+(drafts.get(g.scene.groupId)?.staged?' · 待采用':'')+'</small></button>').join('')||'<p>此范围没有场景。</p>';
      body.querySelectorAll('[data-source-id]').forEach(b=>b.onclick=()=>{active=groups.find(g=>g.scene.groupId===b.dataset.sourceId);show()});
      const count=[...drafts.values()].filter(d=>d.staged).length;body.querySelector('[data-source-apply]').disabled=busy||!count;body.querySelector('[data-source-apply]').textContent=count?'保存采用 '+count+' 项':'保存采用';
    }
    async function job(run){
      if(busy)return;busy=true;list();
      try{assert();await run();assert()}catch(e){if(valid())status(e.name==='AbortError'?'请求已停止，原内容和建议保留。':e.message)}
      finally{busy=false;if(valid())list()}
    }
    function show(){
      if(!valid())return;const version=++serial;list();
      if(url){URL.revokeObjectURL(url);url=''}
      const original=body.querySelector('[data-source-original]'),check=body.querySelector('[data-source-check]');
      if(!active){original.textContent='尚无场景。';check.replaceChildren();return}
      const scene=active.scene,d=draft(active),matched=SourceData.match(scene,sources);
      original.innerHTML='<div class="source-media"></div><h3>原句与译文</h3><p>'+esc(scene.quote||'未填写原句')+'</p><p class="source-muted">'+esc(scene.translation)+'</p><h3>现有来源</h3><p>'+esc([scene.sourceTitle,scene.chapter].filter(Boolean).join(' · ')||'尚未填写')+'</p><p class="source-muted">'+esc(issues(active).join(' · '))+'</p>';
      const ref=scene.media.find(v=>v.mime.startsWith('image/'));if(ref)SceneMedia.resolve(ref).then(record=>{if(!valid()||version!==serial)return;url=URL.createObjectURL(record.blob);const img=new Image();img.alt='当前场景素材';img.src=url;original.querySelector('.source-media').append(img)}).catch(()=>{if(valid()&&version===serial)original.querySelector('.source-media').textContent='素材暂不可用；可继续核对文字。'});
      check.innerHTML='<h3>来源核对</h3><p class="source-muted">'+(matched.method==='identity'?'已有稳定来源身份；更名不影响关联。':matched.method==='ambiguous'?'名称或别名冲突，请选择。':matched.candidates.length?'已有候选，核对后复用。':'尚无确定来源，可核对语录或建立来源。')+'</p><label class="scene-field"><span>规范来源</span><select data-source-choice><option value="">保留原来源文字</option>'+sources.filter(s=>!s.deleted).map(s=>'<option value="'+esc(s.id)+'">'+esc(s.name)+(matched.candidates.some(c=>c.id===s.id)?' · 候选':'')+'</option>').join('')+'</select></label><details><summary>管理来源名称与别名</summary><label class="scene-field"><span>规范名称</span><input data-source-name maxlength="200"></label><label class="scene-field"><span>类型</span><select data-source-type><option value="other">其他</option><option value="game">游戏</option><option value="animation">动画</option><option value="book">书籍</option><option value="video">视频</option></select></label><label class="scene-field"><span>确认过的别名，每行一个</span><textarea class="content-editor" data-source-alias rows="2"></textarea></label><div class="source-inline-actions"><button class="plain-btn" data-source-new>新建来源</button><button class="plain-btn" data-source-save>保存来源目录</button></div></details><button class="plain-btn" data-source-search>'+icon('search')+'核对 Teyvat 语录</button><div data-source-evidence></div><label class="scene-field"><span>章节</span><input data-source-chapter maxlength="400"></label><label class="scene-field"><span>译文</span><textarea class="content-editor" data-source-translation rows="2" maxlength="4000"></textarea></label><h3>个人分类</h3><div data-source-folders></div><label class="scene-field"><span>新收藏夹名称</span><span class="source-inline-actions"><input data-source-folder-name maxlength="60"><button class="icon-btn" data-source-new-folder aria-label="准备新收藏夹" data-tip="准备新收藏夹">'+icon('plus')+'</button></span></label><button class="plain-btn" data-source-stage>加入本批核对</button>';
      const choice=check.querySelector('[data-source-choice]');choice.value=d.choice;
      const cloudBox=document.createElement('section');cloudBox.className='source-cloud';cloudBox.dataset.sourceCloud='';
      for(const child of [...check.children]){if(child.querySelector('[data-source-chapter]'))break;cloudBox.append(child)}
      check.prepend(cloudBox);cloudBox.hidden=!cloudEnabled;body.querySelector('[data-source-export]').hidden=!cloudEnabled;
      if(d.sourceTitle===undefined)d.sourceTitle=scene.sourceTitle;
      const raw=document.createElement('label');raw.className='scene-field';raw.hidden=cloudEnabled;raw.innerHTML='<span>来源文字</span><input data-source-title maxlength="400">';cloudBox.after(raw);raw.querySelector('input').value=d.sourceTitle;raw.querySelector('input').readOnly=Boolean(scene.sourceRef);
      function sourceForm(){const src=sources.find(s=>s.id===d.choice);check.querySelector('[data-source-name]').value=src?.name||scene.sourceTitle;check.querySelector('[data-source-type]').value=src?.type||'other';check.querySelector('[data-source-alias]').value=src?.aliases.join('\n')||''}
      sourceForm();check.querySelector('[data-source-chapter]').value=d.chapter;check.querySelector('[data-source-translation]').value=d.translation;
      const changed=()=>{d.dirty=true;d.staged=false;persist();list()};
      raw.querySelector('input').oninput=e=>{d.sourceTitle=e.target.value;changed()};
      choice.onchange=()=>{d.choice=choice.value;d.sourceRevision=sources.find(s=>s.id===d.choice)?.revision||0;d.evidence=null;sourceForm();changed()};
      check.querySelector('[data-source-chapter]').oninput=e=>{d.chapter=e.target.value;changed()};
      check.querySelector('[data-source-translation]').oninput=e=>{d.translation=e.target.value;changed()};
      for(const selector of ['[data-source-name]','[data-source-type]','[data-source-alias]'])check.querySelector(selector).addEventListener('input',()=>{d.catalogDraft={name:check.querySelector('[data-source-name]').value,type:check.querySelector('[data-source-type]').value,aliases:check.querySelector('[data-source-alias]').value};changed()});
      if(d.catalogDraft)for(const [key,selector] of [['name','[data-source-name]'],['type','[data-source-type]'],['aliases','[data-source-alias]']])check.querySelector(selector).value=d.catalogDraft[key];
      check.querySelector('[data-source-new]').onclick=()=>{choice.value='';d.choice='';d.catalogDraft={name:scene.sourceTitle,type:'other',aliases:''};sourceForm();changed()};
      check.querySelector('[data-source-save]').onclick=()=>job(async()=>{
        const old=sources.find(s=>s.id===choice.value),input=SourceData.source({id:old?.id||crypto.randomUUID(),name:check.querySelector('[data-source-name]').value,type:check.querySelector('[data-source-type]').value,aliases:check.querySelector('[data-source-alias]').value.split('\n').filter(v=>v.trim())});
        await request('save',{...input,expectedRevision:old?.revision||0},controller.signal);assert();
        sources=await catalog(controller.signal);assert();d.choice=input.id;d.sourceRevision=sources.find(s=>s.id===input.id).revision;d.catalogDraft=null;changed();show();status('来源目录已保存；场景尚未改变，仍需保存采用。');
      });
      function renderFolders(){
        const proposals=folders().filter(f=>scene.sourceTitle&&SourceData.normalize(scene.sourceTitle)===SourceData.normalize(f.name)).map(f=>f.id);
        check.querySelector('[data-source-folders]').innerHTML=folders().map(f=>'<label class="source-folder"><input type="checkbox" value="'+esc(f.id)+'" '+(d.folderIds.includes(f.id)?'checked':'')+'><span>'+esc(f.name)+(proposals.includes(f.id)?' · 名称一致建议':'')+'</span></label>').join('')||'<p class="source-muted">尚无自定义收藏夹，可就地准备一个。</p>';
        check.querySelectorAll('.source-folder input').forEach(input=>input.onchange=()=>{d.folderIds=[...check.querySelectorAll('.source-folder input:checked')].map(v=>v.value);changed()});
      }renderFolders();
      check.querySelector('[data-source-new-folder]').onclick=()=>{
        const name=check.querySelector('[data-source-folder-name]').value.trim();if(!name)return status('请填写收藏夹名称。');
        let folder=folders().find(f=>SourceData.normalize(f.name)===SourceData.normalize(name));
        if(!folder){const now=new Date().toISOString();folder={id:'folder_'+crypto.randomUUID(),name,parentId:'',order:getSettings().favoriteFolders.length+newFolders.size,createdAt:now,updatedAt:now};newFolders.set(folder.id,folder)}
        d.folderIds=[...new Set([...d.folderIds,folder.id])];changed();renderFolders();check.querySelector('[data-source-folder-name]').value='';status('分类已准备，保存采用后才会创建或修改。');
      };
      check.querySelector('[data-source-folder-name]').onkeydown=e=>{if(e.key==='Enter'&&!e.isComposing){e.preventDefault();check.querySelector('[data-source-new-folder]').click()}};
      const drawEvidence=rows=>{
        const panel=check.querySelector('[data-source-evidence]');panel.innerHTML=rows.length?rows.map((r,i)=>'<label class="source-match"><input type="radio" name="teyvat-match" value="'+i+'"><span><strong>'+esc(r.title)+'</strong><span>'+esc(r.en)+'</span><span>'+esc(r.zh)+'</span></span></label>').join(''):'<p>当前索引覆盖中未匹配，不代表全库不存在。</p>';
        panel.querySelectorAll('input').forEach(input=>input.onchange=()=>{
          const r=rows[Number(input.value)];if(!r.en||!r.zh)return status('此条缺少对应语言，请人工核对，不作为完整双语依据。');
          if(![r.en,r.zh].some(v=>SourceData.normalize(v)===SourceData.normalize(scene.quote)))return status('原句不完全匹配，未采用依据。');
          d.evidence={key:r.key,version:r.version,chapter:r.title,url:r.url};d.chapter=r.title;d.sourceUrl=r.url;
          if(!scene.translation)d.translation=SourceData.normalize(scene.quote)===SourceData.normalize(r.en)?r.zh:r.en;
          check.querySelector('[data-source-chapter]').value=d.chapter;check.querySelector('[data-source-translation]').value=d.translation;changed();status('语录依据已选；已有译文不覆盖，请核对规范来源后加入本批。');
        });
      };
      check.querySelector('[data-source-search]').onclick=()=>job(async()=>{
        if(!scene.quote?.trim())throw Error('先补充完整原句，不能仅凭标题或图片确定语录。');
        const rows=await request('search',{query:scene.quote},controller.signal);assert();if(version!==serial)return;
        d.matches=rows;drawEvidence(rows);persist();status(rows.length===1?'唯一逐字匹配，仍需核对语言和来源。':rows.length?'存在多个匹配，需选择对应语录。':'当前索引未匹配。');
      });
      if(d.matches)drawEvidence(d.matches);
      if(d.evidence){const p=document.createElement('p');p.className='source-muted';p.textContent='已选依据：'+d.evidence.chapter;check.querySelector('[data-source-evidence]').append(p)}
      const stage=check.querySelector('[data-source-stage]');stage.textContent=d.staged?'移出本批核对':'加入本批核对';
      stage.onclick=()=>{
        if(busy)return;try{assert();if(d.staged){d.staged=false;persist();list();stage.textContent='加入本批核对';status('已移出本批，编辑建议仍保留。');return}if([...drafts.values()].filter(v=>v.staged).length>=20)throw Error('每批最多20个场景。');if(cloudEnabled&&d.evidence&&!d.choice)throw Error('采用语录依据前，请明确选择或建立规范来源。');d.dirty=true;d.staged=true;persist();list();stage.textContent='移出本批核对';status('已加入核对，尚未修改场景或分类。')}catch(e){status(e.message)}
      };
      SharedUI.enhanceSelects(check);
    }
    body.querySelector('[data-source-filter]').onchange=list;
    body.querySelector('[data-source-export]').onclick=()=>downloadText('Lexi-sources.json',JSON.stringify({format:'lexi-sources',version:1,sources},null,2));
    body.querySelector('[data-source-apply]').onclick=()=>job(async()=>{
      const selected=structuredClone([...drafts.entries()].filter(([,d])=>d.staged)),reviewVersion=JSON.stringify(snapshot());if(!selected.length)throw Error('先加入需要采用的场景。');
      if(cloudEnabled&&selected.some(([,d])=>d.choice))sources=await catalog(controller.signal);assert();if(reviewVersion!==JSON.stringify(snapshot()))throw Error('核对内容已有修改，请再次加入本批后保存。');
      const settings=getSettings(),beforeFolders=structuredClone(settings.favoriteFolders),oldRows=[],changes=[];
      for(const [id,d] of selected){
        const group=SceneUI.sceneGroups().find(g=>g.scene.groupId===id);if(!group||SceneUI.supplementVersion(id)!==d.expected||organization(id)!==d.orgExpected)throw Error('场景、关联或分类已有更新；本批未保存，请重新核对。');
        const patch={chapter:d.chapter,translation:d.translation};
        if(!cloudEnabled&&!group.scene.sourceRef)patch.sourceTitle=d.sourceTitle??group.scene.sourceTitle;
        if(cloudEnabled&&d.choice){const src=sources.find(s=>s.id===d.choice&&!s.deleted);if(!src||src.revision!==d.sourceRevision)throw Error('来源目录已有更新；本批未保存，请重新核对。');patch.sourceTitle=src.name;patch.sourceRef=SourceData.reference({id:src.id,name:src.name,method:d.evidence?'teyvat':'manual',...(d.evidence?{evidence:d.evidence}:{})});if(d.evidence)patch.sourceUrl=d.sourceUrl}
        oldRows.push({id,patch:Object.fromEntries(Object.keys(patch).map(k=>[k,group.scene[k]??(k==='sourceRef'?null:'')])),organization:structuredClone(SceneOrganization.state(id))});changes.push({id,expected:d.expected,patch});
      }
      const used=new Set(selected.flatMap(([,d])=>d.folderIds)),added=[...newFolders.values()].filter(f=>used.has(f.id));
      if(added.some(f=>folderCatalog().some(old=>SourceData.normalize(old.name)===SourceData.normalize(f.name))))throw Error('新增收藏夹出现同名项，请重新核对。');
      const afterFolders=[...settings.favoriteFolders,...added],org={expectedFolders:JSON.stringify(settings.favoriteFolders),folders:afterFolders,rows:selected.map(([id,d])=>({id,expected:d.orgExpected,folderIds:d.folderIds,favorite:d.favorite}))};
      SceneUI.applySupplement(changes,account,{sourceOrganization:org});
      const undo=oldRows.map(row=>({...row,expected:SceneUI.supplementVersion(row.id),orgExpected:organization(row.id)})),expectedFolders=JSON.stringify(getSettings().favoriteFolders);
      selected.forEach(([id])=>drafts.delete(id));newFolders.clear();await persist();assert();list();show();status('已采用 '+changes.length+' 个场景；未修改其他正文或词条。');
      notify('场景整理已采用。','good','整理',true,{label:'撤销',run:()=>{
        try{if(account!==owner())throw Error('账号已切换，未撤销。');if(added.some(folder=>getHistory().some(item=>(item.folderIds||[]).includes(folder.id))||SceneUI.sceneGroups().some(g=>!undo.some(u=>u.id===g.scene.groupId)&&SceneOrganization.state(g.scene.groupId).folderIds.includes(folder.id))))throw Error('新收藏夹已关联其他内容，未撤销以免影响后续整理。');SceneUI.applySupplement(undo,account,{undo:true,sourceOrganization:{expectedFolders,folders:beforeFolders,rows:undo.map(v=>({id:v.id,expected:v.orgExpected,folderIds:v.organization.folderIds,favorite:v.organization.favorite}))}})}catch(e){notify(e.message,'warn','撤销')}
      }});
    });
    const authChanged=()=>{if(account!==owner()){retainDraft=true;persist();node.close()}};
    addEventListener('lexi-auth-context',authChanged);
    node.addEventListener('close',()=>{removeEventListener('lexi-auth-context',authChanged);controller.abort();serial++;if(url)URL.revokeObjectURL(url);if(!retainDraft)writes=writes.then(()=>LearningStore.write(account,'sources:review',null)).catch(()=>{})},{once:true});
    UIOverlays.guardDialog(node,{getState:snapshot,initialState:{rows:[],folders:[]},restore:saved=>open(initialId,saved),canRestore:()=>[...drafts].filter(([,d])=>d.dirty).every(([id,d])=>SceneUI.supplementVersion(id)===d.expected)});
    SharedUI.enhanceSelects(body);
    try{
      const saved=restored||await LearningStore.read(account,'sources:review');assert();if(saved){for(const [id,d] of saved.rows||[])if(groups.some(g=>g.scene.groupId===id))drafts.set(id,d);for(const f of saved.folders||[])newFolders.set(f.id,f)}
      sources=(await LearningStore.read(account,'sources:catalog')||[]).map(SourceData.source);assert();
      try{const response=await fetch('/api/sources',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(5000)])});const capability=await response.json();cloudEnabled=response.ok&&capability.enabled===true&&Boolean(cloudUser)}catch{cloudEnabled=false}
      assert();
      if(cloudEnabled){sources=await catalog(controller.signal);const coverage=await request('coverage',{},controller.signal);assert();body.querySelector('[data-source-coverage]').textContent='已索引 '+coverage.length+' / '+Math.max(0,...coverage.map(c=>c.catalog_total||0))+' 个目录章节 · '+coverage.reduce((n,c)=>n+c.line_count,0)+' 条语录（当前覆盖）';for(const d of drafts.values())if(!d.dirty)d.sourceRevision=sources.find(s=>s.id===d.choice)?.revision||0;show()}
      else{body.querySelector('[data-source-coverage]').textContent='本机检查 · 不调用 AI';status('可整理文字与分类；规范来源和语录匹配尚未开放。');show()}
    }catch(e){if(valid()){show();body.querySelector('[data-source-coverage]').textContent='索引覆盖未核验';status(e.message+' 原内容与草稿保持不变。')}}
    return node;
  }
  document.addEventListener('click',e=>{const button=e.target.closest('[data-source-workspace]');if(button){e.preventDefault();open(button.dataset.sourceWorkspace)}});
  root.SourceWorkspace=Object.freeze({open,request,catalog});
})(globalThis);
