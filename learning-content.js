(function(root){
 const sections={core:'核心义',summary:'总述',senses:'义项',examples:'例句与译文',collocations:'固定搭配',register:'语体说明',confusions:'易混词辨析'};
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function text(value,max=12000){if(value==null)return '';if(typeof value!=='string'||value.length>max)throw Error('AI 内容格式无效或过长，未截断。');return value}
 function terms(value){if(value==null)return [];if(!Array.isArray(value)||value.length>30)throw Error('高亮格式无效。');return value.map(v=>text(v,400))}
 function normalize(value){
  if(!value||value.version!==1||!value.result||!Array.isArray(value.selected)||value.selected.some(k=>!Object.hasOwn(sections,k))||new Set(value.selected).size!==value.selected.length||!value.selected.length)throw Error('请选择卡片内容。');
  const r=value.result,h=r.headword||{},m=r.meta||{},selected=Object.keys(sections).filter(k=>value.selected.includes(k));
  const headword=Object.fromEntries(['title','languageTag','basicPartOfSpeech','coreMeaning','summary'].map(k=>[k,text(h[k],k==='title'?400:12000)]));
  if(!headword.title.trim())throw Error('词条缺少 AI 标题。');
  const meta=Object.fromEntries(['language','entryType','direction','model','generatedAt','source'].map(k=>[k,text(m[k],1000)]));
  function rows(key,fields){const input=r[key]??[];if(!Array.isArray(input)||input.length>1000)throw Error('AI 内容列表无效。');return input.map(row=>{if(!row||typeof row!=='object'||Array.isArray(row))throw Error('AI 内容条目无效。');const out=Object.fromEntries(fields.map(k=>[k,text(row[k])]));if(key!=='confusions'){out.exampleHighlights=terms(row.exampleHighlights);out.translationHighlights=terms(row.translationHighlights)}return out})}
  const result={meta,headword,senses:rows('senses',['partOfSpeech','shortestLabel','meaning','example','translation']),collocations:rows('collocations',['phrase','meaning','example','translation','note']),register:Object.fromEntries(['style','tone','environment'].map(k=>[k,text(r.register?.[k])])),confusions:rows('confusions',['term','difference','usage'])};
  const output={version:1,result,selected,origin:text(value.origin,400)};
  if(new TextEncoder().encode(JSON.stringify(output)).length>220000)throw Error('完整内容超过 220KB，请减少所选范围；原文未截断。');
  return output;
 }
 function snapshot(result,selected=Object.keys(sections),origin=''){
  const input=structuredClone(result);if(!selected.includes('core'))input.headword.coreMeaning='';if(!selected.includes('summary'))input.headword.summary='';
  if(!selected.includes('senses'))input.senses=[];if(!selected.includes('collocations'))input.collocations=[];if(!selected.includes('register'))input.register={};if(!selected.includes('confusions'))input.confusions=[];
  if(!selected.includes('examples'))for(const row of [...(input.senses||[]),...(input.collocations||[])]){row.example='';row.translation='';row.exampleHighlights=[];row.translationHighlights=[]}
  return normalize({version:1,result:input,selected,origin});
 }
 function highlight(value,values){const source=String(value||''),matches=[...new Set(values||[])].filter(Boolean).sort((a,b)=>b.length-a.length);if(!matches.length)return escape(source);const regex=new RegExp(matches.map(v=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gi');let html='',start=0;for(const match of source.matchAll(regex)){html+=escape(source.slice(start,match.index))+'<mark>'+escape(match[0])+'</mark>';start=match.index+match[0].length}return html+escape(source.slice(start))}
 function render(value){const {result:r,selected}=normalize(value),part=(key,body)=>selected.includes(key)&&body?'<section class="learning-section" data-content-section="'+key+'"><h3>'+sections[key]+'</h3>'+body+'</section>':'';
  function items(rows,label){return rows.map((row,i)=>'<article class="learning-item"><h4><span>'+String(i+1)+'</span>'+escape(row[label])+'</h4>'+(row.partOfSpeech?'<small>'+escape(row.partOfSpeech)+'</small>':'')+(row.meaning?'<p>'+escape(row.meaning)+'</p>':'')+(row.example?'<p class="learning-example">'+highlight(row.example,row.exampleHighlights)+'</p>':'')+(row.translation?'<p class="learning-translation">'+highlight(row.translation,row.translationHighlights)+'</p>':'')+(row.note?'<small>'+escape(row.note)+'</small>':'')+'</article>').join('')}
  return part('summary',r.headword.summary?'<p>'+escape(r.headword.summary)+'</p>':'')+part('senses',items(r.senses,'shortestLabel'))+part('collocations',items(r.collocations,'phrase'))+part('register',Object.entries(r.register).filter(([,v])=>v).map(([k,v])=>'<p><b>'+({style:'语体',tone:'语气',environment:'环境'})[k]+'</b> '+escape(v)+'</p>').join(''))+part('confusions',r.confusions.map(row=>'<article class="learning-item"><h4>'+escape(row.term)+'</h4><p>'+escape(row.difference)+'</p><p class="learning-translation">'+escape(row.usage)+'</p></article>').join(''));
 }
 root.LearningContent={sections,normalize,snapshot,render,highlight};
})(globalThis);
