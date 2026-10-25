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
    if(!button?.isConnected||!button.dataset.tip||document.body.classList.contains('reorder-active')||document.body.classList.contains('tooltips-hidden'))return;
    const label=button.matches('.nav-item')?button.querySelector('span'):null;
    if(label?.getBoundingClientRect().width&&label.textContent.trim()===button.dataset.tip.trim())return;
    hide(true);owner=button;previousDescription=button.getAttribute('aria-describedby');
    hintText.textContent=button.dataset.tip;
    hint.dataset.kind=button.dataset.tipKind||'';
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
  const dialogDismissers=new WeakMap();
  function topDialog(){return [...document.querySelectorAll('dialog[open]')].filter(node=>node.matches(':modal')).at(-1)||null}
  function dismissDialog(node){if(!node?.open)return;const dismiss=dialogDismissers.get(node);if(dismiss)dismiss();else node.close()}
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||document.fullscreenElement)return;
    const dialog=topDialog();
    if(event.repeat&&(dialog||document.querySelector('.modal-layer.open,.confirm-layer.open'))){event.preventDefault();event.stopImmediatePropagation();return}
    if(!dialog)return;
    event.preventDefault();event.stopImmediatePropagation();hideFieldHint();dismissDialog(dialog);
  },true);
  document.addEventListener('cancel',event=>{
    if(event.target.tagName!=='DIALOG')return;
    event.preventDefault();event.stopImmediatePropagation();dismissDialog(event.target);
  },true);
  let dialogPress=null,dialogRelease=null;
  const onDialogBackdrop=(event,node)=>{if(event.target!==node)return false;const rect=node.getBoundingClientRect();return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom};
  document.addEventListener('pointerdown',event=>{
    const node=topDialog();dialogPress=node&&event.button===0&&onDialogBackdrop(event,node)?{node,id:event.pointerId,x:event.clientX,y:event.clientY}:null;dialogRelease=null;
  },true);
  document.addEventListener('pointerup',event=>{
    dialogRelease=dialogPress&&event.pointerId===dialogPress.id&&topDialog()===dialogPress.node&&onDialogBackdrop(event,dialogPress.node)&&Math.hypot(event.clientX-dialogPress.x,event.clientY-dialogPress.y)<=8?dialogPress.node:null;dialogPress=null;
  },true);
  document.addEventListener('click',event=>{
    const node=topDialog();if(!node||!onDialogBackdrop(event,node))return;
    event.preventDefault();event.stopImmediatePropagation();const accepted=dialogRelease===node;dialogRelease=null;if(accepted)dismissDialog(node);
  },true);
  document.addEventListener('pointercancel',()=>{dialogPress=null;dialogRelease=null},true);addEventListener('blur',()=>{dialogPress=null;dialogRelease=null});
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
  let fieldHint=null,fieldAnchor=null;
  function hideFieldHint(){if(fieldHint?.matches(':popover-open'))fieldHint.hidePopover();fieldHint=null;fieldAnchor=null}
  function positionFieldHint(){
    if(!fieldHint?.isConnected||!fieldAnchor?.isConnected)return hideFieldHint();
    const viewport=visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight;
    const anchor=fieldAnchor.getBoundingClientRect();
    if(anchor.bottom<top||anchor.top>top+height)return hideFieldHint();
    const limit=Math.max(40,Math.min(220,height*.35));
    fieldHint.style.maxWidth=`${Math.max(40,Math.min(360,width-24))}px`;fieldHint.style.maxHeight=`${limit}px`;fieldHint.style.setProperty('--hint-height',`${limit}px`);
    const header=fieldAnchor.closest('dialog,.scene-editor,.modal-card')?.querySelector(':scope>header,:scope>.modal-head'),safeTop=Math.max(top+12,(header?.getBoundingClientRect().bottom||0)+8);
    const rect=fieldHint.getBoundingClientRect(),above=anchor.top-rect.height-10>=safeTop;
    const x=Math.max(left+12,Math.min(left+width-rect.width-12,anchor.left));
    fieldHint.style.left=`${x}px`;fieldHint.style.top=`${Math.max(top+12,Math.min(top+height-rect.height-12,above?anchor.top-rect.height-10:anchor.bottom+10))}px`;
    const dialog=fieldAnchor.closest('dialog'),footer=dialog?.querySelector('footer')?.getBoundingClientRect(),frame=dialog?.getBoundingClientRect();
    if(!above&&footer&&anchor.bottom+10+rect.height>footer.top&&frame.bottom+10+rect.height<top+height-12)fieldHint.style.top=`${frame.bottom+10}px`;
    fieldHint.dataset.side=above?'above':'below';fieldHint.style.setProperty('--field-arrow-x',`${Math.max(14,Math.min(rect.width-20,anchor.left+Math.min(anchor.width/2,40)-x))}px`);
  }
  document.addEventListener('focusin',event=>{
    const field=event.target.closest('.visual-field-hinted');if(event.target.closest('.visual-hint-bubble'))return;
    hideFieldHint();if(!field||field.closest('.hints-pinned')||document.body.classList.contains('hints-hidden'))return;
    field.classList.remove('hint-dismissed');const bubble=field.querySelector('.visual-hint-bubble');if(!bubble)return;
    fieldHint=bubble;fieldAnchor=event.target;bubble.setAttribute('popover','manual');bubble.showPopover();positionFieldHint();
    if(!reducedMotion())bubble.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:140,easing:'ease'});
  });
  document.addEventListener('focusout',event=>{if(!event.relatedTarget?.closest?.('.visual-hint-bubble'))hideFieldHint()});
  document.addEventListener('hint-visibility-change',()=>{if(document.body.classList.contains('tooltips-hidden'))hide(true);if(document.body.classList.contains('hints-hidden'))hideFieldHint()});
  document.addEventListener('click',event=>{const close=event.target.closest('.visual-hint-close');if(!close)return;event.preventDefault();close.closest('.visual-field-hinted')?.classList.add('hint-dismissed');hideFieldHint()},true);
  document.addEventListener('scroll',positionFieldHint,true);addEventListener('resize',positionFieldHint);visualViewport?.addEventListener('resize',positionFieldHint);
  const notifications=document.getElementById('toast-stack');
  notifications.setAttribute('popover','manual');
  function raiseNotifications(){
    if(!notifications.children.length)return;
    const modal=topDialog(),parent=modal||document.body;
    if(notifications.parentElement!==parent)parent.append(notifications);
    if(notifications.matches(':popover-open'))notifications.hidePopover();
    notifications.showPopover();
  }
  async function confirmDiscard(message){
    if(!document.querySelector('dialog:modal'))return askConfirm(message,'放弃修改');
    return new Promise(resolve=>{
      const node=document.createElement('dialog');node.className='scene-study-dialog draft-confirm';
      node.innerHTML='<header><h2>放弃修改？</h2></header><div class="scene-dialog-body"><p></p><footer><button class="plain-btn" data-keep>继续编辑</button><button class="plain-btn danger-btn" data-discard>放弃修改</button></footer></div>';
      node.querySelector('p').textContent=message;node.querySelector('[data-keep]').onclick=()=>node.close('keep');node.querySelector('[data-discard]').onclick=()=>node.close('discard');
      node.onclose=()=>{const result=node.returnValue==='discard';node.remove();resolve(result)};document.body.append(node);node.showModal();
    });
  }
  function guardDialog(node,{getState,restore,canRestore=()=>true,initialState=getState()}){
    const baseline=JSON.stringify(initialState),account=cloudUser?.id||'local';let closing=false;
    node.requestClose=async()=>{
      if(closing)return;closing=true;
      try{
        const snapshot=structuredClone(getState()),changed=JSON.stringify(snapshot)!==baseline;
        if(changed&&!await confirmDiscard('未保存的修改将被放弃，关闭后可以撤销恢复。'))return;
        if(!node.isConnected)return;node.close();
        const recover=()=>{
          if(account!==(cloudUser?.id||'local')||!canRestore())return notify('账号或原内容已有变化，未恢复过期草稿。','warn','恢复草稿');
          if(document.querySelector('dialog:modal'))return notify('请先关闭当前弹窗再恢复草稿。','info','恢复草稿',true,{label:'撤销',run:recover});
          restore(snapshot);
        };
        if(changed)notify('已放弃未保存的修改。','info','编辑',true,{label:'撤销',run:recover});
      }finally{closing=false}
    };
    node.querySelector('header button')?.addEventListener('click',event=>{event.stopImmediatePropagation();node.requestClose()},true);
    dialogDismissers.set(node,node.requestClose);
  }
  globalThis.UIOverlays={raiseNotifications,guardDialog,confirmDiscard,topDialog,hideFieldHint};
  document.addEventListener('close',event=>{
    if(event.target.tagName==='DIALOG'&&event.target.contains(notifications)){document.body.append(notifications);raiseNotifications()}
  },true);
  document.addEventListener('toggle',event=>{
    if(event.target!==notifications&&event.target!==hint&&event.newState==='open')raiseNotifications();
  },true);
})();
