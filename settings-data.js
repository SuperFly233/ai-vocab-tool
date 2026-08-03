(function(root){
  'use strict';

  function timestamp(value){
    const time=new Date(value||0).getTime();
    return Number.isFinite(time)?time:0;
  }

  function stableValue(value){
    if(Array.isArray(value))return value.map(stableValue);
    if(value&&typeof value==='object'){
      return Object.keys(value).sort().reduce((result,key)=>{
        const next=value[key];
        if(next!==undefined)result[key]=stableValue(next);
        return result;
      },{});
    }
    return value;
  }

  function stableSignature(value){
    return JSON.stringify(stableValue(value));
  }

  function normalizeClock(value,fallback=''){
    const time=timestamp(value)||timestamp(fallback);
    return time?new Date(time).toISOString():'';
  }

  function stableId(prefix,parts=[]){
    const input=stableSignature(Array.isArray(parts)?parts:[parts]);
    let hash=2166136261;
    for(let index=0;index<input.length;index+=1){
      hash^=input.charCodeAt(index);
      hash=Math.imul(hash,16777619);
    }
    return `${String(prefix||'item').replace(/[^a-z0-9_-]/gi,'_')}_${(hash>>>0).toString(36)}`;
  }

  function selectPreferredValue(leftValue,rightValue,preferLeft){
    return preferLeft?leftValue:rightValue;
  }

  function preferNewerItem(left,right){
    if(!left)return right;
    if(!right)return left;
    const leftTime=timestamp(left.updatedAt);
    const rightTime=timestamp(right.updatedAt);
    if(leftTime!==rightTime)return leftTime>rightTime?left:right;
    return stableSignature(left)>=stableSignature(right)?left:right;
  }

  function normalizeTombstones(...groups){
    const map=new Map();
    groups.flatMap(group=>Array.isArray(group)?group:[]).forEach(item=>{
      const id=String(item?.id||'').trim();
      const deletedAt=String(item?.deletedAt||'').trim();
      if(!id||!timestamp(deletedAt))return;
      const existing=map.get(id);
      if(!existing||timestamp(deletedAt)>timestamp(existing.deletedAt))map.set(id,{id,deletedAt});
    });
    return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
  }

  function addTombstone(tombstones,id,deletedAt=new Date().toISOString()){
    return normalizeTombstones(tombstones,[{id,deletedAt}]);
  }

  function reconcileItems(items,tombstones){
    const deleted=new Map(normalizeTombstones(tombstones).map(item=>[item.id,timestamp(item.deletedAt)]));
    return (Array.isArray(items)?items:[]).filter(item=>{
      const id=String(item?.id||'').trim();
      const deletedAt=deleted.get(id)||0;
      return !deletedAt||timestamp(item?.updatedAt)>deletedAt;
    });
  }

  function resolveOrderedIds(leftIds,leftUpdatedAt,rightIds,rightUpdatedAt,allIds,legacyIds=[]){
    const allowed=[...new Set((Array.isArray(allIds)?allIds:[]).map(id=>String(id||'').trim()).filter(Boolean))];
    const allowedSet=new Set(allowed);
    const normalize=value=>[...new Set((Array.isArray(value)?value:[]).map(id=>String(id||'').trim()).filter(id=>allowedSet.has(id)))];
    const left=normalize(leftIds);
    const right=normalize(rightIds);
    const leftTime=timestamp(leftUpdatedAt);
    const rightTime=timestamp(rightUpdatedAt);
    let selected;
    if(!leftTime&&!rightTime)selected=normalize(legacyIds);
    else if(leftTime!==rightTime)selected=leftTime>rightTime?left:right;
    else selected=JSON.stringify(left)>=JSON.stringify(right)?left:right;
    return [...selected,...allowed.filter(id=>!selected.includes(id))];
  }

  root.SettingsData=Object.freeze({normalizeTombstones,addTombstone,reconcileItems,resolveOrderedIds,preferNewerItem,normalizeClock,stableId,selectPreferredValue});
})(typeof globalThis==='object'?globalThis:this);
