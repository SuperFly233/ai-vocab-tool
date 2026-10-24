(function(root){
 let worker,sequence=0;const pending=new Map(),installs=new WeakMap();
 function stop(){worker?.terminate();worker=null;for(const state of pending.values()){clearTimeout(state.timer);state.reject(Error('词库已暂停'))}pending.clear()}
 function request(text,kind){
  if(!worker){worker=new Worker('/basic-dictionary-worker.js?v=0.41.0');worker.onmessage=({data})=>{const state=pending.get(data.id);if(!state)return;clearTimeout(state.timer);pending.delete(data.id);data.error?state.reject(Error(data.error)):state.resolve(data)};worker.onerror=stop}
  return new Promise((resolve,reject)=>{const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('词库读取超时，请重试'))},15000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,text,kind})});
 }
 function install(container){
  if(!container||container.querySelector('.lookup-stream'))return;
  const target=container.querySelector('.entry-head,.lookup-error'),query=target?.querySelector('.entry-title')?.textContent.trim()||target?.dataset.lookupQuery;
  const old=installs.get(container),account=cloudUser?.id||'local';
  if(getSettings().basicDictionary===false||!target||!query){old?.node.remove();installs.delete(container);return}
  if(old?.target===target&&old.account===account&&old.query===query&&old.node.isConnected)return;
  old?.node.remove();const node=document.createElement('aside');node.className='basic-reference';node.setAttribute('aria-label','基础词典');if(target.classList.contains('lookup-error'))target.before(node);else target.after(node);const state={node,target,account,query};installs.set(container,state);
  const valid=()=>node.isConnected&&installs.get(container)===state&&account===(cloudUser?.id||'local')&&getSettings().basicDictionary!==false;
  const details=document.createElement('details'),summary=document.createElement('summary'),reading=document.createElement('div');details.open=target.classList.contains('lookup-error');reading.className='basic-reading';details.append(summary,reading);node.append(details);
  async function load(){
   summary.textContent='基础词典 · 读取中';reading.replaceChildren();
   try{const value=await request(query,'exact');if(!valid())return;summary.textContent='基础词典';
    if(!value.items.length){summary.textContent=value.unsupported?'基础词典 · 当前语言暂无基础词库':'基础词典 · 当前基础词库未收录';const message=document.createElement('p');message.textContent='基础词库范围为英汉、日英和中英；未命中不代表其他词典没有此词。';reading.append(message);return}
    summary.textContent='基础词典 · '+value.items[0].meaning.replace(/\s+/g,' ').slice(0,85)+(value.items[0].meaning.length>85?'…':'');
    if(value.partial){const warning=document.createElement('p');warning.textContent='部分基础词库暂不可用，当前仅显示已读取来源。';reading.append(warning)}
    for(const item of value.items){const row=document.createElement('section'),title=document.createElement('strong'),pronunciation=document.createElement('small'),meaning=document.createElement('p'),source=document.createElement('a');title.textContent=item.value;pronunciation.textContent=item.reading||'';meaning.textContent=item.meaning;source.href=item.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';source.textContent=`${item.source} · ${item.pair}${item.abridged?' · 节选':''}`;row.append(title,pronunciation,meaning,source);reading.append(row)}
    const license=document.createElement('a');license.href='/vendor/basic-dictionaries/README.md';license.target='_blank';license.rel='noopener';license.className='basic-license';license.textContent='词库来源与许可';reading.append(license);
   }catch(error){if(!valid())return;summary.textContent='基础词典暂不可用';details.open=true;const retry=document.createElement('button');retry.type='button';retry.className='plain-btn';retry.textContent='重试';retry.onclick=load;reading.append(retry)}
  }
  load();
 }
 addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 root.BasicDictionary={suggest:text=>request(text,'prefix'),lookup:text=>request(text,'exact'),install};
})(globalThis);
