(function(root){
'use strict';
function create({fsrs,createEmptyCard}){

// Explicit FSRS-6 weights from ts-fsrs 5.4.2; do not inherit evolving library defaults.
const MEMORY_ALGORITHM='ts-fsrs@5.4.2/FSRS-6';
const MEMORY_PARAMETERS=Object.freeze({request_retention:.9,maximum_interval:36500,enable_fuzz:false,enable_short_term:true,learning_steps:Object.freeze(['1m','10m']),relearning_steps:Object.freeze(['10m']),w:Object.freeze([.212,1.2931,2.3065,8.2956,6.4133,.8334,3.0194,.001,1.8722,.1666,.796,1.4835,.0614,.2629,1.6483,.6014,1.8729,.5425,.0912,.0658,.1542])});
const engine=fsrs(MEMORY_PARAMETERS),uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
const copy=value=>JSON.parse(JSON.stringify(value));
class MemoryConflict extends Error{constructor(message){super(message);this.name='MemoryConflict';this.status=409}}
function time(value){const result=new Date(value);if(!Number.isFinite(result.getTime()))throw Error('Invalid review time');return result}
function identity(value){if(typeof value!=='string'||!value||value.length>200)throw Error('Invalid memory identity');return value}

function learningDay(now,zone){
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}),parts=Object.fromEntries(formatter.formatToParts(time(now)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));return parts.year+'-'+parts.month+'-'+parts.day;
}
function enroll({account,groupId,targetId,fingerprint,timeZone},now){
 if(!/^[a-f\d]{64}$/.test(fingerprint))throw Error('Invalid content fingerprint');learningDay(now,timeZone);
 return {account:identity(account),groupId:identity(groupId),targetId:identity(targetId),fingerprint,timeZone,algorithm:MEMORY_ALGORITHM,revision:1,paused:false,card:copy(createEmptyCard(time(now))),lastEventId:null};
}
function ready(state,fingerprint){
 if(state.algorithm!==MEMORY_ALGORITHM)throw new MemoryConflict('调度版本不同，请重新核对。');
 if(state.paused)throw new MemoryConflict('此学习目标已暂停。');
 if(fingerprint!==state.fingerprint)throw new MemoryConflict('内容已变化，请确认后继续记忆；历史保留。');
}
function preview(state,fingerprint,now){ready(state,fingerprint);return [1,2,3,4].map(rating=>({rating,...copy(engine.next(state.card,time(now),rating))}))}
function score(state,input,now,existingEvent=null){
 if(!uuid.test(input.eventId||'')||![1,2,3,4].includes(input.rating)||!Number.isSafeInteger(input.expectedRevision))throw Error('Invalid rating event');
 if(existingEvent){if(existingEvent.eventId!==input.eventId||existingEvent.account!==state.account||existingEvent.groupId!==state.groupId||existingEvent.targetId!==state.targetId||existingEvent.rating!==input.rating||existingEvent.expectedRevision!==input.expectedRevision||existingEvent.previousEventId!==(input.previousEventId||null)||existingEvent.fingerprint!==input.fingerprint)throw new MemoryConflict('同一评分请求包含不同内容。');return {replayed:true,event:copy(existingEvent),state:copy(state)}}
 ready(state,input.fingerprint);if(state.revision!==input.expectedRevision||state.lastEventId!==(input.previousEventId||null))throw new MemoryConflict('另一端已有评分，请核对双方记录。');
 if(state.card.last_review&&time(now)<time(state.card.last_review))throw new MemoryConflict('评分时间早于上次记录，请核对设备时间。');
 const result=copy(engine.next(state.card,time(now),input.rating)),after={...copy(state),card:result.card,revision:state.revision+1,lastEventId:input.eventId};
 const event={eventId:input.eventId,account:state.account,groupId:state.groupId,targetId:state.targetId,rating:input.rating,expectedRevision:state.revision,revision:after.revision,fingerprint:state.fingerprint,previousEventId:state.lastEventId,at:time(now).toISOString(),learningDay:learningDay(now,state.timeZone),algorithm:MEMORY_ALGORITHM,before:copy(state.card),after:result.card,log:result.log};
 return {replayed:false,event,state:after};
}
function undoScore(state,event,expectedRevision){
 if(state.account!==event.account||state.groupId!==event.groupId||state.targetId!==event.targetId||state.fingerprint!==event.fingerprint||state.revision!==expectedRevision||state.lastEventId!==event.eventId||state.revision!==event.revision||state.paused)throw new MemoryConflict('评分后已有变化，未撤销以免覆盖。');
 return {...copy(state),card:copy(event.before),revision:state.revision+1,lastEventId:event.previousEventId};
}
function confirmContent(state,fingerprint,expectedRevision){if(state.revision!==expectedRevision||!/^[a-f\d]{64}$/.test(fingerprint))throw new MemoryConflict('目标已有变化，请重新核对。');return {...copy(state),fingerprint,paused:false,revision:state.revision+1}}
function memoryCurve(state,now){if(!state.card.last_review)return [];const base=Math.max(time(now).getTime(),time(state.card.last_review).getTime());return [0,1,3,7,14,30,60,90].map(days=>{const at=new Date(base+days*86400000);return {at:at.toISOString(),estimatedRecall:engine.get_retrievability(state.card,at,false)}})}
function reviewQueue(states,events,{account,now,timeZone,newLimit=10,selected=null,mode='due'}={}){
 if(!['due','new','selected'].includes(mode)||!Number.isSafeInteger(newLimit)||newLimit<0||newLimit>10)throw Error('Invalid review scope');const day=learningDay(now,timeZone),seen=new Set(events.filter(e=>e.account===account&&!e.undone&&!e.archived&&e.before?.reps===0&&learningDay(e.at,timeZone)===day).map(e=>e.groupId+'\0'+e.targetId)),allowed=Math.max(0,newLimit-seen.size),keys=selected?new Set(selected):null;
 const live=states.filter(s=>s.account===account&&!s.paused&&!s.deleted&&(!keys||keys.has(s.groupId+'\0'+s.targetId))),due=live.filter(s=>s.card.reps>0&&time(s.card.due)<=time(now)).sort((a,b)=>time(a.card.due)-time(b.card.due)),fresh=live.filter(s=>s.card.reps===0).sort((a,b)=>(a.groupId+'\0'+a.targetId).localeCompare(b.groupId+'\0'+b.targetId)).slice(0,allowed);
 return mode==='new'?fresh:mode==='selected'?live.filter(s=>s.card.reps>0).sort((a,b)=>time(a.card.due)-time(b.card.due)).concat(fresh):due.concat(fresh);
}
return Object.freeze({MEMORY_ALGORITHM,MEMORY_PARAMETERS,MemoryConflict,learningDay,enroll,preview,score,undoScore,confirmContent,memoryCurve,reviewQueue});
}
root.MemoryAlgorithm=Object.freeze({create});
})(globalThis);
