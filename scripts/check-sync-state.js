await import('../sync-state.js');

const {createDirtyState,mapsEqual}=globalThis.SyncState||{};
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};

expect(typeof createDirtyState==='function','SyncState production module did not load');
expect(mapsEqual({history:'same'},{history:'same'}),'Equal raw sync maps must use the no-op path');
expect(!mapsEqual({history:'local'},{history:'remote'}),'Changed raw values must continue to the merge path');
expect(!mapsEqual({history:'same'},{history:'same',logs:'[]'}),'Missing remote or local keys must not be treated as equal');

const state=createDirtyState();
state.mark('history');
state.mark('settings');
const first=state.snapshot();
expect(Object.keys(first).sort().join(',')==='history,settings','Snapshot must include only dirty keys');

state.mark('history');
state.clear(first);
expect(state.has('history'),'A newer edit must survive completion of an older upload');
expect(!state.has('settings'),'An unchanged uploaded key must be cleared');
expect(state.version('history')===2,'Dirty versions must increase per key');

const second=state.snapshot();
state.clear(second);
expect(state.size()===0,'The latest successful upload must clear its dirty key');

state.mark('logs');
state.clearKeys(['logs']);
expect(!state.has('logs'),'Explicit authoritative replacement must support forced clearing');

if(failures.length){
  console.error(`Sync state check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Sync state check passed: dirty snapshots, concurrent edits, and authoritative clearing.');
}
