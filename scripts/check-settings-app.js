import fs from 'node:fs';
import vm from 'node:vm';

await import('../settings-data.js');
await import('../scene-data.js');
await import('../view-preferences.js');

const app=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const start=app.indexOf('function normalizeSettings');
const end=app.indexOf('function currentApiSettings',start);
if(start<0||end<0)throw new Error('Could not locate production settings functions');

const context={
  SettingsData:globalThis.SettingsData,
  SceneData:globalThis.SceneData,
  ViewPreferences:globalThis.ViewPreferences,
  DEFAULT_API_PROFILE:{id:'default',name:'默认配置',apiUrl:'',apiKey:'',model:''},
  DEFAULT_SETTINGS:{apiUrl:'',apiKey:'',model:'',activeApiProfileId:'default',apiProfiles:[],apiProfileTombstones:[],apiProfileOrder:['default'],apiProfileOrderUpdatedAt:'',labelMode:'zh',fontMode:'system',historyTimeMode:'created',homeStickyMode:'compact',visualHintsPinned:false,modelPrompt:'',favoriteFolders:[],favoriteFolderTombstones:[],favoriteFolderOrder:[],favoriteFolderOrderUpdatedAt:''},
  FOLDER_LIKED_ID:'liked',
  FOLDER_INSIGHTS_ID:'insights',
  FOLDER_UNFILED_ID:'unfiled',
  CLOUD_KEYS:{settings:'ai_vocab_tool_settings'},
  historyCollator:new Intl.Collator(['zh-Hans-CN','en'],{numeric:true,sensitivity:'base'}),
  cloudDirtyState:{has:()=>false},
  normalizeHistoryClock(value){
    const time=new Date(value||0).getTime();
    return time?new Date(time).toISOString():'';
  },
};
vm.createContext(context);
vm.runInContext(`${app.slice(start,end)}\nthis.normalizeSettings=normalizeSettings;this.mergeSettings=mergeSettings;`,context);

const failures=[];
const expect=(condition,message)=>{if(!condition)failures.push(message)};
const old='2026-01-01T00:00:00.000Z';
const newer='2026-01-02T00:00:00.000Z';
const legacy={
  updatedAt:old,
  apiProfiles:[{name:'Legacy',apiUrl:'https://example.com/v1',apiKey:'key-a',model:'model-a'}],
  favoriteFolders:[{name:'旧收藏夹'}],
};

const first=context.normalizeSettings(legacy);
expect(context.normalizeSettings({rememberViewFilters:'false'}).rememberViewFilters===false,'Legacy string false disables filter memory');
expect(context.normalizeSettings({}).rememberViewFilters===true,'Filter memory defaults on for existing accounts');
expect(context.normalizeSettings({hintsHidden:true}).tooltipsHidden===false,'Hiding editor hints must not hide hover tooltips');
await new Promise(resolve=>setTimeout(resolve,15));
const second=context.normalizeSettings(legacy);
expect(JSON.stringify(first)===JSON.stringify(second),'Repeated legacy normalization must not depend on wall-clock time or randomness');
expect(first.apiProfiles[0].id===second.apiProfiles[0].id&&first.apiProfiles[0].id.startsWith('api_'),'A missing legacy profile id must become stable');
expect(first.apiProfiles[0].updatedAt===old&&first.favoriteFolders[0].updatedAt===old,'Legacy items must inherit the parent settings clock');

const unclocked=context.normalizeSettings({apiProfiles:[{name:'No clock',apiUrl:'https://example.com'}],favoriteFolders:[{name:'No clock folder'}]});
expect(unclocked.updatedAt===''&&unclocked.apiProfiles[0].updatedAt===''&&unclocked.favoriteFolders[0].updatedAt==='','Unclocked legacy data must stay unclocked instead of becoming current');

const local={updatedAt:old,modelPrompt:'old custom',apiProfiles:[{id:'default',name:'默认配置',updatedAt:old}]};
const remote={updatedAt:newer,modelPrompt:'',apiProfiles:[{id:'default',name:'默认配置',updatedAt:newer}]};
const forward=context.mergeSettings(local,remote);
const reverse=context.mergeSettings(remote,local);
expect(forward.modelPrompt===''&&reverse.modelPrompt==='','A newer empty Prompt must win in both device argument orders');
expect(forward.updatedAt===newer&&reverse.updatedAt===newer,'Merged settings must retain the winning overall clock');
expect(JSON.stringify(forward)===JSON.stringify(reverse),'Deterministic legacy settings must converge in both merge directions');
const scene={id:'shared-scene',groupId:'group-a',quote:'Old quote',createdAt:old,updatedAt:old};
const sceneLocal={...local,sceneLibrary:[scene]},sceneRemote={...remote,sceneLibrary:[{...scene,quote:'New quote',updatedAt:newer}]};
expect(context.mergeSettings(sceneLocal,sceneRemote).sceneLibrary[0].quote==='New quote','Independent scene content uses per-scene clocks');
expect(JSON.stringify(context.mergeSettings(sceneLocal,sceneRemote).sceneLibrary)===JSON.stringify(context.mergeSettings(sceneRemote,sceneLocal).sceneLibrary),'Scene libraries converge in both directions');
expect(context.mergeSettings(sceneLocal,{...remote,sceneLibraryTombstones:[{key:scene.id,deletedAt:newer}]}).sceneLibrary.length===0,'Independent scene deletion cannot revive from a stale device');
const organizationLocal={...local,sceneOrganization:{'group-a':{favorite:{value:false,updatedAt:newer},folders:{value:[],updatedAt:newer}}}},organizationRemote={...remote,sceneOrganization:{'group-a':{favorite:{value:true,updatedAt:old},folders:{value:['folder_old'],updatedAt:old},pinned:{value:true,updatedAt:newer}}}};
const organized=context.mergeSettings(organizationLocal,organizationRemote);
expect(organized.sceneOrganization['group-a'].favorite.value===false&&organized.sceneOrganization['group-a'].folders.value.length===0,'Newer scene favorite and folder clears survive cloud merge');
expect(organized.sceneOrganization['group-a'].pinned.value===true,'Independent scene pin clock survives other metadata changes');
expect(JSON.stringify(organized.sceneOrganization)===JSON.stringify(context.mergeSettings(organizationRemote,organizationLocal).sceneOrganization),'Scene organization cloud merge is commutative');
expect(context.mergeSettings(organizationLocal,remote).sceneOrganization['group-a'].favorite.updatedAt===newer,'Legacy settings without scene organization do not clear it');

if(failures.length){
  console.error(`Production settings check failed (${failures.length}):`);
  failures.forEach(message=>console.error(`- ${message}`));
  process.exitCode=1;
}else{
  console.log('Production settings check passed: legacy ids/clocks and explicit Prompt clears converge.');
}
