const SUPABASE_CONFIG={
  url:'https://uoifrqehkfvpzqojaazh.supabase.co',
  anonKey:'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80',
};

const STORAGE_KEYS={
  history:'ai_vocab_tool_history_v1',
  settings:'ai_vocab_tool_settings_v1',
  theme:'ai_vocab_tool_theme',
  offline:'ai_vocab_tool_offline_mode',
  layout:'ai_vocab_tool_layout',
  logs:'ai_vocab_tool_logs_v1',
};
const CLOUD_KEYS={
  history:'ai_vocab_tool_history',
  settings:'ai_vocab_tool_settings',
  theme:'ai_vocab_tool_theme',
  layout:'ai_vocab_tool_layout',
  logs:'ai_vocab_tool_logs',
};

let cloudClient=null;
let cloudUser=null;
let activeView='home';
let currentResult=null;
let currentHistoryId=null;
let currentFollowups=[];
let modalResult=null;
let modalHistoryId=null;
let modalRollId=null;
let configInfo=null;
let confirmResolver=null;
let lookupBusy=false;
let followupBusy=false;
let cloudBusy=false;
let cloudBootstrapped=false;
let cloudSyncQueued=false;
let cloudAutoTimer=null;
let passwordRecoveryMode=false;
const cloudDirtyKeys=new Set();
let editingFollowup=null;
let pendingFollowup=null;
const activeToasts=new Map();
const historyState={
  query:'',
  scope:'all',
  sort:'time',
  sortDir:'desc',
  filters:{
    language:'',
    direction:'',
    pos:'',
    style:'',
  },
};
const historyCollator=new Intl.Collator(['zh-Hans-CN','en','ja','ko','fr','es'],{
  numeric:true,
  sensitivity:'base',
  ignorePunctuation:true,
});
const DEFAULT_API_PROFILE={id:'default',name:'默认配置',apiUrl:'',apiKey:'',model:''};
const DEFAULT_SETTINGS={apiUrl:'',apiKey:'',model:'',activeApiProfileId:'default',apiProfiles:[DEFAULT_API_PROFILE]};
const APP_INFO={
  name:'ai-vocab-tool',
  version:'0.9.1',
  releaseDate:'2026-04-27',
  site:'https://ai-vocab-tool.vercel.app',
  repo:'https://github.com/SuperFly233/ai-vocab-tool',
};
const CHANGELOG=[
  {
    version:'0.9.1',
    date:'2026-04-27',
    title:'优化首页聚焦体验',
    items:['左上角品牌区新增可点击的网页图标。','进入主界面、点击品牌或首页按钮时自动聚焦搜索框。','减少查词前的额外点击，直接输入或回车即可开始查询。'],
  },
  {
    version:'0.9.0',
    date:'2026-04-27',
    title:'新增多组 API 配置同步',
    items:['设置页支持保存多组 API URL、API Key 和 Model。','可选择当前使用的 API 配置组，旧单组配置会自动迁移。','云同步会合并多设备 API 配置组，减少新设备拿不到模型设置的问题。'],
  },
  {
    version:'0.8.1',
    date:'2026-04-27',
    title:'优化右上角通知弹窗',
    items:['通知弹窗新增手动关闭按钮。','重做 toast 视觉层次、状态色、进度条和进入/退出动效。','通知仍会自动消失，但用户可以立即关闭当前消息。'],
  },
  {
    version:'0.8.0',
    date:'2026-04-27',
    title:'修复无感云端同步',
    items:['历史、收藏、API 设置、主题、布局和运行日志都进入 Supabase 同步。','登录后自动合并本机与云端数据，并在页面聚焦或回到前台时静默拉取更新。','新增项目上下文记录，方便新对话继续接手当前进度。'],
  },
  {
    version:'0.7.0',
    date:'2026-04-25',
    title:'新增词条追问对话',
    items:['结果页下方支持基于当前词条继续追问。','追问回答会保存进对应历史记录，并可在历史详情中继续查看。','追问支持卡片内编辑和删除。'],
  },
  {
    version:'0.6.0',
    date:'2026-04-25',
    title:'优化查询反馈、历史编辑和结果排版',
    items:['首页输入框取消伸缩特效，支持回车快速查询。','历史记录整块可点击进入详情，并保留删除按钮独立操作。','结果排版和 JSON 视图重做层级，减少全局粗体，突出义项、词性和重点内容。'],
  },
  {
    version:'0.5.0',
    date:'2026-04-25',
    title:'统一本地交互与设置体验',
    items:['首页输入区改为主输入框右侧工具按钮。','历史清空改为垃圾桶图标，单条删除保留 X。','新增自定义接口配置、恢复默认、运行日志和关于页。'],
  },
  {
    version:'0.4.0',
    date:'2026-04-25',
    title:'历史搜索与结果布局优化',
    items:['增强历史记录搜索和排序。','优化结果卡片与 JSON 查看体验。','加入云端设置同步。'],
  },
];

const els={
  authStatus:document.getElementById('auth-status'),
  accountPanel:document.getElementById('account-panel'),
  accountToggle:document.getElementById('account-toggle'),
  accountStatus:document.getElementById('account-status'),
  accountSyncStatus:document.getElementById('account-sync-status'),
  query:document.getElementById('query-input'),
  direction:document.getElementById('direction-input'),
  note:document.getElementById('note-input'),
  resultCard:document.getElementById('result-card'),
  resultJson:document.getElementById('result-json'),
  historyModal:document.getElementById('history-modal'),
  modalTitle:document.getElementById('modal-title'),
  modalSubtitle:document.getElementById('modal-subtitle'),
  modalRollbar:document.getElementById('modal-rollbar'),
  modalCardPage:document.getElementById('modal-card-page'),
  modalJsonPage:document.getElementById('modal-json-page'),
  modalQueryEdit:document.getElementById('modal-query-edit'),
  modalJsonEdit:document.getElementById('modal-json-edit'),
  modalJsonStatus:document.getElementById('modal-json-status'),
  workspace:document.getElementById('workspace'),
  layoutTopBtn:document.getElementById('layout-top-btn'),
  layoutSplitBtn:document.getElementById('layout-split-btn'),
  historyList:document.getElementById('history-list'),
  historyCount:document.getElementById('history-count'),
  historySearch:document.getElementById('history-search'),
  historyClearBtn:document.getElementById('history-clear-btn'),
  historyFilterLanguage:document.getElementById('history-filter-language'),
  historyFilterDirection:document.getElementById('history-filter-direction'),
  historyFilterPos:document.getElementById('history-filter-pos'),
  historyFilterStyle:document.getElementById('history-filter-style'),
  historySortbar:document.getElementById('history-sortbar'),
  historyScope:document.getElementById('history-scope'),
  apiProfileSelect:document.getElementById('api-profile-select'),
  apiProfileName:document.getElementById('api-profile-name'),
  apiUrl:document.getElementById('api-url'),
  apiKey:document.getElementById('api-key'),
  apiModel:document.getElementById('api-model'),
  envCard:document.getElementById('env-card'),
  storageStatus:document.getElementById('storage-status'),
  settingsSyncStatus:document.getElementById('settings-sync-status'),
  logList:document.getElementById('log-list'),
  aboutContainer:document.getElementById('about-container'),
  clearQueryBtn:document.getElementById('clear-query-btn'),
  confirmLayer:document.getElementById('confirm-layer'),
  confirmTitle:document.getElementById('confirm-title'),
  confirmMessage:document.getElementById('confirm-message'),
  confirmCancel:document.getElementById('confirm-cancel'),
  confirmOk:document.getElementById('confirm-ok'),
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
function notify(message,type='info',title='ai-vocab-tool',record=true){
  if(record)pushLog(message,type,title);
  const key=`${type}|${title}|${message}`;
  const existing=activeToasts.get(key);
  if(existing?.element?.isConnected){
    existing.count+=1;
    existing.element.querySelector('.toast-count').textContent=`×${existing.count}`;
    existing.element.classList.add('counted');
    existing.element.classList.remove('bump');
    void existing.element.offsetWidth;
    existing.element.classList.add('bump');
    clearTimeout(existing.timer);
    existing.timer=setTimeout(()=>dismissToast(key),3200);
    return;
  }
  const toast=document.createElement('div');
  toast.className=`toast ${type}`;
  toast.innerHTML=`
      <div class="toast-row">
        <div class="toast-mark" aria-hidden="true">${toastIcon(type)}</div>
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-count" aria-live="polite"></div>
        <button class="toast-close" type="button" aria-label="关闭通知">×</button>
    </div>
    <div class="toast-msg">${escapeHTML(message)}</div>
    <div class="toast-progress" aria-hidden="true"></div>
  `;
  document.getElementById('toast-stack').appendChild(toast);
  toast.querySelector('.toast-close')?.addEventListener('click',()=>dismissToast(key));
  const timer=setTimeout(()=>dismissToast(key),3200);
  activeToasts.set(key,{element:toast,count:1,timer});
}
function toastIcon(type){
  if(type==='good')return '✓';
  if(type==='bad')return '!';
  if(type==='warn')return '!';
  return 'i';
}
function dismissToast(key){
  const toastState=activeToasts.get(key);
  const toast=toastState?.element;
  if(!toast)return activeToasts.delete(key);
  if(toast.classList.contains('leaving'))return;
  toast.classList.add('leaving');
  toast.addEventListener('animationend',()=>{
    toast.remove();
    activeToasts.delete(key);
  },{once:true});
}
function askConfirm(message,title='确认操作'){
  if(!els.confirmLayer)return Promise.resolve(false);
  resetConfirmUI();
  els.confirmTitle.textContent=title;
  els.confirmMessage.textContent=message;
  els.confirmLayer.classList.add('open');
  return new Promise(resolve=>{confirmResolver=resolve});
}
function closeConfirm(result=false){
  els.confirmLayer?.classList.remove('open');
  if(confirmResolver)confirmResolver(result);
  confirmResolver=null;
}
function resetConfirmUI(){
  const card=document.getElementById('confirm-card');
  card?.classList.remove('sync-card');
  document.getElementById('sync-merge')?.remove();
  if(els.confirmLayer)els.confirmLayer.onclick=null;
  if(els.confirmOk){
    els.confirmOk.textContent='确认';
    els.confirmOk.className='danger-btn';
    els.confirmOk.onclick=null;
  }
  if(els.confirmCancel){
    els.confirmCancel.textContent='取消';
    els.confirmCancel.onclick=null;
  }
}
function getLogs(){return readJSON(STORAGE_KEYS.logs,[])}
function setLogs(items){
  writeJSON(STORAGE_KEYS.logs,items.slice(0,80));
  markCloudDirty(CLOUD_KEYS.logs);
  renderLogs();
  syncAllToCloud(true);
}
function pushLog(message,type='info',title='ai-vocab-tool'){
  const logs=getLogs();
  logs.unshift({id:Date.now(),time:new Date().toISOString(),type,title,message});
  writeJSON(STORAGE_KEYS.logs,logs.slice(0,80));
  markCloudDirty(CLOUD_KEYS.logs);
  renderLogs();
}
function clearLogs(){
  setLogs([]);
  notify('日志已清空。','good','日志',false);
}
function offlineMode(){return localStorage.getItem(STORAGE_KEYS.offline)==='1'}
function canEnterApp(){return Boolean(cloudUser)||offlineMode()}
function renderAuthGate(){
  const couldEnter=!document.body.classList.contains('auth-required');
  document.body.classList.toggle('auth-required',!canEnterApp());
  document.body.classList.toggle('offline-mode',offlineMode()&&!cloudUser);
  document.body.classList.toggle('cloud-logged-in',Boolean(cloudUser));
  document.body.classList.toggle('password-recovery',passwordRecoveryMode);
  if(els.accountToggle){
    els.accountToggle.classList.toggle('signed-in',Boolean(cloudUser));
    els.accountToggle.textContent=cloudUser?'已登录':offlineMode()?'离线':'账号';
  }
  if(els.accountStatus){
    if(cloudUser&&passwordRecoveryMode)els.accountStatus.textContent=`重设密码：${cloudUser.email}`;
    else if(cloudUser)els.accountStatus.textContent=`已登录：${cloudUser.email}`;
    else if(offlineMode())els.accountStatus.textContent='当前为离线模式';
    else els.accountStatus.textContent=cloudClient?'未登录':'Supabase 未配置';
  }
  if(els.authStatus){
    els.authStatus.textContent=cloudClient?'未登录。可以登录或离线使用。':'Supabase 未配置。可以离线使用。';
  }
  if(els.storageStatus){
    els.storageStatus.textContent=cloudUser?'localStorage + Supabase 自动同步':'localStorage，本机本浏览器记录。';
  }
  if(!couldEnter&&canEnterApp())focusQueryInput();
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
    setCloudStatus('Supabase 未配置，只使用本机数据。','bad');
    renderAuthGate();
    return;
  }
  cloudClient=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey,{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},
  });
  cloudClient.auth.onAuthStateChange((_event,session)=>{
    cloudUser=session?.user||null;
    if(!cloudUser)stopCloudAutoSync();
    if(_event==='PASSWORD_RECOVERY'){
      passwordRecoveryMode=true;
      els.accountPanel?.classList.add('open');
    }
    renderAuthGate();
  });
  const params=new URLSearchParams(location.search);
  const hasAuthCallback=params.has('code')||location.hash.includes('access_token')||location.hash.includes('type=');
  if(params.has('code')){
    const {error}=await cloudClient.auth.exchangeCodeForSession(params.get('code'));
    if(!error)history.replaceState({},document.title,location.pathname);
  }
  const {data}=await cloudClient.auth.getSession();
  cloudUser=data.session?.user||null;
  renderAuthGate();
  if(cloudUser)await bootstrapCloudSync('merge',hasAuthCallback);
}
async function loginPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法登录');
  const {email,password}=credentials(source);
  if(!email||!password)return notify('请输入邮箱和密码。','bad','登录失败');
  setCloudStatus('正在登录并准备同步...','info',true);
  const {data,error}=await cloudClient.auth.signInWithPassword({email,password});
  if(error){setCloudStatus(`登录失败：${error.message}`,'bad');return notify(error.message,'bad','登录失败')}
  cloudUser=data.session?.user||null;
  passwordRecoveryMode=false;
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
  if(cloudUser)await bootstrapCloudSync('merge',true);
}
async function signupPassword(source='account'){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法注册');
  const {email,password}=credentials(source);
  if(!email||password.length<6)return notify('密码至少 6 位。','bad','注册失败');
  setCloudStatus('正在注册账号...','info',true);
  const {data,error}=await cloudClient.auth.signUp({email,password,options:{emailRedirectTo:authRedirectTo()}});
  if(error){setCloudStatus(`注册失败：${error.message}`,'bad');return notify(error.message,'bad','注册失败')}
  cloudUser=data.session?.user||cloudUser;
  passwordRecoveryMode=false;
  localStorage.removeItem(STORAGE_KEYS.offline);
  renderAuthGate();
  if(cloudUser)await bootstrapCloudSync('merge',true);
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
  const {email}=source==='current'&&cloudUser?{email:cloudUser.email}:credentials(source);
  if(!email)return notify('请输入邮箱。','bad','重置失败');
  const {error}=await cloudClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectTo()});
  if(error)return notify(error.message,'bad','重置失败');
  notify('重置邮件已发送，打开邮件后回到这里输入新密码。','good','检查邮箱');
}
async function setCloudPassword(){
  if(!cloudClient)return notify('Supabase 未配置。','bad','无法重设');
  if(!cloudUser)return notify('请先登录。','bad','还没登录');
  if(!passwordRecoveryMode){
    passwordRecoveryMode=true;
    renderAuthGate();
    notify('输入新密码后，再点一次“重设密码”。','good','准备重设密码');
    return;
  }
  const {password}=credentials('account');
  if(!password||password.length<6)return notify('请输入至少 6 位新密码。','bad','重设失败');
  const email=cloudUser.email;
  const {error}=await cloudClient.auth.updateUser({password});
  if(error)return notify(error.message,'bad','重设失败');
  const {error:logoutError}=await cloudClient.auth.signOut();
  if(logoutError)return notify(logoutError.message,'bad','验证失败');
  const {data,error:loginError}=await cloudClient.auth.signInWithPassword({email,password});
  if(loginError){
    cloudUser=null;
    passwordRecoveryMode=false;
    renderAuthGate();
    return notify(`密码已提交，但自动验证失败：${loginError.message}`,'bad','验证失败');
  }
  cloudUser=data.session?.user||null;
  passwordRecoveryMode=false;
  renderAuthGate();
  await bootstrapCloudSync('merge',true);
  notify('以后可以直接用新密码登录。','good','密码已重设');
}
async function logoutCloud(){
  if(cloudClient)await cloudClient.auth.signOut();
  cloudUser=null;
  cloudBootstrapped=false;
  passwordRecoveryMode=false;
  stopCloudAutoSync();
  renderAuthGate();
  setCloudStatus('已退出云端账号，本机数据仍保留。','info');
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
  markCloudDirty(CLOUD_KEYS.history);
  renderHistory();
  syncAllToCloud(true);
}
function getSettings(){return normalizeSettings(readJSON(STORAGE_KEYS.settings,DEFAULT_SETTINGS))}
function setSettings(settings){
  writeJSON(STORAGE_KEYS.settings,normalizeSettings(settings));
  markCloudDirty(CLOUD_KEYS.settings);
  syncAllToCloud(true);
}
function normalizeSettings(raw={}){
  const source={...raw};
  let profiles=Array.isArray(source.apiProfiles)?source.apiProfiles.map(normalizeApiProfile).filter(Boolean):[];
  const legacyHasValue=Boolean(source.apiUrl||source.apiKey||source.model);
  if(!profiles.length||legacyHasValue){
    const legacyProfile=normalizeApiProfile({
      id:source.activeApiProfileId||'default',
      name:source.apiProfileName||source.profileName||'默认配置',
      apiUrl:source.apiUrl||'',
      apiKey:source.apiKey||'',
      model:source.model||'',
      updatedAt:source.updatedAt||new Date().toISOString(),
    });
    const existingIndex=profiles.findIndex(profile=>profile.id===legacyProfile.id);
    if(existingIndex>=0)profiles[existingIndex]={...profiles[existingIndex],...legacyProfile};
    else profiles.unshift(legacyProfile);
  }
  profiles=dedupeApiProfiles(profiles.length?profiles:[DEFAULT_API_PROFILE]);
  const activeId=profiles.some(profile=>profile.id===source.activeApiProfileId)?source.activeApiProfileId:profiles[0].id;
  const active=profiles.find(profile=>profile.id===activeId)||profiles[0];
  return {
    ...DEFAULT_SETTINGS,
    ...source,
    apiProfiles:profiles,
    activeApiProfileId:active.id,
    apiUrl:active.apiUrl,
    apiKey:active.apiKey,
    model:active.model,
  };
}
function normalizeApiProfile(profile={}){
  const id=String(profile.id||`api_${Date.now()}_${Math.floor(Math.random()*1000)}`);
  return {
    id,
    name:String(profile.name||profile.label||'未命名配置').trim()||'未命名配置',
    apiUrl:String(profile.apiUrl||'').trim(),
    apiKey:String(profile.apiKey||'').trim(),
    model:String(profile.model||'').trim(),
    updatedAt:profile.updatedAt||new Date().toISOString(),
  };
}
function dedupeApiProfiles(profiles){
  const map=new Map();
  profiles.map(normalizeApiProfile).forEach(profile=>{
    const existing=map.get(profile.id);
    if(!existing||new Date(profile.updatedAt||0)>new Date(existing.updatedAt||0))map.set(profile.id,profile);
  });
  return [...map.values()].sort((a,b)=>new Date(b.updatedAt||0)-new Date(a.updatedAt||0));
}
function activeApiProfile(settings=getSettings()){
  return settings.apiProfiles.find(profile=>profile.id===settings.activeApiProfileId)||settings.apiProfiles[0]||DEFAULT_API_PROFILE;
}
function mergeSettings(localRaw,remoteRaw){
  const local=localRaw?normalizeSettings(localRaw):{apiProfiles:[],activeApiProfileId:''};
  const remote=remoteRaw?normalizeSettings(remoteRaw):{apiProfiles:[],activeApiProfileId:''};
  const profiles=dedupeApiProfiles([...(remote.apiProfiles||[]),...(local.apiProfiles||[])]);
  if(!profiles.length)return normalizeSettings(DEFAULT_SETTINGS);
  const activeId=cloudDirtyKeys.has(CLOUD_KEYS.settings)
    ? local.activeApiProfileId
    : remote.activeApiProfileId||local.activeApiProfileId;
  return normalizeSettings({
    ...remote,
    apiProfiles:profiles,
    activeApiProfileId:profiles.some(profile=>profile.id===activeId)?activeId:profiles[0]?.id,
    apiUrl:'',
    apiKey:'',
    model:'',
  });
}
function currentApiSettings(settings=getSettings()){
  const profile=activeApiProfile(settings);
  return {
    ...settings,
    apiUrl:profile.apiUrl||'',
    apiKey:profile.apiKey||'',
    model:profile.model||'',
    apiProfileName:profile.name||'默认配置',
  };
}
function cloudReady(){
  if(!cloudClient){notify('Supabase 未配置。','bad','云端不可用');return false}
  if(!cloudUser){notify('请先登录云端账号。','bad','还没登录');return false}
  return true;
}
function setCloudStatus(message,type='info',busy=false){
  cloudBusy=Boolean(busy);
  document.body.classList.toggle('cloud-syncing',cloudBusy);
  const text=message||'同步状态会显示在这里';
  [els.accountSyncStatus,els.settingsSyncStatus].forEach(node=>{
    if(!node)return;
    node.textContent=text;
    node.classList.remove('good','bad','info');
    node.classList.add(type);
  });
}
function setCloudBusy(busy,visible=false){
  cloudBusy=Boolean(busy);
  document.body.classList.toggle('cloud-syncing',cloudBusy&&visible);
}
function markCloudDirty(key){
  if(key)cloudDirtyKeys.add(key);
}
function clearCloudDirty(keys=Object.values(CLOUD_KEYS)){
  keys.forEach(key=>cloudDirtyKeys.delete(key));
}
function syncableItems(){
  return {
    [CLOUD_KEYS.history]:JSON.stringify(getHistory()),
    [CLOUD_KEYS.settings]:JSON.stringify(getSettings()),
    [CLOUD_KEYS.theme]:localStorage.getItem(STORAGE_KEYS.theme)||'auto',
    [CLOUD_KEYS.layout]:localStorage.getItem(STORAGE_KEYS.layout)||'top',
    [CLOUD_KEYS.logs]:JSON.stringify(getLogs()),
  };
}
function cloudRawMap(rows){
  const allowed=new Set(Object.values(CLOUD_KEYS));
  const out={};
  (rows||[]).forEach(row=>{
    if(allowed.has(row.key))out[row.key]=String(row.value?.raw??'');
  });
  return out;
}
function mapsEqual(a,b){
  const keys=new Set([...Object.keys(a),...Object.keys(b)]);
  for(const key of keys){
    if((a[key]??null)!==(b[key]??null))return false;
  }
  return true;
}
function replaceLocalWithItems(items){
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.settings);
  localStorage.removeItem(STORAGE_KEYS.theme);
  localStorage.removeItem(STORAGE_KEYS.layout);
  localStorage.removeItem(STORAGE_KEYS.logs);
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.history)){
    writeJSON(STORAGE_KEYS.history,safeHistoryFromRaw(items[CLOUD_KEYS.history]));
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.settings)){
    writeJSON(STORAGE_KEYS.settings,safeObjectFromRaw(items[CLOUD_KEYS.settings],DEFAULT_SETTINGS));
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.theme)){
    localStorage.setItem(STORAGE_KEYS.theme,items[CLOUD_KEYS.theme]||'auto');
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.layout)){
    localStorage.setItem(STORAGE_KEYS.layout,items[CLOUD_KEYS.layout]||'top');
  }
  if(Object.prototype.hasOwnProperty.call(items,CLOUD_KEYS.logs)){
    writeJSON(STORAGE_KEYS.logs,safeLogsFromRaw(items[CLOUD_KEYS.logs]));
  }
  hydrateSettings();
  renderHistory();
  renderLogs();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme)||'auto');
  applyLayout(localStorage.getItem(STORAGE_KEYS.layout)||'top');
  renderAuthGate();
}
function safeObjectFromRaw(raw,fallback={}){
  try{return {...fallback,...JSON.parse(raw||'{}')}}catch{return fallback}
}
function safeHistoryFromRaw(raw){
  try{return normalizeHistoryItems(JSON.parse(raw||'[]'))}catch{return []}
}
function safeLogsFromRaw(raw){
  try{
    const logs=JSON.parse(raw||'[]');
    return Array.isArray(logs)?logs.slice(0,80):[];
  }catch{return []}
}
function syncKind(key){
  if(key===CLOUD_KEYS.history)return '历史记录';
  if(key===CLOUD_KEYS.settings)return '模型设置';
  if(key===CLOUD_KEYS.theme)return '主题';
  if(key===CLOUD_KEYS.layout)return '布局';
  if(key===CLOUD_KEYS.logs)return '日志';
  return '数据';
}
function syncValuePreview(key,value){
  if(value===''||value===undefined||value===null)return '无';
  if(key===CLOUD_KEYS.history){
    const history=safeHistoryFromRaw(value);
    const rolls=history.reduce((sum,item)=>sum+getHistoryRolls(item).length,0);
    return `${history.length} 条历史，${rolls} 个结果版本`;
  }
  if(key===CLOUD_KEYS.settings){
    const settings=normalizeSettings(safeObjectFromRaw(value,DEFAULT_SETTINGS));
    const active=currentApiSettings(settings);
    return `${settings.apiProfiles.length} 组 API，当前 ${active.apiProfileName}，URL ${active.apiUrl?'已填':'空'}，Key ${active.apiKey?'已填':'空'}，Model ${active.model||'空'}`;
  }
  if(key===CLOUD_KEYS.logs)return `${safeLogsFromRaw(value).length} 条日志`;
  return String(value).replace(/\s+/g,' ').trim().slice(0,120);
}
function syncDiffStats(local,remote){
  const keys=[...new Set([...Object.keys(local),...Object.keys(remote)])].sort();
  const stats={localTotal:Object.keys(local).length,remoteTotal:Object.keys(remote).length,localOnly:0,remoteOnly:0,changed:0,diffs:[],kinds:{}};
  const ensure=kind=>stats.kinds[kind]||(stats.kinds[kind]={local:0,remote:0,diff:0});
  Object.keys(local).forEach(key=>ensure(syncKind(key)).local+=1);
  Object.keys(remote).forEach(key=>ensure(syncKind(key)).remote+=1);
  keys.forEach(key=>{
    const inLocal=Object.prototype.hasOwnProperty.call(local,key);
    const inRemote=Object.prototype.hasOwnProperty.call(remote,key);
    const kind=ensure(syncKind(key));
    if(!inRemote){stats.localOnly+=1;kind.diff+=1;stats.diffs.push({key,type:'本机独有',local:local[key],remote:''});return}
    if(!inLocal){stats.remoteOnly+=1;kind.diff+=1;stats.diffs.push({key,type:'云端独有',local:'',remote:remote[key]});return}
    if(local[key]!==remote[key]){stats.changed+=1;kind.diff+=1;stats.diffs.push({key,type:'同名不同',local:local[key],remote:remote[key]})}
  });
  stats.diffTotal=stats.localOnly+stats.remoteOnly+stats.changed;
  return stats;
}
function mergeSyncItems(local,remote){
  const merged={...remote,...local};
  if(remote[CLOUD_KEYS.history]||local[CLOUD_KEYS.history]){
    const remoteHistory=safeHistoryFromRaw(remote[CLOUD_KEYS.history]);
    const localHistory=safeHistoryFromRaw(local[CLOUD_KEYS.history]);
    merged[CLOUD_KEYS.history]=JSON.stringify(mergeHistoryItems(localHistory,remoteHistory));
  }
  if(remote[CLOUD_KEYS.settings]||local[CLOUD_KEYS.settings]){
    merged[CLOUD_KEYS.settings]=JSON.stringify(mergeSettings(
      Object.prototype.hasOwnProperty.call(local,CLOUD_KEYS.settings)?safeObjectFromRaw(local[CLOUD_KEYS.settings],DEFAULT_SETTINGS):null,
      Object.prototype.hasOwnProperty.call(remote,CLOUD_KEYS.settings)?safeObjectFromRaw(remote[CLOUD_KEYS.settings],DEFAULT_SETTINGS):null,
    ));
  }
  if(remote[CLOUD_KEYS.theme]&&!cloudDirtyKeys.has(CLOUD_KEYS.theme))merged[CLOUD_KEYS.theme]=remote[CLOUD_KEYS.theme];
  if(remote[CLOUD_KEYS.layout]&&!cloudDirtyKeys.has(CLOUD_KEYS.layout))merged[CLOUD_KEYS.layout]=remote[CLOUD_KEYS.layout];
  if(remote[CLOUD_KEYS.logs]||local[CLOUD_KEYS.logs]){
    merged[CLOUD_KEYS.logs]=JSON.stringify(mergeLogs(safeLogsFromRaw(local[CLOUD_KEYS.logs]),safeLogsFromRaw(remote[CLOUD_KEYS.logs])));
  }
  return merged;
}
function mergeLogs(localLogs,remoteLogs){
  const map=new Map();
  [...remoteLogs,...localLogs].forEach(item=>{
    if(!item)return;
    const key=String(item.id||`${item.time}|${item.type}|${item.title}|${item.message}`);
    if(!map.has(key))map.set(key,item);
  });
  return [...map.values()].sort((a,b)=>new Date(b.time||0)-new Date(a.time||0)).slice(0,80);
}
function mergeHistoryItems(localHistory,remoteHistory){
  const map=new Map();
  const put=item=>{
    const normalized=normalizeHistoryItem(item);
    const key=normalizeSearch(normalized.query||normalized.result?.meta?.query||normalized.result?.headword?.title||normalized.id);
    const existing=map.get(key);
    if(!existing){map.set(key,normalized);return}
    const rolls=dedupeRolls([...getHistoryRolls(existing),...getHistoryRolls(normalized)]);
    const latest=rolls[0]||makeHistoryRoll(normalized.result,normalized.createdAt);
    map.set(key,{
      ...existing,
      ...normalized,
      id:existing.id||normalized.id,
      query:existing.query||normalized.query,
      favorite:Boolean(existing.favorite||normalized.favorite),
      favoriteAt:[existing.favoriteAt,normalized.favoriteAt].filter(Boolean).sort().pop()||'',
      createdAt:new Date(Math.min(new Date(existing.createdAt||Date.now()),new Date(normalized.createdAt||Date.now()))).toISOString(),
      updatedAt:new Date(Math.max(new Date(existing.updatedAt||existing.createdAt||0),new Date(normalized.updatedAt||normalized.createdAt||0))).toISOString(),
      result:latest.result,
      followups:dedupeFollowups([...(existing.followups||[]),...(normalized.followups||[])]),
      rolls,
    });
  };
  remoteHistory.forEach(put);
  localHistory.forEach(put);
  return [...map.values()].sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt)).slice(0,120);
}
function dedupeFollowups(items){
  const seen=new Set();
  return items.filter(item=>{
    const key=String(item.id||`${item.question}|${item.answer}`);
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  });
}
function dedupeRolls(rolls){
  const seen=new Set();
  return rolls
    .filter(roll=>{
      const key=JSON.stringify(roll.result||{});
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    })
    .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function makeHistoryRoll(result,createdAt=new Date().toISOString(),id=null,meta={}){
  return {id:id||Date.now()+Math.floor(Math.random()*1000),createdAt,result,...meta};
}
function normalizeHistoryItems(items){
  return Array.isArray(items)?items.map(normalizeHistoryItem).filter(item=>item.query||item.result):[];
}
function normalizeHistoryItem(item){
  const base={...item};
  const createdAt=base.createdAt||new Date().toISOString();
  const rolls=dedupeRolls(Array.isArray(base.rolls)&&base.rolls.length
    ? base.rolls.map(roll=>({
      ...roll,
      createdAt:roll.createdAt||createdAt,
      result:roll.result||base.result,
      model:roll.model||roll.modelName||base.model||base.result?.meta?.model||'未记录',
      modelSource:roll.modelSource||base.modelSource||'unknown',
    }))
    : [makeHistoryRoll(base.result,createdAt,base.id||Date.parse(createdAt),{
      model:base.model||base.result?.meta?.model||'未记录',
      modelSource:base.modelSource||'unknown',
    })]);
  const latest=rolls[0]||makeHistoryRoll(base.result,createdAt);
  return {...base,favorite:Boolean(base.favorite),favoriteAt:base.favoriteAt||'',createdAt,result:base.result||latest.result,rolls};
}
function getHistoryRolls(item){
  return normalizeHistoryItem(item).rolls;
}
async function askSyncConflict(local,remote){
  return new Promise(resolve=>{
    const layer=els.confirmLayer;
    const card=document.getElementById('confirm-card');
    const actions=card?.querySelector('.confirm-actions');
    if(!layer||!els.confirmOk||!els.confirmCancel||!actions){
      resolve(window.confirm('检测到本机和云端数据不一致。确认保留本机，取消保留云端。')?'local':'remote');
      return;
    }
    resetConfirmUI();
    const mergeBtn=document.createElement('button');
    mergeBtn.className='plain-btn merge-btn';
    mergeBtn.id='sync-merge';
    mergeBtn.textContent='合并';
    actions.insertBefore(mergeBtn,els.confirmOk);
    const stats=syncDiffStats(local,remote);
    const kinds=['历史记录','模型设置','主题','布局','日志'].map(kind=>{
      const row=stats.kinds[kind]||{local:0,remote:0,diff:0};
      return `<div class="sync-kind"><b>${kind}</b><span>本机 ${row.local}</span><span>云端 ${row.remote}</span><em>${row.diff} 项不一致</em></div>`;
    }).join('');
    const rows=stats.diffs.map(item=>`
      <div class="sync-data-row">
        <div class="sync-data-head"><b>${escapeHTML(syncKind(item.key))}</b><em>${escapeHTML(item.type)}</em></div>
        <div class="sync-data-cols">
          <div><span>本机</span><p>${escapeHTML(syncValuePreview(item.key,item.local))}</p></div>
          <div><span>云端</span><p>${escapeHTML(syncValuePreview(item.key,item.remote))}</p></div>
        </div>
      </div>
    `).join('');
    card.classList.add('sync-card');
    els.confirmTitle.textContent='同步冲突';
    els.confirmMessage.innerHTML=`
      <div class="sync-simple">
        <div class="sync-side local"><span>本机</span><strong>${stats.localTotal}</strong><em>当前浏览器</em></div>
        <div class="sync-vs">不同步</div>
        <div class="sync-side remote"><span>云端</span><strong>${stats.remoteTotal}</strong><em>Supabase</em></div>
      </div>
      <div class="sync-plain">检测到 <b>${stats.diffTotal}</b> 项不一致。推荐“合并”：历史会按词条合并，多次生成结果都会保留。</div>
      <button class="sync-toggle" type="button" id="sync-detail-toggle">展开详细</button>
      <div class="sync-detail" id="sync-detail">
        <div class="sync-help"><b>本机独有</b> 只在当前浏览器；<b>云端独有</b> 只在 Supabase；<b>同名不同</b> 两边都有但内容不一样。</div>
        <div class="sync-breakdown">
          <div><b>${stats.localOnly}</b><span>本机独有</span></div>
          <div><b>${stats.remoteOnly}</b><span>云端独有</span></div>
          <div><b>${stats.changed}</b><span>同名不同</span></div>
        </div>
        <div class="sync-kinds">${kinds}</div>
        <div class="sync-data-list">${rows||'<div class="sync-help">没有不同的数据项。</div>'}</div>
      </div>
    `;
    els.confirmMessage.querySelector('#sync-detail-toggle')?.addEventListener('click',event=>{
      const detail=els.confirmMessage.querySelector('#sync-detail');
      const open=detail?.classList.toggle('open');
      event.currentTarget.textContent=open?'收起详细':'展开详细';
    });
    els.confirmOk.textContent='保留本机';
    els.confirmOk.className='plain-btn primary-btn';
    els.confirmCancel.textContent='保留云端';
    layer.classList.add('open');
    const close=value=>{
      layer.classList.remove('open');
      resetConfirmUI();
      resolve(value);
    };
    mergeBtn.onclick=()=>close('merge');
    els.confirmOk.onclick=()=>close('local');
    els.confirmCancel.onclick=()=>close('remote');
    layer.onclick=event=>{if(event.target===layer)close('remote')};
  });
}
async function bootstrapCloudSync(mode='ask',manual=false){
  if(!cloudReady())return;
  if(cloudBusy){cloudSyncQueued=true;return}
  cloudBootstrapped=true;
  if(manual)setCloudStatus('正在读取云端数据...','info',true);
  else setCloudBusy(true,false);
  const local=syncableItems();
  const {data,error}=await cloudClient.from('study_store').select('key,value').eq('user_id',cloudUser.id).in('key',Object.values(CLOUD_KEYS));
  if(error){setCloudStatus(`同步失败：${error.message}`,'bad');notify(error.message,'bad','同步失败');return}
  const remote=cloudRawMap(data);
  if(mode==='cloud'){
    replaceLocalWithItems(remote);
    setCloudStatus('已读取云端最新数据。','good');
    if(manual)notify('已读取云端最新数据。','good','云端同步');
    startCloudAutoSync();
    flushQueuedCloudSync();
    return;
  }
  const merged=Object.keys(remote).length?mergeSyncItems(local,remote):local;
  if(!mapsEqual(local,merged))replaceLocalWithItems(merged);
  if(!Object.keys(remote).length||!mapsEqual(remote,merged)){
    const result=await replaceCloudWithItems(merged);
    if(result.error){setCloudStatus(`同步失败：${result.error.message}`,'bad');notify(result.error.message,'bad','同步失败');return}
  }
  setCloudStatus('已自动同步本机和云端数据。','good');
  if(manual)notify('已自动同步本机和云端数据。','good','同步完成');
  startCloudAutoSync();
  flushQueuedCloudSync();
}
async function uploadItemsToCloud(items){
  const rows=Object.entries(items).map(([key,raw])=>({user_id:cloudUser.id,key,value:{raw}}));
  if(!rows.length)return {count:0};
  const {error}=await cloudClient.from('study_store').upsert(rows,{onConflict:'user_id,key'});
  if(!error)clearCloudDirty(Object.keys(items));
  return {error,count:rows.length};
}
async function replaceCloudWithItems(items){
  return uploadItemsToCloud(items);
}
async function syncAllToCloud(silent=false){
  if(!cloudClient||!cloudUser)return;
  if(cloudBusy){cloudSyncQueued=true;return}
  setCloudStatus('正在保存到云端...','info',true);
  const result=await uploadItemsToCloud(syncableItems());
  if(result.error){setCloudStatus(`同步失败：${result.error.message}`,'bad');notify(result.error.message,'bad','同步失败');return}
  setCloudStatus(`已同步 ${result.count} 项到云端。`,'good');
  if(!silent)notify('已同步到云端。','good','同步完成');
  flushQueuedCloudSync();
}
function flushQueuedCloudSync(){
  if(!cloudSyncQueued||cloudBusy)return;
  cloudSyncQueued=false;
  syncAllToCloud(true);
}
function startCloudAutoSync(){
  if(cloudAutoTimer)clearInterval(cloudAutoTimer);
  if(!cloudClient||!cloudUser)return;
  cloudAutoTimer=setInterval(()=>bootstrapCloudSync('merge',false),15000);
}
function stopCloudAutoSync(){
  if(cloudAutoTimer)clearInterval(cloudAutoTimer);
  cloudAutoTimer=null;
}
async function uploadCloud(){
  if(!cloudReady())return;
  if(!await askConfirm('确认用本机数据覆盖云端的 ai-vocab-tool 数据？study-kanban 的数据不会被动到。','上传本机'))return;
  setCloudStatus('正在上传本机数据...','info',true);
  const result=await replaceCloudWithItems(syncableItems());
  if(result.error){setCloudStatus(`上传失败：${result.error.message}`,'bad');notify(result.error.message,'bad','上传失败');return}
  setCloudStatus(`已上传 ${result.count} 项本机数据。`,'good');
  notify('本机数据已覆盖云端。','good','上传完成');
}
async function downloadCloud(){
  if(!cloudReady())return;
  if(!await askConfirm('确认用云端 ai-vocab-tool 数据覆盖当前浏览器本机数据？','恢复云端'))return;
  await bootstrapCloudSync('cloud',true);
}
async function loadConfigInfo(){
  try{
    const response=await fetch('/api/config');
    if(!response.ok)throw new Error('config unavailable');
    configInfo=await response.json();
  }catch{
    configInfo={hasApiUrl:false,hasApiKey:false,model:''};
  }
  renderConfigInfo();
}
function renderConfigInfo(){
  if(!els.envCard)return;
  const settings=currentApiSettings();
  const profileCount=getSettings().apiProfiles.length;
  const localModel=settings.model||'';
  const envModel=configInfo?.model||'';
  const source=localModel&&settings.apiUrl&&settings.apiKey?`网页配置：${settings.apiProfileName}`:'Vercel 环境变量';
  els.envCard.innerHTML=`
    <div><b>当前来源</b><span>${escapeHTML(source)}</span></div>
    <div><b>已保存配置组</b><span>${profileCount} 组</span></div>
    <div><b>环境变量 API URL</b><span>${configInfo?.hasApiUrl?'已配置':'未配置'}</span></div>
    <div><b>环境变量 API Key</b><span>${configInfo?.hasApiKey?'已配置':'未配置'}</span></div>
    <div><b>环境变量 Model</b><span>${escapeHTML(envModel||'未配置')}</span></div>
    <div><b>管理员限制</b><span>${configInfo?.adminRestricted?'已开启':'未开启'}</span></div>
  `;
}

function showView(id,button){
  activeView=id;
  document.querySelectorAll('.view').forEach(view=>view.classList.toggle('active',view.id===`view-${id}`));
  document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
  if(button)button.classList.add('active');
  if(id==='history')renderHistory();
  if(id==='settings')renderSettings();
  if(id==='about')renderAbout();
  if(id==='home')focusQueryInput();
}
function goHomeAndFocus(){
  showView('home',document.getElementById('nav-home'));
  focusQueryInput();
}
function focusQueryInput(){
  requestAnimationFrame(()=>{
    if(!canEnterApp()||activeView!=='home'||document.body.classList.contains('modal-open'))return;
    els.query?.focus({preventScroll:true});
    const length=els.query?.value.length||0;
    els.query?.setSelectionRange(length,length);
  });
}
function setResultTab(id,button){
  document.querySelectorAll('.result-page').forEach(page=>page.classList.remove('active'));
  document.getElementById(id==='card'?'result-card':'result-json').classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(btn=>btn.classList.remove('active'));
  button.classList.add('active');
}
function setModalTab(id,button){
  document.querySelectorAll('.modal-page').forEach(page=>page.classList.toggle('active',page.id===`modal-${id}-page`));
  document.querySelectorAll('.modal-head .tab-btn').forEach(btn=>btn.classList.remove('active'));
  button.classList.add('active');
  if(id==='json')validateModalJSON(false);
}
function renderEmpty(){
  els.resultCard.innerHTML='<div class="empty">等待查询</div>';
  els.resultJson.innerHTML='<div class="empty">等待 JSON</div>';
}
function renderLookupLoading(query,settings){
  const apiSettings=currentApiSettings(settings);
  const source=apiSettings.apiUrl&&apiSettings.apiKey?`自定义接口：${apiSettings.apiProfileName}`:'环境变量接口';
  els.resultCard.innerHTML=`
    <div class="lookup-state lookup-loading">
      <div class="lookup-orbit"><div class="lookup-spinner"></div></div>
      <div class="lookup-copy">
        <div class="lookup-title">正在分析：${escapeHTML(query)}</div>
        <div class="lookup-steps">
          <span>准备请求</span>
          <span>调用模型</span>
          <span>校验 JSON</span>
          <span>生成排版</span>
        </div>
        <div class="lookup-progress" aria-hidden="true"><i></i></div>
        <p><b>正在调用模型并等待返回。</b> 当前来源：${escapeHTML(source)}；下方进度是预估动画，完成后会自动切换到结果。</p>
      </div>
    </div>
  `;
  els.resultJson.innerHTML='<div class="empty">等待模型返回 JSON</div>';
}
function renderLookupError(query,error,stage='查询失败'){
  const message=error?.message||String(error||'未知错误');
  els.resultCard.innerHTML=`
    <div class="lookup-state lookup-error">
      <div class="lookup-error-mark">!</div>
      <div>
        <div class="lookup-title">${escapeHTML(stage)}：${escapeHTML(query)}</div>
        <div class="lookup-steps">
          <span>请求已结束</span>
          <span>未保存历史</span>
          <span>可修改设置后重试</span>
        </div>
        <p>${escapeHTML(message)}</p>
      </div>
    </div>
  `;
  els.resultJson.innerHTML=`<pre class="error-pre">${escapeHTML(JSON.stringify({ok:false,stage,query,error:message},null,2))}</pre>`;
}
function renderResult(result){
  currentResult=result;
  els.resultJson.innerHTML=renderStructuredJSON(result);
  els.resultCard.innerHTML=renderResultHTML(result,currentFollowups,'current');
}
function renderResultHTML(result,followups=[],scope='current'){
  const head=result.headword||{};
  const meta=result.meta||{};
  const senses=result.senses||[];
  const collocations=result.collocations||[];
  const register=result.register||{};
  const confusions=result.confusions||[];
  return `
    <div class="entry-head">
      <div class="entry-kicker">${escapeHTML(head.languageTag||meta.language||'词条')}</div>
      <div class="entry-title">${escapeHTML(head.title||meta.query||'')}</div>
      <div class="entry-meta-grid">
        <span><b>词性</b>${escapeHTML(head.basicPartOfSpeech||'')}</span>
        <span><b>核心义</b><mark>${escapeHTML(head.coreMeaning||'')}</mark></span>
        <span><b>方向</b>${escapeHTML(meta.defaultDirection||'')}</span>
      </div>
      ${head.summary?`<div class="entry-meta">${escapeHTML(head.summary)}</div>`:''}
    </div>
    ${renderItems('义项分析',senses,item=>`
      <div class="item-index">${escapeHTML(item.index)}</div>
      <div class="item-body">
        <div class="item-title"><span class="pos-pill">${escapeHTML(item.partOfSpeech)}</span><mark>${escapeHTML(item.shortestLabel)}</mark></div>
        <div class="line"><b>语意</b><span>${escapeHTML(item.meaning)}</span></div>
        <div class="line"><b>例句</b><span>${escapeHTML(item.example)}</span></div>
        <div class="line"><b>译文</b><span>${escapeHTML(item.translation)}</span></div>
      </div>
    `)}
    ${renderItems('固定搭配',collocations,item=>`
      <div class="item-index">${escapeHTML(item.index)}</div>
      <div class="item-body">
        <div class="item-title"><mark>${escapeHTML(item.phrase)}</mark>${item.note?`<span class="chip">${escapeHTML(item.note)}</span>`:''}</div>
        <div class="line"><b>语意</b><span>${escapeHTML(item.meaning)}</span></div>
        <div class="line"><b>例句</b><span>${escapeHTML(item.example)}</span></div>
        <div class="line"><b>译文</b><span>${escapeHTML(item.translation)}</span></div>
      </div>
    `)}
    <div class="block">
      <div class="block-title">语义感受与使用说明</div>
      <div class="register-grid">
        <div><b>语体属性</b><span>${escapeHTML(register.style||'')}</span></div>
        <div><b>语义气质</b><span>${escapeHTML(register.tone||'')}</span></div>
        <div><b>使用环境</b><span>${escapeHTML(register.environment||'')}</span></div>
      </div>
    </div>
    ${renderConfusions(confusions)}
    ${renderFollowupHTML(followups,scope)}
  `;
}
function renderItems(title,items,renderer){
  return `<div class="block"><div class="block-title">${title}</div>${items.length?items.map(item=>`<div class="item">${renderer(item)}</div>`).join(''):'<div class="item empty-item">无</div>'}</div>`;
}
function renderConfusions(items){
  if(!items.length)return '';
  return `<div class="block"><div class="block-title">近义词 / 易混词辨析</div><table class="confusion-table"><thead><tr><th>词</th><th>核心区别</th><th>语体/使用倾向</th></tr></thead><tbody>${items.map(item=>`<tr><td><mark>${escapeHTML(item.term)}</mark></td><td>${escapeHTML(item.difference)}</td><td>${escapeHTML(item.usage)}</td></tr>`).join('')}</tbody></table></div>`;
}
function renderStructuredJSON(result){
  const sections=[
    ['meta','元信息',result.meta],
    ['headword','词条标题',result.headword],
    ['senses','义项分析',result.senses],
    ['collocations','固定搭配',result.collocations],
    ['register','语感说明',result.register],
    ['confusions','易混辨析',result.confusions],
  ];
  return `<div class="json-sections">${sections.map(([key,title,value])=>`
    <details class="json-section" open>
      <summary><span>${escapeHTML(title)}</span><code>${escapeHTML(key)}</code></summary>
      <pre>${escapeHTML(JSON.stringify(value??(Array.isArray(value)?[]:{}),null,2))}</pre>
    </details>
  `).join('')}</div>`;
}
function renderFollowupHTML(followups=[],scope='current'){
  const list=Array.isArray(followups)?[...followups]:[];
  if(pendingFollowup?.scope===scope)list.push(pendingFollowup.item);
  const inputId=scope==='modal'?'modal-followup-input':'followup-input';
  const buttonCall=scope==='modal'?'askModalFollowup()':'askCurrentFollowup()';
  return `
    <div class="followup-panel">
      <div class="block-title">追问</div>
      <div class="followup-list">
        ${list.length?list.map(item=>renderFollowupItem(item,scope)).join(''):'<div class="followup-empty">可以继续追问这个词条，回答会保存在历史记录里。</div>'}
      </div>
      <div class="followup-compose">
        <textarea id="${inputId}" rows="2" placeholder="针对这个结果继续问，比如：这个词写作里怎么用？和另一个词差在哪？"></textarea>
        <button class="plain-btn primary-btn" onclick="${buttonCall}">发送</button>
      </div>
    </div>
  `;
}
function renderFollowupItem(item,scope){
  const id=Number(item.id);
  if(editingFollowup&&editingFollowup.scope===scope&&Number(editingFollowup.id)===id){
    return `
      <article class="followup-item editing">
        <label class="setting-field">
          <span>问题</span>
          <textarea class="followup-edit-input" id="followup-edit-question-${scope}-${id}">${escapeHTML(item.question)}</textarea>
        </label>
        <label class="setting-field">
          <span>回答</span>
          <textarea class="followup-edit-input answer" id="followup-edit-answer-${scope}-${id}">${escapeHTML(item.answer)}</textarea>
        </label>
        <div class="followup-actions">
          <button class="plain-btn primary-btn" onclick="saveFollowupEdit('${scope}',${id})">保存</button>
          <button class="plain-btn ghost-btn" onclick="cancelFollowupEdit('${scope}')">取消</button>
        </div>
      </article>
    `;
  }
  return `
    <article class="followup-item ${item.pending?'pending':''}">
      <div class="followup-question"><b>问</b><span>${escapeHTML(item.question)}</span></div>
      <div class="followup-answer">${formatFollowupAnswer(item.answer)}</div>
      <div class="followup-actions">
        ${item.pending?'':`
          <button class="plain-btn ghost-btn" onclick="editFollowup('${scope}',${id})">编辑</button>
          <button class="danger-btn" onclick="deleteFollowup('${scope}',${id})">删除</button>
        `}
      </div>
    </article>
  `;
}
function formatFollowupAnswer(answer){
  const text=String(answer||'').trim();
  if(!text)return '<p>无内容</p>';
  const blocks=text.split(/\n{2,}/).map(block=>block.trim()).filter(Boolean);
  return blocks.map(block=>{
    const lines=block.split('\n').map(line=>line.trim()).filter(Boolean);
    if(lines.length===1&&/^#{1,4}\s+/.test(lines[0])){
      return `<h4>${formatInlineMarkdown(lines[0].replace(/^#{1,4}\s+/,''))}</h4>`;
    }
    if(lines.every(line=>/^[-*•]\s+/.test(line))){
      return `<ul>${lines.map(line=>`<li>${formatInlineMarkdown(line.replace(/^[-*•]\s+/,''))}</li>`).join('')}</ul>`;
    }
    if(lines.every(line=>/^\d+[.)]\s+/.test(line))){
      return `<ol>${lines.map(line=>`<li>${formatInlineMarkdown(line.replace(/^\d+[.)]\s+/,''))}</li>`).join('')}</ol>`;
    }
    return `<p>${formatInlineMarkdown(block).replace(/\n/g,'<br>')}</p>`;
  }).join('');
}
function formatInlineMarkdown(value){
  return escapeHTML(value)
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>');
}
function getCurrentHistoryItem(){
  return getHistory().find(item=>Number(item.id)===Number(currentHistoryId));
}
function saveFollowupsForCurrent(followups){
  currentFollowups=followups;
  const history=getHistory().map(item=>Number(item.id)===Number(currentHistoryId)?{...item,followups,updatedAt:new Date().toISOString()}:item);
  setHistory(history);
  renderResult(currentResult);
}
function saveFollowupsForModal(followups){
  const history=getHistory().map(item=>Number(item.id)===Number(modalHistoryId)?{...item,followups,updatedAt:new Date().toISOString()}:item);
  setHistory(history);
  const updated=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  if(updated){
    els.modalCardPage.innerHTML=renderResultHTML(modalResult||updated.result,updated.followups||[],'modal');
    renderModalRollbar(updated);
  }
  if(Number(modalHistoryId)===Number(currentHistoryId))saveFollowupsForCurrent(followups);
}
function setPendingFollowup(scope,question){
  pendingFollowup={
    scope,
    item:{id:Date.now(),question,answer:'正在生成回答...',createdAt:new Date().toISOString(),pending:true},
  };
  rerenderFollowupScope(scope);
}
function clearPendingFollowup(scope){
  if(pendingFollowup?.scope===scope)pendingFollowup=null;
}
async function requestFollowup(question,baseItem){
  const settings=currentApiSettings();
  const hasLocalEndpoint=Boolean(settings.apiUrl&&settings.apiKey);
  const response=await fetch('/api/followup',{
    method:'POST',
    headers:await analyzeHeaders(hasLocalEndpoint),
    body:JSON.stringify({
      question,
      result:baseItem.result,
      followups:baseItem.followups||[],
      apiUrl:hasLocalEndpoint?settings.apiUrl:'',
      apiKey:hasLocalEndpoint?settings.apiKey:'',
      model:hasLocalEndpoint?settings.model:'',
    }),
  });
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'追问失败');
  return data.answer;
}
async function askCurrentFollowup(){
  if(followupBusy)return;
  const input=document.getElementById('followup-input');
  const question=input?.value.trim()||'';
  if(!question)return notify('请输入追问内容。','bad','追问');
  const baseItem=getCurrentHistoryItem()||{id:currentHistoryId,result:currentResult,followups:currentFollowups};
  if(!baseItem.result)return notify('还没有可追问的结果。','bad','追问');
  input.value='';
  setPendingFollowup('current',question);
  followupBusy=true;
  document.body.classList.add('followup-busy');
  try{
    notify('正在追问，会把回答保存到当前记录。','info','追问中');
    const answer=await requestFollowup(question,baseItem);
    const followups=[...(baseItem.followups||[]),{id:Date.now(),question,answer,createdAt:new Date().toISOString()}];
    clearPendingFollowup('current');
    saveFollowupsForCurrent(followups);
    notify('追问已保存。','good','追问完成');
  }catch(error){
    clearPendingFollowup('current');
    rerenderFollowupScope('current');
    notify(error.message||'追问失败。','bad','追问失败');
  }finally{
    followupBusy=false;
    document.body.classList.remove('followup-busy');
  }
}
async function askModalFollowup(){
  if(followupBusy)return;
  const input=document.getElementById('modal-followup-input');
  const question=input?.value.trim()||'';
  if(!question)return notify('请输入追问内容。','bad','追问');
  const baseItem=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  if(!baseItem)return notify('找不到这条历史记录。','bad','追问');
  input.value='';
  setPendingFollowup('modal',question);
  followupBusy=true;
  document.body.classList.add('followup-busy');
  try{
    notify('正在追问，会保存到这条历史记录。','info','追问中');
    const answer=await requestFollowup(question,baseItem);
    const followups=[...(baseItem.followups||[]),{id:Date.now(),question,answer,createdAt:new Date().toISOString()}];
    clearPendingFollowup('modal');
    saveFollowupsForModal(followups);
    notify('追问已保存。','good','追问完成');
  }catch(error){
    clearPendingFollowup('modal');
    rerenderFollowupScope('modal');
    notify(error.message||'追问失败。','bad','追问失败');
  }finally{
    followupBusy=false;
    document.body.classList.remove('followup-busy');
  }
}
async function deleteFollowup(scope,id){
  if(!await askConfirm('确认删除这条追问？','删除追问'))return;
  if(scope==='modal'){
    const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
    saveFollowupsForModal((item?.followups||[]).filter(row=>Number(row.id)!==Number(id)));
  }else{
    saveFollowupsForCurrent((currentFollowups||[]).filter(row=>Number(row.id)!==Number(id)));
  }
  notify('追问已删除。','good','追问');
}
function editFollowup(scope,id){
  editingFollowup={scope,id};
  rerenderFollowupScope(scope);
}
function cancelFollowupEdit(scope){
  editingFollowup=null;
  rerenderFollowupScope(scope);
}
function saveFollowupEdit(scope,id){
  const source=scope==='modal'
    ? (getHistory().find(row=>Number(row.id)===Number(modalHistoryId))?.followups||[])
    : currentFollowups;
  const question=document.getElementById(`followup-edit-question-${scope}-${id}`)?.value.trim()||'';
  const answer=document.getElementById(`followup-edit-answer-${scope}-${id}`)?.value.trim()||'';
  if(!question||!answer){
    notify('问题和回答都不能为空。','bad','保存失败');
    return;
  }
  const next=source.map(row=>Number(row.id)===Number(id)?{...row,question,answer,updatedAt:new Date().toISOString()}:row);
  editingFollowup=null;
  if(scope==='modal')saveFollowupsForModal(next);
  else saveFollowupsForCurrent(next);
  notify('追问已编辑。','good','追问');
}
function rerenderFollowupScope(scope){
  if(scope==='modal'){
    const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
    if(item)els.modalCardPage.innerHTML=renderResultHTML(modalResult||item.result,item.followups||[],'modal');
    return;
  }
  if(currentResult)renderResult(currentResult);
}
async function runLookup(){
  if(lookupBusy)return;
  const query=els.query.value.trim();
  if(!query)return notify('请输入要查的内容。','bad','无法查询');
  const existing=findHistoryByQuery(query);
  if(existing){
    const rolls=getHistoryRolls(existing).length;
    const ok=await askConfirm(`“${query}” 已经有历史记录${rolls>1?`（${rolls} 个版本）`:''}。确认重新生成并保留为新版本？取消则打开已有记录。`,'已有记录');
    if(!ok){
      showView('history',document.getElementById('nav-history'));
      openHistoryModal(existing.id);
      return;
    }
  }
  await performLookup({query,existingId:existing?.id||null});
}
async function performLookup({query,existingId=null,sourceItem=null}){
  const settings=currentApiSettings();
  lookupBusy=true;
  document.body.classList.add('lookup-busy');
  renderLookupLoading(query,settings);
  notify('正在发送请求，模型返回后会自动校验 JSON。','info','查询中');
  const hasLocalEndpoint=Boolean(settings.apiUrl&&settings.apiKey);
  const modelInfo=lookupModelInfo(settings,hasLocalEndpoint);
  try{
    const response=await fetch('/api/analyze',{
      method:'POST',
      headers:await analyzeHeaders(hasLocalEndpoint),
      body:JSON.stringify({
        query,
        direction:els.direction.value.trim(),
        note:els.note.value.trim(),
        apiUrl:hasLocalEndpoint?settings.apiUrl:'',
        apiKey:hasLocalEndpoint?settings.apiKey:'',
        model:hasLocalEndpoint?settings.model:'',
      }),
    });
    let data;
    try{
      data=await response.json();
    }catch(error){
      throw new Error(`接口返回不是合法 JSON：${error.message}`);
    }
    if(!response.ok)throw new Error(data.error||'查询失败');
    const saved=saveLookupResult({query,result:data,existingId,sourceItem,modelInfo});
    currentHistoryId=saved.id;
    currentFollowups=saved.followups||[];
    renderResult(data);
    notify(existingId?'新版本已保存。':'结果已生成。','good','查询完成');
  }catch(error){
    renderLookupError(query,error);
    notify(error.message||'查询失败。','bad','查询失败');
  }finally{
    lookupBusy=false;
    document.body.classList.remove('lookup-busy');
  }
}
function lookupModelInfo(settings,hasLocalEndpoint){
  const model=(hasLocalEndpoint?settings.model:configInfo?.model)||'未配置';
  return {
    model,
    modelSource:hasLocalEndpoint?`网页设置：${settings.apiProfileName||'默认配置'}`:'Vercel 环境变量',
  };
}
async function analyzeHeaders(hasLocalEndpoint){
  const headers={'Content-Type':'application/json'};
  if(!hasLocalEndpoint&&cloudClient){
    const {data}=await cloudClient.auth.getSession();
    const token=data.session?.access_token;
    if(token)headers.Authorization=`Bearer ${token}`;
  }
  return headers;
}
function addHistory(item){
  const history=getHistory().filter(existing=>normalizeSearch(existing.query)!==normalizeSearch(item.query));
  history.unshift(normalizeHistoryItem(item));
  setHistory(history.slice(0,120));
}
function findHistoryByQuery(query){
  const normalized=normalizeSearch(query);
  return getHistory().find(item=>normalizeSearch(item.query)===normalized);
}
function saveLookupResult({query,result,existingId=null,sourceItem=null,modelInfo={}}){
  const now=new Date().toISOString();
  const history=getHistory();
  const existing=sourceItem||history.find(item=>Number(item.id)===Number(existingId))||findHistoryByQuery(query);
  const roll=makeHistoryRoll(result,now,null,modelInfo);
  let saved;
  if(existing){
    saved={
      ...normalizeHistoryItem(existing),
      query,
      result,
      updatedAt:now,
      rolls:dedupeRolls([roll,...getHistoryRolls(existing)]),
    };
    setHistory(history.map(item=>Number(item.id)===Number(existing.id)?saved:item));
  }else{
    saved={id:Date.now(),query,result,followups:[],createdAt:now,updatedAt:now,rolls:[roll]};
    const next=history.filter(item=>normalizeSearch(item.query)!==normalizeSearch(query));
    next.unshift(saved);
    setHistory(next.slice(0,120));
  }
  return saved;
}
function renderHistory(){
  renderHistoryFilterOptions(getHistory());
  renderHistorySortControls();
  renderHistoryScopeControls();
  const history=filterAndSortHistory(getHistory());
  const total=getHistory().length;
  const favoriteTotal=getHistory().filter(item=>normalizeHistoryItem(item).favorite).length;
  const constrained=historyState.scope!=='all'||historyState.query||Object.values(historyState.filters).some(Boolean);
  els.historyCount.textContent=constrained?`${history.length}/${total} 条`:`${total} 条`;
  if(!history.length){
    els.historyList.innerHTML=`<div class="empty">${historyState.scope==='favorites'&&!favoriteTotal?'暂无收藏记录':constrained?'没有匹配记录':'暂无历史记录'}</div>`;
    return;
  }
  els.historyList.innerHTML=history.map(item=>`
    <div class="history-item" role="button" tabindex="0" onclick="openHistoryModal(${Number(item.id)})" onkeydown="handleHistoryItemKey(event,${Number(item.id)})">
      <div>
        <div class="history-word">${escapeHTML(item.query)}</div>
        <div class="history-time">${new Date(item.createdAt).toLocaleString('zh-CN',{hour12:false})}${getHistoryRolls(item).length>1?` · ${getHistoryRolls(item).length} 个版本`:''}</div>
      </div>
      <div class="history-actions">
        <button class="icon-btn favorite-icon ${normalizeHistoryItem(item).favorite?'active':''}" data-tip="${normalizeHistoryItem(item).favorite?'取消收藏':'收藏'}" aria-label="${normalizeHistoryItem(item).favorite?'取消收藏':'收藏'}" onclick="event.stopPropagation();toggleFavoriteHistory(${Number(item.id)})">${normalizeHistoryItem(item).favorite?'★':'☆'}</button>
        <button class="icon-btn" data-tip="重新生成" onclick="event.stopPropagation();regenerateHistory(${Number(item.id)})">↻</button>
        <button class="icon-btn" data-tip="查看" onclick="event.stopPropagation();openHistoryModal(${Number(item.id)})">↗️</button>
        <button class="icon-btn danger-icon" data-tip="删除" onclick="event.stopPropagation();deleteHistory(${Number(item.id)})">×</button>
      </div>
    </div>
  `).join('');
}
function handleHistoryItemKey(event,id){
  if(event.key==='Enter'||event.key===' '){
    event.preventDefault();
    openHistoryModal(id);
  }
}
function filterAndSortHistory(history){
  const query=normalizeSearch(historyState.query);
  const scoped=historyState.scope==='favorites'
    ? history.filter(item=>normalizeHistoryItem(item).favorite)
    : [...history];
  const filteredByText=query
    ? scoped.filter(item=>historySearchText(item).includes(query))
    : scoped;
  const filtered=filteredByText.filter(item=>historyMatchesFilters(item));
  return filtered.sort((a,b)=>{
    let value=0;
    if(historyState.sort==='text')value=compareHistoryText(a,b);
    else if(historyState.sort==='language')value=historyCollator.compare(historyField(a,'language'),historyField(b,'language'));
    else if(historyState.sort==='rolls')value=getHistoryRolls(a).length-getHistoryRolls(b).length;
    else if(historyState.sort==='followups')value=(a.followups||[]).length-(b.followups||[]).length;
    else value=new Date(a.createdAt)-new Date(b.createdAt);
    return historyState.sortDir==='asc'?value:-value;
  });
}
function historyMatchesFilters(item){
  const filters=historyState.filters;
  return (!filters.language||normalizeSearch(historyField(item,'language'))===filters.language)
    && (!filters.direction||normalizeSearch(historyField(item,'direction'))===filters.direction)
    && (!filters.pos||historyFieldList(item,'pos').map(normalizeSearch).includes(filters.pos))
    && (!filters.style||normalizeSearch(historyField(item,'style'))===filters.style);
}
function compareHistoryText(a,b){
  return historyCollator.compare(historySortTitle(a),historySortTitle(b));
}
function historySortTitle(item){
  return item.result?.meta?.normalized||item.result?.headword?.title||item.query||'';
}
function historyField(item,key){
  const result=item.result||{};
  if(key==='language')return result.headword?.languageTag||result.meta?.language||'';
  if(key==='direction')return result.meta?.defaultDirection||result.meta?.direction||'';
  if(key==='style')return result.register?.style||'';
  return '';
}
function historyFieldList(item,key){
  const result=item.result||{};
  if(key==='pos'){
    return [
      result.headword?.basicPartOfSpeech,
      ...(Array.isArray(result.senses)?result.senses.map(sense=>sense.partOfSpeech):[]),
    ].filter(Boolean);
  }
  return [];
}
function collectHistoryOptions(history){
  const sets={language:new Set(),direction:new Set(),pos:new Set(),style:new Set()};
  history.forEach(item=>{
    ['language','direction','style'].forEach(key=>{
      const value=historyField(item,key);
      if(value)sets[key].add(value);
    });
    historyFieldList(item,'pos').forEach(value=>sets.pos.add(value));
  });
  return Object.fromEntries(Object.entries(sets).map(([key,set])=>[key,[...set].sort(historyCollator.compare)]));
}
function renderHistoryFilterOptions(history){
  const options=collectHistoryOptions(history);
  setFilterOptions(els.historyFilterLanguage,'language','全部语言',options.language);
  setFilterOptions(els.historyFilterDirection,'direction','全部方向',options.direction);
  setFilterOptions(els.historyFilterPos,'pos','全部词性',options.pos);
  setFilterOptions(els.historyFilterStyle,'style','全部语体',options.style);
}
function setFilterOptions(select,key,label,values=[]){
  if(!select)return;
  const current=historyState.filters[key];
  select.innerHTML=`<option value="">${label}</option>${values.map(value=>`<option value="${escapeHTML(normalizeSearch(value))}">${escapeHTML(value)}</option>`).join('')}`;
  if(current&&values.map(normalizeSearch).includes(current))select.value=current;
  else{
    select.value='';
    historyState.filters[key]='';
  }
}
function setHistoryFilter(key,value){
  historyState.filters[key]=value;
  renderHistory();
}
function setHistoryScope(scope){
  historyState.scope=scope==='favorites'?'favorites':'all';
  renderHistory();
}
function setHistorySort(sort){
  if(historyState.sort===sort)historyState.sortDir=historyState.sortDir==='asc'?'desc':'asc';
  else{
    historyState.sort=sort;
    historyState.sortDir=(sort==='time'||sort==='rolls'||sort==='followups')?'desc':'asc';
  }
  renderHistory();
}
function renderHistorySortControls(){
  els.historySortbar?.querySelectorAll('.sort-btn').forEach(button=>{
    const active=button.dataset.sort===historyState.sort;
    button.classList.toggle('active',active);
    const mark=button.querySelector('span');
    if(mark)mark.textContent=active?(historyState.sortDir==='asc'?'↑':'↓'):'';
  });
}
function renderHistoryScopeControls(){
  els.historyScope?.querySelectorAll('.scope-btn').forEach(button=>{
    button.classList.toggle('active',button.dataset.scope===historyState.scope);
  });
}
function normalizeSearch(value){
  return String(value||'').toLocaleLowerCase().normalize('NFKC').trim();
}
function historySearchText(item){
  return normalizeSearch(flattenText([
    item.query,
    item.createdAt,
    item.result,
    item.followups,
  ]));
}
function flattenText(value){
  if(value==null)return '';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value))return value.map(flattenText).join(' ');
  if(typeof value==='object')return Object.values(value).map(flattenText).join(' ');
  return '';
}
function clearHistorySearch(){
  historyState.query='';
  if(els.historySearch)els.historySearch.value='';
  updateHistorySearchState();
  renderHistory();
}
function toggleFavoriteHistory(id){
  const now=new Date().toISOString();
  let favorite=false;
  const history=getHistory().map(item=>{
    if(Number(item.id)!==Number(id))return item;
    const normalized=normalizeHistoryItem(item);
    favorite=!normalized.favorite;
    return {...normalized,favorite,favoriteAt:favorite?now:'',updatedAt:now};
  });
  setHistory(history);
  notify(favorite?'已收藏。':'已取消收藏。','good','收藏');
}
function updateHistorySearchState(){
  const hasText=Boolean(els.historySearch?.value.trim());
  els.historyClearBtn?.classList.toggle('hidden',!hasText);
}
function openHistoryModal(id){
  const item=getHistory().find(row=>Number(row.id)===Number(id));
  if(!item)return;
  const normalized=normalizeHistoryItem(item);
  const latest=getHistoryRolls(normalized)[0];
  modalResult=latest?.result||normalized.result;
  modalHistoryId=Number(item.id);
  modalRollId=latest?.id||null;
  els.modalTitle.textContent=normalized.query;
  els.modalSubtitle.textContent=historyModalMeta(normalized);
  renderModalRollbar(normalized);
  els.modalCardPage.innerHTML=renderResultHTML(modalResult,normalized.followups||[],'modal');
  els.modalQueryEdit.value=normalized.query;
  els.modalJsonEdit.value=JSON.stringify(modalResult,null,2);
  validateModalJSON(false);
  setModalTab('card',document.getElementById('modal-card-tab'));
  els.historyModal.classList.add('open');
  document.body.classList.add('modal-open');
}
function closeHistoryModal(event){
  if(event&&event.target!==els.historyModal)return;
  els.historyModal.classList.remove('open');
  document.body.classList.remove('modal-open');
}
function saveHistoryEdit(){
  if(!modalHistoryId)return;
  let parsed;
  try{
    parsed=JSON.parse(els.modalJsonEdit.value);
  }catch(error){
    updateModalJSONStatus(false,error.message);
    notify(`JSON 格式不对：${error.message}`,'bad','保存失败');
    return;
  }
  const query=els.modalQueryEdit.value.trim()||parsed?.meta?.query||parsed?.headword?.title||'未命名记录';
  const history=getHistory().map(item=>{
    if(Number(item.id)!==Number(modalHistoryId))return item;
    const rolls=getHistoryRolls(item);
    const updatedRolls=rolls.map((roll,index)=>Number(roll.id)===Number(modalRollId)||(!modalRollId&&index===0)
      ? {...roll,result:parsed,updatedAt:new Date().toISOString()}
      : roll);
    return {...normalizeHistoryItem(item),query,result:parsed,rolls:updatedRolls,followups:item.followups||[],updatedAt:new Date().toISOString()};
  });
  setHistory(history);
  modalResult=parsed;
  els.modalTitle.textContent=query;
  const updatedItem=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  const updatedFollowups=updatedItem?.followups||[];
  els.modalSubtitle.textContent=historyModalMeta(updatedItem);
  renderModalRollbar(updatedItem);
  els.modalCardPage.innerHTML=renderResultHTML(parsed,updatedFollowups,'modal');
  els.modalJsonEdit.value=JSON.stringify(parsed,null,2);
  updateModalJSONStatus(true,'语法正确，已保存');
  setModalTab('card',document.getElementById('modal-card-tab'));
  notify('历史记录已保存。','good','编辑完成');
}
function historyModalMeta(item){
  if(!item)return '';
  const created=new Date(item.createdAt).toLocaleString('zh-CN',{hour12:false});
  const followupCount=(item.followups||[]).length;
  const rollCount=getHistoryRolls(item).length;
  const updated=item.updatedAt?` · 已编辑 ${new Date(item.updatedAt).toLocaleString('zh-CN',{hour12:false})}`:'';
  return `${created}${rollCount>1?` · ${rollCount} 个版本`:''}${followupCount?` · ${followupCount} 条追问`:''}${updated}`;
}
function renderModalRollbar(item){
  if(!els.modalRollbar)return;
  const normalized=normalizeHistoryItem(item||{});
  const rolls=getHistoryRolls(normalized);
  if(!rolls.length){
    els.modalRollbar.innerHTML='';
    return;
  }
  els.modalRollbar.innerHTML=`
    <div class="roll-tabs">
      ${rolls.map((roll,index)=>`
        <button class="roll-btn ${Number(roll.id)===Number(modalRollId)?'active':''}" onclick="setModalRoll(${Number(roll.id)})">
          <span>版本 ${rolls.length-index}</span>
          <em>${escapeHTML(new Date(roll.createdAt).toLocaleString('zh-CN',{hour12:false}))}</em>
          <strong>${escapeHTML(roll.model||'未记录')}</strong>
        </button>
      `).join('')}
    </div>
    <button class="plain-btn primary-btn reroll-btn" onclick="regenerateModalHistory()">重新生成</button>
  `;
}
function setModalRoll(rollId){
  const item=getHistory().find(row=>Number(row.id)===Number(modalHistoryId));
  if(!item)return;
  const roll=getHistoryRolls(item).find(row=>Number(row.id)===Number(rollId));
  if(!roll)return;
  modalRollId=Number(roll.id);
  modalResult=roll.result;
  els.modalCardPage.innerHTML=renderResultHTML(roll.result,item.followups||[],'modal');
  els.modalJsonEdit.value=JSON.stringify(roll.result,null,2);
  renderModalRollbar(item);
  validateModalJSON(false);
}
function validateModalJSON(showSuccess=true){
  if(!els.modalJsonEdit)return false;
  try{
    JSON.parse(els.modalJsonEdit.value);
    updateModalJSONStatus(true,showSuccess?'语法正确':'可编辑，保存时会再次检查');
    return true;
  }catch(error){
    updateModalJSONStatus(false,error.message);
    return false;
  }
}
function updateModalJSONStatus(isValid,message){
  if(!els.modalJsonStatus)return;
  els.modalJsonStatus.classList.toggle('good',isValid);
  els.modalJsonStatus.classList.toggle('bad',!isValid);
  els.modalJsonStatus.textContent=isValid?message:`JSON 错误：${message}`;
}
function copyModalJSON(){
  if(!modalResult)return;
  navigator.clipboard.writeText(JSON.stringify(modalResult,null,2));
  notify('JSON 已复制。','good','复制完成');
}
async function regenerateHistory(id){
  const item=getHistory().find(row=>Number(row.id)===Number(id));
  if(!item)return notify('找不到这条历史记录。','bad','重新生成');
  const ok=await askConfirm(`确认重新生成“${item.query}”？新结果会保存为一个新版本，旧版本仍可切换查看。`,'重新生成');
  if(!ok)return;
  els.query.value=item.query;
  updateEditorState();
  goHomeAndFocus();
  await performLookup({query:item.query,existingId:item.id,sourceItem:item});
}
async function regenerateModalHistory(){
  if(!modalHistoryId)return;
  closeHistoryModal();
  await regenerateHistory(modalHistoryId);
}
function exportModalJSON(){
  if(!modalResult)return;
  const name=(modalResult.meta?.normalized||modalResult.meta?.query||'history').replace(/[\\/:*?"<>|]/g,'_');
  downloadText(`${name}.json`,JSON.stringify(modalResult,null,2));
}
async function deleteHistory(id){
  if(!await askConfirm('确认删除这条历史记录？','删除记录'))return;
  setHistory(getHistory().filter(item=>Number(item.id)!==Number(id)));
  notify('记录已删除。','good','历史记录');
}
async function clearHistory(){
  if(!await askConfirm('确认清空历史记录？','清空历史'))return;
  setHistory([]);
  notify('历史记录已清空。','good','历史记录');
}
function exportHistory(){downloadText('ai-vocab-tool-history.json',JSON.stringify(getHistory(),null,2))}
function exportCurrent(){
  if(!currentResult)return notify('还没有结果。','bad','无法导出');
  const name=(currentResult.meta?.normalized||currentResult.meta?.query||'ai-vocab-tool').replace(/[\\/:*?"<>|]/g,'_');
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
  currentResult=null;
  currentHistoryId=null;
  currentFollowups=[];
  pendingFollowup=null;
  editingFollowup=null;
  renderEmpty();
  updateEditorState();
}
function hydrateSettings(){
  const settings=getSettings();
  const profile=activeApiProfile(settings);
  if(els.apiProfileSelect){
    els.apiProfileSelect.innerHTML=settings.apiProfiles.map(item=>`<option value="${escapeHTML(item.id)}">${escapeHTML(item.name)}${item.apiUrl&&item.apiKey?'':' · 未完整'}</option>`).join('');
    els.apiProfileSelect.value=profile.id;
  }
  if(els.apiProfileName)els.apiProfileName.value=profile.name||'';
  els.apiUrl.value=profile.apiUrl||'';
  els.apiKey.value=profile.apiKey||'';
  els.apiModel.value=profile.model||'';
  els.apiModel.placeholder=configInfo?.model||'gpt-4o-mini';
  renderConfigInfo();
}
function renderSettings(){
  hydrateSettings();
  renderLogs();
}
function saveSettings(){
  const settings=getSettings();
  const activeId=settings.activeApiProfileId;
  const now=new Date().toISOString();
  const profiles=settings.apiProfiles.map(profile=>profile.id===activeId?{
    ...profile,
    name:els.apiProfileName.value.trim()||profile.name||'未命名配置',
    apiUrl:els.apiUrl.value.trim(),
    apiKey:els.apiKey.value.trim(),
    model:els.apiModel.value.trim(),
    updatedAt:now,
  }:profile);
  setSettings({...settings,apiProfiles:profiles,activeApiProfileId:activeId,updatedAt:now});
  hydrateSettings();
  renderConfigInfo();
  notify('设置已保存。','good','设置');
}
async function resetModelSettings(){
  if(!await askConfirm('这会清空所有自定义 API 配置组，改回 Vercel 环境变量。','恢复接口默认'))return;
  setSettings(DEFAULT_SETTINGS);
  hydrateSettings();
  notify('接口配置已恢复默认。','good','设置');
}
function selectApiProfile(id){
  const settings=getSettings();
  if(!settings.apiProfiles.some(profile=>profile.id===id))return;
  setSettings({...settings,activeApiProfileId:id,updatedAt:new Date().toISOString()});
  hydrateSettings();
}
function newApiProfile(){
  const settings=getSettings();
  const id=`api_${Date.now()}`;
  const profile={...DEFAULT_API_PROFILE,id,name:`配置 ${settings.apiProfiles.length+1}`,updatedAt:new Date().toISOString()};
  setSettings({...settings,apiProfiles:[profile,...settings.apiProfiles],activeApiProfileId:id,updatedAt:profile.updatedAt});
  hydrateSettings();
  els.apiProfileName?.focus();
  notify('已新增 API 配置组。','good','设置');
}
async function deleteApiProfile(){
  const settings=getSettings();
  if(settings.apiProfiles.length<=1)return resetModelSettings();
  const current=activeApiProfile(settings);
  if(!await askConfirm(`确认删除「${current.name}」？`,'删除 API 配置'))return;
  const profiles=settings.apiProfiles.filter(profile=>profile.id!==current.id);
  setSettings({...settings,apiProfiles,activeApiProfileId:profiles[0].id,updatedAt:new Date().toISOString()});
  hydrateSettings();
  notify('当前 API 配置组已删除。','good','设置');
}
async function factoryReset(){
  if(!await askConfirm('这会清空本机历史、接口配置、主题、布局和日志。','恢复出厂设置'))return;
  localStorage.removeItem(STORAGE_KEYS.history);
  localStorage.removeItem(STORAGE_KEYS.settings);
  localStorage.removeItem(STORAGE_KEYS.theme);
  localStorage.removeItem(STORAGE_KEYS.layout);
  localStorage.removeItem(STORAGE_KEYS.logs);
  currentResult=null;
  currentHistoryId=null;
  currentFollowups=[];
  modalResult=null;
  historyState.query='';
  historyState.scope='all';
  if(els.historySearch)els.historySearch.value='';
  hydrateSettings();
  renderEmpty();
  renderHistory();
  renderLogs();
  applyTheme('auto');
  applyLayout('top');
  syncAllToCloud(true);
  notify('已恢复默认设置。','good','恢复出厂',false);
}
function renderLogs(){
  if(!els.logList)return;
  const logs=getLogs();
  if(!logs.length){
    els.logList.innerHTML='<div class="empty small-empty">暂无日志</div>';
    return;
  }
  els.logList.innerHTML=logs.slice(0,18).map(item=>`
    <article class="log-item ${escapeHTML(item.type)}">
      <div class="log-head"><b>${escapeHTML(item.title)}</b><span>${new Date(item.time).toLocaleString('zh-CN',{hour12:false})}</span></div>
      <p>${escapeHTML(item.message)}</p>
    </article>
  `).join('');
}
function renderAbout(){
  if(!els.aboutContainer)return;
  const latest=CHANGELOG[0];
  els.aboutContainer.innerHTML=`
    <div class="about-hero">
      <div>
        <div class="setting-title">关于</div>
        <h2>${escapeHTML(APP_INFO.name)}</h2>
        <p>一个面向写作、考试和日常阅读的词汇结构化查询工具。它把释义、搭配、例句、语体和易混辨析整理成可以回看、导出和同步的记录。</p>
      </div>
      <div class="about-version">
        <span>当前版本</span>
        <strong>v${escapeHTML(APP_INFO.version)}</strong>
        <em>${escapeHTML(APP_INFO.releaseDate)}</em>
      </div>
    </div>
    <div class="about-grid">
      <a class="about-link" href="${APP_INFO.site}" target="_blank" rel="noopener noreferrer"><b>线上地址</b><span>${escapeHTML(APP_INFO.site)}</span></a>
      <a class="about-link" href="${APP_INFO.repo}" target="_blank" rel="noopener noreferrer"><b>GitHub 仓库</b><span>${escapeHTML(APP_INFO.repo)}</span></a>
      <div class="about-link"><b>数据存储</b><span>localStorage + Supabase Auth / Postgres</span></div>
      <div class="about-link"><b>最近更新</b><span>v${escapeHTML(latest.version)} · ${escapeHTML(latest.title)}</span></div>
    </div>
    <div class="about-card">
      <div class="setting-title">更新记录</div>
      <div class="release-list">
        ${CHANGELOG.map(entry=>`
          <article class="release-item">
            <div class="release-head"><b>v${escapeHTML(entry.version)}</b><span>${escapeHTML(entry.date)}</span></div>
            <h3>${escapeHTML(entry.title)}</h3>
            <ul>${entry.items.map(item=>`<li>${escapeHTML(item)}</li>`).join('')}</ul>
          </article>
        `).join('')}
      </div>
    </div>
  `;
}
function applyTheme(theme){
  document.documentElement.dataset.theme=theme==='auto'?'':theme;
  document.body.dataset.themeMode=theme;
  document.querySelectorAll('.seg button').forEach(btn=>btn.classList.remove('active'));
  document.getElementById(`th-${theme}`)?.classList.add('active');
  const themeToggle=document.getElementById('theme-toggle-btn');
  if(themeToggle)themeToggle.textContent=theme==='light'?'☀️':theme==='dark'?'🌙':'◐';
}
function setTheme(theme){
  localStorage.setItem(STORAGE_KEYS.theme,theme);
  markCloudDirty(CLOUD_KEYS.theme);
  applyTheme(theme);
  syncAllToCloud(true);
}
function cycleTheme(){
  const order=['auto','light','dark'];
  const current=localStorage.getItem(STORAGE_KEYS.theme)||'auto';
  setTheme(order[(order.indexOf(current)+1)%order.length]);
}
function applyLayout(layout){
  const next=layout==='split'?'split':'top';
  els.workspace.classList.toggle('layout-split',next==='split');
  els.workspace.classList.toggle('layout-top',next==='top');
  els.layoutTopBtn?.classList.toggle('active',next==='top');
  els.layoutSplitBtn?.classList.toggle('active',next==='split');
}
function setLayout(layout){
  const next=layout==='split'?'split':'top';
  localStorage.setItem(STORAGE_KEYS.layout,next);
  markCloudDirty(CLOUD_KEYS.layout);
  applyLayout(next);
  syncAllToCloud(true);
}
function updateEditorState(){
  const hasText=Boolean(els.query.value.trim()||els.direction.value.trim()||els.note.value.trim());
  els.clearQueryBtn?.classList.toggle('hidden',!hasText);
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&els.confirmLayer?.classList.contains('open'))closeConfirm(false);
  if(event.key==='Escape'&&els.historyModal.classList.contains('open'))closeHistoryModal();
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();
    showView('history',document.getElementById('nav-history'));
    requestAnimationFrame(()=>els.historySearch?.focus());
  }
  if(activeView==='history'&&event.key==='/'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
    const tag=document.activeElement?.tagName;
    if(tag!=='INPUT'&&tag!=='TEXTAREA'&&tag!=='SELECT'){
      event.preventDefault();
      els.historySearch?.focus();
    }
  }
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&cloudClient&&cloudUser)bootstrapCloudSync('merge',false);
});
window.addEventListener('focus',()=>{
  if(cloudClient&&cloudUser)bootstrapCloudSync('merge',false);
});
els.historySearch?.addEventListener('input',event=>{
  historyState.query=event.target.value;
  updateHistorySearchState();
  renderHistory();
});
els.historyFilterLanguage?.addEventListener('change',event=>setHistoryFilter('language',event.target.value));
els.historyFilterDirection?.addEventListener('change',event=>setHistoryFilter('direction',event.target.value));
els.historyFilterPos?.addEventListener('change',event=>setHistoryFilter('pos',event.target.value));
els.historyFilterStyle?.addEventListener('change',event=>setHistoryFilter('style',event.target.value));
els.query?.addEventListener('input',updateEditorState);
els.query?.addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey){
    event.preventDefault();
    runLookup();
  }
});
els.direction?.addEventListener('input',updateEditorState);
els.note?.addEventListener('input',updateEditorState);
els.modalJsonEdit?.addEventListener('input',()=>validateModalJSON(false));
els.confirmCancel?.addEventListener('click',()=>closeConfirm(false));
els.confirmOk?.addEventListener('click',()=>closeConfirm(true));
els.confirmLayer?.addEventListener('click',event=>{
  if(event.target===els.confirmLayer)closeConfirm(false);
});

renderEmpty();
hydrateSettings();
renderHistory();
applyTheme(localStorage.getItem(STORAGE_KEYS.theme)||'auto');
applyLayout(localStorage.getItem(STORAGE_KEYS.layout)||'top');
updateEditorState();
updateHistorySearchState();
loadConfigInfo();
initCloud();
focusQueryInput();
