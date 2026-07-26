await import('../history-data.js');

const {normalizeTombstones,reconcileHistory,mergeFollowups,preferNewer,resolveMutableField}=globalThis.HistoryData||{};
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
expect(
  JSON.stringify(normalizeTombstones(
    [{key:'beta',deletedAt:'2026-01-06T00:00:00.000Z'}],
    [{key:'alpha',deletedAt:'2026-01-06T00:00:00.000Z'}],
  ))===JSON.stringify(normalizeTombstones(
    [{key:'alpha',deletedAt:'2026-01-06T00:00:00.000Z'}],
    [{key:'beta',deletedAt:'2026-01-06T00:00:00.000Z'}],
  )),
  'Tombstone normalization must not depend on device merge order',
);

const followups=mergeFollowups([
  {id:1,question:'old',answer:'old',createdAt:'2026-01-01T00:00:00.000Z'},
  {id:1,question:'new',answer:'new',createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-01-02T00:00:00.000Z'},
  {id:2,question:'other',answer:'kept',createdAt:'2026-01-01T00:00:00.000Z'},
]);
expect(followups.length===2,'Merging followups must retain unrelated ids');
expect(followups.find(item=>item.id===1)?.answer==='new','A duplicate followup id must keep the newest edit');

const equalTimeFollowups=[
  {id:3,question:'same id',answer:'left',createdAt:'2026-01-03T00:00:00.000Z',updatedAt:'2026-01-04T00:00:00.000Z'},
  {id:3,question:'same id',answer:'right',createdAt:'2026-01-03T00:00:00.000Z',updatedAt:'2026-01-04T00:00:00.000Z'},
  {id:4,question:'later',answer:'kept',createdAt:'2026-01-05T00:00:00.000Z'},
];
expect(
  JSON.stringify(mergeFollowups(equalTimeFollowups))===JSON.stringify(mergeFollowups([...equalTimeFollowups].reverse())),
  'Equal-time followup conflicts must converge regardless of merge direction',
);

const olderOrder={id:'same',updatedAt:'2026-01-02T00:00:00.000Z',rolls:['old','new']};
const newerOrder={id:'same',updatedAt:'2026-01-03T00:00:00.000Z',rolls:['new','old']};
expect(preferNewer(olderOrder,newerOrder)[0]===newerOrder,'Newer record order must take precedence');
expect(preferNewer(newerOrder,olderOrder)[0]===newerOrder,'Record precedence must be independent of merge direction');

const legacyFolders=resolveMutableField(['alpha'],'',['beta'],'',['alpha','beta']);
expect(JSON.stringify(legacyFolders.value)===JSON.stringify(['alpha','beta']),'Legacy metadata without field clocks must retain the compatibility union');
const removedFavorite=resolveMutableField(true,'2026-01-02T00:00:00.000Z',false,'2026-01-03T00:00:00.000Z',true);
expect(removedFavorite.value===false&&removedFavorite.side==='right','A newer explicit favorite removal must beat an older addition');
const reverseRemovedFavorite=resolveMutableField(false,'2026-01-03T00:00:00.000Z',true,'2026-01-02T00:00:00.000Z',true);
expect(reverseRemovedFavorite.value===false&&reverseRemovedFavorite.side==='left','Favorite removal must not depend on merge direction');
const equalClockLeft=resolveMutableField(['alpha'],'2026-01-03T00:00:00.000Z',['beta'],'2026-01-03T00:00:00.000Z',['alpha','beta']);
const equalClockRight=resolveMutableField(['beta'],'2026-01-03T00:00:00.000Z',['alpha'],'2026-01-03T00:00:00.000Z',['alpha','beta']);
expect(JSON.stringify(equalClockLeft.value)===JSON.stringify(equalClockRight.value),'Equal-clock metadata conflicts must converge deterministically');

if(failures.length){
  console.error(`History data check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('History data check passed: records, tombstones, followups, and mutable metadata converge deterministically.');
}
