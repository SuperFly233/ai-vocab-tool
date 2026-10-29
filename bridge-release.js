(function(root){
 'use strict';
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const steps=[
  '暂停接收新任务；完成已领取批次，或在网页明确取消剩余项。取消不会删除已写入卡片。',
  '从托盘正常退出旧助手。下载完整 ZIP，解压到一个新目录，不覆盖正在运行的文件。',
  '保留 _internal 文件夹，运行 LexiConnect.exe。无需安装 Python，默认不开机自启，也不自动打开浏览器。',
  '在托盘打开连接设置，核对实际版本，独立登录同一 Lexi 账号并登记电脑。原设备配置和系统凭据继续保留。',
  'Bridge 0.4.2及以后默认停止云端接单。需要录入时点“开始连接（10分钟）”，用完点“停止连接”；已领取批次安全完成。',
  '打开 Anki，检查连接及目标配置；首次在“Lexi 验收”牌库测试。返回 Lexi 网页预览，确认后才写入。'
 ];
 function validate(value){
  if(!value||value.schema!==1||!/^\d+\.\d+\.\d+$/.test(value.version)||value.platform!=='windows-x64'||value.entrypoint!=='LexiConnect.exe'||!Number.isSafeInteger(value.size)||value.size<1||value.size>300000000||!/^[a-f0-9]{64}$/.test(value.sha256)||JSON.stringify(value.payloadVersions)!=='[1,2,3,4]')throw Error('发布清单校验失败，未提供未经验证的下载。');
  const url=new URL(value.url);
  if(url.origin!=='https://github.com'||url.search||url.hash||url.username||url.password||!new RegExp('^/SuperFly233/ai-vocab-tool/releases/download/v[0-9.]+/LexiAnkiBridge-'+value.version.replaceAll('.','\\.')+'-Windows-portable\\.zip$').test(url.pathname)||!/^https:\/\/github\.com\/SuperFly233\/ai-vocab-tool\/releases\/tag\/v[0-9.]+$/.test(value.releaseUrl))throw Error('发布地址不在官方仓库。');
  return value;
 }
 async function load(){const r=await fetch('/bridge-release.json',{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(5000)});if(!r.ok||Number(r.headers.get('content-length')||0)>32768)throw Error('暂时无法读取发布清单，请稍后重试。');const text=await r.text();if(text.length>32768)throw Error('发布清单超限。');return validate(JSON.parse(text))}
 function comparison(installed,latest){
  if(!/^\d+\.\d+\.\d+$/.test(installed||''))return '尚未取得本机版本';
  const a=installed.split('.').map(Number),b=latest.split('.').map(Number);
  for(let n=0;n<3;n++)if(a[n]!==b[n])return a[n]<b[n]?'可更新':'本机版本高于正式发布，请核对来源';
  return '已是最新版，无需重新安装';
 }
 function guide(value,installed=''){
  validate(value);
  return `<section class="bridge-update-guide"><h3>Windows 连接助手</h3><p>最新正式版 ${esc(value.version)}${installed?` · 本机 ${esc(installed)} · ${esc(comparison(installed,value.version))}`:' · 本机版本以所选电脑实际登记为准'}</p><p><a class="plain-btn" href="${esc(value.url)}" target="_blank" rel="noopener noreferrer">下载便携 ZIP · ${(value.size/1048576).toFixed(1)} MB</a> <a href="${esc(value.releaseUrl)}" target="_blank" rel="noopener noreferrer">正式发布记录</a></p><details><summary>更新与首次连接</summary><ol>${steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p>用户数据：%LOCALAPPDATA%\\LexiAnkiBridge；密码和密钥不在 ZIP 内。手机和 Mac 可提交任务，执行需要 Windows 助手在线。</p><p>SHA256</p><code class="bridge-checksum">${esc(value.sha256)}</code><p>写入 Anki、云端回执与 Anki 自身同步是三个不同状态。</p></details></section>`;
 }
 function diagnosticsHTML(data,now=Date.now()){
  const checked=Date.parse(data?.checkedAt||''),fresh=Number.isFinite(checked)&&now>=checked-30000&&now-checked<=120000;
  const names=[['cloud','云任务',true],['anki','Anki',true],['fushi','Fushi',false],['dictionary','本机词典',false]];
  const failure=(key,row)=>{const message=String(row?.message||'');if(key==='anki')return /认证|unauthorized|invalid api key/i.test(message)?'AnkiConnect 认证失败：在连接设置核对本地密钥':/兼容|API v6|格式异常/.test(message)?'接口不兼容：核对 AnkiConnect API v6 与所填端口':/超时/.test(message)?'Anki 响应超时：先核对任务回执，不要重复提交':'Anki 未连接：打开 Anki 并核对端口；尚不能区分未启动与端口错误';if(key==='cloud')return /登录|凭据|账号/.test(message)?'登录已失效或尚未登录：在电脑连接设置重新登录同一账号':/启用|503/.test(message)?'云任务未启用：稍后重试或查看任务服务状态':'云任务不可达：检查电脑网络、账号与设备登记';return key==='dictionary'?'可稍后启用词典，不影响普通制卡':'可稍后打开 Fushi，不影响普通制卡'};
  return `<p>${esc(data?.deviceName||'电脑诊断')} · ${Number.isFinite(checked)?esc(new Date(checked).toLocaleString()):'检查时间未知'} · ${fresh?'本次检查':'需重新检查'}</p>`+names.map(([key,label,required])=>{const row=data?.[key],ok=fresh&&row?.ok===true;return `<section class="connection-state" data-ok="${ok}"><strong>${label}<small> · ${required?'基础制卡必需':'可选'}</small></strong><span>${!fresh?'诊断已过期，请重新检查':ok?(key==='anki'?esc(row.detail?.profile||'可用'):key==='dictionary'?esc(row.names?.join('、')||'可用'):'可用'):failure(key,row)}</span></section>`}).join('');
 }
 root.BridgeRelease={validate,load,comparison,guide,diagnosticsHTML,steps};
 if(typeof module!=='undefined')module.exports=root.BridgeRelease;
})(globalThis);
