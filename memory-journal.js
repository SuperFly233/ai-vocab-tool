(function(root){
 'use strict';
 const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
 const targetKey=(group,target)=>{if(typeof group!=='string'||!group||group.length>200||typeof target!=='string'||!target||target.length>200)throw Error('记忆目标身份无效。');return 'memory:state:'+encodeURIComponent(group)+':'+encodeURIComponent(target)};
 const eventKey=id=>{if(!uuid.test(id||''))throw Error('评分事件标识无效。');return 'memory:event:'+id};
 const conflict=()=>Error('记忆目标已有更新，请核对记录；本地评分保留。');
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 async function enroll(account,state){
  if(state.account!==account||state.revision!==1||state.card?.reps!==0||state.lastEventId!==null||state.algorithm!=='ts-fsrs@5.4.2/FSRS-6'||!/^[a-f\d]{64}$/.test(state.fingerprint))throw Error('加入记忆的状态无效。');
  const key=targetKey(state.groupId,state.targetId);return LearningStore.atomic(account,[key],values=>{const existing=values.get(key);return existing?{writes:[],result:{created:false,state:existing}}:{writes:[[key,state]],result:{created:true,state}}});
 }
 async function append(account,state,event){
  const key=targetKey(state.groupId,state.targetId),receipt=eventKey(event.eventId),outbox='memory:outbox';
  if(state.account!==account||event.account!==account||event.groupId!==state.groupId||event.targetId!==state.targetId||!Number.isSafeInteger(event.expectedRevision)||event.expectedRevision<1||state.revision!==event.revision||state.revision!==event.expectedRevision+1||state.lastEventId!==event.eventId||state.fingerprint!==event.fingerprint||state.algorithm!==event.algorithm||!equal(state.card,event.after)||![1,2,3,4].includes(event.rating))throw Error('评分状态和事件不一致。');
  return LearningStore.atomic(account,[key,receipt,outbox],values=>{
   const old=values.get(key),stored=values.get(receipt);
   if(stored){if(!equal(stored.event,event))throw conflict();return {writes:[],result:{replayed:true,state:old}}}
   if(!old||old.paused||old.algorithm!==state.algorithm||old.revision!==event.expectedRevision||old.fingerprint!==event.fingerprint||old.lastEventId!==event.previousEventId||!equal(old.card,event.before))throw conflict();
   const pending=values.get(outbox)||[];if(!Array.isArray(pending)||pending.length>=10000)throw Error('待同步评分过多，请先同步或导出；本次评分未保存。');
   return {writes:[[key,state],[receipt,{event,status:'pending',remote:null}],[outbox,[...pending,event.eventId]]],result:{replayed:false,state}};
  });
 }
 async function pending(account){const ids=await LearningStore.read(account,'memory:outbox')||[];if(!Array.isArray(ids))throw Error('待同步评分索引无效，原记录保留。');const rows=await Promise.all(ids.map(id=>LearningStore.read(account,eventKey(id))));if(rows.some(row=>!row))throw Error('部分评分记录缺失，请导出并核对，不自动忽略。');return rows}
 async function acknowledge(account,eventId,remote){
  const receipt=eventKey(eventId),outbox='memory:outbox';return LearningStore.atomic(account,[receipt,outbox],values=>{
   const row=values.get(receipt);if(!row||row.event.account!==account||!remote||remote.account!==account||remote.groupId!==row.event.groupId||remote.targetId!==row.event.targetId||remote.eventId!==eventId||remote.fingerprint!==row.event.fingerprint||remote.revision!==row.event.revision)throw conflict();
   if(row.status==='conflict')throw conflict();
   return {writes:[[receipt,{...row,status:'synced',remote}],[outbox,(values.get(outbox)||[]).filter(id=>id!==eventId)]],result:true};
  });
 }
 async function markConflict(account,eventId,remote){const receipt=eventKey(eventId);return LearningStore.atomic(account,[receipt],values=>{const row=values.get(receipt);if(!row||row.event.account!==account)throw conflict();return {writes:[[receipt,{...row,status:'conflict',remote}]],result:true}})}
 root.MemoryJournal=Object.freeze({targetKey,eventKey,enroll,append,pending,acknowledge,markConflict});
})(globalThis);
