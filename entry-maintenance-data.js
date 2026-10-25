(function(root){
  const sections={core:'核心义',summary:'总述',senses:'义项',examples:'例句与译文',collocations:'固定搭配',register:'语体说明',confusions:'易混词辨析'};
  const keys=Object.keys(sections),bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
  const has=value=>typeof value==='string'&&Boolean(value.trim());
  function scan(result={}){
    const senses=Array.isArray(result.senses)?result.senses:[],collocations=Array.isArray(result.collocations)?result.collocations:[];
    return keys.filter(key=>({core:!has(result.headword?.coreMeaning),summary:!has(result.headword?.summary),senses:!senses.length,
      examples:!senses.length||[...senses,...collocations].some(row=>!has(row.example)||!has(row.translation)),
      collocations:!collocations.length,register:!Object.values(result.register||{}).some(has),confusions:!Array.isArray(result.confusions)||!result.confusions.length})[key]);
  }
  function validate(result,origin=''){
    if(bytes(result)>220000)throw Error('正文超过 220KB，未截断；请先缩小补遗范围。');
    return root.LearningContent.normalize({version:1,result,selected:keys,origin}).result;
  }
  function parse(answer,origin=''){
    if(typeof answer!=='string'||new TextEncoder().encode(answer).length>220000)throw Error('模型返回超过 220KB 或格式无效，未截断。');
    const value=JSON.parse(answer.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
    if(!value||Array.isArray(value)||Object.keys(value).some(key=>!['meta','headword','senses','collocations','register','confusions'].includes(key)))throw Error('模型未返回约定的词条结构。');
    if(!value.headword||!value.register||Array.isArray(value.headword)||Array.isArray(value.register)||typeof value.register!=='object'||['senses','collocations','confusions'].some(key=>!Array.isArray(value[key])))throw Error('模型缺少完整的词条分区，未保存不完整结果。');
    return validate(value,origin);
  }
  function compose(original,proposal,selected,origin=''){
    if(!Array.isArray(selected)||!selected.length||selected.some(key=>!keys.includes(key)))throw Error('请选择要采用的分区。');
    const clean=validate(proposal,origin),next=structuredClone(original);
    next.headword={...next.headword};
    for(const key of ['core','summary'])if(selected.includes(key))next.headword[key==='core'?'coreMeaning':key]=clean.headword[key==='core'?'coreMeaning':key];
    for(const key of ['senses','collocations']){
      if(selected.includes(key)){
        next[key]=clean[key].map((row,index)=>{
          const previous=(original[key]||[])[index],same=previous&&['partOfSpeech','shortestLabel','phrase','meaning'].every(field=>(previous[field]||'')===(row[field]||''));
          if(selected.includes('examples'))return row;
          const output={...row};for(const field of ['example','translation','exampleHighlights','translationHighlights'])output[field]=same?structuredClone(previous[field]??(field.endsWith('Highlights')?[]:'')):(field.endsWith('Highlights')?[]:'');
          return output;
        });
      }else if(selected.includes('examples')){
        const old=original[key]||[],suggested=clean[key];
        if(old.length!==suggested.length||old.some((row,index)=>['partOfSpeech','shortestLabel','phrase','meaning'].some(field=>(row[field]||'')!==(suggested[index][field]||''))))throw Error('仅补例句时，义项或搭配顺序发生变化；请重新生成并核对。');
        next[key]=old.map((row,index)=>({...row,...Object.fromEntries(['example','translation','exampleHighlights','translationHighlights'].map(field=>[field,suggested[index][field]]))}));
      }
    }
    for(const key of ['register','confusions'])if(selected.includes(key))next[key]=clean[key];
    // Validation checks bounds without replacing the original metadata or unrelated fields.
    validate(next,origin);return next;
  }
  root.EntryMaintenanceData={sections,keys,scan,validate,parse,compose};
})(globalThis);
