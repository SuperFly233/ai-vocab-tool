const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto');
const root='vendor/basic-dictionaries/',manifest=JSON.parse(fs.readFileSync(root+'manifest.json','utf8'));let bytes=0;
for(const [language,source] of Object.entries(manifest.sources)){
 assert.ok(source.entries>10000);assert.ok(['MIT','CC-BY-SA-4.0'].includes(source.license));
 for(const [key,info] of Object.entries(source.shards)){const raw=fs.readFileSync(root+info.file);assert.equal(raw.length,info.bytes);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),info.sha256);bytes+=raw.length;assert.ok(raw.length<=2500000);for(const row of JSON.parse(raw)){assert.equal(String(row.match.codePointAt(0)%32).padStart(2,'0'),key);assert.ok(row.meaning&&row.value);assert.ok([...row.meaning].length<=2000)}}
}
for(const [language,word,meaning] of [['en','skewer','串'],['en','creditor','债'],['en','fickle',''],['ja','食べる','eat'],['ja','たべる','eat'],['zh','学习','learn'],['zh','學習','learn']]){const source=manifest.sources[language],key=String(word.codePointAt(0)%32).padStart(2,'0');assert.ok(JSON.parse(fs.readFileSync(root+source.shards[key].file,'utf8')).some(row=>row.match===word&&row.meaning.toLowerCase().includes(meaning)),word)}
assert.ok(fs.readFileSync(root+'ECDICT-LICENSE.txt','utf8').includes('MIT'));assert.ok(fs.readFileSync(root+'CC-BY-SA-4.0.txt','utf8').includes('Attribution-ShareAlike'));console.log(`Basic dictionary data: source licenses, counts, aliases, examples, all hashes and ${bytes} bounded shard bytes passed`);
