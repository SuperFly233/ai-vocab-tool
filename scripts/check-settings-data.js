await import('../settings-data.js');

const {normalizeTombstones,addTombstone,reconcileItems}=globalThis.SettingsData||{};
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};
const old='2026-01-01T00:00:00.000Z';
const removed='2026-01-02T00:00:00.000Z';
const revived='2026-01-03T00:00:00.000Z';

const tombstones=addTombstone([], 'folder_a', removed);
expect(tombstones.length===1&&tombstones[0].id==='folder_a','Adding a settings tombstone must preserve its id');
expect(reconcileItems([{id:'folder_a',updatedAt:old}],tombstones).length===0,'A newer deletion must remove an older settings item');
expect(reconcileItems([{id:'folder_a',updatedAt:removed}],tombstones).length===0,'Deletion must win an equal-time conflict');
expect(reconcileItems([{id:'folder_a',updatedAt:revived}],tombstones).length===1,'A genuinely newer recreation must survive an older tombstone');
expect(reconcileItems([{id:'folder_b',updatedAt:old}],tombstones).length===1,'Deleting one item must not remove concurrent unrelated items');

const forward=normalizeTombstones([{id:'api_a',deletedAt:old}],[{id:'api_a',deletedAt:removed},{id:'api_b',deletedAt:old}]);
const reverse=normalizeTombstones([{id:'api_a',deletedAt:removed},{id:'api_b',deletedAt:old}],[{id:'api_a',deletedAt:old}]);
expect(JSON.stringify(forward)===JSON.stringify(reverse),'Settings tombstone merge must not depend on device order');

if(failures.length){
  console.error(`Settings data check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Settings data check passed: deletions, recreations, unrelated additions, and merge order converge.');
}
