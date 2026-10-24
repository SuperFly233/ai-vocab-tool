import assert from 'node:assert/strict';
await import('../scene-data.js');
const merge=SceneData.mergeOrganization,old='2026-10-23T00:00:00.000Z',now='2026-10-24T00:00:00.000Z';
const left={one:{favorite:{value:false,updatedAt:now},folders:{value:[],updatedAt:now}}},right={one:{favorite:{value:true,updatedAt:old},pinned:{value:true,updatedAt:now},folders:{value:['travel'],updatedAt:old}}};
assert.deepEqual(merge(left,right),merge(right,left));assert.equal(merge(left,right).one.favorite.value,false);assert.deepEqual(merge(left,right).one.folders.value,[]);assert.equal(merge(left,right).one.pinned.value,true);
assert.deepEqual(merge(left,{}),merge(left));assert.deepEqual(merge(left,merge(left,right)),merge(left,right));assert.deepEqual(merge(JSON.parse(JSON.stringify(merge(left,right)))),merge(left,right));
assert.equal(Object.hasOwn(merge(JSON.parse('{"__proto__":{"favorite":{"value":true,"updatedAt":"2026-10-24"}}}')),'__proto__'),false);
assert.deepEqual(merge({one:{favorite:{value:'true',updatedAt:now},pinned:{value:true,updatedAt:'bad'}}}).one,{});
console.log('Organization data: independent clocks, explicit clears, deterministic order, old clients, roundtrip, invalid input and prototype keys passed.');
