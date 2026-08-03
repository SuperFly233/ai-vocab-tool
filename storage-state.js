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
      normalized.forEach(change=>{
        failedKey=change.key;
        if(change.value===null)storage.removeItem(change.key);
        else storage.setItem(change.key,change.value);
      });
      return {ok:true,failedKey:'',rollbackOk:true,error:null};
    }catch(error){
      let rollbackOk=true;
      [...snapshots.entries()].reverse().forEach(([key,value])=>{
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

  function isQuotaError(error){
    const name=String(error?.name||'').toLowerCase();
    const code=Number(error?.code||0);
    const message=String(error?.message||error||'').toLowerCase();
    return name==='quotaexceedederror'||code===22||code===1014||/quota|storage.*full|disk.*full/.test(message);
  }

  root.StorageState=Object.freeze({writeBatch,isQuotaError});
})(typeof globalThis==='object'?globalThis:this);
