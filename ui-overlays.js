(function installOverlayInteractions(){
  const hint=document.createElement('div');
  hint.id='ui-tooltip';hint.className='ui-tooltip';hint.setAttribute('popover','manual');hint.setAttribute('role','tooltip');
  document.body.append(hint);
  let owner=null,timer=null,previousDescription=null;
  function hide(){
    clearTimeout(timer);
    if(hint.matches(':popover-open'))hint.hidePopover();
    if(owner){
      if(previousDescription===null)owner.removeAttribute('aria-describedby');
      else owner.setAttribute('aria-describedby',previousDescription);
    }
    owner=null;
  }
  function show(button){
    if(!button?.isConnected||!button.dataset.tip||document.body.classList.contains('reorder-active'))return;
    hide();owner=button;previousDescription=button.getAttribute('aria-describedby');
    hint.textContent=button.dataset.tip;
    button.setAttribute('aria-describedby',[previousDescription,hint.id].filter(Boolean).join(' '));
    hint.showPopover();
    const viewport=window.visualViewport;
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
    const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    hint.style.maxWidth=`${Math.max(40,Math.min(300,width-24))}px`;
    hint.style.maxHeight=`${Math.max(24,height-24)}px`;
    const anchor=button.getBoundingClientRect(),rect=hint.getBoundingClientRect();
    const above=anchor.top-rect.height-8;
    hint.style.left=`${Math.max(left+12,Math.min(left+width-rect.width-12,anchor.left+anchor.width/2-rect.width/2))}px`;
    hint.style.top=`${Math.max(top+12,Math.min(top+height-rect.height-12,above>=top+12?above:anchor.bottom+8))}px`;
  }
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch')return;
    const button=event.target.closest('[data-tip]');
    if(!button||button===owner)return;
    clearTimeout(timer);timer=setTimeout(()=>show(button),300);
  });
  document.addEventListener('pointerout',event=>{
    const button=event.target.closest('[data-tip]');
    if(button&&!button.contains(event.relatedTarget))hide();
  });
  document.addEventListener('focusin',event=>{if(event.target.matches('[data-tip]:focus-visible'))show(event.target)});
  document.addEventListener('focusout',hide);
  document.addEventListener('pointerdown',hide,true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide()},true);
  document.addEventListener('scroll',hide,true);
  addEventListener('resize',hide);window.visualViewport?.addEventListener('resize',hide);
  // Draft editors only dismiss from explicit controls, never a release outside.
  document.addEventListener('click',event=>{
    if(event.target.matches('#history-modal,#api-profile-modal,#scene-editor')){
      event.preventDefault();event.stopImmediatePropagation();
    }
  },true);
  const notifications=document.getElementById('toast-stack');
  notifications.setAttribute('popover','manual');
  function raiseNotifications(){
    if(!notifications.children.length)return;
    const modal=document.querySelector('dialog:modal'),parent=modal||document.body;
    if(notifications.parentElement!==parent)parent.append(notifications);
    if(notifications.matches(':popover-open'))notifications.hidePopover();
    notifications.showPopover();
  }
  globalThis.UIOverlays={raiseNotifications};
  document.addEventListener('close',event=>{
    if(event.target.tagName==='DIALOG'&&event.target.contains(notifications)){document.body.append(notifications);raiseNotifications()}
  },true);
  document.addEventListener('toggle',event=>{
    if(event.target!==notifications&&event.target!==hint&&event.newState==='open')raiseNotifications();
  },true);
})();
