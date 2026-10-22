(function(root){
 const tags=new Set(['ARTICLE','SECTION','DIV','SPAN','P','H1','H2','H3','H4','OL','UL','LI','B','STRONG','I','EM','SMALL','SUP','SUB','BR','BLOCKQUOTE']);
 const blocked=new Set(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','FORM','BUTTON','AUDIO','VIDEO','TEMPLATE']);
 const classes=new Set(['entry','headword','pos','phon','sense','sensetop','shcut','def','chn','x','xs','examples','gram','label','labels','cf','idm','idmg','phrasal_verb','pv','bold','translation']);
 const key=query=>String(query||'').trim().toLocaleLowerCase();
 const owner=()=>typeof cloudUser!=='undefined'?cloudUser?.id||'':'';
 const cacheKey=(account,query)=>`dictionary:v1:${account}:${key(query)}`;
 const installs=new WeakMap(),capabilities=new Map();
 function safeHTML(value){
  const fragment=document.createDocumentFragment();if(typeof value!=='string'||value.length>262144)return fragment;
  const parsed=document.createElement('template');parsed.innerHTML=value;
  function copy(source,target,depth=0){
   if(depth>80)return;
   for(const child of source.childNodes){
    if(child.nodeType===3){target.append(document.createTextNode(child.textContent));continue}
    if(child.nodeType!==1||blocked.has(child.tagName))continue;
    if(!tags.has(child.tagName)){copy(child,target,depth+1);continue}
    const node=document.createElement(child.tagName.toLowerCase());
    node.className=[...child.classList].filter(name=>classes.has(name)).join(' ');copy(child,node,depth+1);target.append(node);
   }
  }
  copy(parsed.content,fragment);return fragment;
 }
 async function valid(snapshot){
  if(!snapshot||typeof snapshot.id!=='string'||!snapshot.id||typeof snapshot.canonical!=='string'||snapshot.canonical.length>262144||!/^[a-f0-9]{64}$/.test(snapshot.hash))return false;
  try{
   const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(snapshot.canonical));
   const hash=[...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('');
   const payload=JSON.parse(snapshot.canonical);
   return hash===snapshot.hash&&JSON.stringify(payload)===JSON.stringify(snapshot.payload)&&payload.textOnly===true&&typeof payload.dictionary==='string'&&Array.isArray(payload.senses)&&payload.senses.length>0&&payload.senses.length<=100&&payload.senses.every(sense=>typeof sense.html==='string');
  }catch{return false}
 }
 async function cached(query,account=owner()){
  if(!account)return [];
  try{const values=await SceneData.getDraft(cacheKey(account,query));const result=[];for(const snapshot of Array.isArray(values)?values:[])if(await valid(snapshot))result.push(snapshot);return result}catch{return []}
 }
 async function remember(query,snapshot,account){
  if(!account||account!==owner()||!await valid(snapshot))throw Error('词典快照校验失败或账号已切换。');
  const values=await cached(query,account);if(account!==owner())throw Error('账号已切换。');
  await SceneData.putDraft(cacheKey(account,query),[snapshot,...values.filter(value=>value.id!==snapshot.id)].slice(0,20));
 }
 async function available(account){
  if(!account)return false;
  const previous=capabilities.get(account);if(previous&&Date.now()-previous.time<30000)return previous.promise;
  const promise=AnkiBridge.request('health').then(value=>owner()===account&&value.dictionary===true).catch(()=>false);
  capabilities.set(account,{time:Date.now(),promise});return promise;
 }
 async function snapshots(query,{refresh=false}={}){
  const account=owner();let result=await cached(query,account);
  if(refresh&&await available(account)){
   try{
   const rows=await AnkiBridge.request('dictionary_list',{query});
   for(const row of rows){
    if(owner()!==account)throw Error('账号已切换。');
    if(result.some(value=>value.id===row.id))continue;
    const snapshot=await AnkiBridge.request('dictionary_get',{snapshotId:row.id});
    await remember(query,snapshot,account);result=[snapshot,...result];
   }
   }catch(error){if(!result.length||owner()!==account)throw error}
  }
  return owner()===account?result:[];
 }
 function renderSnapshot(target,snapshot){
  target.replaceChildren();const heading=document.createElement('h3');heading.textContent=[snapshot.payload.headword,snapshot.payload.dictionary].filter(Boolean).join(' · ');target.append(heading);
  for(const sense of snapshot.payload.senses){const section=document.createElement('section');section.className='dictionary-sense';section.append(safeHTML(sense.html));target.append(section)}
 }
 async function lookup(query,onSaved,draft=null){
  const account=owner(),node=AnkiBridge.dialog('查询本机词典'),body=node.querySelector('.scene-dialog-body');let pending=false,context=draft?.context||null;
  body.innerHTML='<label class="scene-field"><span>接收电脑</span><select name="dictionary-device"></select></label><label class="history-search search-field"><span></span><input type="search" aria-label="词典查询" maxlength="200" autocomplete="off"></label><button type="button" class="plain-btn" data-dictionary-connect>读取此电脑词典</button><div data-dictionary-results></div>';
  body.querySelector('.search-field>span').innerHTML=icon('search');body.querySelector('input').value=draft?.query??query;
  const status=node.querySelector('[role=status]'),select=body.querySelector('select'),button=body.querySelector('[data-dictionary-connect]'),results=body.querySelector('[data-dictionary-results]');
  const current=()=>node.isConnected&&owner()===account;
  function renderEntries(value,requestId,word,chosen=[]){
   if(!current())return;context={value,requestId,word};results.replaceChildren();
   if(!value.entries?.length){status.textContent='此词典没有找到条目。';return}
   value.entries.forEach((entry,index)=>{
    const section=document.createElement('section'),title=document.createElement('h3');title.textContent=[entry.headword,value.dictionary].join(' · ');section.append(title);
    entry.senses.forEach(sense=>{const row=document.createElement('label');row.className='dictionary-choice';const check=document.createElement('input');check.type='checkbox';check.value=sense.id;check.dataset.selection=`${index}:${sense.id}`;check.checked=chosen.includes(check.dataset.selection);const content=document.createElement('div');content.append(safeHTML(sense.html));row.append(check,content);section.append(row)});
    const save=document.createElement('button');save.type='button';save.className='plain-btn primary-btn';save.textContent='保存所选义项';section.append(save);results.append(section);
    save.onclick=async()=>{if(pending||!current())return;const ids=[...section.querySelectorAll('input:checked')].map(box=>box.value);if(!ids.length||ids.length>100){status.textContent='请选择 1–100 个义项。';return}pending=true;save.disabled=true;try{const snapshot=await AnkiBridge.request('dictionary_save',{requestId,entryIndex:index,senseIds:ids});if(!current())return;await remember(word,snapshot,account);onSaved?.(snapshot,word);node.close()}catch(error){status.textContent=error.message}finally{pending=false;if(save.isConnected)save.disabled=false}};
   });
  }
  UIOverlays.guardDialog(node,{initialState:{query,selected:[]},getState:()=>({query:body.querySelector('input').value,selected:[...results.querySelectorAll('input:checked')].map(input=>input.dataset.selection).sort()}),restore:state=>lookup(query,onSaved,{...state,context})});
  try{const devices=await AnkiBridge.request('devices');if(!current())return;for(const device of devices)select.add(new Option(device.name,device.id));if(!devices.length){button.disabled=true;status.textContent='尚未登记电脑。请先在电脑学习伴侣中登录并登记。'}}catch(error){status.textContent=error.message;button.disabled=true}
  if(context)renderEntries(context.value,context.requestId,context.word,draft?.selected||[]);
  button.onclick=async()=>{
   if(pending)return;pending=true;button.disabled=true;
   try{
    if(!current())throw Error('账号已切换。');
    await FushiWorkspace.command(node,{deviceId:select.value,kind:'diagnostics'},async result=>{
     if(!current())return;
     const catalog=result.dictionary;if(!catalog?.ok)throw Error(catalog?.message||'此电脑未返回词典列表，请更新学习伴侣。');
     results.replaceChildren();const field=document.createElement('label');field.className='scene-field';const label=document.createElement('span');label.textContent='已安装的词典';const dictionaries=document.createElement('select');dictionaries.setAttribute('aria-label','已安装的词典');for(const name of catalog.names||[])dictionaries.add(new Option(name,name));field.append(label,dictionaries);
     const search=document.createElement('button');search.type='button';search.className='plain-btn primary-btn';search.textContent='查询词典';search.disabled=!dictionaries.options.length;results.append(field,search);
     search.onclick=async()=>{
      if(pending||!current())return;const word=body.querySelector('input').value.trim();if(!word){status.textContent='请输入要查的单词或词组。';return}
      pending=true;search.disabled=true;
      try{await FushiWorkspace.command(node,{deviceId:select.value,kind:'dictionary_lookup',query:word,dictionary:dictionaries.value},async(value,requestId)=>{
       renderEntries(value,requestId,word);
      })}catch(error){if(current())status.textContent=error.message}finally{pending=false;if(search.isConnected)search.disabled=false}
     };
    });
   }catch(error){if(current())status.textContent=error.message}finally{pending=false;if(button.isConnected)button.disabled=false}
  };
 }
 async function install(container){
  const head=container?.querySelector('.entry-head'),query=head?.querySelector('.entry-title')?.textContent.trim(),account=owner();
  if(!head)return;
  const existing=installs.get(head);if(existing?.account===account)return;existing?.dispose?.();
  if(!query||!account){installs.delete(head);return}
  const state={account};installs.set(head,state);
  let values=await cached(query,account),online=await available(account);
  if(!head.isConnected||installs.get(head)!==state||owner()!==account||(!online&&!values.length))return;
  const content=head.parentElement,nav=container.querySelector('.reading-nav'),bar=document.createElement('div'),pane=document.createElement('section');bar.className='dictionary-tabs seg';bar.setAttribute('aria-label','释义来源');pane.className='dictionary-pane';pane.hidden=true;
  const ai=document.createElement('button'),dictionary=document.createElement('button');ai.type=dictionary.type='button';ai.textContent='AI 释义';dictionary.textContent='本机词典';ai.className='active';bar.append(ai,dictionary);head.after(bar,pane);
  const hidden=new Map();
  function switchTab(show){
   for(const button of [ai,dictionary]){const active=button===(show?dictionary:ai);button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))}
   if(show){for(const child of content.children)if(![head,bar,pane].includes(child)){if(!hidden.has(child))hidden.set(child,child.hidden);child.hidden=true}}else{for(const [child,value] of hidden)child.hidden=value;hidden.clear()}
   if(nav)nav.hidden=show;pane.hidden=!show;
  }
  state.dispose=()=>{switchTab(false);bar.remove();pane.remove()};
  async function render(refresh=false){
   if(owner()!==account){bar.remove();pane.remove();switchTab(false);return}
   try{values=await snapshots(query,{refresh});if(!head.isConnected||owner()!==account)return;pane.replaceChildren();
    const tools=document.createElement('div');tools.className='dictionary-toolbar';const select=document.createElement('select');select.setAttribute('aria-label','已保存词典快照');for(const snapshot of values)select.add(new Option(`${snapshot.payload.dictionary} · ${snapshot.payload.senses.length} 个义项`,snapshot.id));tools.append(select);
    if(online){const search=document.createElement('button');search.className='plain-btn';search.type='button';search.textContent='查询与选择义项';search.onclick=()=>lookup(query,()=>render());tools.append(search)}pane.append(tools);
    const reading=document.createElement('div');reading.className='dictionary-reading';pane.append(reading);const show=()=>{const snapshot=values.find(value=>value.id===select.value);if(snapshot)renderSnapshot(reading,snapshot);else reading.textContent='尚无已保存的词典义项。'};select.onchange=show;show();
    const source=document.createElement('p');source.className='dictionary-source';source.textContent=online?'所选义项快照；新查询需要接收电脑在线。':'离线快照；电脑离线时不能查询新内容。';pane.append(source);
   }catch(error){pane.textContent=error.message}
  }
  ai.onclick=()=>switchTab(false);dictionary.onclick=()=>{switchTab(true);render(true)};
 }
 root.DictionaryUI={safeHTML,valid,cached,snapshots,remember,renderSnapshot,lookup,install};
})(globalThis);
