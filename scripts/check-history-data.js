await import('../history-data.js');

const {normalizeTombstones,reconcileHistory,mergeFollowups}=globalThis.HistoryData||{};
const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};
const keyOf=item=>item.query;

expect(typeof reconcileHistory==='function','HistoryData production module did not load');

const remoteOld={query:'alpha',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'};
const unrelated={query:'beta',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-03T00:00:00.000Z'};
const deletion={key:'alpha',deletedAt:'2026-01-04T00:00:00.000Z'};
const deletedMerge=reconcileHistory([remoteOld,unrelated],[deletion],keyOf);
expect(deletedMerge.history.map(item=>item.query).join(',')==='beta','A newer tombstone must block an older cloud record');
expect(deletedMerge.tombstones.length===1,'An active tombstone must be preserved');

const recreated={...remoteOld,updatedAt:'2026-01-05T00:00:00.000Z'};
const recreatedMerge=reconcileHistory([recreated],[deletion],keyOf);
expect(recreatedMerge.history.length===1,'A record recreated after deletion must survive');
expect(recreatedMerge.tombstones.length===0,'Recreation must clear the stale tombstone');

const mergedTombstones=normalizeTombstones(
  [{key:'alpha',deletedAt:'2026-01-04T00:00:00.000Z'}],
  [{key:'alpha',deletedAt:'2026-01-06T00:00:00.000Z'}],
);
expect(mergedTombstones[0]?.deletedAt==='2026-01-06T00:00:00.000Z','The newest deletion timestamp must win');

const followups=mergeFollowups([
  {id:1,question:'old',answer:'old',createdAt:'2026-01-01T00:00:00.000Z'},
  {id:1,question:'new',answer:'new',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'},
  {id:2,question:'other',answer:'kept',createdAt:'2026-01-01T00:00:00.000Z'},
]);
expect(followups.length===2,'Merging followups must retain unrelated ids');
expect(followups.find(item=>item.id===1)?.answer==='new','A duplicate followup id must keep the newest edit');

if(failures.length){
  console.error(`History data check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('History data check passed: tombstone deletion, recreation, ordering, and followup freshness.');
}
