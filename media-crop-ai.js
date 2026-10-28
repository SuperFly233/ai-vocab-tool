(function(root){
 'use strict';
 function attach({node,body,element,meta,owner,current,snapshot,processing,preview,signal}){
  const area=document.createElement('fieldset');area.className='media-ai-crop';
  area.innerHTML='<legend><span>'+icon('sparkles')+'裁剪建议</span><button type="button" class="plain-btn" data-crop-analyze>分析</button></legend><p class="media-ai-status" role="status" aria-live="polite"></p><div data-crop-suggestions></div>';
  body.querySelector('.media-edit-fields').prepend(area);
  const status=area.querySelector('.media-ai-status'),button=area.querySelector('[data-crop-analyze]');status.removeAttribute('role');let job=null,serial=0,busy=false;
  const valid=()=>current()&&!signal.aborted;
  const abort=()=>{serial++;job?.abort();job=null};signal.addEventListener('abort',abort,{once:true});
  function end(){busy=false;button.textContent='分析';area.classList.remove('media-ai-running')}
  button.onclick=async()=>{
   if(busy){abort();end();status.textContent='已停止分析。';return}
   if(processing())return;
   busy=true;const id=++serial,before=snapshot();job=new AbortController();const local=job;
   button.innerHTML=icon('x')+'停止';area.classList.add('media-ai-running');area.querySelector('[data-crop-suggestions]').replaceChildren();
   status.textContent='';
   try{
    const profile=await SceneAI.chooseProfile();
    if(!profile||!valid()||id!==serial||local.signal.aborted)return;
    const identity=SceneAIData.identity(profile),profileNow=()=>getSettings().apiProfiles.find(v=>v.id===profile.id);
    if(element.tagName==='VIDEO')element.pause();
    const width=element.videoWidth||element.naturalWidth,height=element.videoHeight||element.naturalHeight;
    if(!width||!height||width!==meta.width||height!==meta.height)throw Error('当前画面尚未就绪，请稍后重试。');
    const factor=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*factor));canvas.height=Math.max(1,Math.round(height*factor));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(element,0,0,canvas.width,canvas.height);
    const frame=canvas.toDataURL('image/jpeg',.86);canvas.width=canvas.height=1;
    status.innerHTML='<span class="lexi-progress-spinner" aria-hidden="true"></span><span>正在分析当前画面…</span>';
    const rows=await SceneAIClient.suggestCrop(profile,frame,{signal:local.signal});
    rows.sort((a,b)=>['frame','subtitles','subject'].indexOf(a.kind)-['frame','subtitles','subject'].indexOf(b.kind));
    if(!valid()||id!==serial||local.signal.aborted)return;
    if(identity!==SceneAIData.identity(profileNow()))throw Error('模型配置已变化，旧建议未采用。');
    if(before!==snapshot())throw Error('裁剪参数已有手动修改，旧建议未采用；可重新分析。');
    status.textContent=rows.length?profile.model+' · 已生成 '+rows.length+' 个建议':'未找到合适的裁剪区域。';
    rows.forEach(row=>{
     const item=document.createElement('div');item.className='media-ai-suggestion';const description=document.createElement('div'),title=document.createElement('strong'),reason=document.createElement('span'),use=document.createElement('button');
     title.textContent={frame:'完整画面',subtitles:'字幕区域',subject:'主体区域'}[row.kind];reason.textContent=row.reason;description.append(title,reason);use.type='button';use.className='plain-btn';use.textContent='预览建议';
     use.onclick=()=>{try{if(!valid()||processing())return;if(id!==serial||identity!==SceneAIData.identity(profileNow()))throw Error('模型或分析任务已有变化，请重新分析。');preview(MediaEditorData.cropPixels(row,meta.width,meta.height));status.textContent=''}catch(e){status.textContent=e.message}};
     item.append(description,use);area.querySelector('[data-crop-suggestions]').append(item);
    });
   }catch(e){if(valid()&&id===serial)status.textContent=e.message}
   finally{if(id===serial){job=null;end()}}
  };
  return {busy:()=>busy,abort};
 }
 root.MediaCropAI=Object.freeze({attach});
})(globalThis);
