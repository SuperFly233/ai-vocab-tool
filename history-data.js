(function attachHistoryData(root){
  const timestamp=value=>{
    const time=new Date(value||0).getTime();
    return Number.isFinite(time)?time:0;
  };

  function normalizeTombstones(...groups){
    const map=new Map();
    groups.flatMap(group=>Array.isArray(group)?group:[]).forEach(item=>{
      const key=String(item?.key||'').trim();
      const deletedAt=String(item?.deletedAt||'').trim();
      if(!key||!timestamp(deletedAt))return;
      const existing=map.get(key);
      if(!existing||timestamp(deletedAt)>=timestamp(existing.deletedAt))map.set(key,{key,deletedAt});
    });
    return [...map.values()].sort((a,b)=>timestamp(b.deletedAt)-timestamp(a.deletedAt));
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
      if(!existing||currentTime>=existingTime)map.set(key,existing?{...existing,...item}:item);
    });
    return [...map.values()];
  }

  root.HistoryData=Object.freeze({normalizeTombstones,reconcileHistory,mergeFollowups});
})(typeof globalThis==='object'?globalThis:this);
