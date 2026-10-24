const {spawnSync}=require('node:child_process');
const defaults=[
 'check-organization-data.js','check-scene-organization.cjs','check-quick-learning.cjs',
 'check-learning-workbench.cjs','check-scene-navigation-hotfix.cjs',
 'check-scene-authoring-polish.cjs','check-scene-learning-safety.cjs',
 'check-learning-ui.cjs','check-favorites-boundaries.cjs','check-streaming-e2e.cjs',
 'check-modal-dismissal.cjs','check-control-motion.cjs',
];
const tests=process.argv.length>2?process.argv.slice(2):defaults;
for(const file of tests){console.log(`\nRunning ${file}`);const result=spawnSync(process.execPath,[`scripts/${file}`],{stdio:'inherit',env:process.env,timeout:240000});if(result.error||result.status!==0){console.error(result.error||`${file} exit ${result.status}`);process.exit(result.status||1)}}
console.log('Learning workbench release regressions passed.');
