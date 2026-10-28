import * as scheduler from './memory-scheduler.js';
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const identity=value=>{if(typeof value!=='string'||!value||value.length>200)throw Error('记忆目标身份无效。');return value};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function context(scene,target,targetId){
 if(!scene||!target||target.id!==targetId||typeof scene.quote!=='string'||scene.quote.length>4000||typeof scene.translation!=='string'||scene.translation.length>4000||typeof target.phrase!=='string'||!target.phrase.trim()||target.phrase.length>200||typeof target.meaning!=='string'||!target.meaning.trim()||target.meaning.length>2000||!scene.quote.includes(target.phrase)||!Array.isArray(scene.media)||scene.media.length>6||scene.media.some(v=>!/^[a-f\d]{64}$/i.test(v.id||'')))throw Error('记忆目标需提供原句中的片段和语境释义。');
 return {scene:{quote:scene.quote,translation:scene.translation,media:scene.media.map(v=>({id:v.id}))},target:{id:target.id,phrase:target.phrase,meaning:target.meaning}};
}
export function createMemoryService(repository,{clock=()=>new Date().toISOString()}={}){
 return async function dispatch(account,action,args={}){
  if(!uuid.test(account)||!args||typeof args!=='object'||Array.isArray(args)||JSON.stringify(args).length>30000)throw Error('记忆请求格式无效。');
  if(action==='list')return repository(account,'list',{});
  const groupId=identity(args.groupId),targetId=identity(args.targetId),now=clock(),key={groupId,targetId};
  const record=await repository(account,'read',key),state=record?.state||null;
  if(action==='preview'){if(!state||state.deleted)throw new scheduler.MemoryConflict('记忆目标已移除。');return {state,options:scheduler.preview(state,args.fingerprint,now),curve:scheduler.memoryCurve(state,now),events:record.events||[]}}
  if(!['enroll','score','pause','resume','confirm','undo','remove'].includes(action)||!uuid.test(args.requestId||''))throw Error('记忆操作或请求身份无效。');
  const request={action,...Object.fromEntries(['groupId','targetId','requestId','expectedRevision','fingerprint','previousEventId','rating','at','eventId','timeZone'].filter(k=>Object.hasOwn(args,k)).map(k=>[k,args[k]]))};if(action==='enroll'||action==='confirm')Object.assign(request,context(args.scene,args.target,targetId));
  const receipt=await repository(account,'receipt',{requestId:args.requestId});
  if(receipt){if(!equal(receipt.request,request))throw new scheduler.MemoryConflict('同一请求包含不同内容。');return {...receipt.result,replayed:true}}
  let next,event=null;
  if(action==='enroll'){
   if(state&&!state.deleted)return {state,created:false};
   if(state?.deleted)throw new scheduler.MemoryConflict('此目标已被移除，请明确重新核对，不自动恢复旧评分。');
   const preference=await repository(account,'preferences',{}),timeZone=preference?.timeZone||args.timeZone;if(typeof timeZone!=='string'||!timeZone||timeZone.length>100)throw Error('学习时区无效。');
   next=scheduler.enroll({account,...key,fingerprint:await scheduler.contentFingerprint(request.scene,request.target),timeZone},now);
  }else{
   if(!state||state.deleted||state.revision!==args.expectedRevision)throw new scheduler.MemoryConflict('目标已有更新，请核对记录。');
   if(action==='score'){
    const at=args.at||now,stamp=Date.parse(at);if(!Number.isFinite(stamp)||stamp>Date.parse(now)+300000||state.card.reps===0&&stamp<Date.parse(state.card.due))throw Error('评分时间无效，请核对设备时间。');
    const result=scheduler.score(state,{...args,eventId:args.requestId},at);next=result.state;event=result.event;
   }else if(action==='undo'){
    const previous=(record.events||[]).find(v=>v.eventId===args.eventId);if(!previous||previous.undone)throw new scheduler.MemoryConflict('此评分不能撤销。');next=scheduler.undoScore(state,previous,args.expectedRevision);event={...previous,undone:true};
   }else if(action==='confirm'){
    next=scheduler.confirmContent(state,await scheduler.contentFingerprint(request.scene,request.target),args.expectedRevision);
   }else next={...state,paused:action==='pause'?true:action==='resume'?false:state.paused,deleted:action==='remove',revision:state.revision+1};
  }
  const result={state:next,...(event?{event}:{}),created:action==='enroll'};
  return repository(account,'commit',{...key,requestId:args.requestId,request,expectedRevision:state?.revision||0,expectedLastEventId:state?.lastEventId||null,result});
 };
}
