const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const dir=process.argv[2]||'tmp/teyvat-index',manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));let count=0;
assert.equal(manifest.schema,1);
for(const [chapter,entry] of Object.entries(manifest.chapters)){
 const bytes=fs.readFileSync(path.join(dir,chapter+'.json')),rows=JSON.parse(bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.artifactHash);assert.equal(rows.length,entry.lines);assert.equal(new Set(rows.map(v=>v.key)).size,rows.length);
 for(const row of rows){assert.equal(row.chapter,chapter);assert.equal(row.version,entry.version);assert.ok(row.en||row.zh);assert.equal(new URL(row.url).origin,'https://teyvat-scriptorium.pages.dev')}
 count+=rows.length;
}
console.log(JSON.stringify({chapters:Object.keys(manifest.chapters).length,lines:count,catalog:manifest.catalog?.total||0,failed:Object.keys(manifest.failed||{}).length,integrity:'all prepared artifacts match; not a production import claim'}));
