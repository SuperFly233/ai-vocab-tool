(function(root){
  'use strict';

  function timestamp(value){
    const time=new Date(value||0).getTime();
    return Number.isFinite(time)?time:0;
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

  root.SettingsData=Object.freeze({normalizeTombstones,addTombstone,reconcileItems});
})(typeof globalThis==='object'?globalThis:this);
