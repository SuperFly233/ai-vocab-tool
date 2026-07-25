import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [app, html, changelog, readme, projectContext, packageText, vercelText, syncApi] = await Promise.all([
  read('app.js'),
  read('index.html'),
  read('CHANGELOG.md'),
  read('README.md'),
  read('PROJECT_CONTEXT.md'),
  read('package.json'),
  read('vercel.json'),
  read('api/sync.js'),
]);

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};
const firstMatch = (text, pattern) => text.match(pattern)?.[1] || '';

const packageInfo = JSON.parse(packageText);
const vercelInfo = JSON.parse(vercelText);
const versions = {
  package: packageInfo.version,
  app: firstMatch(app, /const APP_INFO=\{[\s\S]*?version:'([\d.]+)'/),
  appChangelog: firstMatch(app, /const CHANGELOG=\[\s*\{\s*version:'([\d.]+)'/),
  cssAsset: firstMatch(html, /\/styles\.css\?v=([\d.]+)/),
  jsAsset: firstMatch(html, /\/app\.js\?v=([\d.]+)/),
  historyAsset: firstMatch(html, /\/history-data\.js\?v=([\d.]+)/),
  lookupTasksAsset: firstMatch(html, /\/lookup-tasks\.js\?v=([\d.]+)/),
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
expect(/src="\/lookup-tasks\.js\?v=/.test(html), 'lookup-tasks.js 必须使用根绝对路径，避免二级 URL 加载失败');
expect(app.includes("historyTombstones:'ai_vocab_tool_history_tombstones'"), '前端同步键缺少历史删除墓碑');
expect(syncApi.includes("'ai_vocab_tool_history_tombstones'"), '同步 API 白名单缺少历史删除墓碑');

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
