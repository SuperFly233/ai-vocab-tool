(function(root){
  let active=null,menuSequence=0;
  function positionMenu(){
    if(!active)return;const {trigger,menu:box}=active,r=trigger.getBoundingClientRect(),v=root.visualViewport,top=v?.offsetTop||0,bottom=top+(v?.height||innerHeight);
    if(!trigger.isConnected||!r.width||r.bottom<top||r.top>bottom){closeMenu(false);return}
    box.style.maxHeight=`${Math.max(80,Math.min(active.kind==='select'?320:innerHeight,bottom-top-24))}px`;if(active.kind==='select')box.style.width=`${Math.min(Math.max(180,r.width),innerWidth-24)}px`;const b=box.getBoundingClientRect();box.style.left=`${Math.max(12,Math.min(r.right-b.width,innerWidth-b.width-12))}px`;box.style.top=`${Math.max(top+12,r.bottom+b.height+8<bottom?r.bottom+6:r.top-b.height-6)}px`;
  }
  function closeMenu(focus=true){if(!active)return;const {menu,trigger}=active;active=null;if(menu.matches(':popover-open'))menu.hidePopover();menu.remove();trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');if(focus&&trigger.isConnected)trigger.focus({preventScroll:true})}
  function menu(trigger,items,{kind='menu'}={}){
    if(active?.trigger===trigger){closeMenu();return}closeMenu(false);
    const box=document.createElement('div');box.id=`shared-menu-${++menuSequence}`;box.className=`shared-action-menu${kind==='select'?' shared-select-menu':''}`;box.setAttribute('popover','manual');box.setAttribute('role',kind==='select'?'listbox':'menu');box.setAttribute('aria-label',trigger.getAttribute('aria-label')||'更多操作');trigger.setAttribute('aria-controls',box.id);
    const account=typeof cloudUser==='undefined'?'local':cloudUser?.id||'local';
    items.filter(Boolean).forEach(item=>{const button=document.createElement('button');button.type='button';button.setAttribute('role',kind==='select'?'option':'menuitem');if(kind==='select')button.setAttribute('aria-selected',String(Boolean(item.selected)));button.disabled=Boolean(item.disabled);button.className=item.danger||kind!=='select'&&['trash-2','star-off','folder-minus','bookmark-x'].includes(item.icon)?'danger-icon':'';button.innerHTML=(kind==='select'?'':icon(item.icon||'ellipsis'))+'<span>'+escapeHTML(item.label)+'</span>';button.onclick=()=>{closeMenu(false);if(account!==(cloudUser?.id||'local'))return notify('账号已切换，请重新打开。','warn','操作');item.run()};box.append(button)});
    if(!box.childElementCount)return;(trigger.closest('dialog[open]')||document.body).append(box);box.showPopover();active={menu:box,trigger,kind};trigger.setAttribute('aria-expanded','true');trigger.setAttribute('aria-haspopup',kind==='select'?'listbox':'menu');
    positionMenu();(box.querySelector('[aria-selected="true"]:not(:disabled)')||box.querySelector('button:not(:disabled)'))?.focus({preventScroll:true});
  }
  document.addEventListener('keydown',event=>{
    const selection=document.querySelector('.scene-selection-highlight:popover-open');if(event.key==='Escape'&&selection&&!active){event.preventDefault();event.stopImmediatePropagation();selection.hidePopover();return}
    if(!active)return;if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();closeMenu();return}if(event.key==='Tab'){closeMenu();return}
    const buttons=[...active.menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);
    if(active.kind==='select'&&event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){active.search=Date.now()-(active.typedAt||0)<700?(active.search||'')+event.key:event.key;active.typedAt=Date.now();const match=buttons.find(button=>button.textContent.trim().toLocaleLowerCase().startsWith(active.search.toLocaleLowerCase()));if(match){event.preventDefault();match.focus()}return}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;event.preventDefault();buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();
  },true);
  document.addEventListener('pointerdown',event=>{const selection=document.querySelector('.scene-selection-highlight:popover-open');if(selection&&!selection.contains(event.target)&&!event.target.matches('#scene-editor textarea')){selection.hidePopover();if(event.target.matches('.modal-layer,.confirm-layer,dialog[open]')){event.preventDefault();event.stopImmediatePropagation();document.addEventListener('click',click=>{click.preventDefault();click.stopImmediatePropagation()},{capture:true,once:true})}}},true);
  document.addEventListener('pointerdown',event=>{if(active&&!active.menu.contains(event.target)&&!active.trigger.contains(event.target)){closeMenu(false);if(event.target.matches('.modal-layer,.confirm-layer,dialog[open]')){event.preventDefault();event.stopImmediatePropagation();document.addEventListener('click',click=>{click.preventDefault();click.stopImmediatePropagation()},{capture:true,once:true})}}},true);
  addEventListener('resize',positionMenu);root.visualViewport?.addEventListener('resize',positionMenu);document.addEventListener('scroll',event=>{
    if(!active||active.menu.contains(event.target))return;
    const r=active.trigger.getBoundingClientRect();if(!active.trigger.isConnected||!r.width||r.bottom<0||r.top>innerHeight){closeMenu(false);return}
    if(event.target===document||event.target.contains?.(active.trigger)){const b=active.menu.getBoundingClientRect(),top=root.visualViewport?.offsetTop||0,bottom=top+(root.visualViewport?.height||innerHeight);active.menu.style.left=`${Math.max(12,Math.min(r.right-b.width,innerWidth-b.width-12))}px`;active.menu.style.top=`${Math.max(top+12,r.bottom+b.height+8<bottom?r.bottom+6:r.top-b.height-6)}px`}
  },true);
  const command=(label,name,attributes='')=>`<button type="button" class="icon-btn" aria-label="${escapeHTML(label)}" data-tip="${escapeHTML(label)}" ${attributes}>${icon(name)}</button>`;
  const selectionSession=(count,attributes='')=>`<span class="selection-count" role="status">已选 ${count} 条</span><button type="button" class="selection-cancel" ${attributes}>取消</button>`;
  const selectionGroups=(controls,actions)=>`<div class="selection-controls" role="group" aria-label="控制选择">${controls}</div><div class="selection-operations" role="group" aria-label="操作所选内容">${actions}</div>`;
  const selectBindings=new WeakMap();
  function enhanceSelects(host=document){
    host.querySelectorAll('select:not([multiple])').forEach(source=>{
      let binding=selectBindings.get(source);
      if(!binding){
        const wrapper=document.createElement('span'),button=document.createElement('button');wrapper.className='lexi-select';source.before(wrapper);wrapper.append(source,button);source.classList.add('lexi-select-source');source.tabIndex=-1;source.setAttribute('aria-hidden','true');
        button.type='button';button.className='lexi-select-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.innerHTML='<span></span>'+icon('chevron-down');
        binding={button};selectBindings.set(source,binding);
        const open=()=>{if(source.disabled)return;menu(button,[...source.options].map(option=>({label:option.label,selected:option.selected,disabled:option.disabled||option.parentElement.disabled,run:()=>{if(!source.isConnected||source.disabled)return;const current=[...source.options].find(row=>row.value===option.value&&!row.disabled);if(!current)return;source.value=current.value;source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));sync();if(button.isConnected)button.focus({preventScroll:true})}})),{kind:'select'})};
        const sync=()=>{const text=source.selectedOptions[0]?.label||'—',span=button.querySelector('span');if(span.textContent!==text)span.textContent=text;button.disabled=source.disabled;const label=source.getAttribute('aria-label')||source.closest('label')?.querySelector(':scope>span')?.textContent||text;if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label)};
        binding.sync=sync;button.onclick=open;button.onkeydown=event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();open();if(active?.trigger===button&&['Home','End'].includes(event.key)){const options=[...active.menu.querySelectorAll('button:not(:disabled)')];options[event.key==='Home'?0:options.length-1]?.focus()}}};
        source.addEventListener('change',sync);new MutationObserver(()=>{if(active?.trigger===button)closeMenu(false);sync()}).observe(source,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','label','selected','value','aria-label']});
      }
      binding.sync();
    });
  }
  function more(container,selector){
    if(!container||container.querySelector(':scope>[data-shared-more]'))return;
    const nodes=[...container.querySelectorAll(selector)];if(!nodes.length)return;
    for(const node of nodes){node.hidden=true;node.dataset.menuCommand=''}
    const trigger=document.createElement('button');trigger.type='button';trigger.className='icon-btn';trigger.dataset.sharedMore='';trigger.setAttribute('aria-label','更多操作');trigger.dataset.tip='更多操作';trigger.innerHTML=icon('ellipsis');container.append(trigger);
    trigger.onclick=event=>{event.stopPropagation();menu(trigger,nodes.filter(node=>node.isConnected&&(!node.matches('[data-fushi-browser]')||document.body.classList.contains('integrations-ready'))).map(node=>({label:node.getAttribute('aria-label')||node.dataset.tip||node.textContent.trim(),icon:node.querySelector('svg')?.dataset.lucide||'ellipsis',disabled:node.disabled,danger:node.classList.contains('danger-icon'),run:()=>node.isConnected?node.click():notify('内容已变化，请重新打开菜单。','warn','操作')})))};
  }
  function enhance(){
    document.querySelectorAll('button:has(svg[data-lucide="trash-2"]),button[data-scene-action="remove"],button[data-scene-action="detach"]').forEach(button=>button.classList.add('danger-icon'));
    const historyBar=document.getElementById('history-selection-bar'),head=document.querySelector('#view-history .section-head .action-row');
    if(historyBar&&head){
      let session=head.querySelector('[data-history-selection-session]');if(!session){session=document.createElement('div');session.className='selection-session';session.dataset.historySelectionSession='';session.innerHTML='<button type="button" class="selection-cancel">取消</button>';session.prepend(document.getElementById('history-selection-count'));session.querySelector('button').onclick=()=>toggleHistorySelectionMode();head.append(session)}
      session.hidden=!historySelection.active;head.classList.toggle('selection-header-active',historySelection.active);
      if(historyBar.parentElement===head)document.getElementById('history-list').before(historyBar);
    }
    more(historyBar?.querySelector('.selection-operations'),'button[aria-label^="导出"],button[aria-label="删除所选"]');
    const toggle=document.getElementById('history-selection-toggle');if(toggle&&toggle.getAttribute('aria-label')!=='批量选择'){toggle.setAttribute('aria-label','批量选择');toggle.dataset.tip='批量选择';toggle.innerHTML=icon('square-check')}
    document.querySelectorAll('.scene-record>header>.scene-actions').forEach(node=>more(node,'[data-organize="pin"],[data-scene-action="feature"],[data-scene-action="edit"],[data-scene-action="remove"]'));
  }
  root.SharedUI={menu,closeMenu,command,more,enhance,enhanceSelects,selectionSession,selectionGroups};
  let pane=null,bar=null,compact=false,inputSizeKey='',inputHeightBeforePopup=null;
  function fitHomeInput(){
    if(!pane?.matches(':popover-open'))return;
    const input=els.query,key=JSON.stringify([input.value,input.clientWidth]);if(inputSizeKey===key)return;inputSizeKey=key;if(inputHeightBeforePopup===null)inputHeightBeforePopup=input.style.height;
    input.style.height='44px';input.style.height=`${Math.max(44,Math.min(136,input.scrollHeight))}px`;
  }
  function homeDisclosure(expanded){bar?.querySelector('[data-home-query]')?.setAttribute('aria-expanded',String(expanded));const trigger=bar?.querySelector('[data-home-options]');if(trigger){trigger.setAttribute('aria-expanded',String(expanded));trigger.setAttribute('aria-label',expanded?'收起查询选项':'展开查询选项');trigger.innerHTML=icon(expanded?'chevron-up':'chevron-down')}}
  function closeHome(focus=false){if(pane?.matches(':popover-open'))pane.hidePopover();if(pane&&inputHeightBeforePopup!==null){if(inputHeightBeforePopup)els.query.style.height=inputHeightBeforePopup;else els.query.style.removeProperty('height');inputHeightBeforePopup=null}inputSizeKey='';homeDisclosure(false);if(focus)bar?.querySelector('[data-home-query]').focus({preventScroll:true})}
  function openHome(focus=true){if(!compact)return;lookupOptionsExpanded=true;applyLookupOptionsState();if(!pane.matches(':popover-open'))pane.showPopover();fitHomeInput();homeDisclosure(true);if(focus)els.query.focus({preventScroll:true})}
  function syncHome(){
    if(!bar)return;const next=document.body.classList.contains('home-scrolled')&&activeView==='home';
    if(next!==compact){compact=next;bar.hidden=!compact;if(compact)pane.setAttribute('popover','manual');else{closeHome();pane.removeAttribute('popover')}}
    if(!compact)return;
    const lines=els.query.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),text=lines[0]||'输入单词、短语或句子',summary=bar.querySelector('[data-home-summary]');if(summary.textContent!==text)summary.textContent=text;
    const count=bar.querySelector('[data-home-count]'),label=[lines.length>1?`${lines.length} 条输入`:'',lookupQueue.length?`${lookupQueue.length} 条等待`:''].filter(Boolean).join(' · ');if(count.textContent!==label)count.textContent=label;count.hidden=!label;
    const b=bar.getBoundingClientRect(),v=root.visualViewport,bottom=(v?.offsetTop||0)+(v?.height||innerHeight);pane.style.setProperty('--query-panel-top',`${b.bottom+8}px`);pane.style.setProperty('--query-panel-height',`${Math.max(80,bottom-b.bottom-24)}px`);
    els.workspace.style.setProperty('--home-sticky-height',`${Math.ceil(b.height+18)}px`);
    fitHomeInput();
  }
  document.addEventListener('DOMContentLoaded',async()=>{
    await appReady;await cloudInitPromise;pane=document.querySelector('#view-home .editor-pane');els.query.addEventListener('input',fitHomeInput);bar=document.createElement('div');bar.id='home-compact-bar';bar.className='home-compact-bar';bar.hidden=true;
    bar.innerHTML='<button type="button" class="compact-query-summary" data-home-query aria-label="展开查询输入与队列" aria-expanded="false"><span data-home-summary></span><small data-home-count hidden></small></button>'+command('添加场景或词条','image-plus','data-home-scene')+command('查询','search','data-home-run')+'<button type="button" class="compact-query-disclosure" data-home-options aria-label="展开查询选项" aria-expanded="false" aria-controls="home-query-panel">'+icon('chevron-down')+'</button>';pane.id='home-query-panel';pane.before(bar);
    bar.querySelector('[data-home-query]').onclick=()=>pane.matches(':popover-open')?closeHome(true):openHome();bar.querySelector('[data-home-options]').onclick=()=>pane.matches(':popover-open')?closeHome():openHome(false);bar.querySelector('[data-home-scene]').onclick=()=>document.querySelector('.query-actions [data-scene-action="open"]').click();bar.querySelector('[data-home-run]').onclick=()=>runLookup();syncHome();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&pane?.matches(':popover-open')&&!document.querySelector('#input-suggestions:not([hidden]),dialog[open],.modal-layer.open,.confirm-layer.open')){event.preventDefault();event.stopImmediatePropagation();closeHome(true)}},true);
  document.addEventListener('pointerdown',event=>{if(pane?.matches(':popover-open')&&!pane.contains(event.target)&&!bar.contains(event.target))closeHome()},true);
  addEventListener('resize',syncHome);root.visualViewport?.addEventListener('resize',syncHome);
  root.HomeSticky={sync:syncHome,open:openHome,close:closeHome};
})(globalThis);
