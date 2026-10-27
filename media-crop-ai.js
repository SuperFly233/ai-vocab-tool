(function(root){
 'use strict';
 function attach({node,body,element,meta,owner,current,snapshot,processing,preview,signal}){
  const area=document.createElement('fieldset');area.className='media-ai-crop';
  area.innerHTML='<legend>'+icon('sparkles')+'裁剪建议</legend><div class="media-ai-tools"><select aria-label="裁剪建议范围" data-crop-purpose><option value="subtitles">字幕区域</option><option value="subject">主体区域</option></select><button type="button" class="plain-btn" data-crop-analyze>分析</button></div><label class="media-component-consent"><input type="checkbox" data-crop-consent><span>'+(element.tagName==='VIDEO'?'仅将当前画面发送给所选模型，不发送整段视频。':'将当前图片画面发送给所选模型。动画仅发送当前一帧。')+'</span></label><p class="media-ai-status" role="status" aria-live="polite">沿用场景识图配置，可能产生费用；不自动生成或采用副本。</p><div data-crop-suggestions></div>';
  body.querySelector('.media-edit-fields').prepend(area);SharedUI.enhanceSelects(area);
  const status=area.querySelector('.media-ai-status'),button=area.querySelector('[data-crop-analyze]'),consent=area.querySelector('[data-crop-consent]');status.removeAttribute('role');let job=null,serial=0,busy=false;
  const valid=()=>current()&&!signal.aborted;
  const abort=()=>{serial++;job?.abort();job=null};signal.addEventListener('abort',abort,{once:true});
  function end(){busy=false;button.textContent='分析';area.classList.remove('media-ai-running')}
  button.onclick=async()=>{
   if(busy){abort();end();status.textContent='已停止分析，原件与手动裁剪保留。';return}
   if(processing())return;
   if(!consent.checked){status.textContent='先确认本次发送范围；尚未调用模型。';return}
   busy=true;const id=++serial,before=snapshot();job=new AbortController();const local=job;
   button.innerHTML=icon('x')+'停止';area.classList.add('media-ai-running');area.querySelector('[data-crop-suggestions]').replaceChildren();
   status.textContent='请选择并核对识图配置…';
   try{
    const profile=await SceneAI.chooseProfile();
    if(!profile||!valid()||id!==serial||local.signal.aborted)return;
    const identity=SceneAIData.identity(profile),profileNow=()=>getSettings().apiProfiles.find(v=>v.id===profile.id);
    if(!consent.checked)throw Error('发送确认已取消，未上传画面。');
    if(element.tagName==='VIDEO')element.pause();
    const width=element.videoWidth||element.naturalWidth,height=element.videoHeight||element.naturalHeight;
    if(!width||!height||width!==meta.width||height!==meta.height)throw Error('当前画面尚未就绪，请稍后重试。');
    const factor=Math.min(1,1600/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*factor));canvas.height=Math.max(1,Math.round(height*factor));
    const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(element,0,0,canvas.width,canvas.height);
    const frame=canvas.toDataURL('image/jpeg',.86);canvas.width=canvas.height=1;
    status.innerHTML='<span class="lexi-progress-spinner" aria-hidden="true"></span><span>正在分析当前画面…</span>';
    const rows=await SceneAIClient.suggestCrop(profile,frame,{purpose:area.querySelector('[data-crop-purpose]').value,signal:local.signal});
    if(!valid()||id!==serial||local.signal.aborted)return;
    if(!consent.checked)throw Error('发送确认已取消，返回建议未采用。');
    if(identity!==SceneAIData.identity(profileNow()))throw Error('模型配置已变化，旧建议未采用。');
    if(before!==snapshot())throw Error('裁剪参数已有手动修改，旧建议未采用；可重新分析。');
    status.textContent=rows.length?profile.model+' · 建议待核对，尚未更改裁剪框。':'当前画面没有可靠建议，仍可手动裁剪。';
    rows.forEach(row=>{
     const item=document.createElement('div');item.className='media-ai-suggestion';const description=document.createElement('div'),title=document.createElement('strong'),reason=document.createElement('span'),use=document.createElement('button');
     title.textContent=row.kind==='subtitles'?'字幕区域':'主体区域';reason.textContent=row.reason;description.append(title,reason);use.type='button';use.className='plain-btn';use.textContent='预览建议';
     use.onclick=()=>{try{if(!valid()||processing())return;if(id!==serial||identity!==SceneAIData.identity(profileNow()))throw Error('模型或分析任务已有变化，请重新分析。');preview(MediaEditorData.cropPixels(row,meta.width,meta.height));status.textContent='建议框已预览，可拖动调整；生成并使用副本后才加入场景草稿。'}catch(e){status.textContent=e.message}};
     item.append(description,use);area.querySelector('[data-crop-suggestions]').append(item);
    });
   }catch(e){if(valid()&&id===serial)status.textContent=e.message}
   finally{if(id===serial){job=null;end()}}
  };
  consent.onchange=()=>{if(!consent.checked){abort();end();area.querySelector('[data-crop-suggestions]').replaceChildren();status.textContent='已取消发送确认，仍可手动编辑。'}};
  return {busy:()=>busy,abort};
 }
 root.MediaCropAI=Object.freeze({attach});
})(globalThis);
