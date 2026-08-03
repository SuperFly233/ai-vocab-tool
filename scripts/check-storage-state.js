import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../storage-state.js',import.meta.url),'utf8');
const context={};
vm.createContext(context);
vm.runInContext(source,context);
const {StorageState}=context;
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};

function memoryStorage(initial={},failAt=''){
  const values=new Map(Object.entries(initial));
  let failed=false;
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem(key,value){
      if(key===failAt&&!failed){
        failed=true;
        const error=new Error('Storage quota exceeded');
        error.name='QuotaExceededError';
        throw error;
      }
      values.set(key,String(value));
    },
    removeItem:key=>values.delete(key),
    dump:()=>Object.fromEntries(values),
  };
}

const successStorage=memoryStorage({history:'old',theme:'dark'});
const success=StorageState.writeBatch(successStorage,[
  {key:'history',value:'new'},
  {key:'theme',value:null},
  {key:'settings',value:'saved'},
]);
expect(success.ok,'successful batch should report ok');
expect(JSON.stringify(successStorage.dump())===JSON.stringify({history:'new',settings:'saved'}),'successful batch should apply set and remove operations');

const quotaStorage=memoryStorage({history:'old-history',tombstones:'old-tombstones'},'tombstones');
const quota=StorageState.writeBatch(quotaStorage,[
  {key:'history',value:'new-history'},
  {key:'tombstones',value:'new-tombstones'},
]);
expect(!quota.ok&&quota.failedKey==='tombstones','failed batch should identify the failing key');
expect(quota.rollbackOk,'failed batch should report a successful rollback');
expect(JSON.stringify(quotaStorage.dump())===JSON.stringify({history:'old-history',tombstones:'old-tombstones'}),'failed batch must restore every previous value');
expect(StorageState.isQuotaError(quota.error),'quota failures should be recognized');
expect(!StorageState.isQuotaError(new Error('network failed')),'unrelated failures must not be classified as quota errors');

const removeRollbackStorage=memoryStorage({history:'keep-history',settings:'old-settings'},'settings');
const removeRollback=StorageState.writeBatch(removeRollbackStorage,[
  {key:'history',value:null},
  {key:'settings',value:'new-settings'},
]);
expect(!removeRollback.ok&&removeRollback.rollbackOk,'a failure after removal should still roll back');
const removeRollbackDump=removeRollbackStorage.dump();
expect(removeRollbackDump.history==='keep-history'&&removeRollbackDump.settings==='old-settings'&&Object.keys(removeRollbackDump).length===2,'rollback must restore a key removed earlier in the batch');

if(failures.length){
  console.error(`Storage state check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Storage state check passed: atomic commit, rollback, removal, and quota classification.');
}
