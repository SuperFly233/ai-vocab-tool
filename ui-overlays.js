(function installOverlayInteractions(){
  const hint=document.createElement('div');
  hint.id='ui-tooltip';hint.className='ui-tooltip';hint.setAttribute('popover','manual');hint.setAttribute('role','tooltip');
  const hintText=document.createElement('span');hintText.className='ui-tooltip-text';hint.append(hintText);
  document.body.append(hint);
  let owner=null,previousDescription=null,motion=null;
  const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  function hide(immediate=false){
    motion?.cancel();motion=null;
    if(owner){
      if(previousDescription===null)owner.removeAttribute('aria-describedby');
      else owner.setAttribute('aria-describedby',previousDescription);
    }
    owner=null;
    if(!hint.matches(':popover-open'))return;
    if(immediate===true||reducedMotion()){hint.hidePopover();return}
    const animation=hint.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:`translateY(${hint.dataset.side==='above'?4:-4}px)`}],{duration:100,easing:'ease',fill:'forwards'});
    motion=animation;
    animation.onfinish=()=>{if(motion===animation){hint.hidePopover();animation.cancel();motion=null}};
  }
  function show(button){
    if(!button?.isConnected||!button.dataset.tip||document.body.classList.contains('reorder-active'))return;
    hide(true);owner=button;previousDescription=button.getAttribute('aria-describedby');
    hintText.textContent=button.dataset.tip;
    button.setAttribute('aria-describedby',[previousDescription,hint.id].filter(Boolean).join(' '));
    hint.showPopover();
    const viewport=window.visualViewport;
    const left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0;
    const width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    hint.style.maxWidth=`${Math.max(40,Math.min(300,width-24))}px`;
    hint.style.maxHeight=`${Math.max(24,height-24)}px`;
    const anchor=button.getBoundingClientRect(),rect=hint.getBoundingClientRect();
    const above=anchor.top-rect.height-10,placeAbove=above>=top+12;
    const x=Math.max(left+12,Math.min(left+width-rect.width-12,anchor.left+anchor.width/2-rect.width/2));
    hint.dataset.side=placeAbove?'above':'below';
    hint.style.setProperty('--tip-arrow-x',`${Math.max(12,Math.min(rect.width-12,anchor.left+anchor.width/2-x))}px`);
    hint.style.left=`${x}px`;
    hint.style.top=`${Math.max(top+12,Math.min(top+height-rect.height-12,placeAbove?above:anchor.bottom+10))}px`;
    if(!reducedMotion()){
      const animation=hint.animate([{opacity:0,transform:`translateY(${placeAbove?4:-4}px)`},{opacity:1,transform:'translateY(0)'}],{duration:140,easing:'ease'});
      motion=animation;animation.onfinish=()=>{if(motion===animation)motion=null};
    }
  }
  document.addEventListener('pointerover',event=>{
    if(event.pointerType==='touch')return;
    const button=event.target.closest('[data-tip]');
    if(!button||button===owner)return;
    show(button);
  });
  document.addEventListener('pointerout',event=>{
    const button=event.target.closest('[data-tip]');
    if(button&&!button.contains(event.relatedTarget))hide();
  });
  document.addEventListener('focusin',event=>{if(event.target.matches('[data-tip]:focus-visible'))show(event.target)});
  document.addEventListener('focusout',hide);
  document.addEventListener('pointerdown',()=>hide(true),true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hide(true)},true);
  document.addEventListener('scroll',()=>hide(true),true);
  addEventListener('resize',()=>hide(true));window.visualViewport?.addEventListener('resize',()=>hide(true));
  const editorBackdrops='#history-modal,#api-profile-modal,#scene-editor';
  let press=null,release=null;
  document.addEventListener('pointerdown',event=>{
    press=event.button===0&&event.target.matches(editorBackdrops)?{layer:event.target,id:event.pointerId,x:event.clientX,y:event.clientY}:null;
    release=null;
  },true);
  document.addEventListener('pointerup',event=>{
    release=press&&press.id===event.pointerId&&press.layer===event.target&&Math.hypot(event.clientX-press.x,event.clientY-press.y)<=8?press.layer:null;
    press=null;
  },true);
  document.addEventListener('pointercancel',()=>{press=null;release=null},true);
  addEventListener('blur',()=>{press=null;release=null});
  // Only a deliberate press and release on the same backdrop dismisses a draft.
  document.addEventListener('click',event=>{
    if(event.target.matches(editorBackdrops)){
      event.preventDefault();event.stopImmediatePropagation();
      const accepted=release===event.target;release=null;
      if(accepted)event.target.dispatchEvent(new Event('backdrop-dismiss'));
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
