(function(root){
 'use strict';
 let active=null;
 const check=signal=>{if(signal?.aborted)throw new DOMException('已取消','AbortError')};
 async function image(blob){
  const bytes=new Uint8Array(await blob.slice(0,65536).arrayBuffer()),view=new DataView(bytes.buffer);let width=0,height=0;
  if(blob.type==='image/png'&&bytes.length>=24){width=view.getUint32(16);height=view.getUint32(20)}
  else if(blob.type==='image/gif'&&bytes.length>=10){width=view.getUint16(6,true);height=view.getUint16(8,true)}
  else if(blob.type==='image/webp'&&bytes.length>=30&&new TextDecoder('latin1').decode(bytes.slice(12,16))==='VP8X'){width=1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16);height=1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)}
  if(width*height>16000000)throw Error('图片过大，请在电脑缩小后重试。');
  const bitmap=await createImageBitmap(blob);if(bitmap.width*bitmap.height>16000000){bitmap.close();throw Error('图片过大，请在电脑缩小后重试。')}return bitmap;
 }
 async function animated(blob){if(blob.type==='image/gif'||blob.type.startsWith('video/'))return true;const h=new TextDecoder('latin1').decode(await blob.slice(0,65536).arrayBuffer());return blob.type==='image/webp'&&h.includes('ANIM')||blob.type==='image/png'&&h.includes('acTL')}
 async function metadata(blob,signal){check(signal);if(!blob.type.startsWith('video/')){const b=await image(blob),result={width:b.width,height:b.height,duration:0};b.close();return result}return new Promise((resolve,reject)=>{const video=document.createElement('video'),url=URL.createObjectURL(blob),timer=setTimeout(()=>finish(Error('无法读取视频尺寸与时长。')),10000);const finish=error=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);video.removeAttribute('src');video.load();URL.revokeObjectURL(url);error?reject(error):resolve(result)};let result;const cancel=()=>finish(new DOMException('已取消','AbortError'));signal?.addEventListener('abort',cancel,{once:true});video.onloadedmetadata=()=>{result={width:video.videoWidth,height:video.videoHeight,duration:video.duration};if(!Number.isFinite(result.duration)||result.duration>600)return finish(Error('视频时长超过浏览器处理范围，请在电脑先截短。'));finish()};video.onerror=()=>finish(Error('浏览器无法读取此视频编码，请在电脑转换后重试。'));video.preload='metadata';video.src=url})}
 async function verified(asset,signal){const response=await fetch(asset.url,{signal,referrerPolicy:'no-referrer'});if(!response.ok)throw Error('媒体组件下载失败，原件保留。');const bytes=await response.arrayBuffer();check(signal);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');if(bytes.byteLength!==asset.size||hash!==asset.sha256)throw Error('媒体组件校验失败，已停止加载。');return bytes}
 async function process(blob,input,{signal,onStatus=()=>{},allowComponent=false}={}){
  if(active)throw Error('已有媒体正在处理，请等待或取消。');const token={};active=token;const local=new AbortController(),abort=()=>local.abort(),urls=[];let ffmpeg,bitmap,timer;
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  try{timer=setTimeout(()=>local.abort(),60000);check(local.signal);if(blob.size>20*1024*1024)throw Error('原件超过20MB。');const meta=await metadata(blob,local.signal),p=MediaEditorData.parameters(input,meta.width,meta.height,meta.duration);let result;
   if(!await animated(blob)){
    onStatus('正在生成图片副本…');bitmap=await image(blob);check(local.signal);const canvas=document.createElement('canvas');canvas.width=p.outputWidth;canvas.height=p.outputHeight;canvas.getContext('2d').drawImage(bitmap,p.x,p.y,p.width,p.height,0,0,p.outputWidth,p.outputHeight);result=await new Promise((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(Error('图片编码失败。')),'image/png'));canvas.width=canvas.height=1;
   }else{
    if(!allowComponent)throw Error('GIF和视频需要先确认下载本机处理组件。');if(meta.width*meta.height>8000000)throw Error('视频或动画尺寸过大，请先在电脑缩小。');onStatus('正在下载并校验本机媒体组件…');
    const {FFmpeg}=await import('/vendor/media-engine/index.js'),manifest=await (await fetch('/vendor/media-engine/manifest.json',{signal:local.signal})).json();ffmpeg=new FFmpeg();local.signal.addEventListener('abort',()=>ffmpeg.terminate(),{once:true});
    const core=await verified(manifest.assets['ffmpeg-core.js'],local.signal),wasm=await verified(manifest.assets['ffmpeg-core.wasm'],local.signal);for(const [bytes,type] of [[core,'text/javascript'],[wasm,'application/wasm']])urls.push(URL.createObjectURL(new Blob([bytes],{type})));check(local.signal);await ffmpeg.load({coreURL:urls[0],wasmURL:urls[1]});check(local.signal);onStatus('正在生成动画／视频副本…');
    const gif=blob.type==='image/gif'||!blob.type.startsWith('video/'),ext=gif?'gif':'mp4',out='output.'+ext;await ffmpeg.writeFile('input',new Uint8Array(await blob.arrayBuffer()));const w=gif?p.outputWidth:Math.max(2,Math.floor(p.outputWidth/2)*2),h=gif?p.outputHeight:Math.max(2,Math.floor(p.outputHeight/2)*2),filter=`crop=${p.width}:${p.height}:${p.x}:${p.y},scale=${w}:${h}`;
    const args=['-ss',String(p.start),'-i','input',...(p.end?['-t',String(p.end-p.start)]:[]),'-vf',filter,...(gif?['-loop','0']:['-map','0:v:0','-map','0:a?','-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart']),'-threads','1',out];
    if(await ffmpeg.exec(args,50000)!==0)throw Error('媒体处理未完成，请缩小尺寸或截短后重试。');check(local.signal);const data=await ffmpeg.readFile(out);result=new Blob([data],{type:gif?'image/gif':'video/mp4'});
   }
   check(local.signal);if(!result?.size||result.size>20*1024*1024)throw Error('副本为空或超过20MB，请调整尺寸后重试。');const output=await metadata(result,local.signal);if(!output.width||!output.height)throw Error('生成结果无法解码，原件未替换。');check(local.signal);return {blob:result,params:p,source:meta,output};
  }catch(e){if(local.signal.aborted)throw Error(signal?.aborted?'已取消，原件未改变。':'处理超过60秒，已停止；请缩小或截短素材后重试。');if(typeof e==='string'||e instanceof TypeError)throw Error('媒体组件下载或处理失败，原件保持不变；请检查网络或缩小素材后重试。');throw e}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);bitmap?.close();ffmpeg?.terminate();urls.forEach(v=>URL.revokeObjectURL(v));if(active===token)active=null}
 }
 root.MediaEditorEngine=Object.freeze({metadata,animated,process});
})(globalThis);
