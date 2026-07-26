(function attachSyncState(root){
  function createDirtyState(){
    const versions=new Map();

    function mark(key){
      if(!key)return 0;
      const version=(versions.get(key)||0)+1;
      versions.set(key,version);
      return version;
    }

    function snapshot(keys=[...versions.keys()]){
      const out={};
      (Array.isArray(keys)?keys:[]).forEach(key=>{
        if(versions.has(key))out[key]=versions.get(key);
      });
      return out;
    }

    function clear(snapshotValue={}){
      Object.entries(snapshotValue||{}).forEach(([key,version])=>{
        if(versions.get(key)===version)versions.delete(key);
      });
    }

    function clearKeys(keys=[]){
      (Array.isArray(keys)?keys:[]).forEach(key=>versions.delete(key));
    }

    return Object.freeze({
      mark,
      snapshot,
      clear,
      clearKeys,
      has:key=>versions.has(key),
      keys:()=>[...versions.keys()],
      size:()=>versions.size,
      version:key=>versions.get(key)||0,
    });
  }

  root.SyncState=Object.freeze({createDirtyState});
})(typeof globalThis==='object'?globalThis:this);
