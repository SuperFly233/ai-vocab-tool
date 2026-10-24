(function(root){
  let active=null;
  function positionMenu(){
    if(!active)return;const {trigger,menu:box}=active,r=trigger.getBoundingClientRect(),v=root.visualViewport,top=v?.offsetTop||0,bottom=top+(v?.height||innerHeight);
    if(!trigger.isConnected||!r.width||r.bottom<top||r.top>bottom){closeMenu(false);return}
    box.style.maxHeight=`${Math.max(80,bottom-top-24)}px`;const b=box.getBoundingClientRect();box.style.left=`${Math.max(12,Math.min(r.right-b.width,innerWidth-b.width-12))}px`;box.style.top=`${Math.max(top+12,r.bottom+b.height+8<bottom?r.bottom+6:r.top-b.height-6)}px`;
  }
  function closeMenu(focus=true){if(!active)return;const {menu,trigger}=active;active=null;if(menu.matches(':popover-open'))menu.hidePopover();menu.remove();trigger.setAttribute('aria-expanded','false');if(focus&&trigger.isConnected)trigger.focus({preventScroll:true})}
  function menu(trigger,items){
    if(active?.trigger===trigger){closeMenu();return}closeMenu(false);
    const box=document.createElement('div');box.className='shared-action-menu';box.setAttribute('popover','manual');box.setAttribute('role','menu');
    const account=typeof cloudUser==='undefined'?'local':cloudUser?.id||'local';
    items.filter(Boolean).forEach(item=>{const button=document.createElement('button');button.type='button';button.setAttribute('role','menuitem');button.disabled=Boolean(item.disabled);button.className=item.danger?'danger-icon':'';button.innerHTML=icon(item.icon||'ellipsis')+'<span>'+escapeHTML(item.label)+'</span>';button.onclick=()=>{closeMenu(false);if(account!==(cloudUser?.id||'local'))return notify('账号已切换，请重新打开。','warn','操作');item.run()};box.append(button)});
    if(!box.childElementCount)return;(trigger.closest('dialog[open]')||document.body).append(box);box.showPopover();active={menu:box,trigger};trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-haspopup','menu');
    positionMenu();box.querySelector('button:not(:disabled)')?.focus({preventScroll:true});
  }
  document.addEventListener('keydown',event=>{if(!active)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeMenu();return}if(event.key==='Tab'){closeMenu();return}if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...active.menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus()},true);
  document.addEventListener('pointerdown',event=>{if(active&&!active.menu.contains(event.target)&&!active.trigger.contains(event.target)){closeMenu(false);if(event.target.matches('.modal-layer,.confirm-layer,dialog[open]')){event.preventDefault();event.stopImmediatePropagation();document.addEventListener('click',click=>{click.preventDefault();click.stopImmediatePropagation()},{capture:true,once:true})}}},true);
  addEventListener('resize',positionMenu);root.visualViewport?.addEventListener('resize',positionMenu);document.addEventListener('scroll',event=>{
    if(!active||active.menu.contains(event.target))return;
    const r=active.trigger.getBoundingClientRect();if(!active.trigger.isConnected||!r.width||r.bottom<0||r.top>innerHeight){closeMenu(false);return}
    if(event.target===document||event.target.contains?.(active.trigger)){const b=active.menu.getBoundingClientRect(),top=root.visualViewport?.offsetTop||0,bottom=top+(root.visualViewport?.height||innerHeight);active.menu.style.left=`${Math.max(12,Math.min(r.right-b.width,innerWidth-b.width-12))}px`;active.menu.style.top=`${Math.max(top+12,r.bottom+b.height+8<bottom?r.bottom+6:r.top-b.height-6)}px`}
  },true);
  const command=(label,name,attributes='')=>`<button type="button" class="icon-btn" aria-label="${escapeHTML(label)}" data-tip="${escapeHTML(label)}" ${attributes}>${icon(name)}</button>`;
  function more(container,selector){
    if(!container||container.querySelector(':scope>[data-shared-more]'))return;
    const nodes=[...container.querySelectorAll(selector)];if(!nodes.length)return;
    for(const node of nodes){node.hidden=true;node.dataset.menuCommand=''}
    const trigger=document.createElement('button');trigger.type='button';trigger.className='icon-btn';trigger.dataset.sharedMore='';trigger.setAttribute('aria-label','更多操作');trigger.dataset.tip='更多操作';trigger.innerHTML=icon('ellipsis');container.append(trigger);
    trigger.onclick=event=>{event.stopPropagation();menu(trigger,nodes.filter(node=>node.isConnected&&(!node.matches('[data-fushi-browser]')||document.body.classList.contains('integrations-ready'))).map(node=>({label:node.getAttribute('aria-label')||node.dataset.tip||node.textContent.trim(),icon:node.querySelector('svg')?.dataset.lucide||'ellipsis',disabled:node.disabled,danger:node.classList.contains('danger-icon'),run:()=>node.isConnected?node.click():notify('内容已变化，请重新打开菜单。','warn','操作')})))};
  }
  function enhance(){
    const historyBar=document.getElementById('history-selection-bar'),head=document.querySelector('#view-history .section-head .action-row');
    if(historyBar&&head&&historyBar.parentElement!==head)head.append(historyBar);
    const all=document.getElementById('history-select-matching');if(all&&!all.dataset.compact){all.dataset.compact='';all.className='icon-btn';all.setAttribute('aria-label','全选筛选结果');all.dataset.tip='全选筛选结果';all.innerHTML=icon('square-check')}
    more(historyBar?.querySelector('.history-selection-controls'),'button[aria-label^="导出"],button[aria-label="删除所选"]');
    const toggle=document.getElementById('history-selection-toggle');if(toggle){const active=historySelection.active,label=active?'退出多选':'批量选择';if(toggle.getAttribute('aria-label')!==label){toggle.setAttribute('aria-label',label);toggle.dataset.tip=label;toggle.innerHTML=icon(active?'x':'square-check')}}
    document.querySelectorAll('.scene-record>header>.scene-actions').forEach(node=>more(node,'[data-organize="pin"],[data-scene-action="feature"],[data-scene-action="edit"],[data-scene-action="remove"]'));
  }
  root.SharedUI={menu,closeMenu,command,more,enhance};
  let pane=null,bar=null,compact=false;
  function closeHome(focus=false){if(pane?.matches(':popover-open'))pane.hidePopover();bar?.querySelector('[data-home-query]')?.setAttribute('aria-expanded','false');if(focus)bar?.querySelector('[data-home-query]').focus({preventScroll:true})}
  function openHome(focus=true){if(!compact)return;lookupOptionsExpanded=true;applyLookupOptionsState();if(!pane.matches(':popover-open'))pane.showPopover();bar.querySelector('[data-home-query]').setAttribute('aria-expanded','true');if(focus)els.query.focus({preventScroll:true})}
  function syncHome(){
    if(!bar)return;const next=document.body.classList.contains('home-scrolled')&&activeView==='home';
    if(next!==compact){compact=next;bar.hidden=!compact;if(compact)pane.setAttribute('popover','manual');else{closeHome();pane.removeAttribute('popover')}}
    if(!compact)return;
    const lines=els.query.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),text=lines[0]||'输入单词、短语或句子',summary=bar.querySelector('[data-home-summary]');if(summary.textContent!==text)summary.textContent=text;
    const count=bar.querySelector('[data-home-count]'),label=[lines.length>1?`${lines.length} 条输入`:'',lookupQueue.length?`${lookupQueue.length} 条等待`:''].filter(Boolean).join(' · ');if(count.textContent!==label)count.textContent=label;count.hidden=!label;
    const b=bar.getBoundingClientRect(),v=root.visualViewport,bottom=(v?.offsetTop||0)+(v?.height||innerHeight);pane.style.setProperty('--query-panel-top',`${b.bottom+8}px`);pane.style.setProperty('--query-panel-height',`${Math.max(80,bottom-b.bottom-24)}px`);
    els.workspace.style.setProperty('--home-sticky-height',`${Math.ceil(b.height+18)}px`);
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    await appReady;await cloudInitPromise;pane=document.querySelector('#view-home .editor-pane');bar=document.createElement('div');bar.id='home-compact-bar';bar.className='home-compact-bar';bar.hidden=true;
    bar.innerHTML='<button type="button" class="compact-query-summary" data-home-query aria-label="展开查询输入与队列" aria-expanded="false"><span data-home-summary></span><small data-home-count hidden></small></button>'+command('添加场景或词条','image-plus','data-home-scene')+command('查询选项与队列','sliders-horizontal','data-home-options')+command('查询','search','data-home-run');pane.before(bar);
    bar.querySelector('[data-home-query]').onclick=()=>pane.matches(':popover-open')?closeHome(true):openHome();bar.querySelector('[data-home-options]').onclick=()=>pane.matches(':popover-open')?closeHome():openHome(false);bar.querySelector('[data-home-scene]').onclick=()=>document.querySelector('.query-actions [data-scene-action="open"]').click();bar.querySelector('[data-home-run]').onclick=()=>runLookup();syncHome();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pane?.matches(':popover-open')&&!document.querySelector('#input-suggestions:not([hidden]),dialog[open],.modal-layer.open,.confirm-layer.open')){event.preventDefault();event.stopImmediatePropagation();closeHome(true)}},true);
  document.addEventListener('pointerdown',event=>{if(pane?.matches(':popover-open')&&!pane.contains(event.target)&&!bar.contains(event.target))closeHome()},true);
  addEventListener('resize',syncHome);root.visualViewport?.addEventListener('resize',syncHome);
  root.HomeSticky={sync:syncHome,open:openHome,close:closeHome};
})(globalThis);
