await import('../lookup-tasks.js');

const {normalizeSnapshot,recoverRequests,requestSignature,resolveCompletion}=globalThis.LookupTasks||{};
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};

expect(typeof recoverRequests==='function','LookupTasks production module did not load');
const sceneRequest={query:'skewer',sceneGroupId:'scene-test',userNote:'侧重口语',note:'侧重口语\n场景原句：Private synthetic quote'};
expect(LookupTasks.editorNote(LookupTasks.normalizeRequest(sceneRequest))==='侧重口语','Scene editor must receive only explicit user focus, including after task serialization');
expect(LookupTasks.editorNote({query:'legacy',sceneGroupId:'old',note:'场景原句：legacy'})==='','Legacy model-only scene context must not enter the editor');
expect(LookupTasks.editorNote({query:'plain',note:'Keep my explicit focus'})==='Keep my explicit focus','Ordinary user-authored requirements must remain intact');
expect(requestSignature(sceneRequest)===requestSignature({...sceneRequest,userNote:'display-only'}),'Editor-only focus field must not change model-request identity');
const legacyBatch=recoverRequests({queue:[{query:'legacy phrase',batchId:'v28-batch',queuedAt:'2026-10-21T00:00:00.000Z'}]},[]);
expect(legacyBatch.length===1&&legacyBatch[0].batchId==='v28-batch','Removing the batch page must not discard old queued requests');

const interrupted={
  active:{query:'alpha',direction:'en-zh',startedAt:'2026-07-26T01:00:00.000Z'},
  queue:[{query:'beta',queuedAt:'2026-07-26T01:00:01.000Z'}],
};
const recovered=recoverRequests(interrupted,[]);
expect(recovered.map(item=>item.query).join(',')==='alpha,beta','Interrupted active work must resume before queued work');

const alreadySaved=recoverRequests(interrupted,[{
  query:' Alpha ',
  lookupSignature:requestSignature(interrupted.active),
  lookupCompletedAt:'2026-07-26T01:00:02.000Z',
  createdAt:'2026-07-26T00:00:00.000Z',
  updatedAt:'2026-07-26T01:00:02.000Z',
}]);
expect(alreadySaved.map(item=>item.query).join(',')==='beta','A completed active request must not run again after reload');

const savedAfterLocalHydration=recoverRequests({queue:recovered},[{
  query:'alpha',
  lookupSignature:requestSignature(interrupted.active),
  lookupCompletedAt:'2026-07-26T01:00:03.000Z',
  updatedAt:'2026-07-26T01:00:03.000Z',
}]);
expect(savedAfterLocalHydration.map(item=>item.query).join(',')==='beta','Cloud sync completion must remove a recovered active request before resume');

const beforeStart=recoverRequests(interrupted,[{
  query:'alpha',
  createdAt:'2026-07-25T00:00:00.000Z',
  updatedAt:'2026-07-26T00:59:59.000Z',
}]);
expect(beforeStart[0]?.query==='alpha','An older history version must not suppress interrupted regeneration');

const directedRequest={query:'alpha',direction:'ja-zh',startedAt:'2026-07-26T01:00:00.000Z'};
const exactDirectedSignature=requestSignature(directedRequest);
expect(recoverRequests({active:directedRequest},[{
  query:'alpha',
  lookupSignature:exactDirectedSignature,
  lookupCompletedAt:'2026-07-26T01:00:02.000Z',
}]).length===0,'An exact completed request signature must suppress crash recovery');
expect(recoverRequests({active:directedRequest},[{
  query:'alpha',
  lookupSignature:requestSignature({...directedRequest,direction:'en-zh'}),
  lookupCompletedAt:'2026-07-26T01:00:02.000Z',
}])[0]?.direction==='ja-zh','A newer same-query result with a different direction must not swallow recovery');
expect(recoverRequests({active:directedRequest},[{
  query:'alpha',
  lookupSignature:exactDirectedSignature,
  lookupCompletedAt:'2026-07-26T00:59:59.000Z',
  updatedAt:'2026-07-26T01:00:02.000Z',
}])[0]?.direction==='ja-zh','A later metadata edit must not make an older completion suppress a newer interrupted request');

const folderRequest={query:'alpha',folderIds:['folder-a'],startedAt:'2026-07-26T01:00:00.000Z'};
expect(recoverRequests({active:folderRequest},[{
  query:'alpha',
  lookupSignature:requestSignature({...folderRequest,folderIds:['folder-b']}),
  lookupCompletedAt:'2026-07-26T01:00:02.000Z',
}])[0]?.folderIds[0]==='folder-a','A same-query result targeting another folder must not swallow recovery');
expect(recoverRequests({active:directedRequest},[{
  query:'alpha',
  updatedAt:'2026-07-26T01:00:02.000Z',
}])[0]?.direction==='ja-zh','Legacy query-only history must not suppress a qualified recovery request');

const mergedCompletion=resolveCompletion(
  {lookupSignature:'old',lookupCompletedAt:'2026-07-26T01:00:00.000Z',updatedAt:'2026-07-26T02:00:00.000Z'},
  {lookupSignature:'new',lookupCompletedAt:'2026-07-26T01:30:00.000Z',updatedAt:'2026-07-26T01:30:00.000Z'},
);
expect(mergedCompletion.lookupSignature==='new','Completion merge must follow the completion clock, not an unrelated record edit');

const deduped=normalizeSnapshot({
  active:{query:'same',folderIds:['b','a']},
  queue:[{query:' same ',folderIds:['a','b']},{query:'other'}],
});
expect(deduped.queue.length===1&&deduped.queue[0].query==='other','Snapshot normalization must remove duplicate signatures');
const sceneTasks=normalizeSnapshot({queue:[{query:'same',sceneGroupId:'scene-a'},{query:'same',sceneGroupId:'scene-b'}]});
expect(sceneTasks.queue.length===2&&sceneTasks.queue[1].sceneGroupId==='scene-b','Same phrase from different scenes retains both associations after queue recovery');

if(failures.length){
  console.error(`Lookup task check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Lookup task check passed: interruption recovery, completion guard, ordering, and deduplication.');
}
