(function(root){
 'use strict';
 function dialogues(raw){
  if(!Array.isArray(raw)||raw.length>20)throw Error('对话候选需为至多20句的列表。');
  return raw.map((row,index)=>{
   const parsed=SceneAIData.parse(JSON.stringify(row));
   const rect=row.rect;
   if(rect!==undefined&&(!rect||['x','y','width','height'].some(k=>typeof rect[k]!=='number'||!Number.isFinite(rect[k]))||rect.x<0||rect.y<0||rect.width<=0||rect.height<=0||rect.x+rect.width>1.001||rect.y+rect.height>1.001))throw Error('对话位置不在截图范围内。');
   const speaker=row.speaker??'';if(typeof speaker!=='string'||speaker.length>100)throw Error('说话人格式无效。');
   return {...parsed,id:'line-'+(index+1),speaker,complete:row.complete===true,...(rect?{rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height}}:{})};
  });
 }
 function select(rows,point,manual=false){
  if(manual)return null;
  if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1){
   const hits=rows.filter(v=>v.complete&&v.rect&&point.x>=v.rect.x&&point.x<=v.rect.x+v.rect.width&&point.y>=v.rect.y&&point.y<=v.rect.y+v.rect.height);
   return hits.length===1?hits[0].id:null;
  }
  return rows.length===1&&rows[0].complete?rows[0].id:null;
 }
 function parse(input,point,manual=false){
  if(typeof input!=='string'||input.length>40000)throw Error('截图分析响应过长或无效，原件保留。');
  let raw;try{raw=JSON.parse(input.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''))}catch{throw Error('截图分析未返回有效 JSON。')}
  // Legacy single-scene responses remain available, but never claim a complete Backlog extraction.
  if(!Object.hasOwn(raw,'dialogues')){const row=SceneAIData.parse(input);return {...row,dialogues:[{...row,id:'line-1',speaker:'',complete:false}],selectedDialogueId:null}}
  const rows=dialogues(raw.dialogues),selectedDialogueId=select(rows,point,manual);
  return {dialogues:rows,selectedDialogueId};
 }
 function patch(result,chosen){
  const row=result.dialogues?.find(v=>v.id===(chosen||result.selectedDialogueId));if(!row)throw Error('请先选择截图中的一句。');
  return {...Object.fromEntries(SceneAIData.fields.filter(k=>Object.hasOwn(row,k)).map(k=>[k,row[k]])),aiAnalysis:{model:result.model,generatedAt:result.generatedAt,translationOrigin:row.translationOrigin,sourceEvidence:row.sourceEvidence,sourceCandidates:row.sourceCandidates,sourceBasis:row.sourceBasis,warnings:row.warnings}};
 }
 root.ExerciseData=Object.freeze({parse,dialogues,select,patch});
})(globalThis);
