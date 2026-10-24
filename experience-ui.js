(function(root){
  let scheduled=false,drag=null;
  const navLocks=new WeakMap();
  const topButton=document.createElement('button');topButton.type='button';topButton.className='icon-btn scroll-top-button';topButton.hidden=true;topButton.setAttribute('aria-label','回到顶部');topButton.dataset.tip='回到顶部';topButton.innerHTML=icon('arrow-up');document.body.append(topButton);
  function scrollContext(){
    const native=root.UIOverlays?.topDialog(),layer=native||[...document.querySelectorAll('.modal-layer.open')].at(-1);
    if(document.querySelector('.confirm-layer.open')||native?.classList.contains('draft-confirm'))return {host:document.body,target:null};
    if(layer){const candidates=[...layer.querySelectorAll('.scene-dialog-body,.scene-editor-body,.modal-body,.scene-viewer-content')];return {host:layer,target:candidates.find(node=>node.scrollHeight>node.clientHeight+1)||null}}
    return {host:document.body,target:document.scrollingElement};
  }
  function updateScrollTop(){
    const {host,target}=scrollContext();if(topButton.parentElement!==host)host.append(topButton);
    const range=target?target.scrollHeight-target.clientHeight:0;topButton.hidden=!target||range<=1||target.scrollTop<=Math.max(16,range*.05);
    if(host===document.body){topButton.style.removeProperty('right');const nav=innerWidth<=900?document.querySelector('.sidebar')?.getBoundingClientRect():null;if(nav&&nav.height>0&&nav.top>innerHeight/2)topButton.style.bottom=`${innerHeight-nav.top+14}px`;else topButton.style.removeProperty('bottom')}
    else{const rect=host.getBoundingClientRect(),footer=host.querySelector('footer'),footerRect=footer?.getBoundingClientRect();topButton.style.right=`${Math.max(18,innerWidth-rect.right+14)}px`;topButton.style.bottom=`${Math.max(22,innerHeight-rect.bottom+14,footerRect&&footerRect.top<rect.bottom?innerHeight-footerRect.top+8:0)}px`}
  }
  topButton.onclick=()=>{const {target}=scrollContext();target?.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})};
  function revealNavItem(nav,button){
    if(!nav||!button||nav.dataset.currentItem===button.dataset.settingsTarget+'|'+button.dataset.readTarget)return;
    nav.dataset.currentItem=button.dataset.settingsTarget+'|'+button.dataset.readTarget;
    const bounds=nav.getBoundingClientRect(),rect=button.getBoundingClientRect();
    const dx=rect.left<bounds.left+8?rect.left-bounds.left-8:rect.right>bounds.right-8?rect.right-bounds.right+8:0;
    const dy=rect.top<bounds.top+8?rect.top-bounds.top-8:rect.bottom>bounds.bottom-8?rect.bottom-bounds.bottom+8:0;
    nav.scrollBy({left:dx,top:dy,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function enhanceSearch(){
    document.querySelectorAll('.settings-search,.history-search').forEach(label=>{
      label.classList.add('search-field');
      const input=label.querySelector('input');if(!input||input.dataset.sharedSearch)return;
      input.dataset.sharedSearch='true';
      let clear=label.querySelector('.history-clear-btn');
      if(!clear){clear=document.createElement('button');clear.type='button';clear.className='history-clear-btn';clear.setAttribute('aria-label','清空搜索');clear.dataset.tip='清空搜索';clear.innerHTML=icon('x');label.append(clear);clear.onclick=()=>{input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true})}}
      const update=()=>clear.classList.toggle('hidden',!input.value);input.addEventListener('input',update);update();
    });
  }
  const measuredBrowseTools=new WeakSet(),browseSizeObserver=new ResizeObserver(()=>schedule());
  function enhanceBrowseTools(){
    document.querySelectorAll('.folder-toolbar select,.scene-filter-bar select').forEach(select=>{
      if(select.parentElement.classList.contains('browse-select'))return;
      const wrapper=document.createElement('span');wrapper.className='browse-select';select.before(wrapper);wrapper.append(select);wrapper.insertAdjacentHTML('beforeend',icon('chevron-down'));
    });
    document.querySelectorAll('.history-tools,.folder-toolbar,.scene-browse-tools').forEach(node=>{if(!measuredBrowseTools.has(node)){measuredBrowseTools.add(node);browseSizeObserver.observe(node)}});
  }
  const ratios=new Map(),mediaObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){const video=entry.target;if(entry.isIntersecting&&getSettings().mediaAutoplay&&!document.hidden&&!document.querySelector('#scene-viewer'))playAudibly(video);else video.pause()}
  },{threshold:.5});
  async function playAudibly(video){
    if(video.dataset.userMuted==='true'){video.muted=true;try{await video.play()}catch{}updateSound(video);return}
    video.muted=false;
    try{await video.play();delete video.dataset.soundBlocked}
    catch{if(!video.isConnected)return;video.dataset.soundBlocked='true';video.muted=true;try{await video.play()}catch{}}
    updateSound(video);
  }
  function updateSound(video){
    const button=video.closest('.scene-asset')?.querySelector('.scene-sound');if(!button)return;
    button.innerHTML=icon(video.muted?'volume-x':'volume-2');button.setAttribute('aria-label',video.muted?'开启视频声音':'静音');button.dataset.tip=video.muted?'开启视频声音':'静音';button.setAttribute('aria-pressed',String(!video.muted));
  }
  function savePreference(key,value){
    if(!setSettings({...getSettings(),[key]:value,updatedAt:new Date().toISOString()}))return;
    apply(getSettings());
  }
  function group(id,title,after){
    let section=document.getElementById(id);if(section)return section;
    section=document.createElement('div');section.className='setting-group';section.id=id;
    section.innerHTML=`<div class="setting-title">${title}</div>`;after.after(section);return section;
  }
  function setupSettings(){
    document.querySelectorAll('.sidebar .nav-item').forEach(button=>{const label=button.textContent.trim();button.setAttribute('aria-label',label);button.dataset.tip=label});
    const experience=document.getElementById('settings-experience');
    const reading=group('settings-reading','阅读体验',experience),media=group('settings-media','场景媒体',reading),notifications=group('settings-notifications','消息通知',media);
    for(const id of ['label-mode-zh','font-mode-system','time-mode-created','hints-hidden','tooltips-hidden','visual-hints-pinned'])reading.append(document.getElementById(id).closest('.setting-row'));
    for(const id of ['toast-mode-snackbar','toast-position-top'])notifications.append(document.getElementById(id).closest('.setting-row'));
    const row=(label,description,control)=>`<div class="setting-row"><div><div class="setting-label">${label}</div><div class="setting-sub">${description}</div></div>${control}</div>`;
    reading.insertAdjacentHTML('beforeend',row('浏览目录','首页结果与词条详情共用此位置；左侧目录在手机上改为顶部。',`<div class="seg" data-preference="readingNav">${[['top','顶部'],['left','左侧'],['off','隐藏']].map(([value,label])=>`<button type="button" data-value="${value}">${label}</button>`).join('')}</div>`));
    reading.insertAdjacentHTML('beforeend',row('记住各页筛选与排序','历史、收藏、场景分别保存，刷新及云同步后恢复；不保存临时搜索文字。关闭后恢复默认。','<label class="capsule-switch"><input id="remember-view-filters" type="checkbox" role="switch" onchange="setRememberViewFilters(this.checked)"><span>记住</span></label>'));
    document.getElementById('remember-view-filters').checked=getSettings().rememberViewFilters!==false;
    media.insertAdjacentHTML('beforeend',row('视频自动播放','尝试有声播放；浏览器限制时静音，并保留声音开关。','<label class="capsule-switch"><input type="checkbox" role="switch" data-preference="mediaAutoplay" aria-label="视频自动播放"><span>开启</span></label>')+row('视频播放控件','显示浏览器提供的进度、音量和全屏控件。','<label class="capsule-switch"><input type="checkbox" role="switch" data-preference="mediaControls" aria-label="视频原生控件"><span>显示</span></label>')+row('素材操作工具','设置放大、保存等操作的显示方式；不影响声音开关。',`<div class="seg" data-preference="mediaTools">${[['auto','自动'],['always','常显'],['hidden','隐藏']].map(([value,label])=>`<button type="button" data-value="${value}">${label}</button>`).join('')}</div>`));
    const nav=document.querySelector('.settings-nav');
    const categories=[
      ['settings-model','模型生成','scan-search','API、模型配置与查询规则','接口 key prompt 模型'],
      ['settings-experience','界面布局','monitor','主题、首页布局与移动工具栏','主题 深色 浅色 首页 手机'],
      ['settings-reading','阅读体验','book-open','内容显示、浏览目录与编辑提示','字体 标签 词性 时间 导航 提示'],
      ['settings-media','场景媒体','images','视频播放与素材操作','图片 gif 视频 自动播放 声音 音量'],
      ['settings-notifications','消息通知','bell','通知样式与显示位置','toast snackbar 提醒 弹窗'],
      ['settings-data','数据同步','cloud','云端、备份与外部集成','备份 导入 导出 Anki 收藏夹'],
      ['settings-maintenance','维护诊断','settings-2','日志、缓存与数据重置','缓存 清理 错误 日志 重置']
    ];
    nav.replaceChildren();
    for(const [id,label,glyph,description,keywords] of categories){
      const section=document.getElementById(id);section.dataset.searchKeywords=keywords;
      const title=section.querySelector('.setting-title');
      if(title.querySelector('span'))title.querySelector('span').textContent=label;else title.textContent=label;
      let intro=section.querySelector('.setting-intro');if(!intro){intro=document.createElement('p');intro.className='setting-intro';title.after(intro)}intro.textContent=description;
      const button=document.createElement('button');button.className='settings-nav-item';button.dataset.settingsTarget=section.id;
      button.type='button';button.innerHTML=`${icon(glyph)}<span><b>${label}</b></span>`;button.onclick=()=>scrollToSettingsSection(section.id,button);nav.append(button);
    }
    const maintenance=document.getElementById('settings-maintenance');
    maintenance.append(...maintenance.querySelectorAll(':scope>.setting-row:has(.danger-btn)'));
    const data=document.getElementById('settings-data');data.append(document.getElementById('anki-task-manager').closest('.setting-row'));
    const hintRow=document.getElementById('hints-hidden').closest('.setting-row');reading.append(hintRow,document.getElementById('tooltips-hidden').closest('.setting-row'),document.getElementById('visual-hints-pinned').closest('.setting-row'));
    hintRow.dataset.settingArea='提示辅助';
    document.getElementById('clear-scene-previews').closest('.setting-row').dataset.settingArea='本机维护';
    maintenance.querySelector('.setting-row:has(.danger-btn)').dataset.settingArea='危险操作';
    document.getElementById('anki-task-manager').closest('.setting-row').dataset.settingArea='外部集成';
    setupSettingGroupToggles();setupSettingsNavigation();
    for(const [id,label] of categories){const section=document.getElementById(id);section.querySelector('.setting-collapse-btn')?.setAttribute('aria-label',`${section.classList.contains('collapsed')?'展开':'折叠'} ${label}`)}
    const search=document.createElement('label');search.className='settings-search';search.innerHTML=`${icon('search')}<input type="search" aria-label="搜索设置" placeholder="搜索设置、功能或关键词"><span role="status" aria-live="polite"></span>`;document.querySelector('.settings-page-head').append(search);
    const empty=document.createElement('div');empty.className='settings-empty';empty.hidden=true;empty.innerHTML='<strong>没有找到相关设置</strong><p>试试“主题”“播放”或“备份”。</p><button class="plain-btn" type="button">清空搜索</button>';document.querySelector('.settings-content').append(empty);
    empty.querySelector('button').onclick=()=>{const input=search.querySelector('input');input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true})};
    search.querySelector('input').addEventListener('input',()=>{
      const query=normalizeSearch(search.querySelector('input').value);let matches=0;
      for(const section of document.querySelectorAll('.settings-content>.setting-group')){
        let count=0;const category=section.querySelector('.setting-title').textContent;
        for(const item of section.querySelectorAll(':scope>.setting-row')){const shown=!query||normalizeSearch(category+' '+section.dataset.searchKeywords+' '+item.textContent).includes(query);item.hidden=!shown;if(shown)count++}
        section.hidden=Boolean(query&&!count);nav.querySelector(`[data-settings-target="${section.id}"]`).hidden=section.hidden;
        if(query&&count){section.classList.remove('collapsed');const toggle=section.querySelector('.setting-collapse-btn');toggle?.setAttribute('aria-expanded','true');toggle?.setAttribute('aria-label',`折叠 ${category}`)}
        matches+=count;
      }
      search.querySelector('[role="status"]').textContent=query?`${matches} 项`:'';empty.hidden=!query||matches>0;
      updateSettingsNavActive();
    });
    document.querySelectorAll('[data-preference]').forEach(control=>control.addEventListener(control.tagName==='INPUT'?'change':'click',event=>{
      const key=control.dataset.preference,value=control.tagName==='INPUT'?control.checked:event.target.closest('[data-value]')?.dataset.value;
      if(value!==undefined)savePreference(key,value);
    }));
  }
  function mediaReady(asset,media){
    if(!media)return;
    if(media.tagName==='VIDEO'){
      media.controls=getSettings().mediaControls;media.loop=getSettings().mediaAutoplay;
      media.muted=false;
      const sound=document.createElement('button');sound.type='button';sound.className='icon-btn scene-sound';sound.onclick=()=>{media.muted=!media.muted;media.dataset.userMuted=String(media.muted);if(media.paused)media.play().catch(()=>{media.controls=true});updateSound(media)};
      asset.querySelector('figcaption')?.append(sound);media.addEventListener('volumechange',()=>updateSound(media));updateSound(media);
      if(!media.closest('#scene-viewer'))mediaObserver.observe(media);
      media.addEventListener('click',()=>{if(!media.controls){if(media.paused)media.play().catch(()=>{});else media.pause()}});
    }
    const card=asset.closest('.scene-illustrated');
    const adapt=()=>{if(card&&!ratios.has(card.dataset.sceneId)){const width=media.videoWidth||media.naturalWidth,height=media.videoHeight||media.naturalHeight;card.style.setProperty('--scene-media-width',width>height*1.4?'42%':'30%')}};
    media.addEventListener(media.tagName==='VIDEO'?'loadedmetadata':'load',adapt,{once:true});adapt();
  }
  function sections(content){
    const entries=[];
    for(const element of content.querySelectorAll('.entry-core,.scene-section,.block,.history-note-block,.followup-section')){
      if(element.closest('.scene-record,.scene-fragment')||element.parentElement.closest('.block,.sense-group'))continue;
      const title=element.matches('.entry-core')?'核心义':element.matches('.scene-section')?'场景记忆':element.querySelector('.block-title,.followup-title,h3')?.textContent.trim();
      if(title)entries.push({element,title:title.replace(/\s+/g,' ').slice(0,30)});
    }
    return entries;
  }
  function enhance(container){
    if(!container?.querySelector('.entry-head')||container.querySelector('.lookup-stream')||document.body.classList.contains('lookup-busy'))return;
    let layout=container.querySelector(':scope>.reading-layout');
    if(!layout){
      layout=document.createElement('div');layout.className='reading-layout';
      const nav=document.createElement('nav');nav.className='reading-nav';nav.setAttribute('aria-label','词条阅读目录');
      const content=document.createElement('div');content.className='reading-content';while(container.firstChild)content.append(container.firstChild);
      layout.append(nav,content);container.append(layout);
    }
    layout.dataset.position=getSettings().readingNav;
    root.DictionaryUI?.install(container);
    const content=layout.querySelector('.reading-content'),nav=layout.querySelector('.reading-nav'),entries=sections(content);
    const signature=entries.map(entry=>entry.title).join('|');if(nav.dataset.signature===signature)return;
    nav.dataset.signature=signature;nav.replaceChildren();
    entries.forEach(({element,title},index)=>{
      element.id=`read-${container.id}-${index}`;element.dataset.readSection='true';
      const button=document.createElement('button');button.type='button';button.textContent=title;button.dataset.readTarget=element.id;
      const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
      const samples=element.matches('.entry-core')?[element.querySelector('mark')?.textContent]:element.matches('.scene-section')?[...element.querySelectorAll('.scene-record blockquote')].map(node=>node.textContent):[...element.querySelectorAll('.item-title>mark,tbody tr td:first-child,.register-grid span,.history-note-content')].map(node=>node.textContent);
      const lines=[...new Set(samples.map(clean).filter(Boolean))].slice(0,3).map(text=>text.length>56?text.slice(0,56)+'…':text);
      button.dataset.tip=lines.length?`${title}\n${lines.map(line=>'• '+line).join('\n')}`:title;button.dataset.tipKind='reading';
      button.onclick=()=>{
        navLocks.set(layout,{id:element.id,until:performance.now()+1200});
        nav.querySelectorAll('button').forEach(item=>item.classList.toggle('active',item===button));revealNavItem(nav,button);
        let parent=element.parentElement;while(parent&&parent!==container){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement}
        const scroller=container.closest('.modal-body')||(getComputedStyle(container).overflowY==='auto'?container:document.scrollingElement);
        const rect=element.getBoundingClientRect(),bounds=scroller===document.scrollingElement?{top:0}:scroller.getBoundingClientRect();
        const offset=(layout.dataset.position==='left'&&innerWidth>1000?0:nav.getBoundingClientRect().height)+(scroller===document.scrollingElement?parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-top'))||0:0)+16;
        scroller.scrollTo({top:scroller.scrollTop+rect.top-bounds.top-offset,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      };
      nav.append(button);
    });
  }
  function updateCurrent(){
    for(const layout of document.querySelectorAll('.reading-layout')){
      if(!layout.getBoundingClientRect().height)continue;
      const nav=layout.querySelector('.reading-nav'),limit=(layout.dataset.position==='left'&&innerWidth>1000?nav.getBoundingClientRect().top:nav.getBoundingClientRect().bottom)+24,sections=[...layout.querySelectorAll('[data-read-section]')];
      let selected=sections[0];for(const section of sections)if(section.getBoundingClientRect().top<=limit)selected=section;
      const lock=navLocks.get(layout);if(lock&&performance.now()<lock.until)selected=sections.find(section=>section.id===lock.id)||selected;
      nav.querySelectorAll('button').forEach(button=>{const active=button.dataset.readTarget===selected?.id;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current')});
      revealNavItem(nav,nav.querySelector('[aria-current="location"]'));
    }
    const compact=document.body.classList.contains('home-scrolled');
    const topbar=document.querySelector('.topbar'),sidebar=innerWidth>900?document.querySelector('.sidebar'):null,query=compact?document.querySelector('#view-home.active .editor-pane'):null;
    const visibleBottom=node=>{if(!node)return 0;const style=getComputedStyle(node),rect=node.getBoundingClientRect();return style.display==='none'||style.visibility==='hidden'||Number(style.opacity)===0||rect.height<=0?0:Math.max(0,rect.bottom)};
    // Compact home replaces the navigation; its hidden geometry must not mask the query.
    const headerBottom=compact?0:Math.max(visibleBottom(topbar),visibleBottom(sidebar));
    document.documentElement.style.setProperty('--app-header-mask-height',`${headerBottom}px`);
    const tools=document.querySelector('.view.active .scene-browse-tools,.view.active .folder-toolbar,.view.active .history-tools');
    document.documentElement.style.setProperty('--browse-tools-height',`${tools?.getBoundingClientRect().height||0}px`);
    document.documentElement.style.setProperty('--app-top',`${Math.max(headerBottom,visibleBottom(query))}px`);
  }
  function refresh(){
    scheduled=false;enhanceSearch();enhanceBrowseTools();enhance(document.getElementById('result-card'));enhance(document.getElementById('modal-card-page'));
    for(const summary of document.querySelectorAll('.scene-library>summary,.scene-more-media>summary'))if(!summary.querySelector('svg'))summary.insertAdjacentHTML('afterbegin',icon('chevron-down'));
    for(const card of document.querySelectorAll('.scene-illustrated'))if(ratios.has(card.dataset.sceneId))card.style.setProperty('--scene-media-width',`${ratios.get(card.dataset.sceneId)}%`);
    updateCurrent();if(activeView==='settings')updateSettingsNavActive();updateScrollTop();
  }
  const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(refresh)}};
  function apply(settings){
    document.body.dataset.mediaTools=settings.mediaTools||'auto';
    document.querySelectorAll('[data-preference]').forEach(control=>{
      if(control.tagName==='INPUT')control.checked=Boolean(settings[control.dataset.preference]);
      else control.querySelectorAll('[data-value]').forEach(button=>{const selected=button.dataset.value===settings[control.dataset.preference];button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected))});
    });
    document.querySelectorAll('.reading-layout').forEach(layout=>layout.dataset.position=settings.readingNav||'top');
    document.querySelectorAll('.scene-asset video').forEach(video=>{if(video.closest('#scene-viewer'))return;video.controls=settings.mediaControls!==false;video.loop=Boolean(settings.mediaAutoplay);if(!settings.mediaAutoplay)video.pause();else{mediaObserver.unobserve(video);mediaObserver.observe(video)}});
    schedule();
  }
  document.addEventListener('pointerdown',event=>{
    const handle=event.target.closest('.scene-splitter');if(!handle||event.button!==0||innerWidth<=600)return;
    event.preventDefault();const card=handle.closest('.scene-illustrated');drag={card,handle,id:event.pointerId};handle.setPointerCapture(event.pointerId);
  });
  const resize=(card,value)=>{value=Math.max(25,Math.min(65,Math.round(value)));ratios.set(card.dataset.sceneId,value);document.querySelectorAll('.scene-illustrated').forEach(node=>{if(node.dataset.sceneId===card.dataset.sceneId){node.style.setProperty('--scene-media-width',`${value}%`);node.querySelector('.scene-splitter').setAttribute('aria-valuenow',String(value))}})};
  document.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const rect=drag.card.getBoundingClientRect();resize(drag.card,(rect.right-event.clientX)/rect.width*100)});
  document.addEventListener('pointerup',()=>{drag=null});document.addEventListener('pointercancel',()=>{drag=null});
  document.addEventListener('dblclick',event=>{const handle=event.target.closest('.scene-splitter');if(!handle)return;const card=handle.closest('.scene-illustrated');ratios.delete(card.dataset.sceneId);card.style.removeProperty('--scene-media-width');handle.setAttribute('aria-valuenow','38')});
  document.addEventListener('keydown',event=>{const handle=event.target.closest('.scene-splitter');if(!handle)return;if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();if(event.key==='Home')handle.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));else resize(handle.closest('.scene-illustrated'),Number(handle.getAttribute('aria-valuenow'))+(event.key==='ArrowLeft'?3:-3))}});
  document.addEventListener('play',event=>{if(event.target.matches('.scene-asset video'))document.querySelectorAll('.scene-asset video').forEach(video=>{if(video!==event.target)video.pause()})},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('.scene-asset video').forEach(video=>video.pause())});
  document.addEventListener('scroll',schedule,true);addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  root.ExperienceUI={apply,mediaReady,refresh,revealNavItem,scrollContext};setupSettings();apply(getSettings());
})(globalThis);
