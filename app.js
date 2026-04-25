const SUPABASE_CONFIG={
  url:'https://uoifrqehkfvpzqojaazh.supabase.co',
  anonKey:'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80',
};

const STORAGE_KEYS={
  history:'lexi_glass_history_v2',
  settings:'lexi_glass_settings_v2',
  theme:'lexi_glass_theme',
  offline:'lexi_glass_offline_mode',
};
const CLOUD_KEYS={
  history:'lexi_glass_history',
  settings:'lexi_glass_settings',
  theme:'lexi_glass_theme',
};

let cloudClient=null;
let cloudUser=null;
let activeView='home';
let currentResult=null;

const els={
  authStatus:document.getElementById('auth-status'),
  accountPanel:document.getElementById('account-panel'),
  accountToggle:document.getElementById('account-toggle'),
  accountStatus:document.getElementById('account-status'),
  query:document.getElementById('query-input'),
  direction:document.getElementById('direction-input'),
  note:document.getElementById('note-input'),
  resultCard:document.getElementById('result-card'),
  resultJson:document.getElementById('result-json'),
  historyList:document.getElementById('history-list'),
  historyCount:document.getElementById('history-count'),
  apiUrl:document.getElementById('api-url'),
  apiKey:document.getElementById('api-key'),
  apiModel:document.getElementById('api-model'),
  storageStatus:document.getElementById('storage-status'),
};

function readJSON(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    return raw?JSON.parse(raw):fallback;
  }catch{
    return fallback;
  }
}
function writeJSON(key,value){localStorage.setItem(key,JSON.stringify(value))}
function escapeHTML(value){
  return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}
function notify(message,type='info',title='lexi-glass'){
  const toast=document.createElement('div');
  toast.className=`toast ${type}`;
  toast.innerHTML=`<div class="toast-title">${escapeHTML(title)}</div><div class="toast-msg">${escapeHTML(message)}</div>`;
  document.getElementById('toast-stack').appendChild(toast);
  setTimeout(()=>toast.remove(),3200);
}
function offlineMode(){return localStorage.getItem(STORAGE_KEYS.offline)==='1'}
function canEnterApp(){return Boolean(cloudUser)||offlineMode()}
function renderAuthGate(){
  document.body.classList.toggle('auth-required',!canEnterApp());
  document.body.classList.toggle('offline-mode',offlineMode()&&!cloudUser);
  document.body.classList.toggle('cloud-logged-in',Boolean(cloudUser));
  if(els.accountToggle){
    els.accountToggle.classList.toggle('signed-in',Boolean(cloudUser));
    els.accountToggle.textContent=cloudUser?'已登录':offlineMode()?'离线':'账号';
  }
  if(els.accountStatus){
    if(cloudUser)els.accountStatus.textContent=`已登录：${cloudUser.email}`;
    else if(offlineMode())els.accountStatus.textContent='当前为离线模式';
    else els.accountStatus.textContent=cloudClient?'未登录':'Supabase 未配置';
  }
  if(els.authStatus){
    els.authStatus.textContent=cloudClient?'未登录。可以登录或离线使用。':'Supabase 未配置。可以离线使用。';
  }
  if(els.storageStatus){
    els.storageStatus.textContent=cloudUser?'localStorage + Supabase 云端同步':'localStorage，本机本浏览器记录。';
  }
}
function authRedirectTo(){
  return `${location.origin}${location.pathname}`;
}
function credentials(source){
  const prefix=source==='auth'?'auth':'account';
  return {
    email:document.getElementById(`${prefix}-email`)?.value.trim()||'',
    password:document.getElementById(`${prefix}-password`)?.value||'',
  };
}
async function initCloud(){
  if(!SUPABASE_CONFIG.url||!SUPABASE_CONFIG.anonKey||!window.supabase){
    renderAuthGate();
    return;
  }
  cloudClient=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey);
  cloudClient.auth.onAuthStateChange(async (_event,session)=>{
    cloudUser=session?.user||null;
    renderAuthGate();
    if(cloudUser)await pullCloud();
  });
  const {data}=await cloudClient.auth.getSession();
  cloudUser=data.session?.user||null;
  renderAuthGate();
  if(cloudUser)await pullCloud();
}
async function loginPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法登录');
  const {email,password}=credentials(source);
  if(!email||!password)return notify('请输入邮箱和密码。','bad','登录失败');
  const {data,error}=await cloudClient.auth.signInWithPassword({email,password});
  if(error)return notify(error.message,'bad','登录失败');
  cloudUser=data.session?.user||null;
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
  await pullCloud();
}
async function signupPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法注册');
  const {email,password}=credentials(source);
  if(!email||password.length<6)return notify('密码至少 6 位。','bad','注册失败');
  const {data,error}=await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:authRedirectTo()}});
  if(error)return notify(error.message,'bad','注册失败');
  cloudUser=data.session?.user||cloudUser;
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
  notify(cloudUser?'注册并登录成功。':'注册邮件已发送。','good','注册');
}
async function loginMagic(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法登录');
  const {email}=credentials(source);
  if(!email)return notify('请输入邮箱。','bad','登录失败');
  const {error}=await cloudClient.auth.signInWithOtp({email,options:{emailRedirectTo:authRedirectTo()}});
  if(error)return notify(error.message,'bad','登录失败');
  notify('邮箱链接已发送。','good','检查邮箱');
}
async function resetCloudPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法重置');
  const {email}=credentials(source);
  if(!email)return notify('请输入邮箱。','bad','重置失败');
  const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectTo()});
  if(error)return notify(error.message,'bad','重置失败');
  notify('重置邮件已发送。','good','检查邮箱');
}
async function logoutCloud(){
  if(cloudClient)await cloudClient.auth.signOut();
  cloudUser=null;
  renderAuthGate();
}
function useOfflineMode(){
  localStorage.setItem(STORAGE_KEYS.offline,'1');
  renderAuthGate();
}
function exitOfflineMode(){
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
}
function toggleAccountPanel(){els.accountPanel.classList.toggle('open')}
function closeAccountPanel(){els.accountPanel.classList.remove('open')}

function getHistory(){return readJSON(STORAGE_KEYS.history,[])}
function setHistory(items){
  writeJSON(STORAGE_KEYS.history,items);
  renderHistory();
  syncAllToCloud(true);
}
function getSettings(){return readJSON(STORAGE_KEYS.settings,{apiUrl:'',apiKey:'',model:'gpt-4o-mini'})}
function setSettings(settings){
  writeJSON(STORAGE_KEYS.settings,settings);
  syncAllToCloud(true);
}
async function pullCloud(){
  if(!cloudClient||!cloudUser)return;
  const {data,error}=await cloudClient.from('study_store').select('key,value').eq('user_id',cloudUser.id).in('key',Object.values(CLOUD_KEYS));
  if(error)return notify(error.message,'bad','同步失败');
  const rows=Object.fromEntries((data||[]).map(row=>[row.key,row.value?.raw]));
  if(rows[CLOUD_KEYS.history]){
    const remoteHistory=JSON.parse(rows[CLOUD_KEYS.history]);
    const merged=[...remoteHistory,...getHistory()]
      .filter((item,index,list)=>list.findIndex(row=>String(row.id)===String(item.id)||row.query===item.query)===index)
      .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
      .slice(0,120);
    writeJSON(STORAGE_KEYS.history,merged);
  }
  if(rows[CLOUD_KEYS.settings])writeJSON(STORAGE_KEYS.settings,JSON.parse(rows[CLOUD_KEYS.settings]));
  if(rows[CLOUD_KEYS.theme])localStorage.setItem(STORAGE_KEYS.theme,rows[CLOUD_KEYS.theme]);
  hydrateSettings();
  renderHistory();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme)||'auto');
  await syncAllToCloud(true);
}
async function syncAllToCloud(silent=false){
  if(!cloudClient||!cloudUser)return;
  const rows=[
    {user_id:cloudUser.id,key:CLOUD_KEYS.history,value:{raw:JSON.stringify(getHistory())}},
    {user_id:cloudUser.id,key:CLOUD_KEYS.settings,value:{raw:JSON.stringify(getSettings())}},
    {user_id:cloudUser.id,key:CLOUD_KEYS.theme,value:{raw:localStorage.getItem(STORAGE_KEYS.theme)||'auto'}},
  ];
  const {error}=await cloudClient.from('study_store').upsert(rows,{onConflict:'user_id,key'});
  if(error)return notify(error.message,'bad','同步失败');
  if(!silent)notify('已同步到云端。','good','同步完成');
}

function showView(id,button){
  activeView=id;
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===`view-${id}`));
  document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
  if(button)button.classList.add('active');
  if(id==='history')renderHistory();
}
function setResultTab(id,button){
  document.querySelectorAll('.result-page').forEach(page=>page.classList.remove('active'));
  document.getElementById(id==='card'?'result-card':'result-json').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.classList.remove('active'));
  button.classList.add('active');
}
function renderEmpty(){
  els.resultCard.innerHTML='<div class="empty">等待查询</div>';
  els.resultJson.textContent='';
}
function renderResult(result){
  currentResult=result;
  els.resultJson.textContent=JSON.stringify(result,null,2);
  const head=result.headword||{};
  const meta=result.meta||{};
  const senses=result.senses||[];
  const collocations=result.collocations||[];
  const register=result.register||{};
  const confusions=result.confusions||[];
  els.resultCard.innerHTML=`
    <div class="entry-head">
      <div class="entry-tag">${escapeHTML(head.languageTag||meta.language||'')}</div>
      <div class="entry-title">${escapeHTML(head.title||meta.query||'')}</div>
      <div class="entry-meta">基本词性：${escapeHTML(head.basicPartOfSpeech||'')}　核心义：${escapeHTML(head.coreMeaning||'')}</div>
      ${head.summary?`<div class="entry-meta">${escapeHTML(head.summary)}</div>`:''}
    </div>
    ${renderItems('一、义项分析',senses,item=>`
      <div class="item-title">${escapeHTML(item.index)}. ${escapeHTML(item.partOfSpeech)}: ${escapeHTML(item.shortestLabel)}</div>
      <div class="line"><b>语意：</b>${escapeHTML(item.meaning)}</div>
      <div class="line"><b>例句：</b>${escapeHTML(item.example)}</div>
      <div class="line"><b>译文：</b>${escapeHTML(item.translation)}</div>
    `)}
    ${renderItems('二、固定搭配',collocations,item=>`
      <div class="item-title">${escapeHTML(item.index)}. ${escapeHTML(item.phrase)}${item.note?`<span class="chip">${escapeHTML(item.note)}</span>`:''}</div>
      <div class="line"><b>语意：</b>${escapeHTML(item.meaning)}</div>
      <div class="line"><b>例句：</b>${escapeHTML(item.example)}</div>
      <div class="line"><b>译文：</b>${escapeHTML(item.translation)}</div>
    `)}
    <div class="block">
      <div class="block-title">三、语义感受与使用说明</div>
      <div class="item">
        <div class="line"><b>语体属性：</b>${escapeHTML(register.style||'')}</div>
        <div class="line"><b>语义气质：</b>${escapeHTML(register.tone||'')}</div>
        <div class="line"><b>使用环境：</b>${escapeHTML(register.environment||'')}</div>
      </div>
    </div>
    ${renderConfusions(confusions)}
  `;
}
function renderItems(title,items,renderer){
  return `<div class="block"><div class="block-title">${title}</div>${items.length?items.map(item=>`<div class="item">${renderer(item)}</div>`).join(''):'<div class="item"><div class="line">无</div></div>'}</div>`;
}
function renderConfusions(items){
  if(!items.length)return '';
  return `<div class="block"><div class="block-title">四、近义词 / 易混词辨析</div><table class="confusion-table"><thead><tr><th>词</th><th>核心区别</th><th>语体/使用倾向</th></tr></thead><tbody>${items.map(item=>`<tr><td>${escapeHTML(item.term)}</td><td>${escapeHTML(item.difference)}</td><td>${escapeHTML(item.usage)}</td></tr>`).join('')}</tbody></table></div>`;
}
async function runLookup(){
  const query=els.query.value.trim();
  if(!query)return notify('请输入要查的内容。','bad','无法查询');
  const settings=getSettings();
  notify('正在查询。','info','模型调用');
  try{
    const response=await fetch('/api/analyze',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        query,
        direction:els.direction.value.trim(),
        note:els.note.value.trim(),
        apiUrl:settings.apiUrl,
        apiKey:settings.apiKey,
        model:settings.model,
      }),
    });
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'查询失败');
    renderResult(data);
    addHistory({id:Date.now(),query,result:data,createdAt:new Date().toISOString()});
    notify('结果已生成。','good','查询完成');
  }catch(error){
    notify(error.message||'查询失败。','bad','查询失败');
  }
}
function addHistory(item){
  const history=getHistory().filter(existing=>existing.query!==item.query);
  history.unshift(item);
  setHistory(history.slice(0,120));
}
function renderHistory(){
  const history=getHistory();
  els.historyCount.textContent=`${history.length} 条`;
  if(!history.length){
    els.historyList.innerHTML='<div class="empty">暂无历史记录</div>';
    return;
  }
  els.historyList.innerHTML=history.map(item=>`
    <div class="history-item">
      <div>
        <div class="history-word">${escapeHTML(item.query)}</div>
        <div class="history-time">${new Date(item.createdAt).toLocaleString('zh-CN',{hour12:false})}</div>
      </div>
      <div class="history-actions">
        <button class="plain-btn" onclick="loadHistory(${Number(item.id)})">查看</button>
        <button class="plain-btn danger-btn" onclick="deleteHistory(${Number(item.id)})">删除</button>
      </div>
    </div>
  `).join('');
}
function loadHistory(id){
  const item=getHistory().find(row=>Number(row.id)===Number(id));
  if(!item)return;
  els.query.value=item.query;
  renderResult(item.result);
  showView('home',document.getElementById('nav-home'));
}
function deleteHistory(id){setHistory(getHistory().filter(item=>Number(item.id)!==Number(id)))}
function clearHistory(){
  if(!confirm('确认清空历史记录？'))return;
  setHistory([]);
}
function exportHistory(){downloadText('lexi-glass-history.json',JSON.stringify(getHistory(),null,2))}
function exportCurrent(){
  if(!currentResult)return notify('还没有结果。','bad','无法导出');
  const name=(currentResult.meta?.normalized||currentResult.meta?.query||'lexi-glass').replace(/[\\/:*?"<>|]/g,'_');
  downloadText(`${name}.json`,JSON.stringify(currentResult,null,2));
}
function copyJSON(){
  if(!currentResult)return notify('还没有结果。','bad','无法复制');
  navigator.clipboard.writeText(JSON.stringify(currentResult,null,2));
  notify('JSON 已复制。','good','复制完成');
}
function downloadText(filename,text){
  const blob=new Blob([text],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;
  link.download=filename;
  link.click();
  URL.revokeObjectURL(url);
}
function clearEditor(){
  els.query.value='';
  els.direction.value='';
  els.note.value='';
}
function hydrateSettings(){
  const settings=getSettings();
  els.apiUrl.value=settings.apiUrl||'';
  els.apiKey.value=settings.apiKey||'';
  els.apiModel.value=settings.model||'gpt-4o-mini';
}
function saveSettings(){
  setSettings({apiUrl:els.apiUrl.value.trim(),apiKey:els.apiKey.value.trim(),model:els.apiModel.value.trim()||'gpt-4o-mini'});
  notify('设置已保存。','good','设置');
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme==='auto'?'':theme;
  document.querySelectorAll('.seg button').forEach(btn=>btn.classList.remove('active'));
  document.getElementById(`th-${theme}`)?.classList.add('active');
}
function setTheme(theme){
  localStorage.setItem(STORAGE_KEYS.theme,theme);
  applyTheme(theme);
  syncAllToCloud(true);
}
function cycleTheme(){
  const order=['auto','light','dark'];
  const current=localStorage.getItem(STORAGE_KEYS.theme)||'auto';
  setTheme(order[(order.indexOf(current)+1)%order.length]);
}

renderEmpty();
hydrateSettings();
renderHistory();
applyTheme(localStorage.getItem(STORAGE_KEYS.theme)||'auto');
initCloud();
