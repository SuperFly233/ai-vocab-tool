(function(root){
 'use strict';
 const fields=['title','quote','translation','exampleHighlights','translationHighlights','sourceTitle','chapter','learningTargets','highlightPairs'];
 function text(value,max,label){if(typeof value!=='string'||value.length>max)throw Error(`${label}格式不正确或超过长度限制，原内容未改动。`);return value.trim()}
 function strings(value,max=20){if(!Array.isArray(value)||value.length>max)throw Error('建议列表格式或数量不正确。');return [...new Set(value.map(v=>text(v,4000,'片段')).filter(Boolean))]}
 function parse(input,previous=[]){
  if(typeof input!=='string'||input.length>40000)throw Error('AI 建议为空或过长，未采用。');
  let data;try{data=JSON.parse(input.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))}catch{throw Error('模型未返回有效 JSON 建议。')}
  if(!data||Array.isArray(data)||typeof data!=='object')throw Error('模型建议格式不正确。');
  const result={title:text(data.title??'',48,'标题'),quote:text(data.quote,4000,'原句'),translation:text(data.translation??'',4000,'译文'),sourceTitle:text(data.sourceTitle??data.sourceSuggestion??'',400,'来源'),chapter:text(data.chapter??'',400,'章节')};
  if(!result.quote)throw Error('未识别到完整原句，请手动补充或重试。');
  for(const [key,sentence] of [['exampleHighlights',result.quote],['translationHighlights',result.translation]]){result[key]=strings(data[key]??[]);if(result[key].some(v=>!sentence.includes(v)))throw Error('高亮不是对应正文中的实际片段，请重新识别或手动核对。')}
  const targets=data.learningTargets??[];if(!Array.isArray(targets)||targets.length>20)throw Error('学习目标最多20个。');
  result.learningTargets=targets.map(row=>{const phrase=text(row?.phrase,200,'学习目标'),meaning=text(row?.meaning,2000,'语境义');if(!phrase||!meaning||!result.quote.includes(phrase))throw Error('学习目标必须出现在原句中，并填写语境义。');const old=previous.find(v=>v.phrase===phrase);return {id:old?.id||crypto.randomUUID(),phrase,meaning,kind:row.kind==='sentence'?'sentence':'phrase',provenance:'ai',...(old?.entryId?{entryId:old.entryId}:{}),...(typeof row.senseRef?.entryId==='string'&&Number.isInteger(row.senseRef.index)?{senseRef:{entryId:row.senseRef.entryId,index:row.senseRef.index}}:{})}});
  if(new Set(result.learningTargets.map(v=>v.phrase)).size!==result.learningTargets.length)throw Error('学习目标重复，请核对。');
  result.translationOrigin=['visible','machine','none'].includes(data.translationOrigin)?data.translationOrigin:result.translation?'machine':'none';
  result.sourceEvidence=strings(data.sourceEvidence??[]);result.warnings=strings(data.warnings??[]);
  result.sourceCandidates=strings(data.sourceCandidates??[]);if(result.sourceCandidates.some(v=>v.length>100))throw Error('作品候选名称过长。');result.sourceBasis=['text','visual','unknown'].includes(data.sourceBasis)?data.sourceBasis:'unknown';
  if(root.HighlightPairsData){result.highlightPairs=Object.hasOwn(data,'highlightPairs')?HighlightPairsData.fromAI(data.highlightPairs,result):HighlightPairsData.fromScene(result);Object.assign(result,HighlightPairsData.compatibility(result.highlightPairs))}
  return result;
 }
 function identity(profile){return JSON.stringify([profile?.id,profile?.apiUrl,profile?.model,profile?.apiKey])}
 function validatePatch(input,base){const patch={};for(const [key,value] of Object.entries(input)){
  if(['title','quote','translation','sourceTitle','chapter'].includes(key))patch[key]=text(value,key==='title'?4000:['sourceTitle','chapter'].includes(key)?400:4000,key);
  else if(['exampleHighlights','translationHighlights'].includes(key))patch[key]=strings(value,40);
  else if(key==='highlightPairs')patch[key]=HighlightPairsData.normalize(value,{...base,...input});
  else if(key==='learningTargets'){if(!Array.isArray(value)||value.length>20||value.some(row=>!row||!/^[\w-]{1,100}$/.test(row.id||'')||typeof row.phrase!=='string'||!row.phrase.trim()||row.phrase.length>200||typeof row.meaning!=='string'||!row.meaning.trim()||row.meaning.length>2000)||new Set(value.map(v=>v.id)).size!==value.length)throw Error('语境学习目标需填写实际片段和此处含义，每条最多200／2000字。');patch[key]=structuredClone(value)}
  else if(key==='aiAnalysis'){if(value!==null&&(!value||typeof value!=='object'||JSON.stringify(value).length>40000))throw Error('分析依据格式不正确。');patch[key]=value}
  else if(key==='sourceRef'){if(!root.SourceData)throw Error('来源校验模块尚未加载。');patch[key]=SourceData.reference(value)}
  else if(key==='sourceUrl'){if(typeof value!=='string'||value.length>2048||value&&SceneData.sourceUrl(value)!==value)throw Error('来源链接无效。');patch[key]=value}
  else throw Error('不支持的场景补遗字段。');
 }const merged={...base,...patch};for(const [key,sentence] of [['exampleHighlights',merged.quote],['translationHighlights',merged.translation]])if(Object.hasOwn(patch,key)&&patch[key].some(v=>!String(sentence||'').includes(v)))throw Error('高亮必须是正文中的片段。');if(patch.learningTargets?.some(v=>!String(merged.quote||'').includes(v.phrase)))throw Error('学习目标必须出现在原句中。');if(root.HighlightPairsData){const merged={...base,...patch};if(!Object.hasOwn(patch,'highlightPairs')&&Object.hasOwn(base,'highlightPairs')){let pairs=base.highlightPairs;for(const [key,side] of [['quote','original'],['translation','translation']])if(Object.hasOwn(patch,key)&&patch[key]!==base[key])pairs=HighlightPairsData.reanchor(pairs,merged,side);if(Object.hasOwn(patch,'exampleHighlights')||Object.hasOwn(patch,'translationHighlights'))pairs=HighlightPairsData.withLegacy({...merged,highlightPairs:pairs},patch.exampleHighlights||base.exampleHighlights||[],patch.translationHighlights||base.translationHighlights||[]);patch.highlightPairs=pairs}if(Object.hasOwn(patch,'highlightPairs'))Object.assign(patch,HighlightPairsData.compatibility(patch.highlightPairs))}return patch}
 function defaultUse(key,before,after){const has=value=>Array.isArray(value)?value.length>0:!!String(value??'').trim();if(key==='highlightPairs')return has(after)&&(!has(before)||before.every(v=>v.id.startsWith('legacy-')));return has(after)&&(key==='title'||!has(before))}
 function reviewFields(result){return fields.filter(k=>!Object.hasOwn(result||{},'highlightPairs')||!['exampleHighlights','translationHighlights'].includes(k))}
 root.SceneAIData=Object.freeze({fields,parse,identity,validatePatch,defaultUse,reviewFields});
})(globalThis);
