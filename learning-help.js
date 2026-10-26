(function(root){
 'use strict';
 const {tours,version}=LearningHelpData,esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const memory=new Map(),diagnostics=new Map(),requests=new Map();let help=null,tour=null,welcome=null,promptTimer=null,storageFailed=false;
 const owner=()=>cloudUser?.id||'offline',storageKey=id=>'lexi-learning-help-v1:'+id;
 function state(){
  const id=owner();if(memory.has(id))return memory.get(id);
  let value={};try{const text=localStorage.getItem(storageKey(id));if(text&&text.length<8192)value=JSON.parse(text)}catch{storageFailed=true}
  if(!value||typeof value!=='object'||Array.isArray(value))value={};
  const result={version,welcome:['seen','later','never'].includes(value.welcome)?value.welcome:'',tours:{}};
  if(value.version===version)for(const [key,definition] of Object.entries(tours)){const saved=value.tours?.[key];if(saved)result.tours[key]={step:Number.isInteger(saved.step)?Math.max(0,Math.min(definition.steps.length-1,saved.step)):0,complete:saved.complete===true}}
  memory.set(id,result);return result;
 }
 function persist(){const value=state();try{localStorage.setItem(storageKey(owner()),JSON.stringify(value));storageFailed=false}catch{storageFailed=true}}
 function busyEditor(){return Boolean(document.querySelector('.modal-layer.open,.confirm-layer.open,.inline-name-editor,dialog[open]:not(.learning-help-dialog)'))}
 function visible(node){const r=node?.getBoundingClientRect();return Boolean(r&&r.width&&r.height&&getComputedStyle(node).visibility!=='hidden')}
 function closeWelcome(choice='later'){if(!welcome)return;welcome.remove();welcome=null;state().welcome=choice;persist()}
 function status(node,message){const host=node?.querySelector('.scene-dialog-status');if(host)host.textContent=message}
 function eligible(){return !document.hidden&&typeof canEnterApp==='function'&&canEnterApp()&&!document.body.classList.contains('auth-required')}
 function offer(){
  clearTimeout(promptTimer);if(!eligible()||state().welcome||help||tour||welcome)return;
  if(busyEditor()||document.querySelector('.request-card.is-streaming')||document.activeElement?.matches('textarea:focus,input:focus')&&document.activeElement.value){promptTimer=setTimeout(offer,4000);return}
  const node=document.createElement('aside');welcome=node;node.className='learning-welcome';node.setAttribute('popover','manual');node.setAttribute('aria-label','新手教程');
  node.innerHTML='<strong>用几步熟悉 Lexi</strong><p>只读演示，不查询、不保存，也不创建卡片。</p><div><button class="plain-btn primary-btn" data-start>开始</button><button class="plain-btn" data-later>稍后</button><button class="plain-btn" data-never>不再提示</button></div>';
  document.body.append(node);node.showPopover();state().welcome='seen';persist();
  node.querySelector('[data-start]').onclick=()=>{closeWelcome('seen');open('tutorials')};node.querySelector('[data-later]').onclick=()=>closeWelcome();node.querySelector('[data-never]').onclick=()=>closeWelcome('never');
 }
 function tutorialsHTML(){return `<p class="help-intro">先学基本操作，拓展能力按需查看。演示不会执行真实任务。</p><div class="help-tour-list">${Object.entries(tours).map(([key,item])=>`<section><span class="help-topic-icon">${icon(item.icon)}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><small>${state().tours[key]?.complete?'已看完，可重播':state().tours[key]?'上次看到第 '+(state().tours[key].step+1)+' 步':item.steps.length+' 步 · 只读示例'}</small></div><button class="icon-btn" data-start-tour="${key}" aria-label="${esc(item.title)}${state().tours[key]?.complete?'重新播放':'开始教程'}" data-tip="${state().tours[key]?.complete?'重新播放':'开始教程'}">${icon('play')}</button></section>`).join('')}</div><p class="help-note">教程进度仅保存在本机当前账号；看完教程不等于连接通过。${storageFailed?' 本机存储不可用，刷新后进度可能无法恢复。':''}</p>`}
 const faqs=[
  ['只是查词，需要装软件吗？','不需要安装 Bridge、Anki 或 Fushi。基础查词使用你明确配置的接口，已有内容和可用基础词典可直接阅读。'],
  ['手机或 Mac 怎么制卡？','仍在原 Lexi 网页提交和预览；选择同一账号登记的 Windows 电脑，助手与 Anki 在线后执行。此版助手是 Windows x64 程序，不在手机或 Mac 上运行。'],
  ['下载了，为什么还显示未连接？','点击下载无法证明完整下载、解压或启动。打开 Windows 托盘里的连接设置，核对实际版本、同一账号、电脑登记和 Anki；再在本站检查所选电脑。'],
  ['为什么没有自动弹出浏览器？','助手默认手动启动、托盘常驻，不自动弹浏览器。从托盘打开连接设置；关闭网页不等于退出助手。'],
  ['更新会丢掉配置或卡片吗？','先处理剩余任务，正常退出旧助手，再解压到新目录。用户数据位于 %LOCALAPPDATA%\\LexiAnkiBridge；系统凭据不在 ZIP 内。更新不转换旧卡类型，也不重置复习进度。'],
  ['为什么显示需重新检查？','心跳只说明最近在线。诊断超过120秒，或账号／电脑改变后，需要重新检查。未运行 Anki 和端口错误可能表现相同，不能仅凭网络拒绝武断区分。'],
  ['Fushi 或词典必须连上吗？','不必。普通制卡需要云任务与 Anki；Fushi 来源和已安装词典是可选能力。已有快照不等于电脑此刻在线。'],
  ['写入成功就是手机已经同步了吗？','不是。写入 Anki、Lexi 云端回执、Anki 自身云同步是不同阶段。取消剩余任务不会删除已经写入的卡片。'],
  ['截图识别、语录匹配与媒体编辑呢？','场景编辑器可配置指定模型分析静态图片，先核对再保存；不支持的通道会明确失败并保留原件。独立批量截图、Teyvat 来源索引、间隔重复调度、重复归并、存储迁移及媒体编辑继续按独立阶段验收。']
 ];
 function ledgerHTML(){return '<details class="help-faq help-ledger"><summary>未完成事项与验收条件</summary><p>依次收尾，未通过验收的能力不作为可用功能；以下均未完成。</p>'+LearningHelpData.ledger.map(row=>`<section><h3>${esc(row.title)} <small>待完成</small></h3><p>依赖：${esc(row.dependency)}</p><p>验收：${esc(row.acceptance)}</p><p>下一步：${esc(row.next)}</p><p class="help-note">证据边界：${esc(row.evidence)}</p></section>`).join('')+'</details>'}
 async function open(tab='about'){
  closeWelcome('seen');if(tour)endTour();
  if(!state().welcome){state().welcome='seen';persist()}
  if(help?.node.isConnected){help.change(tab);help.node.focus();return}
  const origin=document.activeElement,node=AnkiBridge.dialog('帮助与关于'),body=node.querySelector('.scene-dialog-body'),account=owner();node.classList.add('learning-help-dialog');
  body.innerHTML='<div class="help-tabs" role="tablist" aria-label="帮助主题"></div><section class="help-content" role="tabpanel"></section>';
  const tabs=body.querySelector('.help-tabs'),content=body.querySelector('.help-content');let generation=0,controller=null,closed=false,release=null,platform=/Windows/i.test(navigator.userAgentData?.platform||navigator.userAgent)?'windows':'remote',devices=[],deviceId='',currentRequest=null,pending=false,restoring=true,expiryTimer=null;
  const alive=()=>!closed&&node.isConnected&&owner()===account;
  function stop(){generation++;controller?.abort();controller=null;pending=false;clearTimeout(expiryTimer)}
  function setMessage(message){if(alive())status(node,message)}
  function cached(){return diagnostics.get(account+':'+deviceId)}
  function renderDiagnostic(){
   const host=content.querySelector('[data-help-diagnostic]');if(!host)return;const value=cached(),device=devices.find(d=>d.id===deviceId);clearTimeout(expiryTimer);
   if(!device){host.innerHTML='<p>选择已登记电脑后检查；网页不会擅自读取本机安装目录或端口。</p>';return}
   const fresh=value&&Date.now()-Date.parse(value.checkedAt)<=120000&&Date.now()>=Date.parse(value.checkedAt)-30000;
   host.innerHTML=`<p>实际登记版本 <strong>${esc(device.capabilities?.bridgeVersion||'未知')}</strong>${release?' · '+esc(BridgeRelease.comparison(device.capabilities?.bridgeVersion,release.version)):''}</p><p>${device.last_seen?'最近在线 '+esc(formatHistoryTime(device.last_seen)):'尚无在线记录'} · 在线不代表 Anki 已就绪</p>${value?BridgeRelease.diagnosticsHTML(value):'<p>尚未取得此电脑的实际诊断。</p>'}<p class="help-readiness" data-ready="${Boolean(fresh&&value.cloud?.ok&&value.anki?.ok)}">${fresh&&value.cloud?.ok&&value.anki?.ok?'基础制卡连接检查通过；每批仍需网页预览和确认。':'尚不能确认可以制卡，请检查所选电脑。'}</p>`;
   if(fresh)expiryTimer=setTimeout(renderDiagnostic,Math.max(50,120001-(Date.now()-Date.parse(value.checkedAt))));
  }
  function updateCheck(){const button=content.querySelector('[data-help-check-device]');if(button){button.disabled=pending||!deviceId;button.textContent=pending?'停止检查':currentRequest?.deviceId===deviceId?'继续检查':'检查这台电脑';if(pending)button.disabled=false}}
  function selected(){deviceId=content.querySelector('[data-help-device]')?.value||'';stop();currentRequest=requests.get(account+':'+deviceId)||null;renderDiagnostic();updateCheck()}
  async function refreshDevices(){
   const button=content.querySelector('[data-help-check-cloud]');if(!cloudUser){setMessage('请登录 Lexi 后检查云任务和登记电脑；下载与教程仍可查看。');return}
   stop();const revision=generation;button.disabled=true;
   try{
    const health=await AnkiBridge.request('health'),rows=await AnkiBridge.request('devices');if(!alive()||revision!==generation)return;
    if(!Array.isArray(rows)||rows.some(d=>!d||typeof d.id!=='string'||typeof d.name!=='string')||!Array.isArray(health?.payloadVersions))throw Error('电脑列表或协议返回不兼容，请刷新后重试。');
    devices=rows;content.querySelector('[data-help-cloud]').textContent='云任务可用 · 支持协议 '+health.payloadVersions.join(' / ')+'；电脑与 Anki 需另行诊断。';
    const select=content.querySelector('[data-help-device]');select.replaceChildren(...devices.map(d=>new Option(d.name,d.id)));
    if(!devices.some(d=>d.id===deviceId))deviceId=devices[0]?.id||'';select.value=deviceId;content.querySelector('[data-help-no-devices]').hidden=Boolean(devices.length);SharedUI.enhanceSelects(content);renderDiagnostic();updateCheck();setMessage('');
   }catch(error){if(alive()&&revision===generation){diagnostics.delete(account+':'+deviceId);setMessage(error.message)}}
   finally{if(button.isConnected)button.disabled=false;if(alive())renderDiagnostic()}
  }
  async function checkDevice(){
   if(pending){stop();renderDiagnostic();updateCheck();setMessage('已停止网页检查；电脑请求仍可完成。点击继续检查不会重复发送。');return}
   if(!deviceId)return;pending=true;controller=new AbortController();const signal=controller.signal,revision=++generation,id=deviceId;updateCheck();
   const valid=()=>alive()&&revision===generation&&deviceId===id&&!signal.aborted;
   try{
    if(currentRequest?.deviceId!==id){currentRequest=requests.get(account+':'+id)||{deviceId:id,clientRequestId:crypto.randomUUID()};requests.set(account+':'+id,currentRequest)}
    if(!currentRequest.id){const request=await AnkiBridge.request('device_request',{deviceId:id,kind:'diagnostics',clientRequestId:currentRequest.clientRequestId},{signal});if(!valid())return;currentRequest.id=request.id}
    for(let n=0;n<60;n++){
     if(!valid()||document.hidden)throw Error('页面不可见，检查已暂停；可继续检查原请求。');
     const value=await AnkiBridge.request('device_status',{requestId:currentRequest.id},{signal});if(!valid())return;
     if(value.status==='error'){requests.delete(account+':'+id);currentRequest=null;throw Error('电脑检查失败，请在连接设置核对登录与服务状态；可导出脱敏诊断。')}
     if(value.status==='complete'){
      const result=value.result;if(!result||result.deviceId&&result.deviceId!==id)throw Error('电脑身份不匹配，未采用该诊断。');
      diagnostics.set(account+':'+id,{...result,deviceName:devices.find(d=>d.id===id)?.name||'所选电脑',deviceId:id,checkedAt:value.updated_at||result.checkedAt||null});requests.delete(account+':'+id);currentRequest=null;renderDiagnostic();setMessage('');return;
     }
     setMessage(value.status==='working'?'所选电脑正在检查连接…':'等待所选电脑上线；请在电脑托盘打开连接设置。');
     await new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(new DOMException('已暂停','AbortError'))},timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},2000);signal.addEventListener('abort',abort,{once:true})});
    }
    throw Error('电脑暂未完成检查，可继续检查原请求，不会重复发送。');
   }catch(error){if(alive()&&revision===generation){if(error.name!=='AbortError')diagnostics.delete(account+':'+id);renderDiagnostic();setMessage(error.name==='AbortError'?'已暂停检查，可继续。':error.message)}}finally{if(revision===generation){pending=false;controller=null;updateCheck()}}
  }
  function connectionHTML(){
   const directory=release?'%LOCALAPPDATA%\\Programs\\LexiConnect\\'+release.version:'%LOCALAPPDATA%\\Programs\\LexiConnect\\版本号';
   return `<p class="help-intro">学习仍在此网页完成，助手只负责连接和执行。</p><div class="seg help-platform" aria-label="使用设备"><button data-platform="windows" aria-pressed="${platform==='windows'}">Windows 电脑</button><button data-platform="remote" aria-pressed="${platform==='remote'}">手机／Mac</button></div><p>${platform==='windows'?'此版为 Windows x64 便携程序；无需安装 Python。':'此设备可以查词、整理、提交和预览。写入 Anki 仍由同一账号的 Windows 电脑执行，不在手机／Mac 上运行 EXE。'}</p><section class="help-install"><h3>1. 下载正式助手</h3><div data-help-release>${release?`<p><strong>Bridge ${esc(release.version)}</strong> · ${(release.size/1048576).toFixed(1)} MB · Windows x64</p><a class="plain-btn primary-btn" href="${esc(release.url)}" target="_blank" rel="noopener noreferrer">${icon('download')}下载完整 ZIP</a><details><summary>校验值与发布记录</summary><code class="bridge-checksum">${esc(release.sha256)}</code><a href="${esc(release.releaseUrl)}" target="_blank" rel="noopener noreferrer">正式发布记录</a></details>`:'<p>正在核对正式发布清单…</p>'}</div><p class="help-note">点击下载不代表下载、解压或安装已经完成。未签名程序如被系统阻止，请先核对来源与校验值，不关闭安全软件。</p></section><section class="help-install"><h3>2. 在 Windows 电脑完成连接</h3><ol class="help-install-steps"><li>更新前暂停接单，完成或明确取消剩余任务，再从托盘正常退出旧助手。</li><li>完整解压 ZIP 到新版本目录，保留 <code>_internal</code>；不要覆盖正在运行的文件。</li><li>运行 <code>LexiConnect.exe</code>；默认不自动弹浏览器、不设置开机自启。</li><li>从系统托盘打开“连接设置”，核对实际版本，登录同一 Lexi 账号并登记电脑。</li><li>打开已安装 AnkiConnect 的 Anki，核对端口、认证和配置；Fushi／词典按需启用。</li><li>回到此网页检查所选电脑，预览卡面与牌库后再确认写入。首次使用“Lexi 验收”牌库。</li></ol><details><summary>程序放哪里？数据放哪里？</summary><p>推荐程序位置（示例，不是已检测路径）</p><code class="bridge-checksum">${esc(directory)}</code><p>现有用户数据目录</p><code class="bridge-checksum">%LOCALAPPDATA%\\LexiAnkiBridge</code><p>密码与本地密钥留在 Windows 系统凭据库，不在 ZIP 内，不需要复制浏览器凭据。</p></details><div class="help-official-links"><a href="https://apps.ankiweb.net/" target="_blank" rel="noopener noreferrer">Anki 官网 · 制卡必需</a><a href="https://ankiweb.net/shared/info/2055492159" target="_blank" rel="noopener noreferrer">AnkiConnect 官方插件页 · 制卡必需</a><a href="https://github.com/hajisensai/Fushi" target="_blank" rel="noopener noreferrer">Fushi 官方仓库 · 可选</a></div></section><section class="help-install"><h3>3. 核对云任务与接收电脑</h3><div class="help-check-actions"><button class="plain-btn" data-help-check-cloud>${icon('refresh-cw')}检查云端与电脑列表</button><button class="plain-btn" data-help-tasks>${icon('list')}查看制卡任务</button></div><p data-help-cloud>尚未检查；教程进度不会改变连接状态。</p><p data-help-no-devices ${devices.length?'hidden':''}>尚未取得登记电脑列表。电脑需要在助手里独立登录并登记。</p><label class="scene-field"><span>接收电脑</span><select data-help-device aria-label="接收电脑">${devices.map(d=>`<option value="${esc(d.id)}" ${d.id===deviceId?'selected':''}>${esc(d.name)}</option>`).join('')}</select></label><div data-help-diagnostic></div><button class="plain-btn" data-help-check-device disabled>检查这台电脑</button></section>`;
  }
  async function renderConnection(){
   content.innerHTML=connectionHTML();SharedUI.enhanceSelects(content);renderDiagnostic();updateCheck();
   const quick=document.createElement('button');quick.className='plain-btn help-check-shortcut';quick.textContent='已安装？直接核对连接';quick.onclick=()=>content.querySelector('[data-help-cloud]').closest('section').scrollIntoView({block:'start',behavior:'instant'});content.querySelector('.help-platform').after(quick);
   content.querySelectorAll('[data-platform]').forEach(b=>b.onclick=()=>{platform=b.dataset.platform;stop();renderConnection()});
   content.querySelector('[data-help-check-cloud]').onclick=refreshDevices;content.querySelector('[data-help-device]').onchange=selected;content.querySelector('[data-help-check-device]').onclick=checkDevice;
   content.querySelector('[data-help-tasks]').onclick=()=>{node.close();AnkiBridge.manage()};
   if(!release){const revision=generation;try{const value=await BridgeRelease.load();if(!alive()||revision!==generation)return;release=value;renderConnection()}catch{if(!alive()||revision!==generation)return;const host=content.querySelector('[data-help-release]');host.innerHTML='<p>正式发布清单暂不可用，未提供未经校验的下载。</p><button class="plain-btn" data-help-retry-release>重新获取</button>';host.querySelector('button').onclick=renderConnection}}
  }
  function change(next='about'){
   stop();tab=['about','tutorials','connect','faq'].includes(next)?next:'about';status(node,'');tabs.innerHTML=[['about','关于'],['tutorials','使用教程'],['connect','安装连接'],['faq','常见问题']].map(([id,label])=>`<button type="button" role="tab" id="help-tab-${id}" aria-controls="help-content" aria-selected="${tab===id}" tabindex="${tab===id?0:-1}" data-help-tab="${id}">${label}</button>`).join('');content.id='help-content';content.setAttribute('aria-labelledby','help-tab-'+tab);content.scrollTop=0;
   tabs.querySelectorAll('button').forEach(b=>b.onclick=()=>change(b.dataset.helpTab));
   if(tab==='connect')renderConnection();
   else if(tab==='about'){content.innerHTML='<div class="help-about"></div>';renderAbout(content.firstElementChild)}
   else if(tab==='faq'){content.innerHTML=faqs.map(([q,a])=>`<details class="help-faq"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')+ledgerHTML()}
   else{content.innerHTML=tutorialsHTML();content.querySelectorAll('[data-start-tour]').forEach(b=>b.onclick=()=>{const id=b.dataset.startTour;if(busyEditor()){status(node,'请先处理当前编辑或弹窗，再开始跨页面教程；不会替你关闭草稿。');return}restoring=false;node.close();startTour(id,origin)})}
  }
  tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const keys=['about','tutorials','connect','faq'],at=keys.indexOf(tab),next=e.key==='Home'?0:e.key==='End'?keys.length-1:(at+(e.key==='ArrowLeft'?keys.length-1:1))%keys.length;change(keys[next]);tabs.querySelector('[aria-selected=true]').focus()};
  const visibility=()=>{if(document.hidden){stop();updateCheck();if(currentRequest)setMessage('检查已暂停；返回后可继续检查原请求。')}else{renderDiagnostic();updateCheck()}};document.addEventListener('visibilitychange',visibility);
  node.addEventListener('close',()=>{closed=true;stop();document.removeEventListener('visibilitychange',visibility);if(help?.node===node)help=null;if(restoring&&origin?.isConnected)origin.focus({preventScroll:true})},{once:true});help={node,account,change};change(tab);
 }
 function saveTour(complete=false){if(!tour||tour.account!==owner())return;state().tours[tour.id]={step:tour.index,complete:complete||state().tours[tour.id]?.complete===true};persist()}
 function endTour(restore=true,complete=false){
  const value=tour;if(!value)return;saveTour(complete);tour=null;value.resize?.disconnect();clearTimeout(value.wait);cancelAnimationFrame(value.frame);value.node.remove();root.removeEventListener('resize',value.position);root.visualViewport?.removeEventListener('resize',value.position);root.visualViewport?.removeEventListener('scroll',value.position);document.removeEventListener('scroll',value.position,true);
  if(restore&&value.account===owner()&&eligible()){showView(value.previousView,null,{route:'none',focus:false,scroll:false});requestAnimationFrame(()=>{scrollTo({top:value.scrollY,left:value.scrollX,behavior:'instant'});for(const [element,top,left] of value.scrolls)if(element.isConnected){element.scrollTop=top;element.scrollLeft=left}if(value.focus?.isConnected)value.focus.focus({preventScroll:true})})}
 }
 function startTour(id,focus=document.activeElement){
  if(!tours[id]||!eligible())return;if(busyEditor()){notify('请先处理当前编辑或弹窗，再开始教程。','info','教程',false);return}
  closeWelcome('seen');endTour();const node=document.createElement('div');node.className='learning-tour-layer';node.setAttribute('popover','manual');node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-labelledby','learning-tour-title');
  node.innerHTML='<div class="learning-tour-ring" aria-hidden="true"></div><section class="learning-tour-panel" tabindex="-1"><header><span data-tour-progress></span><button class="icon-btn" data-tour-close aria-label="退出教程">'+icon('x')+'</button></header><div class="learning-tour-copy"><h2 id="learning-tour-title"></h2><p data-tour-text></p><div class="learning-tour-example"><span>只读示例</span><p></p></div><p class="help-note" data-tour-unavailable hidden></p><p class="help-note" data-tour-storage hidden>本机进度暂不可保存；学习记录未被修改。</p></div><footer><button class="plain-btn" data-tour-skip>跳过</button><button class="plain-btn" data-tour-prev>上一步</button><button class="plain-btn primary-btn" data-tour-next>下一步</button></footer></section>';
  tour={id,node,index:state().tours[id]?.complete?0:state().tours[id]?.step||0,account:owner(),previousView:activeView,scrollY,scrollX,focus,scrolls:[...document.querySelectorAll('.scene-master,.settings-content,.folder-sidebar,.folder-content,.modal-body')].map(n=>[n,n.scrollTop,n.scrollLeft]),position:null,frame:null,wait:null};
  const current=tour,panel=node.querySelector('.learning-tour-panel'),ring=node.querySelector('.learning-tour-ring');
  function position(){if(tour!==current)return;cancelAnimationFrame(current.frame);current.frame=requestAnimationFrame(()=>{
   if(tour!==current)return;const viewport=root.visualViewport,left=viewport?.offsetLeft||0,top=viewport?.offsetTop||0,width=viewport?.width||innerWidth,height=viewport?.height||innerHeight,step=tours[id].steps[current.index],target=document.querySelector(step.target),r=visible(target)?target.getBoundingClientRect():null;
   const x=r?Math.max(left+8,r.left-5):left+width/2,y=r?Math.max(top+8,r.top-5):top+height/2,w=r?Math.max(0,Math.min(left+width-8,r.right+5)-x):0,h=r?Math.max(0,Math.min(top+height-8,r.bottom+5)-y):0;
   ring.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;ring.hidden=!r;
   panel.style.maxHeight=Math.max(120,height-24)+'px';panel.style.width=Math.min(372,width-24)+'px';const rect=panel.getBoundingClientRect();let px=Math.max(left+12,Math.min(left+width-rect.width-12,x)),py=r&&y+h+rect.height+16<top+height?y+h+12:r&&y-rect.height-12>top?y-rect.height-12:top+height-rect.height-16;
   if(width<600){px=left+12;py=top+height-rect.height-16;if(r&&y+h>py-8&&y>top+rect.height+20)py=top+12}
   panel.style.left=px+'px';panel.style.top=Math.max(top+12,py)+'px';node.classList.toggle('tour-missing-target',!r);
   const missing=node.querySelector('[data-tour-unavailable]');missing.hidden=Boolean(r);missing.textContent='此控件当前不可见或前置条件未满足。可先看说明或跳过；不会展开、填写或修改你的设置。';
  })}
  current.position=position;current.resize=new ResizeObserver(position);current.resize.observe(panel);
  function show(){if(tour!==current)return;if(current.account!==owner())return endTour(false);const step=tours[id].steps[current.index];showView(step.view,null,{route:'none',focus:false});node.querySelector('[data-tour-progress]').textContent=tours[id].title+' · '+(current.index+1)+' / '+tours[id].steps.length;node.querySelector('h2').textContent=step.title;node.querySelector('[data-tour-text]').textContent=step.text;node.querySelector('.learning-tour-example p').textContent=step.example;node.querySelector('[data-tour-prev]').disabled=current.index===0;node.querySelector('[data-tour-next]').textContent=current.index===tours[id].steps.length-1?'完成':'下一步';saveTour();node.querySelector('[data-tour-storage]').hidden=!storageFailed;requestAnimationFrame(()=>{if(tour!==current)return;const target=document.querySelector(step.target);if(visible(target))target.scrollIntoView({block:'center',behavior:'instant'});position();clearTimeout(current.wait);current.wait=setTimeout(position,250);panel.focus({preventScroll:true})})}
  node.querySelector('[data-tour-close]').onclick=()=>endTour();node.querySelector('[data-tour-skip]').onclick=()=>endTour();node.querySelector('[data-tour-prev]').onclick=()=>{if(current.index){current.index--;show()}};node.querySelector('[data-tour-next]').onclick=()=>{if(current.index===tours[id].steps.length-1)endTour(true,true);else{current.index++;show()}};
  let press=null;node.addEventListener('pointerdown',e=>{press=e.target===node&&e.button===0?{x:e.clientX,y:e.clientY}:null});node.addEventListener('click',e=>{if(e.target===node&&press&&Math.hypot(e.clientX-press.x,e.clientY-press.y)<=8)endTour()});node.addEventListener('pointercancel',()=>press=null);
  document.body.append(node);node.showPopover();root.addEventListener('resize',position);root.visualViewport?.addEventListener('resize',position);root.visualViewport?.addEventListener('scroll',position);document.addEventListener('scroll',position,true);show();
 }
 function handleKey(event){
  if(event.key==='Escape'&&tour){event.preventDefault();event.stopImmediatePropagation();endTour();return true}
  if(event.key==='Escape'&&welcome){event.preventDefault();event.stopImmediatePropagation();closeWelcome();return true}
  if(tour&&event.key==='Tab'){const buttons=[...tour.node.querySelectorAll('button:not(:disabled)')],at=buttons.indexOf(document.activeElement);event.preventDefault();buttons[(at+(event.shiftKey?-1:1)+buttons.length)%buttons.length].focus();return true}
  return false;
 }
 function authChanged(){if(tour&&(!eligible()||tour.account!==owner()))endTour(false);if(help&&help.account!==owner())help.node.close();if(welcome)welcome.remove();welcome=null;clearTimeout(promptTimer);if(eligible())promptTimer=setTimeout(offer,2500)}
 document.addEventListener('click',event=>{const button=event.target.closest('[data-help-open]');if(button){event.preventDefault();open(button.dataset.helpOpen||'about')}});
 root.addEventListener('lexi-auth-context',authChanged);root.addEventListener('pagehide',()=>{endTour(false);help?.node.close();closeWelcome();clearTimeout(promptTimer)});root.addEventListener('popstate',()=>endTour(false));
 root.addEventListener('storage',event=>{if(event.key===storageKey(owner())){memory.delete(owner());if(welcome&&state().welcome){welcome.remove();welcome=null}}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){endTour(false);closeWelcome()}});
 root.LearningHelp={open,startTour,endTour,handleKey,tourActive:()=>Boolean(tour)};
 Promise.resolve(root.appReady).then(()=>cloudInitPromise).then(authChanged).catch(()=>{});
})(globalThis);
