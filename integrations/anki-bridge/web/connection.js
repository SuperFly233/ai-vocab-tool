(()=>{
 const hash=new URLSearchParams(location.hash.slice(1)).get('token');if(hash)sessionStorage.setItem('bridge-ui-token',hash);const token=hash||sessionStorage.getItem('bridge-ui-token')||'';history.replaceState(null,'',location.pathname);
 const $=id=>document.getElementById(id),form=$('config');let busy=false;
 document.querySelectorAll('[data-icon]').forEach(node=>node.innerHTML=`<i data-lucide="${node.dataset.icon}"></i>`);
 async function api(action,body={}){const r=await fetch('/api/'+action,{method:'POST',headers:{'Content-Type':'application/json','X-Bridge-Token':token},body:JSON.stringify(body)}),data=await r.json();if(!r.ok)throw Error(data.error||'连接未完成');return data}
 async function run(fn){if(busy)return;busy=true;$('status').textContent='';document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn()}catch(e){$('status').textContent=e.message}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=false)}}
 async function status(fill=false){const data=await api('status');$('bridge-version').textContent='Bridge '+data.version;$('login-view').hidden=true;$('workspace').hidden=false;$('logout').hidden=false;$('device-name').textContent=data.config.name;$('worker-state').textContent=data.paused?'已暂停领取新任务；已领取任务继续处理':data.workerError||'等待网页任务';$('pause-worker').dataset.paused=String(data.paused);$('pause-worker').textContent=data.paused?'恢复接单':'暂停接单';if(fill)for(const key of ['name','port','deck'])form.elements[key].value=data.config[key]}
 async function diagnostics(){const data=await api('diagnostics'),host=$('bridge-diagnostics');host.replaceChildren();for(const [key,label] of [['cloud','云任务'],['anki','Anki'],['fushi','Fushi'],['dictionary','本机词典']]){const value=data[key]||{ok:false,message:'尚未返回状态'},row=document.createElement('div');row.className='connection-state';row.dataset.ok=String(value.ok);const title=document.createElement('strong'),detail=document.createElement('span');title.textContent=label;detail.textContent=value.ok?(key==='anki'?value.detail?.profile||'可用':'可用'):value.message;row.append(title,detail);host.append(row)}}
 async function save(){const body=Object.fromEntries(new FormData(form));body.port=Number(body.port);try{await api('config',body)}finally{form.elements.key.value='';delete body.key}}
 $('login').onsubmit=e=>{e.preventDefault();run(async()=>{try{await api('login',{email:e.target.elements.email.value,password:e.target.elements.password.value});await status(true);await diagnostics()}finally{e.target.elements.password.value=''}})};
 $('logout').onclick=()=>run(async()=>{await api('logout');$('workspace').hidden=true;$('login-view').hidden=false;$('logout').hidden=true;form.elements.key.value='';$('bridge-diagnostics').replaceChildren()});
 form.onsubmit=e=>{e.preventDefault();run(async()=>{await save();await diagnostics();await status()})};
 $('diagnostics').onclick=()=>run(diagnostics);
 $('register').onclick=()=>run(async()=>{await save();await api('register');$('status').textContent='电脑已登记';await diagnostics()});
 $('detect-anki').onclick=()=>run(async()=>{if(!confirm('读取本机 AnkiConnect 的端口与密钥？密钥只保存在系统凭据库，不上传云端。'))return;const value=await api('detect-anki',{confirmed:true});form.elements.port.value=value.port;await diagnostics()});
 $('shutdown').onclick=()=>run(async()=>{await api('shutdown');document.body.textContent='Lexi 连接助手已退出'});
 $('pause-worker').onclick=()=>run(async()=>{await api('pause',{paused:$('pause-worker').dataset.paused!=='true'});await status()});
 $('export-diagnostics').onclick=()=>run(async()=>{const value=await api('diagnostics-export'),url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='Lexi-connection-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 fetch('/api/info').then(r=>r.json()).then(v=>$('bridge-version').textContent='Bridge '+v.version).catch(()=>$('bridge-version').textContent='版本信息暂不可用');
 run(async()=>{await status(true);await diagnostics()});setInterval(()=>{if(!document.hidden&&!busy&&!$('workspace').hidden)run(()=>status())},10000);
})();
