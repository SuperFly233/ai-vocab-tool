(function(root){
 'use strict';
 const esc=v=>escapeHTML(String(v??''));
 function chosen(result,id){const row=result?.dialogues?.find(v=>v.id===(id||result.selectedDialogueId));return row?{...row,model:result.model,generatedAt:result.generatedAt}:null}
 function buttons(rows,selected,{exercise=false}={}){return rows.map((row,i)=>`<button type="button" class="${exercise?'exercise-line':'scene-dialogue-option'} ${selected===row.id?'active':''}" data-dialogue-id="${esc(row.id)}" ${exercise?`data-ex-line="${esc(row.id)}"`:''} aria-pressed="${selected===row.id}"><b>${i+1}</b><span><strong>${esc(row.quote)}</strong>${row.translation?`<small>${esc(row.translation)}</small>`:''}${row.speaker?`<small>${esc(row.speaker)}</small>`:''}</span></button>`).join('')}
 function boxes(host,rows,selected,onSelect){host.replaceChildren();for(const [i,row] of rows.entries()){if(!row.rect)continue;const b=document.createElement('button');b.type='button';b.className='scene-dialogue-box'+(selected===row.id?' active':'');const number=Number(row.id?.match(/^line-(\d+)$/)?.[1])||i+1;b.setAttribute('aria-label','选择第'+number+'句：'+row.quote);b.textContent=number;Object.assign(b.style,{left:row.rect.x*100+'%',top:row.rect.y*100+'%',width:row.rect.width*100+'%',height:row.rect.height*100+'%'});b.onclick=e=>{e.stopPropagation();onSelect(row.id)};host.append(b)}}
 root.SceneDialogues=Object.freeze({chosen,buttons,boxes});
})(globalThis);
