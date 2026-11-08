(function(root){
 'use strict';
 const storage='study:local:v1',algorithm='ts-fsrs@5.4.2/FSRS-6';let loading;
 const owner=()=>cloudUser?.id||'local',key=v=>v.groupId+'\0'+v.targetId,copy=v=>structuredClone(v);
 async function library(){
  if(root.FSRS){if(!/5\.4\.2.*FSRS-6/.test(FSRS.FSRSVersion||''))throw Error('记忆算法版本不一致，未继续评分。');return}
  if(!loading)loading=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/fsrs/index.umd.js';const timer=setTimeout(()=>fail(),20000),fail=()=>{clearTimeout(timer);loading=null;script.remove();reject(Error('记忆组件加载失败，请重试。'))};script.onload=()=>{clearTimeout(timer);resolve()};script.onerror=fail;document.head.append(script)});
  await loading;return library();
 }
 const engine=()=>MemoryAlgorithm.create(FSRS);
 const empty=()=>({version:1,algorithm,revision:0,timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',states:[],events:[]});
 async function read(account=owner()){const data=await LearningStore.read(account,storage);return data||empty()}
 async function mutate(account,run){
  if(account!==owner())throw Error('账号已切换，未更改记忆。');
  const result=await LearningStore.atomic(account,[storage],values=>{if(account!==owner())throw Error('账号已切换。');const data=copy(values.get(storage)||empty()),result=run(data);if(result?.then)throw Error('学习事务不能等待网络。');data.revision++;return {writes:[[storage,data]],result}});
  document.dispatchEvent(new CustomEvent('lexi-study-change',{detail:{owner:account}}));return result;
 }
 async function fingerprint(value){return MemoryClient.fingerprint(value.scene,value.target)}
 async function enroll(values,account=owner()){
  await library();if(!Array.isArray(values)||!values.length||values.length>100)throw Error('每次选择1至100个学习目标。');
  const prepared=await Promise.all(values.map(async v=>({groupId:v.groupId,targetId:v.targetId,fingerprint:await fingerprint(v)})));
  return mutate(account,data=>{let added=0;for(const value of prepared)if(!data.states.some(s=>key(s)===key(value))){data.states.push(engine().enroll({account,...value,timeZone:data.timeZone},new Date().toISOString()));added++}return added});
 }
 async function rate(state,rating,value,account=owner()){
  await library();const digest=await fingerprint(value),at=new Date().toISOString(),eventId=crypto.randomUUID();
  return mutate(account,data=>{const i=data.states.findIndex(v=>key(v)===key(state)),live=data.states[i];if(!live||digest!==live.fingerprint)throw Error('学习内容已变化，请重新确认。');const result=engine().score(live,{eventId,rating,expectedRevision:state.revision,previousEventId:state.lastEventId,fingerprint:digest},at);data.states[i]=result.state;data.events.push(result.event);return result});
 }
 async function undo(eventId,account=owner()){
  await library();return mutate(account,data=>{const event=data.events.find(v=>v.eventId===eventId);if(!event||event.undone)throw Error('此评分已撤销或不存在。');const i=data.states.findIndex(v=>key(v)===key(event)),state=data.states[i];if(!state)throw Error('目标已移除。');data.states[i]=engine().undoScore(state,event,event.revision);event.undone=true;return data.states[i]});
 }
 async function pause(state,paused,account=owner()){return mutate(account,data=>{const live=data.states.find(v=>key(v)===key(state));if(!live||live.revision!==state.revision)throw Error('目标已有变化，请刷新后重试。');live.paused=paused;live.revision++;return copy(live)})}
 async function confirm(state,value,account=owner()){await library();const digest=await fingerprint(value);return mutate(account,data=>{const i=data.states.findIndex(v=>key(v)===key(state));if(i<0)throw Error('目标不存在。');data.states[i]=engine().confirmContent(data.states[i],digest,state.revision);return data.states[i]})}
 function validState(s,account){
  return s&&s.account===account&&typeof s.groupId==='string'&&s.groupId.length<=200&&typeof s.targetId==='string'&&s.targetId.length<=200&&s.algorithm===algorithm&&/^[a-f\d]{64}$/.test(s.fingerprint)&&Number.isSafeInteger(s.revision)&&s.revision>0&&typeof s.paused==='boolean'&&s.card&&Number.isFinite(Date.parse(s.card.due))&&Number.isSafeInteger(s.card.reps)&&s.card.reps>=0&&['stability','difficulty','elapsed_days','scheduled_days','lapses','learning_steps','state'].every(k=>typeof s.card[k]==='number'&&Number.isFinite(s.card[k])&&s.card[k]>=0)&&(!s.card.last_review||Number.isFinite(Date.parse(s.card.last_review)));
 }
 async function restore(input,account=owner()){
  await library();if(input?.format!=='lexi-study'||input.version!==1||input.account!==account||input.algorithm!==algorithm||!Array.isArray(input.states)||input.states.length>20000||!Array.isArray(input.events)||input.events.length>100000||input.states.some(s=>!validState(s,account))||new Set(input.states.map(key)).size!==input.states.length)throw Error('学习备份格式、账号或算法不匹配，原记录未改动。');
  engine().learningDay(new Date().toISOString(),input.timeZone);
  const states=new Map(input.states.map(s=>[key(s),s]));
  if(input.events.some(e=>!states.has(key(e))||e.account!==account||e.algorithm!==algorithm||!Number.isFinite(Date.parse(e.at))||![1,2,3,4].includes(e.rating)||!/^[a-f\d-]{36}$/i.test(e.eventId||'')||!e.before||!e.after)||new Set(input.events.map(e=>e.eventId)).size!==input.events.length)throw Error('评分记录格式不正确。');
  return mutate(account,data=>{const accepted=new Set();let conflicts=0;for(const s of input.states){const live=data.states.find(v=>key(v)===key(s));if(!live){data.states.push(copy(s));accepted.add(key(s))}else if(JSON.stringify(live)!==JSON.stringify(s))conflicts++}for(const e of input.events)if(accepted.has(key(e))&&!data.events.some(v=>v.eventId===e.eventId))data.events.push(copy(e));if(data.states.length===input.states.length&&accepted.size===input.states.length)data.timeZone=input.timeZone;return {added:accepted.size,conflicts}});
 }
 root.StudyLedger=Object.freeze({library,engine,read,enroll,rate,undo,pause,confirm,fingerprint,key,restore,algorithm});
})(globalThis);
