const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
(async()=>{
 await import('../learning-content.js');
 const source={headword:{title:'clock',coreMeaning:'注意到',summary:'Full <script>unsafe()</script>'},senses:[{shortestLabel:'notice',partOfSpeech:'verb',meaning:'Noticing a detail',example:'I clocked the detail.',translation:'我注意到了细节。',exampleHighlights:['clocked'],translationHighlights:['注意到']}],collocations:[{phrase:'clock in',meaning:'登记',example:'Clock in now.',translation:'登记',exampleHighlights:['Clock in']}],register:{style:'spoken',tone:'neutral',environment:'daily'},confusions:[{term:'notice',difference:'区别',usage:'通用'}]};
 const content=LearningContent.snapshot(source,undefined,'clcok');assert.equal(content.selected.length,7);assert.equal(content.result.senses[0].translation,source.senses[0].translation);
 const html=LearningContent.render(content);assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('<mark>clocked</mark>'));assert.ok(html.includes('clock in'));assert.ok(html.includes('易混词辨析'));
 const core=LearningContent.snapshot(source,['core'],'clcok');assert.equal(LearningContent.render(core),'');assert.deepEqual(core.result.senses,[]);assert.equal(source.senses.length,1,'Source AI JSON untouched');
 const excluded=LearningContent.snapshot(source,['senses']);assert.equal(excluded.result.senses[0].example,'');
 assert.throws(()=>LearningContent.normalize({...content,selected:['private']}));assert.throws(()=>LearningContent.snapshot({...source,headword:{...source.headword,summary:'x'.repeat(12001)}}));
 const result=spawnSync(process.env.QA_PYTHON||'D:/Files/Projects/lexi-glass/tmp/anki-bridge-035-venv/Scripts/python.exe',['-c',"import sys,json;sys.path.insert(0,'integrations/anki-bridge');from bridge.learning import render;sys.stdout.buffer.write(render(json.loads(sys.stdin.buffer.read().decode('utf-8'))).encode('utf-8'))"],{input:JSON.stringify(content),encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stdout,html,'Web and Anki render exactly the same section HTML');
 console.log('Learning content: complete defaults, per-section exclusion, escaped text/highlights, no source mutation, size limits and exact web/Anki renderer parity passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
