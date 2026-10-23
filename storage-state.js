(function attachStorageState(root){
  function asChanges(changes=[]){
    return (Array.isArray(changes)?changes:[])
      .filter(change=>change&&String(change.key||''))
      .map(change=>({key:String(change.key),value:change.value===null?null:String(change.value)}));
  }

  function writeBatch(storage,changes=[]){
    const normalized=asChanges(changes);
    const snapshots=new Map();
    let failedKey='';
    try{
      normalized.forEach(change=>{
        if(!snapshots.has(change.key))snapshots.set(change.key,storage.getItem(change.key));
      });
      // Free space within this batch before writing larger values at the quota boundary.
      const ordered=[...normalized].sort((a,b)=>{
        const delta=change=>(change.value?.length||0)-(snapshots.get(change.key)?.length||0);
        return delta(a)-delta(b);
      });
      (snapshots.size===normalized.length?ordered:normalized).forEach(change=>{
        failedKey=change.key;
        if(change.value===null)storage.removeItem(change.key);
        else storage.setItem(change.key,change.value);
      });
      return {ok:true,failedKey:'',rollbackOk:true,error:null};
    }catch(error){
      let rollbackOk=true;
      [...snapshots.entries()].sort(([a,av],[b,bv])=>{
        try{return ((av?.length||0)-(storage.getItem(a)?.length||0))-((bv?.length||0)-(storage.getItem(b)?.length||0))}catch{return 0}
      }).forEach(([key,value])=>{
        try{
          if(value===null)storage.removeItem(key);
          else storage.setItem(key,value);
        }catch{
          rollbackOk=false;
        }
      });
      return {ok:false,failedKey,rollbackOk,error};
    }
  }

  function readValue(storage,key,fallback=null){
    try{
      const value=storage.getItem(String(key));
      return {ok:true,value:value===null?fallback:value,error:null};
    }catch(error){
      return {ok:false,value:fallback,error};
    }
  }

  function isQuotaError(error){
    const name=String(error?.name||'').toLowerCase();
    const code=Number(error?.code||0);
    const message=String(error?.message||error||'').toLowerCase();
    return name==='quotaexceedederror'||code===22||code===1014||/quota|storage.*full|disk.*full/.test(message);
  }

  function historyJSON(items=[]){
    return JSON.stringify(items.map(item=>{
      const first=item?.rolls?.[0]?.result;
      if(!first||JSON.stringify(item.result)!==JSON.stringify(first))return item;
      const {result,...rest}=item;
      return rest;
    }));
  }

  root.StorageState=Object.freeze({readValue,writeBatch,isQuotaError,historyJSON});
})(typeof globalThis==='object'?globalThis:this);
