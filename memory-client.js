(function(root){
 'use strict';
 const equal=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
 const owner=()=>cloudUser?.id||'local';
 const engine=()=>MemoryAlgorithm.create(FSRS);
 async function fingerprint(scene,target){const value={quote:scene.quote||'',translation:scene.translation||'',media:(scene.media||[]).map(v=>v.id),target:{id:target.id,phrase:target.phrase||'',meaning:target.meaning||''}},bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return [...new Uint8Array(bytes)].map(v=>v.toString(16).padStart(2,'0')).join('')}
 async function request(account,action,args={}){
  if(owner()!==account||!cloudUser)throw Error('账号已切换或未登录，未发送记忆请求。');const token=await cloudAccessToken();if(owner()!==account)throw Error('账号已切换。');
  const response=await fetch('/api/memory',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({action,args}),signal:AbortSignal.timeout(20000)}),data=await ApiResponse.read(response,'记忆');if(owner()!==account)throw Error('账号已切换，旧响应未采用。');if(!response.ok)throw Object.assign(Error(data.error||'记忆请求未完成。'),{status:response.status});return data.data;
 }
 const syncing=new Map();
 async function sync(account){if(syncing.has(account))return syncing.get(account);const task=run(account).finally(()=>syncing.delete(account));syncing.set(account,task);return task}
 async function run(account){
  const pending=await MemoryJournal.pending(account);let acknowledged=0;
  for(const row of pending){if(row.status==='conflict')continue;const event=row.event;if(owner()!==account)throw Error('账号已切换。');
   try{const result=await request(account,'score',{groupId:event.groupId,targetId:event.targetId,requestId:event.eventId,rating:event.rating,expectedRevision:event.expectedRevision,previousEventId:event.previousEventId,fingerprint:event.fingerprint,at:event.at});
    if(!result.event||!equal(result.event.after,event.after)||!equal(result.event.before,event.before)||result.event.revision!==event.revision||result.state.fingerprint!==event.fingerprint){await MemoryJournal.markConflict(account,event.eventId,result);continue}
    await MemoryJournal.acknowledge(account,event.eventId,{...result.event});acknowledged++;
   }catch(error){if(error.status!==409)throw error;let remote=null;try{remote=await request(account,'preview',{groupId:event.groupId,targetId:event.targetId,fingerprint:event.fingerprint})}catch{}await MemoryJournal.markConflict(account,event.eventId,{message:error.message,...(remote?{remote}:{})})}
  }
  return {acknowledged,pending:await MemoryJournal.pending(account)};
 }
 async function load(account){const snapshot=await request(account,'list');if(!Array.isArray(snapshot.states)||!Array.isArray(snapshot.events))throw Error('远端记忆记录格式不正确。');for(const state of snapshot.states)await MemoryJournal.receive(account,state);await LearningStore.write(account,'memory:remote-snapshot',snapshot);return snapshot}
 async function local(account){const states=(await LearningStore.scan(account,'memory:state:')).map(v=>v.value),records=(await LearningStore.scan(account,'memory:event:')).map(v=>v.value),snapshot=await LearningStore.read(account,'memory:remote-snapshot');const merged=new Map((snapshot?.events||[]).map(v=>[v.eventId,v]));for(const row of records)if(row.status==='resolved')merged.set('local:'+row.event.eventId,{...row.event,archived:true});else if(row.status!=='synced'||!merged.has(row.event.eventId))merged.set(row.event.eventId,row.event);return {states,events:[...merged.values()],timeZone:snapshot?.timeZone||states[0]?.timeZone,pending:await MemoryJournal.pending(account)}}
 async function rate(account,state,rating){if(owner()!==account)throw Error('账号已切换。');const {pending}=await local(account);if(pending.some(v=>v.status==='conflict'&&v.event.groupId===state.groupId&&v.event.targetId===state.targetId))throw Error('此目标有待核对冲突，未继续评分。');const at=new Date().toISOString(),result=engine().score(state,{eventId:crypto.randomUUID(),rating,expectedRevision:state.revision,previousEventId:state.lastEventId,fingerprint:state.fingerprint},at);await MemoryJournal.append(account,result.state,result.event);return result}
 async function resolveRemote(account,groupId,targetId){const snapshot=await request(account,'list'),remote=snapshot.states.find(v=>v.groupId===groupId&&v.targetId===targetId);if(!remote)throw Error('远端状态不存在，未移除本机记录。');const old=await LearningStore.read(account,MemoryJournal.targetKey(groupId,targetId));if(owner()!==account)throw Error('账号已切换。');return MemoryJournal.resolveRemote(account,remote,old?.revision)}
 root.MemoryClient=Object.freeze({fingerprint,engine,request,sync,load,local,rate,resolveRemote});
})(globalThis);
