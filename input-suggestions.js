(function(root){
  const selector='#query-input,.scene-phrase-form input,#scene-editor [name="entryTitle"],#scene-editor [name="lookupTerms"]';
  let current=null,items=[],selected=-1,sequence=0,worker=null,timer=null,scheduledInput=null,choosing=false,composing=false,compositionUntil=0,owner='',context=null,groups={personal:[],dictionary:[],words:[]};
  const menu=document.createElement('div');menu.className='input-suggestions';menu.id='input-suggestions';menu.setAttribute('role','listbox');menu.setAttribute('aria-label','输入联想');menu.setAttribute('popover','manual');menu.hidden=true;document.body.append(menu);
  function close(){clearTimeout(timer);scheduledInput=null;sequence++;if(current){current.setAttribute('aria-expanded','false');current.removeAttribute('aria-activedescendant')}current=null;context=null;items=[];selected=-1;menu.hidden=true;if(menu.matches(':popover-open'))menu.hidePopover()}
  function position(){if(!current?.isConnected){close();return}const rect=current.getBoundingClientRect(),viewport=visualViewport,bottom=(viewport?.height||innerHeight)+(viewport?.offsetTop||0),width=Math.max(0,Math.min(Math.max(rect.width,240),640,innerWidth-24));menu.style.width=`${width}px`;menu.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-width-12))}px`;menu.style.maxHeight=`${Math.max(80,Math.min(288,bottom-24))}px`;const height=Math.min(menu.scrollHeight,288);menu.style.top=`${Math.max(viewport?.offsetTop||0,rect.bottom+height+8<bottom?rect.bottom+5:rect.top-height-5)}px`}
  function segment(input){
    const value=input.value,caret=input.selectionStart??value.length,end=input.selectionEnd??caret,separators=input.id==='query-input'?/[\r\n]/:/[\r\n,，、;；]/;let start=caret,stop=caret;
    while(start>0&&!separators.test(value[start-1]))start--;while(stop<value.length&&!separators.test(value[stop]))stop++;
    if(end>stop)return null;const raw=value.slice(start,stop),leading=raw.length-raw.trimStart().length;start+=leading;stop=start+raw.trim().length;return {start,end:stop,text:value.slice(start,stop),value};
  }
  function combine(){const chosen=items[selected]?.value,seen=new Set();items=[...groups.personal,...groups.dictionary,...groups.words].filter(item=>{const key=normalizeSearch(item.value);if(seen.has(key))return false;seen.add(key);return true}).slice(0,8);selected=chosen?items.findIndex(item=>item.value===chosen):-1;render()}
  function render(){
    if(!current||!items.length){if(!items.length){menu.hidden=true;if(menu.matches(':popover-open'))menu.hidePopover()}return}
    menu.innerHTML=items.slice(0,8).map((item,index)=>`<button type="button" role="option" id="suggestion-${index}" aria-selected="${selected===index}" data-suggestion="${index}"><span class="suggestion-word">${escapeHTML(item.value)}</span>${getSettings().basicDictionary!==false&&item.meaning?`<span class="suggestion-meaning">${escapeHTML(item.meaning.replace(/\s+/g,' '))}</span>`:''}<small>${escapeHTML(item.source||({personal:'已有词条',lexicon:'英语词库',spelling:'拼写建议'})[item.kind]||'基础词库')}</small></button>`).join('');
    menu.hidden=false;if(menu.showPopover&&!menu.matches(':popover-open'))menu.showPopover();current.setAttribute('aria-expanded','true');if(selected>=0)current.setAttribute('aria-activedescendant',`suggestion-${selected}`);else current.removeAttribute('aria-activedescendant');position();
    root.UIOverlays?.hideFieldHint?.();
  }
  function choose(index){
    const input=current,item=items[index];if(!input||!item||owner!==(cloudUser?.id||'local'))return close();
    const latest=segment(input);if(!context||!latest||context.value!==input.value||latest.start!==context.start||latest.end!==context.end)return close();
    choosing=true;input.setRangeText(item.value,context.start,context.end,'end');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new CustomEvent('lexi-suggestion',{bubbles:true,detail:{id:item.entryId||null}}));choosing=false;close();input.focus({preventScroll:true});root.UIOverlays?.hideFieldHint?.();
  }
  function search(input){
    if(!input.isConnected||document.activeElement!==input)return close();
    if(choosing||composing||getSettings().wordSuggestions===false)return;
    const part=segment(input),text=part?.text||'';if(!text||text.length>80){close();return}
    if(current!==input||context?.start!==part.start||context?.text!==part.text)selected=-1;
    current=input;context=part;owner=cloudUser?.id||'local';const request=++sequence;
    const query=normalizeSearch(text),personal=new Map();
    for(const entry of getHistory()){
      const title=historyDisplayTitle(entry);if([title,entry.query].some(value=>normalizeSearch(value).startsWith(query))&&!personal.has(normalizeSearch(title)))personal.set(normalizeSearch(title),{value:title,kind:'personal',entryId:entry.id,meaning:latestHistoryResult(entry)?.headword?.coreMeaning||''});
    }
    groups={personal:[...personal.values()].sort((a,b)=>a.value.length-b.value.length||a.value.localeCompare(b.value)).slice(0,8),dictionary:[],words:[]};combine();
    input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-controls',menu.id);input.setAttribute('aria-expanded',String(Boolean(items.length)));render();
    const valid=()=>current===input&&request===sequence&&document.activeElement===input&&owner===(cloudUser?.id||'local')&&input.value===part.value&&getSettings().wordSuggestions!==false;
    root.BasicDictionary?.suggest(text).then(data=>{if(valid()){groups.dictionary=data.items||[];combine()}}).catch(()=>{});
    if(!/^[a-z'-]{2,40}$/i.test(text))return;
    if(!worker)try{worker=new Worker('/suggestion-worker.js');worker.onmessage=({data})=>{
      if(!current||getSettings().wordSuggestions===false||data.id!==sequence||owner!==(cloudUser?.id||'local')||document.activeElement!==current)return;
      groups.words=data.items||[];combine();
    };worker.onerror=()=>{worker?.terminate();worker=null}}catch{return}
    worker.postMessage({id:request,text});
  }
  document.addEventListener('input',event=>{if(!event.target.matches(selector)||event.isComposing||choosing)return;clearTimeout(timer);const input=event.target;scheduledInput=input;sequence++;timer=setTimeout(()=>{scheduledInput=null;if(input===document.activeElement)search(input)},140)});
  document.addEventListener('compositionstart',event=>{if(event.target.matches(selector)){composing=true;close()}},true);
  document.addEventListener('compositionend',event=>{if(event.target.matches(selector)){composing=false;compositionUntil=performance.now()+120;const input=event.target;clearTimeout(timer);timer=setTimeout(()=>search(input),150)}},true);
  document.addEventListener('keyup',event=>{if(event.target.matches(selector)&&['ArrowLeft','ArrowRight','Home','End','ArrowUp','ArrowDown'].includes(event.key)&&!composing){const part=segment(event.target);if(!part||part.start!==context?.start||part.text!==context?.text){close();search(event.target)}}});
  document.addEventListener('click',event=>{if(event.target.matches(selector)&&!composing)search(event.target)});
  document.addEventListener('keydown',event=>{
    if(event.target.matches(selector)&&event.key==='Enter'&&(event.isComposing||composing||event.keyCode===229||performance.now()<compositionUntil)){event.stopImmediatePropagation();if(!event.isComposing&&!composing&&event.keyCode!==229)event.preventDefault();return}
    if(!current||event.target!==current||menu.hidden||event.isComposing||composing||event.keyCode===229)return;
    if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){close();return}
    if(event.key==='Enter'&&event.shiftKey){close();return}
    if(!['ArrowDown','ArrowUp','Enter','Escape','Tab'].includes(event.key))return;
    if(event.key==='Tab'){close();return}
    if(event.key==='Enter'&&selected<0){close();return}
    event.preventDefault();event.stopImmediatePropagation();
    if(event.key==='Escape')return close();if(event.key==='Enter')return choose(selected);
    selected=selected<0?(event.key==='ArrowDown'?0:items.length-1):(selected+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;render();menu.querySelector('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});
  },true);
  menu.addEventListener('pointerdown',event=>{const button=event.target.closest('[data-suggestion]');if(button){event.preventDefault();choose(Number(button.dataset.suggestion))}});
  document.addEventListener('pointerdown',event=>{if(current&&event.target!==current&&!menu.contains(event.target))close()},true);
  document.addEventListener('focusin',event=>{if(current&&event.target!==current&&!menu.contains(event.target))close()});
  document.addEventListener('scroll',event=>{if(menu.contains(event.target))return;if(event.target.matches?.(selector)){if(event.target===current)position();return}if(scheduledInput&&event.target.contains?.(scheduledInput))return;close()},true);addEventListener('resize',close);root.visualViewport?.addEventListener('resize',close);addEventListener('pagehide',()=>{close();worker?.terminate();worker=null});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){close();worker?.terminate();worker=null}});
  const baskets=new WeakMap();
  function refreshBaskets(){
    document.querySelectorAll('#query-input,#scene-editor [name="lookupTerms"],#scene-editor [name="entryTitle"]').forEach(input=>{
      let node=baskets.get(input);if(!node||!node.isConnected){node=document.createElement('div');node.className='input-term-basket';node.setAttribute('aria-label','待查询词组');if(input.id==='query-input')input.closest('.query-row').before(node);else input.before(node);baskets.set(input,node)}
      if(node.dataset.value===input.value)return;node.dataset.value=input.value;node.replaceChildren();const terms=input.id==='query-input'?homeQueryTerms(input.value):SceneData.highlights(input.value);node.hidden=terms.length<2;
      terms.slice(0,20).forEach((term,index)=>{const chip=document.createElement('span'),label=document.createElement('span'),remove=document.createElement('button');chip.className='input-term-chip';label.textContent=term;remove.type='button';remove.setAttribute('aria-label',`移除词组：${term}`);remove.innerHTML=icon('x');remove.onclick=event=>{event.preventDefault();event.stopPropagation();const next=[...terms];next.splice(index,1);input.value=next.join('\n');input.dispatchEvent(new Event('input',{bubbles:true}));close();input.focus({preventScroll:true});root.UIOverlays?.hideFieldHint?.()};chip.append(label,remove);node.append(chip)});
      if(terms.length>20){const count=document.createElement('small');count.textContent=`另 ${terms.length-20} 项`;node.append(count)}
    });
  }
  document.addEventListener('input',event=>{if(event.target.matches(selector)&&!event.isComposing)refreshBaskets()});
  root.InputSuggestions={close,refreshBaskets};
})(globalThis);
