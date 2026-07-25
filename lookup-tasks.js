(function attachLookupTasks(root){
  const timestamp=value=>{
    const time=new Date(value||0).getTime();
    return Number.isFinite(time)?time:0;
  };
  const text=value=>String(value??'').trim();
  const normalizedText=value=>text(value).toLocaleLowerCase().replace(/\s+/g,' ');

  function requestSignature(request={}){
    const folders=[...new Set((Array.isArray(request.folderIds)?request.folderIds:[]).map(text).filter(Boolean))].sort();
    return [
      normalizedText(request.query),
      normalizedText(request.direction),
      normalizedText(request.note),
      text(request.existingId),
      folders.join(','),
    ].join('\u001f');
  }

  function normalizeRequest(request={}){
    const query=text(request.query);
    if(!query)return null;
    const folderIds=[...new Set((Array.isArray(request.folderIds)?request.folderIds:[]).map(text).filter(Boolean))];
    const normalized={
      query,
      existingId:request.existingId??null,
      direction:text(request.direction),
      note:text(request.note),
      folderIds,
      queuedAt:text(request.queuedAt),
      startedAt:text(request.startedAt),
    };
    normalized.signature=requestSignature(normalized);
    return normalized;
  }

  function normalizeSnapshot(value={}){
    const active=normalizeRequest(value?.active);
    const seen=new Set(active?[active.signature]:[]);
    const queue=[];
    (Array.isArray(value?.queue)?value.queue:[]).forEach(item=>{
      const request=normalizeRequest(item);
      if(!request||seen.has(request.signature))return;
      seen.add(request.signature);
      queue.push(request);
    });
    return {active,queue,savedAt:text(value?.savedAt)};
  }

  function historyTime(item={}){
    return Math.max(timestamp(item.updatedAt),timestamp(item.createdAt));
  }

  function requestAlreadyCompleted(request,history){
    if(!timestamp(request?.startedAt))return false;
    const query=normalizedText(request.query);
    return (Array.isArray(history)?history:[]).some(item=>
      normalizedText(item?.query)===query&&historyTime(item)>=timestamp(request.startedAt)
    );
  }

  function recoverRequests(snapshot,history=[]){
    const normalized=normalizeSnapshot(snapshot);
    const requests=[];
    if(normalized.active&&!requestAlreadyCompleted(normalized.active,history))requests.push({...normalized.active,recovered:true});
    requests.push(...normalized.queue.filter(item=>!requestAlreadyCompleted(item,history)).map(item=>({...item,recovered:true})));
    const seen=new Set();
    return requests.filter(item=>{
      if(seen.has(item.signature))return false;
      seen.add(item.signature);
      return true;
    });
  }

  root.LookupTasks=Object.freeze({requestSignature,normalizeRequest,normalizeSnapshot,recoverRequests});
})(typeof globalThis==='object'?globalThis:this);
