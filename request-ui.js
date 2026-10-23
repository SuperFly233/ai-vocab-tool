(function(root){
  let state=null,timer=null;
  const titles={prepare:'准备请求',request:'已发送 · 等待云端响应',headers:'已连接模型 · 等待首字',thinking:'模型思考中',first:'开始接收正文',buffered:'收到完整响应（非流式）',validate:'校验与保存',retry:'等待重试',complete:'已完成',error:'未完成'};
  const host=document.createElement('details');host.className='request-timing';host.hidden=true;host.setAttribute('aria-label','生成阶段与耗时');document.querySelector('.result-toolbar').after(host);
  function render(){
    if(!state)return;const now=state.end||performance.now(),total=(now-state.start)/1000;
    const title=key=>key==='request'&&state.route==='browser'?'已发送 · 浏览器直连':titles[key];
    const first=state.events.find(event=>event.key==='first'),current=state.events.at(-1);
    host.querySelector('summary').textContent=`${title(current.key)} · ${total.toFixed(1)}s${first?` · 首字 ${((first.time-state.start)/1000).toFixed(1)}s`:''}`;
    const list=host.querySelector('ol');list.replaceChildren();
    state.events.forEach((event,index)=>{const row=document.createElement('li');row.textContent=`${title(event.key)} · +${((event.time-state.start)/1000).toFixed(1)}s${index===state.events.length-1&&!state.end?` · 已等待 ${((now-event.time)/1000).toFixed(1)}s`:''}`;list.append(row)});
  }
  root.RequestUI={
    route(mode){if(state){state.route=mode;render()}},
    start(){clearInterval(timer);state={start:performance.now(),events:[],end:null};host.innerHTML='<summary></summary><ol></ol>';host.hidden=false;host.open=true;this.mark('prepare');timer=setInterval(render,250)},
    mark(key){if(!state||state.end||!titles[key]||state.events.at(-1)?.key===key||key==='first'&&state.events.some(event=>event.key==='first'))return;state.events.push({key,time:performance.now()});render()},
    finish(ok){if(!state)return;this.mark(ok?'complete':'error');state.end=performance.now();clearInterval(timer);host.open=!ok;render()},
    snapshot(){return state?{...state,events:state.events.map(event=>({...event}))}:null},
  };
  const dot=document.createElement('button');dot.className='network-indicator';dot.type='button';dot.setAttribute('aria-label','网络状态');dot.dataset.state='checking';dot.dataset.tip='正在检测站点连接';dot.innerHTML='<span class="network-light" aria-hidden="true"></span>';
  const account=document.getElementById('account-toggle'),wrap=document.createElement('div');wrap.className='account-status-wrap';account.before(wrap);wrap.append(account,dot);
  const panel=document.createElement('div');panel.className='network-status-panel';panel.setAttribute('popover','auto');document.body.append(panel);
  let reachable=null,lastCheck=0,busy=false,cloudMessage='',cloudBad=false;
  function paint(){
    const offline=!navigator.onLine,status=offline?'offline':reachable===null?'checking':!reachable?'bad':cloudBad?'warn':'good';
    const text={offline:'设备离线',checking:'正在检测站点连接',bad:'暂时无法连接站点',warn:'站点可达，云同步需要处理',good:'站点可达'}[status];
    dot.dataset.state=status;dot.dataset.tip=text;dot.setAttribute('aria-label',text);
    panel.replaceChildren();const heading=document.createElement('strong');heading.textContent=text;panel.append(heading);
    const time=document.createElement('p');time.textContent=lastCheck?`上次检测 ${new Date(lastCheck).toLocaleTimeString()}`:'尚未检测';panel.append(time);
    if(cloudMessage){const info=document.createElement('p');info.textContent=cloudMessage;panel.append(info)}
    const retry=document.createElement('button');retry.className='plain-btn';retry.textContent='重新检测';retry.disabled=busy;retry.onclick=check;panel.append(retry);
  }
  async function check(){
    if(busy)return;if(!navigator.onLine){reachable=false;paint();return}busy=true;paint();
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
    try{const response=await fetch('/favicon.svg?connection-check',{method:'HEAD',cache:'no-store',credentials:'omit',signal:controller.signal});reachable=response.ok}
    catch{reachable=false}finally{clearTimeout(timeout);busy=false;lastCheck=Date.now();paint()}
  }
  dot.onclick=()=>{paint();panel.showPopover();const rect=account.getBoundingClientRect();panel.style.left=`${Math.max(12,Math.min(innerWidth-panel.offsetWidth-12,rect.right-panel.offsetWidth))}px`;panel.style.top=`${Math.min(innerHeight-panel.offsetHeight-12,rect.bottom+10)}px`};
  root.NetworkUI={cloudStatus(message,type){cloudMessage=message;cloudBad=type==='bad';paint()},check};
  addEventListener('online',check);addEventListener('offline',paint);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
  setInterval(()=>{if(!document.hidden)check()},60000);check();
})(globalThis);
