await import('../settings-data.js');

const {normalizeTombstones,addTombstone,reconcileItems,resolveOrderedIds,preferNewerItem,normalizeClock,stableId,selectPreferredValue}=globalThis.SettingsData||{};
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

const ordered=resolveOrderedIds(['api_b','api_a'],revived,['api_a','api_b'],removed,['api_a','api_b','api_c']);
expect(JSON.stringify(ordered)===JSON.stringify(['api_b','api_a','api_c']),'The newer explicit order must win and append a concurrent profile');
const tiedForward=resolveOrderedIds(['api_b','api_a'],revived,['api_a','api_b'],revived,['api_a','api_b','api_c']);
const tiedReverse=resolveOrderedIds(['api_a','api_b'],revived,['api_b','api_a'],revived,['api_a','api_b','api_c']);
expect(JSON.stringify(tiedForward)===JSON.stringify(tiedReverse),'Equal-time order conflicts must converge independently of device direction');
const legacyOrder=resolveOrderedIds([], '', [], '', ['api_a','api_b'], ['api_b','api_a']);
expect(JSON.stringify(legacyOrder)===JSON.stringify(['api_b','api_a']),'Legacy settings must retain their existing profile order');

const tiedItemA={id:'folder_a',name:'Alpha',updatedAt:revived};
const tiedItemB={id:'folder_a',name:'Beta',updatedAt:revived};
expect(preferNewerItem(tiedItemA,tiedItemB)===preferNewerItem(tiedItemB,tiedItemA),'Equal-time item conflicts must choose the same content in either merge direction');
expect(preferNewerItem({...tiedItemA,updatedAt:old},tiedItemB)===tiedItemB,'A newer item timestamp must still outrank the deterministic tie-break');

expect(normalizeClock('',old)===old,'Legacy items must inherit a stable parent clock instead of the current time');
expect(normalizeClock('not-a-date','')==='','Invalid legacy clocks must remain empty instead of becoming current');
expect(stableId('api',['Legacy','https://example.com','secret','model'])===stableId('api',['Legacy','https://example.com','secret','model']),'Legacy profile ids must be deterministic');
expect(stableId('api',['Legacy','https://example.com','key-a','model'])!==stableId('api',['Legacy','https://example.com','key-b','model']),'Distinct legacy profiles must not collapse to one deterministic id');
expect(selectPreferredValue('custom','',false)==='','A newer explicit empty scalar must not resurrect an older non-empty value');

if(failures.length){
  console.error(`Settings data check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Settings data check passed: deletions, recreations, content ties, additions, and order converge.');
}
