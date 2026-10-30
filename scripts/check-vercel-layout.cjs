const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const files = fs.readdirSync('api').filter(name => name.endsWith('.js'));
  assert.ok(files.length <= 12, 'Keep direct API functions within the Hobby deployment limit');
  for (const file of files) {
    const api = await import(pathToFileURL(path.resolve('api', file)).href);
    assert.equal(typeof api.default, 'function', `${file} must be a real HTTP handler, not a helper`);
  }
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  for (const route of ['/exercise', '/account']) {
    assert.ok(config.rewrites.some(rule => rule.source === route && rule.destination === '/'));
  }
  console.log(`Vercel layout passed: ${files.length} HTTP handlers; helpers outside api; direct routes present.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
