import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [app, html, changelog, readme, projectContext, packageText, vercelText, syncApi, manifestText] = await Promise.all([
  read('app.js'),
  read('index.html'),
  read('CHANGELOG.md'),
  read('README.md'),
  read('PROJECT_CONTEXT.md'),
  read('package.json'),
  read('vercel.json'),
  read('api/sync.js'),
  read('site.webmanifest'),
]);

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const firstMatch = (text, pattern) => text.match(pattern)?.[1] || '';

const packageInfo = JSON.parse(packageText);
const vercelInfo = JSON.parse(vercelText);
const manifestInfo = JSON.parse(manifestText);
const versions = {
  package: packageInfo.version,
  app: firstMatch(app, /const APP_INFO=\{[\s\S]*?version:'([\d.]+)'/),
  appChangelog: firstMatch(app, /const CHANGELOG=\[\s*\{\s*version:'([\d.]+)'/),
  cssAsset: firstMatch(html, /\/styles\.css\?v=([\d.]+)/),
  jsAsset: firstMatch(html, /\/app\.js\?v=([\d.]+)/),
  historyAsset: firstMatch(html, /\/history-data\.js\?v=([\d.]+)/),
  settingsDataAsset: firstMatch(html, /\/settings-data\.js\?v=([\d.]+)/),
  storageAsset: firstMatch(html, /\/storage-state\.js\?v=([\d.]+)/),
  iconsAsset: firstMatch(html, /\/icons\.js\?v=([\d.]+)/),
  lookupTasksAsset: firstMatch(html, /\/lookup-tasks\.js\?v=([\d.]+)/),
  syncStateAsset: firstMatch(html, /\/sync-state\.js\?v=([\d.]+)/),
  changelog: firstMatch(changelog, /^## v([\d.]+)/m),
  readme: firstMatch(readme, /^- v([\d.]+)/m),
  context: firstMatch(projectContext, /^- v([\d.]+)/m),
};
const versionValues = Object.values(versions);
expect(versionValues.every(Boolean), `无法读取全部版本号：${JSON.stringify(versions)}`);
expect(new Set(versionValues).size === 1, `版本号不一致：${JSON.stringify(versions)}`);

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
expect(!duplicateIds.length, `index.html 存在重复 id：${duplicateIds.join(', ')}`);

const source = `${html}\n${app}`;
const inlineBodies = [...source.matchAll(/on(?:click|change|input|submit|keydown)\s*=\s*["']([^"']*)["']/g)]
  .map(match => match[1]);
const inlineCalls = new Set();
for (const body of inlineBodies) {
  for (const match of body.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
    inlineCalls.add(match[1]);
  }
}
const allowedGlobals = new Set([
  'Array', 'Boolean', 'Date', 'JSON', 'Math', 'Number', 'Object', 'String',
  'parseFloat', 'parseInt',
]);
const missingHandlers = [...inlineCalls].filter(name => {
  if (allowedGlobals.has(name)) return false;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return !new RegExp(`(?:function\\s+${escaped}\\s*\\(|(?:const|let|var)\\s+${escaped}\\s*=)`, 'm').test(source);
});
expect(!missingHandlers.length, `内联交互引用了不存在的函数：${missingHandlers.join(', ')}`);

expect(/href="\/styles\.css\?v=/.test(html), 'styles.css 必须使用根绝对路径，避免二级 URL 加载失败');
expect(/src="\/app\.js\?v=/.test(html), 'app.js 必须使用根绝对路径，避免二级 URL 加载失败');
expect(/src="\/history-data\.js\?v=/.test(html), 'history-data.js 必须使用根绝对路径，避免二级 URL 加载失败');
expect(/src="\/settings-data\.js\?v=/.test(html), 'settings-data.js must use a root-absolute versioned asset path');
expect(html.indexOf('/settings-data.js?v=')<html.indexOf('/app.js?v='), 'settings-data.js must load before app.js');
expect(/src="\/storage-state\.js\?v=/.test(html), 'storage-state.js must use a root-absolute versioned asset path');
expect(html.indexOf('/storage-state.js?v=')<html.indexOf('/app.js?v='), 'storage-state.js must load before app.js');
expect(/src="\/icons\.js\?v=/.test(html), 'icons.js must use a versioned root-absolute path');
expect(!html.includes('/vendor/lucide.min.js'), 'the browser must not download the complete Lucide library');
expect(html.indexOf('/icons.js?v=')<html.indexOf('/app.js?v='), 'icon hydration must load before app.js');
expect(/src="\/lookup-tasks\.js\?v=/.test(html), 'lookup-tasks.js 必须使用根绝对路径，避免二级 URL 加载失败');
expect(app.includes("historyTombstones:'ai_vocab_tool_history_tombstones'"), '前端同步键缺少历史删除墓碑');
expect(syncApi.includes("'ai_vocab_tool_history_tombstones'"), '同步 API 白名单缺少历史删除墓碑');
expect(/const allHistory=getHistory\(\);[\s\S]{0,500}filterAndSortHistory\(allHistory\)/.test(app), '历史渲染必须复用单次 getHistory 结果');
expect(/const hasFilters=Object\.values\(historyState\.filters\)\.some\(filterHasValues\)/.test(app), '历史筛选缺少无筛选快路径');
expect(app.includes("const HISTORY_NORMALIZED=Symbol('historyNormalized')"), '历史记录缺少规范化复用标记');

expect(/src="\/sync-state\.js\?v=/.test(html), 'sync-state.js must use a root-absolute versioned asset path');
expect(app.includes('const keys=force?Object.values(CLOUD_KEYS):cloudDirtyState.keys()'), 'Automatic cloud sync must upload only dirty keys');
expect(app.includes('const dirtySnapshot=cloudDirtyState.snapshot(keys)'), 'Cloud sync must capture versioned dirty snapshots');
expect(app.includes('syncAllToCloud(true,{force:true})'), 'Factory reset must force an authoritative full cloud upload');
expect(app.includes('const rawLocal=rawSyncableItems()'), 'Cloud polling must compare raw local values before parsing and merging history');
expect(app.includes('mapsEqual(rawLocal,remote)'), 'Cloud polling must preserve an unchanged-data fast path');
expect(app.includes("select('key,updated_at')"), 'Cloud polling must probe lightweight row versions before downloading values');
expect(app.includes("{probe:true}"), 'Automatic cloud refreshes must use the metadata probe path');
expect(syncApi.includes("payload.metadata ? 'key,updated_at' : 'key,value,updated_at'"), 'Sync proxy must expose metadata-only selects');
expect(syncApi.includes('return=representation'), 'Sync proxy upserts must return updated row versions');
expect(app.includes('HistoryData.preferNewer(existing,normalized)'), 'History merge must prefer the newer device record deterministically');
expect(app.includes('id:stableHistoryId(existing,normalized)'), 'History merge must choose a stable cross-device record id');
expect(app.includes('HistoryData.resolveMutableField('), 'History merge must resolve removable metadata with field-level clocks');
expect(app.includes('favoriteUpdatedAt:now'), 'Explicit favorite selection must record a favorite field clock');
expect(app.includes('foldersUpdatedAt:now'), 'Explicit folder selection/removal must record a folder field clock');
expect(app.includes('tagsUpdatedAt:now'), 'Legacy tag removal must record a tag field clock');
expect(app.includes('favoriteFolderTombstones:SettingsData.addTombstone'), 'Favorite folder deletion must create a settings tombstone');
expect(app.includes('function setHistoryAndSettings(')&&app.includes("{key:STORAGE_KEYS.settings,value:settingsRaw}"), 'Folder deletion must atomically commit history, tombstones, and settings');
expect(/function setHistory\([\s\S]{0,1500}commitStorageChanges\(\[[\s\S]{0,400}STORAGE_KEYS\.history[\s\S]{0,400}STORAGE_KEYS\.historyTombstones/.test(app), 'History and tombstones must share one local storage transaction');
expect(/function replaceLocalWithItems\([\s\S]{0,1800}commitStorageChanges\(\[/.test(app), 'Full cloud replacement must use one local storage transaction');
expect(/function factoryReset\([\s\S]{0,700}commitStorageChanges\(\[[\s\S]{0,350}STORAGE_KEYS\.lookupTasks/.test(app), 'Factory reset must remove all local keys in one storage transaction');
expect(/function setTheme\([\s\S]{0,350}commitStorageChanges\(\[\{key:STORAGE_KEYS\.theme/.test(app), 'Theme changes must persist before updating the visible theme');
expect(/function setLayout\([\s\S]{0,400}commitStorageChanges\(\[\{key:STORAGE_KEYS\.layout/.test(app), 'Layout changes must persist before updating the visible layout');
expect(!/localStorage\.(?:setItem|removeItem)\(/.test(app), 'App storage writes must use the rollback-capable transaction helper');
expect(app.includes('StorageState.readValue(localStorage,key,fallback)'), 'App storage reads must use the failure-tolerant storage helper');
expect(!/localStorage\.getItem\(/.test(app), 'App modules must not bypass the failure-tolerant storage reader');
expect(app.includes('async function cloudAuthRequest(operation)')&&!/await cloudClient\.auth\./.test(app), 'Cloud auth calls must convert network throws into handled errors');
expect(/initCloud\(\)\.catch\(error=>\{/.test(app), 'Cloud initialization must not create an unhandled startup rejection');
expect(/els\.historySearch\?\.addEventListener\('input',[\s\S]{0,220}scheduleHistorySearchRender\(\)/.test(app), 'History search input must coalesce rapid rerenders');
expect(app.includes('SettingsData.addTombstone(settings.apiProfileTombstones,current.id,now)'), 'API profile deletion must create a settings tombstone');
expect(app.includes('SettingsData.resolveOrderedIds('), 'API profile merge must resolve an independently clocked order');
expect(app.includes('apiProfileOrder:profiles.map(profile=>profile.id),apiProfileOrderUpdatedAt:now'), 'API profile drag must persist order without rewriting profile content');
expect(app.includes('favoriteFolderOrder:ordered.map(folder=>folder.id)'), 'Favorite folder drag must persist an independent order');
expect(app.includes('favoriteFolderOrderUpdatedAt:now'), 'Favorite folder order changes must record an order clock');
expect(!/function ensureFoldersPersistedForOrder[\s\S]{0,500}normalizeFavoriteFolder\(\{\.\.\.folder,order:index,updatedAt:new Date/.test(app), 'Favorite folder drag must not rewrite every folder content clock');
expect((app.match(/SettingsData\.preferNewerItem\(/g)||[]).length>=4, 'API profiles and favorite folders must share deterministic equal-time conflict resolution');
expect(app.includes('localTime===remoteTime&&SettingsData.preferNewerItem(local,remote)===local'), 'Equal-time scalar settings must resolve independently of device argument order');
expect(app.includes("SettingsData.stableId('api',[name,apiUrl,apiKey,model])"), 'Legacy API profiles without ids must migrate deterministically');
expect(app.includes('normalizeFavoriteFolders(source.favoriteFolders,sourceClock)'), 'Legacy favorite folders must inherit a stable settings clock');
expect(app.includes('modelPrompt:SettingsData.selectPreferredValue(local.modelPrompt,remote.modelPrompt,preferLocalSettings)'), 'A newer empty Prompt must remain an authoritative clear operation');
expect(app.includes('updatedAt:SettingsData.selectPreferredValue(local.updatedAt,remote.updatedAt,preferLocalSettings)'), 'Merged scalar settings must retain the winning side clock');
expect(!/function normalizeApiProfile[\s\S]{0,700}Date\.now\(\)/.test(app), 'API profile normalization must never fabricate a current-time identity');
expect(app.includes("homeStickyMode:'compact'"), 'Home sticky controls must default to compact mode');
expect(app.includes("homeStickyMode:preferLocalSettings?local.homeStickyMode"), 'Home sticky preference must participate in settings merge');
expect(html.includes('id="lookup-options-toggle"')&&html.includes('id="sticky-mode-compact"'), 'Home sticky controls and preference UI must exist');
expect(!html.includes('id="top-settings-btn"'), 'Top navigation must not duplicate the settings destination');
expect(app.includes("lookupOptionsExpanded=!narrow||getSettings().homeStickyMode==='expanded'"), 'Desktop sticky lookup must preserve direction and folder controls');
expect(app.includes('createReorderGhost')&&app.includes('animateDomReorder'), 'Long-press reorder must use a ghost and animated sibling movement');
expect(app.includes('persistModalRollOrder')&&app.includes('persistApiProfileOrder'), 'Pointer reorder must persist version and API profile order');
expect(html.includes('onclick="openFoldersRoot(this)"')&&app.includes('folderIdFromPath'), 'Folders must expose a mobile root/detail navigation path');
expect(app.includes("fromFolderRoot:true")&&app.includes("window.history.state?.fromFolderRoot"), 'Folder detail back must distinguish in-app navigation from direct deep links');
expect(app.includes('lookupSignature:activeLookupSignature'), 'Successful lookups must persist an exact recovery completion signature');
expect(app.includes('LookupTasks.resolveCompletion(existing,normalized)'), 'History merge must preserve the newest lookup completion independently of unrelated edits');
expect(app.includes('favoriteUpdatedAt:favorite?now:normalized.favoriteUpdatedAt'), 'Reasserting an existing favorite must refresh its field clock');
expect(app.includes('foldersUpdatedAt:selectedFolderIds.length?now:normalized.foldersUpdatedAt'), 'Reasserting an existing lookup folder must refresh its field clock');
expect(/return \{\.\.\.normalized,query,tags:\[\],tagsUpdatedAt:now,folderIds,foldersUpdatedAt:now/.test(app), 'History editor save must authoritatively clock empty folder and tag state');
expect(/class="modal-head-actions"[\s\S]*class="modal-view-tabs"[\s\S]*class="modal-file-actions"/.test(html), 'History modal header must separate view tabs from file actions');
expect(/<\/div>\s*<button class="icon-btn danger-icon modal-close-btn"/.test(html), 'History modal close control must remain outside the scrolling action group');
expect(app.includes('const ABOUT_RELEASE_LIMIT=3'), 'About page must cap the initial release archive');
expect(app.includes('CHANGELOG.slice(0,ABOUT_RELEASE_LIMIT)'), 'About page must render only recent releases by default');
expect(app.includes("index===0?'open':''"), 'About page must expand only the latest release by default');
expect(html.includes('<title>Lexi酱</title>')&&manifestInfo.name==='Lexi酱', 'Brand name must match across page title and manifest');
expect(app.includes("toastMode:'snackbar'")&&html.includes('id="toast-mode-snackbar"'), 'Snackbar must be the configurable default notification mode');
expect(app.includes("renderHistoryFilterGroup('time','时间'")&&app.includes('historyMatchesTimeFilter'), 'History must provide explicit time-range filtering');
expect(!app.includes('data-tip="查看" aria-label="查看"'), 'History rows must not duplicate the row-level open action');

const requiredRoutes = ['/history', '/favorites', '/settings', '/about'];
const rewriteSources = new Set((vercelInfo.rewrites || []).map(item => item.source));
for (const route of requiredRoutes) {
  expect(app.includes(`:'${route}'`), `VIEW_ROUTES 缺少 ${route}`);
  expect(rewriteSources.has(route), `vercel.json 缺少 ${route} rewrite`);
}

if (failures.length) {
  console.error(`Contract check failed (${failures.length}):`);
  failures.forEach(message => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log(`Contract check passed: v${packageInfo.version}, ${inlineCalls.size} handlers, ${ids.length} DOM ids, ${requiredRoutes.length} routes.`);
}
