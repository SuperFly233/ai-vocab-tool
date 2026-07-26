(function attachHistoryData(root){
  const timestamp=value=>{
    const time=new Date(value||0).getTime();
    return Number.isFinite(time)?time:0;
  };

  const canonical=value=>{
    if(Array.isArray(value))return value.map(canonical);
    if(value&&typeof value==='object'){
      return Object.keys(value).sort().reduce((result,key)=>{
        result[key]=canonical(value[key]);
        return result;
      },{});
    }
    return value;
  };

  const signature=value=>JSON.stringify(canonical(value));

  function preferNewer(left={},right={}){
    const leftTime=timestamp(left?.updatedAt||left?.createdAt);
    const rightTime=timestamp(right?.updatedAt||right?.createdAt);
    if(leftTime!==rightTime)return leftTime>rightTime?[left,right]:[right,left];
    return signature(left)>=signature(right)?[left,right]:[right,left];
  }

  function resolveMutableField(leftValue,leftUpdatedAt,rightValue,rightUpdatedAt,legacyValue){
    const leftTime=timestamp(leftUpdatedAt);
    const rightTime=timestamp(rightUpdatedAt);
    if(!leftTime&&!rightTime)return {value:legacyValue,updatedAt:'',side:'legacy'};
    if(leftTime&&!rightTime)return {value:leftValue,updatedAt:leftUpdatedAt,side:'left'};
    if(rightTime&&!leftTime)return {value:rightValue,updatedAt:rightUpdatedAt,side:'right'};
    if(leftTime!==rightTime){
      return leftTime>rightTime
        ? {value:leftValue,updatedAt:leftUpdatedAt,side:'left'}
        : {value:rightValue,updatedAt:rightUpdatedAt,side:'right'};
    }
    const leftSignature=signature(leftValue);
    const rightSignature=signature(rightValue);
    return leftSignature>=rightSignature
      ? {value:leftValue,updatedAt:leftUpdatedAt,side:'left'}
      : {value:rightValue,updatedAt:rightUpdatedAt,side:'right'};
  }

  function normalizeTombstones(...groups){
    const map=new Map();
    groups.flatMap(group=>Array.isArray(group)?group:[]).forEach(item=>{
      const key=String(item?.key||'').trim();
      const deletedAt=String(item?.deletedAt||'').trim();
      if(!key||!timestamp(deletedAt))return;
      const existing=map.get(key);
      if(!existing||timestamp(deletedAt)>=timestamp(existing.deletedAt))map.set(key,{key,deletedAt});
    });
    return [...map.values()].sort((a,b)=>timestamp(b.deletedAt)-timestamp(a.deletedAt)||a.key.localeCompare(b.key));
  }

  function reconcileHistory(history=[],tombstones=[],keyOf=item=>item?.key){
    const active=new Map(normalizeTombstones(tombstones).map(item=>[item.key,item]));
    const kept=[];
    (Array.isArray(history)?history:[]).forEach(item=>{
      const key=String(keyOf(item)||'').trim();
      const tombstone=active.get(key);
      if(!key||!tombstone){kept.push(item);return}
      const itemTime=timestamp(item?.updatedAt||item?.createdAt);
      if(itemTime>timestamp(tombstone.deletedAt)){
        active.delete(key);
        kept.push(item);
      }
    });
    return {history:kept,tombstones:[...active.values()]};
  }

  function mergeFollowups(items=[]){
    const map=new Map();
    (Array.isArray(items)?items:[]).filter(Boolean).forEach(item=>{
      const id=item.id===undefined||item.id===null?'':String(item.id);
      const key=id?`id:${id}`:`content:${String(item.question||'')}\u0000${String(item.answer||'')}`;
      const existing=map.get(key);
      const currentTime=timestamp(item.updatedAt||item.createdAt);
      const existingTime=timestamp(existing?.updatedAt||existing?.createdAt);
      if(!existing||currentTime>existingTime||(currentTime===existingTime&&signature(item)>=signature(existing))){
        map.set(key,existing?{...existing,...item}:item);
      }
    });
    return [...map.entries()]
      .sort((left,right)=>{
        const timeDiff=timestamp(left[1]?.createdAt)-timestamp(right[1]?.createdAt);
        return timeDiff||left[0].localeCompare(right[0]);
      })
      .map(([,item])=>item);
  }

  root.HistoryData=Object.freeze({normalizeTombstones,reconcileHistory,mergeFollowups,preferNewer,resolveMutableField});
})(typeof globalThis==='object'?globalThis:this);
