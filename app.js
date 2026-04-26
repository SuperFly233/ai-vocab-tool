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
};

let cloudClient=null;
let cloudUser=null;
let activeView='home';
let currentResult=null;
let currentHistoryId=null;
let currentFollowups=[];
let modalResult=null;
let modalHistoryId=null;
let configInfo=null;
let confirmResolver=null;
let lookupBusy=false;
let followupBusy=false;
let editingFollowup=null;
const activeToasts=new Map();
const historyState={
  query:'',
  sort:'time-desc',
};
const historyCollator=new Intl.Collator(['zh-Hans-CN','en','ja','ko','fr','es'],{
  numeric:true,
  sensitivity:'base',
  ignorePunctuation:true,
});
const DEFAULT_SETTINGS={apiUrl:'',apiKey:'',model:''};
const APP_INFO={
  name:'ai-vocab-tool',
  version:'0.7.0',
  releaseDate:'2026-04-25',
  site:'https://ai-vocab-tool.vercel.app',
  repo:'https://github.com/SuperFly233/ai-vocab-tool',
};
const CHANGELOG=[
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
  query:document.getElementById('query-input'),
  direction:document.getElementById('direction-input'),
  note:document.getElementById('note-input'),
  resultCard:document.getElementById('result-card'),
  resultJson:document.getElementById('result-json'),
  historyModal:document.getElementById('history-modal'),
  modalTitle:document.getElementById('modal-title'),
  modalSubtitle:document.getElementById('modal-subtitle'),
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
  historySort:document.getElementById('history-sort'),
  apiUrl:document.getElementById('api-url'),
  apiKey:document.getElementById('api-key'),
  apiModel:document.getElementById('api-model'),
  envCard:document.getElementById('env-card'),
  storageStatus:document.getElementById('storage-status'),
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
    existing.timer=setTimeout(()=>{
      existing.element.remove();
      activeToasts.delete(key);
    },3200);
    return;
  }
  const toast=document.createElement('div');
  toast.className=`toast ${type}`;
  toast.innerHTML=`
      <div class="toast-row">
        <div class="toast-title">${escapeHTML(title)}</div>
      <div class="toast-count" aria-live="polite"></div>
    </div>
    <div class="toast-msg">${escapeHTML(message)}</div>
  `;
  document.getElementById('toast-stack').appendChild(toast);
  const timer=setTimeout(()=>{
    toast.remove();
    activeToasts.delete(key);
  },3200);
  activeToasts.set(key,{element:toast,count:1,timer});
}
function askConfirm(message,title='确认操作'){
  if(!els.confirmLayer)return Promise.resolve(false);
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
function getLogs(){return readJSON(STORAGE_KEYS.logs,[])}
function setLogs(items){
  writeJSON(STORAGE_KEYS.logs,items.slice(0,80));
  renderLogs();
}
function pushLog(message,type='info',title='ai-vocab-tool'){
  const logs=getLogs();
  logs.unshift({id:Date.now(),time:new Date().toISOString(),type,title,message});
  writeJSON(STORAGE_KEYS.logs,logs.slice(0,80));
  renderLogs();
}
function clearLogs(){
  setLogs([]);
  notify('日志已清空。','good','日志',false);
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
    els.storageStatus.textContent=cloudUser?'localStorage + Supabase 自动同步':'localStorage，本机本浏览器记录。';
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
function getSettings(){return {...DEFAULT_SETTINGS,...readJSON(STORAGE_KEYS.settings,DEFAULT_SETTINGS)}}
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
  const settings=getSettings();
  const localModel=settings.model||'';
  const envModel=configInfo?.model||'';
  const source=localModel&&settings.apiUrl&&settings.apiKey?'网页设置':'Vercel 环境变量';
  els.envCard.innerHTML=`
    <div><b>当前来源</b><span>${escapeHTML(source)}</span></div>
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
  const source=settings.apiUrl&&settings.apiKey?'自定义接口':'环境变量接口';
  els.resultCard.innerHTML=`
    <div class="lookup-state">
      <div class="lookup-spinner"></div>
      <div>
        <div class="lookup-title">正在分析：${escapeHTML(query)}</div>
        <div class="lookup-steps">
          <span>准备请求</span>
          <span>调用模型</span>
          <span>校验 JSON</span>
          <span>生成排版</span>
        </div>
        <p>当前来源：${escapeHTML(source)}。复杂词条可能需要几秒钟。</p>
      </div>
    </div>
  `;
  els.resultJson.innerHTML='<div class="empty">等待模型返回 JSON</div>';
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
  const list=Array.isArray(followups)?followups:[];
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
    <article class="followup-item">
      <div class="followup-question"><b>问</b><span>${escapeHTML(item.question)}</span></div>
      <div class="followup-answer">${formatFollowupAnswer(item.answer)}</div>
      <div class="followup-actions">
        <button class="plain-btn ghost-btn" onclick="editFollowup('${scope}',${id})">编辑</button>
        <button class="danger-btn" onclick="deleteFollowup('${scope}',${id})">删除</button>
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
    if(lines.length>1&&lines.every(line=>/^[-*•]\s+/.test(line))){
      return `<ul>${lines.map(line=>`<li>${escapeHTML(line.replace(/^[-*•]\s+/,''))}</li>`).join('')}</ul>`;
    }
    return `<p>${escapeHTML(block).replace(/\n/g,'<br>')}</p>`;
  }).join('');
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
    els.modalCardPage.innerHTML=renderResultHTML(updated.result,updated.followups||[],'modal');
  }
  if(Number(modalHistoryId)===Number(currentHistoryId))saveFollowupsForCurrent(followups);
}
async function requestFollowup(question,baseItem){
  const settings=getSettings();
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
  followupBusy=true;
  document.body.classList.add('followup-busy');
  try{
    notify('正在追问，会把回答保存到当前记录。','info','追问中');
    const answer=await requestFollowup(question,baseItem);
    const followups=[...(baseItem.followups||[]),{id:Date.now(),question,answer,createdAt:new Date().toISOString()}];
    saveFollowupsForCurrent(followups);
    input.value='';
    notify('追问已保存。','good','追问完成');
  }catch(error){
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
  followupBusy=true;
  document.body.classList.add('followup-busy');
  try{
    notify('正在追问，会保存到这条历史记录。','info','追问中');
    const answer=await requestFollowup(question,baseItem);
    const followups=[...(baseItem.followups||[]),{id:Date.now(),question,answer,createdAt:new Date().toISOString()}];
    saveFollowupsForModal(followups);
    input.value='';
    notify('追问已保存。','good','追问完成');
  }catch(error){
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
    if(item)els.modalCardPage.innerHTML=renderResultHTML(item.result,item.followups||[],'modal');
    return;
  }
  if(currentResult)renderResult(currentResult);
}
async function runLookup(){
  if(lookupBusy)return;
  const query=els.query.value.trim();
  if(!query)return notify('请输入要查的内容。','bad','无法查询');
  const settings=getSettings();
  lookupBusy=true;
  document.body.classList.add('lookup-busy');
  renderLookupLoading(query,settings);
  notify('正在发送请求，模型返回后会自动校验 JSON。','info','查询中');
  const hasLocalEndpoint=Boolean(settings.apiUrl&&settings.apiKey);
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
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'查询失败');
    currentHistoryId=Date.now();
    currentFollowups=[];
    renderResult(data);
    addHistory({id:currentHistoryId,query,result:data,followups:[],createdAt:new Date().toISOString()});
    notify('结果已生成。','good','查询完成');
  }catch(error){
    notify(error.message||'查询失败。','bad','查询失败');
  }finally{
    lookupBusy=false;
    document.body.classList.remove('lookup-busy');
  }
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
  const history=getHistory().filter(existing=>existing.query!==item.query);
  history.unshift(item);
  setHistory(history.slice(0,120));
}
function renderHistory(){
  const history=filterAndSortHistory(getHistory());
  const total=getHistory().length;
  els.historyCount.textContent=historyState.query?`${history.length}/${total} 条`:`${total} 条`;
  if(!history.length){
    els.historyList.innerHTML=`<div class="empty">${historyState.query?'没有匹配记录':'暂无历史记录'}</div>`;
    return;
  }
  els.historyList.innerHTML=history.map(item=>`
    <div class="history-item" role="button" tabindex="0" onclick="openHistoryModal(${Number(item.id)})" onkeydown="handleHistoryItemKey(event,${Number(item.id)})">
      <div>
        <div class="history-word">${escapeHTML(item.query)}</div>
        <div class="history-time">${new Date(item.createdAt).toLocaleString('zh-CN',{hour12:false})}</div>
      </div>
      <div class="history-actions">
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
  const filtered=query
    ? history.filter(item=>historySearchText(item).includes(query))
    : [...history];
  return filtered.sort((a,b)=>{
    if(historyState.sort==='time-asc')return new Date(a.createdAt)-new Date(b.createdAt);
    if(historyState.sort==='text-asc')return compareHistoryText(a,b);
    if(historyState.sort==='text-desc')return compareHistoryText(b,a);
    return new Date(b.createdAt)-new Date(a.createdAt);
  });
}
function compareHistoryText(a,b){
  return historyCollator.compare(historySortTitle(a),historySortTitle(b));
}
function historySortTitle(item){
  return item.result?.meta?.normalized||item.result?.headword?.title||item.query||'';
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
  renderHistory();
}
function openHistoryModal(id){
  const item=getHistory().find(row=>Number(row.id)===Number(id));
  if(!item)return;
  modalResult=item.result;
  modalHistoryId=Number(item.id);
  els.modalTitle.textContent=item.query;
  els.modalSubtitle.textContent=historyModalMeta(item);
  els.modalCardPage.innerHTML=renderResultHTML(item.result,item.followups||[],'modal');
  els.modalQueryEdit.value=item.query;
  els.modalJsonEdit.value=JSON.stringify(item.result,null,2);
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
    return {...item,query,result:parsed,followups:item.followups||[],updatedAt:new Date().toISOString()};
  });
  setHistory(history);
  modalResult=parsed;
  els.modalTitle.textContent=query;
  const updatedItem=getHistory().find(item=>Number(item.id)===Number(modalHistoryId));
  const updatedFollowups=updatedItem?.followups||[];
  els.modalSubtitle.textContent=historyModalMeta(updatedItem);
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
  const updated=item.updatedAt?` · 已编辑 ${new Date(item.updatedAt).toLocaleString('zh-CN',{hour12:false})}`:'';
  return `${created}${followupCount?` · ${followupCount} 条追问`:''}${updated}`;
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
  updateEditorState();
}
function hydrateSettings(){
  const settings=getSettings();
  els.apiUrl.value=settings.apiUrl||'';
  els.apiKey.value=settings.apiKey||'';
  els.apiModel.value=settings.model||'';
  els.apiModel.placeholder=configInfo?.model||'gpt-4o-mini';
  renderConfigInfo();
}
function renderSettings(){
  hydrateSettings();
  renderLogs();
}
function saveSettings(){
  setSettings({apiUrl:els.apiUrl.value.trim(),apiKey:els.apiKey.value.trim(),model:els.apiModel.value.trim()});
  renderConfigInfo();
  notify('设置已保存。','good','设置');
}
async function resetModelSettings(){
  if(!await askConfirm('这会清空自定义 API URL、Key 和 Model。','恢复接口默认'))return;
  setSettings(DEFAULT_SETTINGS);
  hydrateSettings();
  notify('接口配置已恢复默认。','good','设置');
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
  applyLayout(next);
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
els.historySearch?.addEventListener('input',event=>{
  historyState.query=event.target.value;
  renderHistory();
});
els.historySort?.addEventListener('change',event=>{
  historyState.sort=event.target.value;
  renderHistory();
});
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
loadConfigInfo();
initCloud();
