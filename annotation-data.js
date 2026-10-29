(function(root){
 'use strict';
 const types=['rectangle','ellipse','arrow','step','text','mosaic','cover','spotlight'];
 function normalize(value,width,height){
  if(!value||value.version!==1||!Array.isArray(value.items)||value.items.length>100)throw Error('标注数据无效或超过100项。');
  const seen=new Set();let cachedArea=0;return {version:1,items:value.items.map(row=>{
   if(!row||!types.includes(row.type)||typeof row.id!=='string'||!/^[\w-]{1,100}$/.test(row.id)||seen.has(row.id))throw Error('标注身份或类型无效。');seen.add(row.id);
   const box=Object.fromEntries(['x','y','width','height'].map(k=>[k,row[k]]));
   if(Object.values(box).some(v=>!Number.isFinite(v))||box.x<0||box.y<0||box.width<1||box.height<1||box.x+box.width>width+.01||box.y+box.height>height+.01)throw Error('标注超出原件范围。');
   if(!/^#[a-f\d]{6}$/i.test(row.color)||!Number.isFinite(row.stroke)||row.stroke<1||row.stroke>40||!Number.isFinite(row.fontSize)||row.fontSize<8||row.fontSize>256||typeof row.text!=='string'||row.text.length>2000)throw Error('标注颜色、字号或文字无效。');
   if(row.type==='mosaic'&&(cachedArea+=box.width*box.height)>16000000)throw Error('马赛克总区域过大，请缩小图片或改用实色遮挡。');
   return {id:row.id,type:row.type,...box,color:row.color,stroke:row.stroke,fontSize:row.fontSize,text:row.text,flipX:row.flipX===true,flipY:row.flipY===true};
  })};
 }
 const privateOriginal=value=>value?.items?.some(row=>['mosaic','cover'].includes(row.type))===true;
 root.AnnotationData=Object.freeze({types,normalize,privateOriginal});
})(globalThis);
