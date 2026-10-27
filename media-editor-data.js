(function(root){
 'use strict';
 const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
 const outputSize=(width,height)=>{const factor=Math.min(1,4096/width,4096/height,Math.sqrt(8000000/(width*height)));return {outputWidth:Math.max(1,Math.floor(width*factor)),outputHeight:Math.max(1,Math.floor(height*factor))}};
 function parameters(input,width,height,duration=0){
  if(!integer(width,1,16384)||!integer(height,1,16384)||width*height>16000000)throw Error('素材尺寸过大，请先在电脑上缩小原件。');
  const p=Object.fromEntries(['x','y','width','height','outputWidth','outputHeight'].map(k=>[k,Number(input[k])])),start=Number(input.start||0),end=Number(input.end||0);
  if(!integer(p.x,0,width-1)||!integer(p.y,0,height-1)||!integer(p.width,1,width-p.x)||!integer(p.height,1,height-p.y))throw Error('裁剪范围超出原件，请调整裁剪框。');
  if(!integer(p.outputWidth,1,4096)||!integer(p.outputHeight,1,4096)||p.outputWidth*p.outputHeight>8000000)throw Error('输出尺寸需在4096像素及800万像素以内。');
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<0||end<0||end>600||start>=600||(end&&end<=start)||duration&&(start>=duration||end>duration+.05))throw Error('截段起止时间无效，单次最多处理10分钟。');
  return {...p,start,end};
 }
 function edits(rows){return (Array.isArray(rows)?rows:[]).slice(0,6).flatMap(row=>{const original=root.SceneData.normalizeMedia([row?.original])[0];if(!root.SceneData.hashId(row?.id)||!original||original.id===row.id||!row.params||typeof row.params!=='object')return [];try{return [{id:row.id,original,params:parameters(row.params,row.sourceWidth,row.sourceHeight),sourceWidth:row.sourceWidth,sourceHeight:row.sourceHeight,createdAt:Number.isFinite(Date.parse(row.createdAt))?row.createdAt:''}]}catch{return []}})}
 root.MediaEditorData=Object.freeze({parameters,edits,outputSize});
})(globalThis);
