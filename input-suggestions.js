(function(root){
  const selector='#query-input,.scene-phrase-form input,#scene-editor [name="entryTitle"],#scene-editor [name="lookupTerms"]';
  let current=null,items=[],selected=-1,sequence=0,worker=null,timer=null,choosing=false,composing=false,owner='';
  const menu=document.createElement('div');menu.className='input-suggestions';menu.id='input-suggestions';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','输入联想');menu.setAttribute('popover','manual');menu.hidden=true;document.body.append(menu);
  function close(){clearTimeout(timer);sequence++;if(current){current.setAttribute('aria-expanded','false');current.removeAttribute('aria-activedescendant')}current=null;items=[];selected=-1;menu.hidden=true;if(menu.matches(':popover-open'))menu.hidePopover()}
  function position(){if(!current?.isConnected){close();return}const rect=current.getBoundingClientRect(),viewport=visualViewport,bottom=(viewport?.height||innerHeight)+(viewport?.offsetTop||0),width=Math.max(0,Math.min(Math.max(rect.width,240),innerWidth-24));menu.style.width=`${width}px`;menu.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;menu.style.maxHeight=`${Math.max(80,Math.min(288,bottom-24))}px`;const height=Math.min(menu.scrollHeight,288);menu.style.top=`${Math.max(viewport?.offsetTop||0,rect.bottom+height+8<bottom?rect.bottom+5:rect.top-height-5)}px`}
  function render(){
    if(!current||!items.length){if(!items.length){menu.hidden=true;if(menu.matches(':popover-open'))menu.hidePopover()}return}
    menu.innerHTML=items.slice(0,8).map((item,index)=>`<button type="button" role="option" id="suggestion-${index}" aria-selected="${selected===index}" data-suggestion="${index}"><span>${escapeHTML(item.value)}</span><small>${({personal:'已有词条',lexicon:'英语词库',spelling:'拼写建议'})[item.kind]}</small></button>`).join('');
    menu.hidden=false;if(menu.showPopover&&!menu.matches(':popover-open'))menu.showPopover();current.setAttribute('aria-expanded','true');if(selected>=0)current.setAttribute('aria-activedescendant',`suggestion-${selected}`);position();
  }
  function choose(index){
    const input=current,item=items[index];if(!input||!item||owner!==(cloudUser?.id||'local'))return close();
    choosing=true;input.value=item.value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new CustomEvent('lexi-suggestion',{bubbles:true,detail:{id:item.entryId||null}}));choosing=false;close();input.focus({preventScroll:true});
  }
  function search(input){
    if(choosing||composing||getSettings().wordSuggestions===false)return;
    const text=input.value.trim();if(!text||text.length>80||/[\r\n]/.test(text)){close();return}
    current=input;owner=cloudUser?.id||'local';const request=++sequence;
    const query=normalizeSearch(text),personal=new Map();
    for(const entry of getHistory()){
      const title=historyDisplayTitle(entry);if([title,entry.query].some(value=>normalizeSearch(value).startsWith(query))&&!personal.has(normalizeSearch(title)))personal.set(normalizeSearch(title),{value:title,kind:'personal',entryId:entry.id});
    }
    items=[...personal.values()].sort((a,b)=>a.value.length-b.value.length||a.value.localeCompare(b.value)).slice(0,8);selected=items.length?0:-1;
    input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded',String(Boolean(items.length)));render();
    if(!/^[a-z'-]{2,40}$/i.test(text))return;
    if(!worker)try{worker=new Worker('/suggestion-worker.js');worker.onmessage=({data})=>{
      if(!current||getSettings().wordSuggestions===false||data.id!==sequence||owner!==(cloudUser?.id||'local')||document.activeElement!==current)return;
      const used=new Set(items.map(v=>normalizeSearch(v.value)));items=[...items,...(data.items||[]).filter(v=>!used.has(normalizeSearch(v.value)))].slice(0,8);selected=items.length?0:-1;render();
    };worker.onerror=()=>{worker?.terminate();worker=null}}catch{return}
    worker.postMessage({id:request,text});
  }
  document.addEventListener('input',event=>{if(!event.target.matches(selector)||event.isComposing||choosing)return;clearTimeout(timer);const input=event.target;sequence++;timer=setTimeout(()=>{if(input===document.activeElement)search(input)},140)});
  document.addEventListener('compositionstart',event=>{if(event.target.matches(selector)){composing=true;close()}},true);
  document.addEventListener('compositionend',event=>{if(event.target.matches(selector)){composing=false;const input=event.target;clearTimeout(timer);timer=setTimeout(()=>search(input),150)}},true);
  document.addEventListener('keydown',event=>{
    if(!current||event.target!==current||menu.hidden||event.isComposing||composing||event.keyCode===229)return;
    if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){close();return}
    if(!['ArrowDown','ArrowUp','Enter','Escape','Tab'].includes(event.key))return;
    if(event.key==='Tab'){close();return}
    event.preventDefault();event.stopImmediatePropagation();
    if(event.key==='Escape')return close();if(event.key==='Enter')return choose(selected<0?0:selected);
    selected=(selected+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;render();menu.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});
  },true);
  menu.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-suggestion]');if(button){event.preventDefault();choose(Number(button.dataset.suggestion))}});
  document.addEventListener('pointerdown',event=>{if(current&&event.target!==current&&!menu.contains(event.target))close()},true);
  document.addEventListener('focusin',event=>{if(current&&event.target!==current&&!menu.contains(event.target))close()});
  document.addEventListener('scroll',event=>{if(!menu.contains(event.target))close()},true);addEventListener('resize',close);root.visualViewport?.addEventListener('resize',close);addEventListener('pagehide',()=>{close();worker?.terminate();worker=null});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){close();worker?.terminate();worker=null}});
  root.InputSuggestions={close};
})(globalThis);
