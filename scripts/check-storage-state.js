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

const readableStorage=memoryStorage({theme:'dark'});
const readable=StorageState.readValue(readableStorage,'theme','auto');
const missing=StorageState.readValue(readableStorage,'layout','top');
expect(readable.ok&&readable.value==='dark','safe reads should return the stored value');
expect(missing.ok&&missing.value==='top','safe reads should return the supplied fallback for a missing key');

const blockedReadError=new Error('Access is denied');
blockedReadError.name='SecurityError';
const blockedStorage={getItem(){throw blockedReadError}};
const blockedRead=StorageState.readValue(blockedStorage,'history','[]');
expect(!blockedRead.ok&&blockedRead.value==='[]'&&blockedRead.error===blockedReadError,'blocked storage reads should return the fallback and preserve the error');

const removeRollbackStorage=memoryStorage({history:'keep-history',settings:'old-settings'},'settings');
const removeRollback=StorageState.writeBatch(removeRollbackStorage,[
  {key:'history',value:null},
  {key:'settings',value:'new-settings'},
]);
expect(!removeRollback.ok&&removeRollback.rollbackOk,'a failure after removal should still roll back');
const removeRollbackDump=removeRollbackStorage.dump();
expect(removeRollbackDump.history==='keep-history'&&removeRollbackDump.settings==='old-settings'&&Object.keys(removeRollbackDump).length===2,'rollback must restore a key removed earlier in the batch');

function boundedStorage(initial,limit){
  const storage=memoryStorage(initial),write=storage.setItem;
  storage.setItem=(key,value)=>{
    const next={...storage.dump(),[key]:String(value)};
    if(Object.values(next).reduce((total,raw)=>total+raw.length,0)>limit){
      const error=new Error('The quota has been exceeded');error.name='QuotaExceededError';throw error;
    }
    write(key,value);
  };
  return storage;
}
const boundary=boundedStorage({history:'12345',settings:'12345'},10);
expect(StorageState.writeBatch(boundary,[{key:'history',value:'12345678'},{key:'settings',value:'12'}]).ok,'Shrink other batch values before growing history');
const overflow=boundedStorage({history:'12345',settings:'12345'},10);
const rejected=StorageState.writeBatch(overflow,[{key:'settings',value:'12'},{key:'history',value:'123456789'}]);
expect(!rejected.ok&&rejected.rollbackOk&&overflow.dump().settings==='12345'&&overflow.dump().history==='12345','True quota overflow must preserve both original values');
const content={headword:{title:'word'},senses:[{definition:'full text'}]};
const entry={id:1,result:content,rolls:[{id:'one',result:content}],note:'keep',scenes:[{id:'scene'}]};
const original=JSON.stringify(entry),compact=JSON.parse(StorageState.historyJSON([entry]))[0];
expect(!Object.hasOwn(compact,'result')&&JSON.stringify(compact.rolls[0].result)===JSON.stringify(content),'Only redundant latest content may be omitted');
expect(compact.note==='keep'&&compact.scenes[0].id==='scene'&&JSON.stringify(entry)===original,'Compaction preserves metadata and does not mutate input');
expect(JSON.parse(StorageState.historyJSON([{id:2,result:content}]))[0].result.headword.title==='word','Legacy history without rolls retains result');
expect(JSON.parse(StorageState.historyJSON([{...entry,result:{headword:{title:'different'}}}]))[0].result.headword.title==='different','Distinct legacy result must never be dropped');

if(failures.length){
  console.error(`Storage state check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Storage state check passed: safe reads, blocked-read fallback, atomic commit, rollback, removal, and quota classification.');
}
