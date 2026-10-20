(function(root){
  let scheduled=false,drag=null;
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
    const reading=group('settings-reading','阅读',experience),media=group('settings-media','场景与媒体',reading),notifications=group('settings-notifications','通知',media);
    for(const id of ['label-mode-zh','font-mode-system','time-mode-created','visual-hints-pinned'])reading.append(document.getElementById(id).closest('.setting-row'));
    for(const id of ['toast-mode-snackbar','toast-position-top'])notifications.append(document.getElementById(id).closest('.setting-row'));
    const row=(label,control)=>`<div class="setting-row"><div class="setting-label">${label}</div>${control}</div>`;
    reading.insertAdjacentHTML('beforeend',row('浏览目录',`<div class="seg" data-preference="readingNav">${[['top','顶部'],['left','左侧'],['off','隐藏']].map(([value,label])=>`<button type="button" data-value="${value}">${label}</button>`).join('')}</div>`));
    media.insertAdjacentHTML('beforeend',row('视频自动播放','<label class="capsule-switch"><input type="checkbox" role="switch" data-preference="mediaAutoplay" aria-label="视频自动播放"><span>开启</span></label>')+row('视频原生控件','<label class="capsule-switch"><input type="checkbox" role="switch" data-preference="mediaControls" aria-label="视频原生控件"><span>显示</span></label>')+row('素材工具',`<div class="seg" data-preference="mediaTools">${[['auto','悬停'],['always','常显'],['hidden','隐藏']].map(([value,label])=>`<button type="button" data-value="${value}">${label}</button>`).join('')}</div>`));
    const nav=document.querySelector('.settings-nav');
    for(const [section,label,glyph] of [[reading,'阅读','list'],[media,'场景与媒体','quote'],[notifications,'通知','info']]){
      const button=document.createElement('button');button.className='settings-nav-item';button.dataset.settingsTarget=section.id;
      button.innerHTML=`${icon(glyph)}<span><b>${label}</b></span>`;button.onclick=()=>scrollToSettingsSection(section.id,button);
      nav.insertBefore(button,nav.querySelector('[data-settings-target="settings-data"]'));
    }
    const categories=[['settings-model','模型与生成'],['settings-experience','外观与布局'],['settings-reading','阅读'],['settings-media','场景与媒体'],['settings-notifications','通知'],['settings-data','数据与同步'],['settings-maintenance','维护与诊断']];
    for(const [id,label] of categories){const button=nav.querySelector(`[data-settings-target="${id}"]`);button.querySelector('b').textContent=label;button.querySelector('small')?.remove();nav.append(button)}
    experience.querySelector('.setting-title>span')?.replaceChildren(document.createTextNode('外观与布局'));
    setupSettingGroupToggles();setupSettingsNavigation();
    const search=document.createElement('label');search.className='settings-search';search.innerHTML=`${icon('search')}<input type="search" aria-label="搜索设置" placeholder="搜索设置"><span role="status"></span>`;document.querySelector('.settings-layout').before(search);
    search.querySelector('input').addEventListener('input',()=>{
      const query=normalizeSearch(search.querySelector('input').value);let matches=0;
      for(const section of document.querySelectorAll('.settings-content>.setting-group')){
        let count=0;const category=section.querySelector('.setting-title').textContent;
        for(const item of section.querySelectorAll(':scope>.setting-row')){const shown=!query||normalizeSearch(category+' '+item.textContent).includes(query);item.hidden=!shown;if(shown)count++}
        section.hidden=Boolean(query&&!count);nav.querySelector(`[data-settings-target="${section.id}"]`).hidden=section.hidden;
        if(query&&count){section.classList.remove('collapsed');section.querySelector('.setting-collapse-btn')?.setAttribute('aria-expanded','true')}
        matches+=count;
      }
      search.querySelector('[role="status"]').textContent=query?`${matches} 项`:'';
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
      nav.querySelectorAll('button').forEach(button=>{const active=button.dataset.readTarget===selected?.id;button.classList.toggle('active',active);if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current')});
    }
    const topbar=document.querySelector('.topbar'),sidebar=innerWidth>900?document.querySelector('.sidebar'):null,query=document.body.classList.contains('home-scrolled')?document.querySelector('#view-home.active .editor-pane'):null;
    document.documentElement.style.setProperty('--app-top',`${Math.max(0,topbar?.getBoundingClientRect().bottom||0,sidebar?.getBoundingClientRect().bottom||0,query?.getBoundingClientRect().bottom||0)}px`);
  }
  function refresh(){
    scheduled=false;enhance(document.getElementById('result-card'));enhance(document.getElementById('modal-card-page'));
    for(const summary of document.querySelectorAll('.scene-library>summary,.scene-more-media>summary'))if(!summary.querySelector('svg'))summary.insertAdjacentHTML('afterbegin',icon('chevron-down'));
    for(const card of document.querySelectorAll('.scene-illustrated'))if(ratios.has(card.dataset.sceneId))card.style.setProperty('--scene-media-width',`${ratios.get(card.dataset.sceneId)}%`);
    updateCurrent();
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
  root.ExperienceUI={apply,mediaReady,refresh};setupSettings();apply(getSettings());
})(globalThis);
