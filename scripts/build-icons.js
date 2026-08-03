import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const iconNames=[
  'arrow-down','arrow-up','arrow-up-right','book-open-text','chevron-down','chevron-right','chevrons-up',
  'circle-help','code-2','copy','download','folder','folder-heart','folder-plus','grip-vertical',
  'history','house','list','monitor','moon','plus','quote','refresh-cw','scan-search','search',
  'settings','settings-2','sliders-horizontal','star','sun','table-2','trash-2','user-round','x',
];

const toExportName=name=>name.split('-').map(part=>part.charAt(0).toUpperCase()+part.slice(1)).join('');
const lucide=await import('lucide');
const icons={};
for(const name of iconNames){
  const definition=lucide[toExportName(name)];
  if(!definition)throw new Error(`Missing Lucide export for ${name}.`);
  icons[name]=definition;
}

const sourceText=(await Promise.all(['index.html','app.js'].map(file=>readFile(resolve(file),'utf8')))).join('\n');
const usedIcons=new Set([
  ...[...sourceText.matchAll(/data-lucide="([a-z0-9-]+)"/g)].map(match=>match[1]),
  ...[...sourceText.matchAll(/icon\('([a-z0-9-]+)'\)/g)].map(match=>match[1]),
]);
const missingIcons=[...usedIcons].filter(name=>!iconNames.includes(name));
if(missingIcons.length)throw new Error(`Icon subset is missing: ${missingIcons.join(', ')}`);

const generated=`/* Generated from lucide v1.28.0 (ISC). Run npm run build:icons after changing icon usage. */
(function attachIcons(root){
  const iconNodes=${JSON.stringify(icons)};
  const namespace='http://www.w3.org/2000/svg';
  const pendingRoots=new Set();
  let scheduled=false;

  function createNode([tag,attributes]){
    const node=document.createElementNS(namespace,tag);
    Object.entries(attributes||{}).forEach(([name,value])=>node.setAttribute(name,String(value)));
    return node;
  }

  function replaceIcon(element){
    const name=element.getAttribute('data-lucide');
    const definition=iconNodes[name];
    if(!definition||element.tagName.toLowerCase()==='svg')return;
    const svg=document.createElementNS(namespace,'svg');
    const originalClass=element.getAttribute('class')||'';
    const attributes={xmlns:namespace,width:'24',height:'24',viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':'2','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true','data-lucide':name,class:['lucide',\`lucide-\${name}\`,originalClass].filter(Boolean).join(' ')};
    Object.entries(attributes).forEach(([key,value])=>svg.setAttribute(key,value));
    definition.forEach(node=>svg.appendChild(createNode(node)));
    element.replaceWith(svg);
  }

  function hydrate(rootNode=document){
    if(rootNode.nodeType!==1&&rootNode!==document)return;
    if(rootNode.matches?.('[data-lucide]'))replaceIcon(rootNode);
    rootNode.querySelectorAll?.('[data-lucide]').forEach(replaceIcon);
  }

  function flush(){
    scheduled=false;
    const roots=[...pendingRoots];
    pendingRoots.clear();
    roots.forEach(hydrate);
  }

  function schedule(rootNode=document){
    pendingRoots.add(rootNode);
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(flush);
  }

  root.refreshIcons=schedule;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>schedule(document),{once:true});
  else schedule(document);

  new MutationObserver(records=>{
    records.forEach(record=>record.addedNodes.forEach(node=>{
      if(node.nodeType===1&&(node.matches?.('[data-lucide]')||node.querySelector?.('[data-lucide]')))schedule(node);
    }));
  }).observe(document.documentElement,{childList:true,subtree:true});
})(window);
`;

const target=resolve('icons.js');
if(process.argv.includes('--check')){
  const current=await readFile(target,'utf8').catch(()=>null);
  if(current!==generated){
    console.error('Icon subset is stale. Run npm run build:icons.');
    process.exitCode=1;
  }else{
    console.log(`Icon subset check passed: ${iconNames.length} Lucide icons, ${Buffer.byteLength(generated)} bytes.`);
  }
}else{
  await writeFile(target,generated,'utf8');
  console.log(`Generated ${iconNames.length} Lucide icons at ${target}.`);
}
