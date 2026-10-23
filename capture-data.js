(function(root){
  const MAX_ITEMS=20,MAX_BYTES=8*1024*1024,MAX_BATCH_BYTES=40*1024*1024;
  const text=(value,max,label)=>{if(typeof value!=='string'||value.length>max)throw Error(`${label}格式不正确或超过 ${max} 字。`);return value.trim()};
  const comparable=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
  function dimensions(bytes,mime){
    const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let width=0,height=0;
    if(mime==='image/png'&&bytes.length>=24){width=view.getUint32(16);height=view.getUint32(20)}
    if(mime==='image/jpeg'){
      let offset=2;while(offset+4<=bytes.length){
        if(bytes[offset++]!==255)break;let marker=bytes[offset++];while(marker===255&&offset<bytes.length)marker=bytes[offset++];
        if(marker===217||marker===218)break;if(marker===1||marker>=208&&marker<=215)continue;
        const size=view.getUint16(offset);if(size<2||offset+size>bytes.length)break;
        if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)&&size>=7){height=view.getUint16(offset+3);width=view.getUint16(offset+5);break}offset+=size;
      }
    }
    if(mime==='image/webp'){
      for(let offset=12;offset+8<=bytes.length;){const type=String.fromCharCode(...bytes.slice(offset,offset+4)),size=view.getUint32(offset+4,true),p=offset+8;if(size<1||p+size>bytes.length)break;
        if(type==='VP8X'&&size>=10){width=1+bytes[p+4]+(bytes[p+5]<<8)+(bytes[p+6]<<16);height=1+bytes[p+7]+(bytes[p+8]<<8)+(bytes[p+9]<<16);if(bytes[p]&2)throw Error('动画 WebP 请使用场景编辑器，不会自动抽成静态截图。');break}
        if(type==='VP8L'&&size>=5&&bytes[p]===47){const bits=view.getUint32(p+1,true);width=1+(bits&16383);height=1+((bits>>>14)&16383);break}
        if(type==='VP8 '&&size>=10&&bytes[p+3]===157&&bytes[p+4]===1&&bytes[p+5]===42){width=view.getUint16(p+6,true)&16383;height=view.getUint16(p+8,true)&16383;break}offset=p+size+(size%2);
      }
    }
    if(!width||!height)throw Error('无法读取截图尺寸，请重新导出为 PNG 或 JPEG。');
    if(width*height>24000000||Math.max(width,height)>20000)throw Error('截图像素超过处理上限（2400 万像素、单边 20000），请先缩小。');return {width,height};
  }
  function fragments(value,quote,label){
    if(!Array.isArray(value)||value.length>40)throw Error(`${label}最多 40 段。`);
    return [...new Set(value.map(v=>text(v,200,label)).filter(Boolean))].filter(v=>comparable(quote).includes(comparable(v)));
  }
  function terms(value){
    const all=Array.isArray(value)?value:String(value||'').split(/[\n、;；]+/);
    if(all.length>MAX_ITEMS)throw Error('每张截图最多 20 个待查词组。');
    const unique=new Map();for(const raw of all){const term=text(raw,200,'词组');if(term)unique.set(comparable(term),term)}return [...unique.values()];
  }
  function extraction(raw){
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('识别未返回结构化内容。');
    const quote=text(raw.quote,4000,'原句'),translation=text(raw.translation??'',4000,'译文');
    if(!quote)throw Error('没有识别出完整原句，请手动填写或换一张更清晰的截图。');
    const translationOrigin=['visible','machine','none'].includes(raw.translationOrigin)?raw.translationOrigin:'none';
    if(translation&&!['visible','machine'].includes(translationOrigin))throw Error('识别没有说明译文来自截图还是机器翻译，请核对。');
    if(!Array.isArray(raw.sourceEvidence)||raw.sourceEvidence.length>6)throw Error('来源证据格式无效。');
    const sourceEvidence=raw.sourceEvidence.map(v=>text(v,300,'可见来源证据'));
    const warnings=Array.isArray(raw.warnings)?raw.warnings.map(v=>text(v,300,'核对项')):[];
    if(warnings.length>10)throw Error('核对项过多，请重新识别。');
    return {quote,translation,translationOrigin,sourceSuggestion:text(raw.sourceSuggestion??'',400,'来源建议'),sourceEvidence,warnings,
      exampleHighlights:fragments(raw.exampleHighlights||[],quote,'原句高亮'),translationHighlights:fragments(raw.translationHighlights||[],translation,'译文高亮'),terms:terms(raw.terms||[])};
  }
  function parse(raw){
    if(typeof raw!=='string'||raw.length>40000)throw Error('识别响应为空或过长。');
    const body=raw.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
    let value;try{value=JSON.parse(body)}catch{throw Error('识别结果不是有效 JSON，原素材已保留，可重试。')}return extraction(value);
  }
  function sourceMatch(value,existing=[]){
    const key=comparable(value);if(!key)return '';
    return existing.find(item=>comparable(item)===key)||'';
  }
  function restore(draft){
    if(draft?.version!==1||!Array.isArray(draft.items))return [];
    const seen=new Set();return draft.items.slice(0,MAX_ITEMS).flatMap(item=>{
      const media=root.SceneData.normalizeMedia([item?.ref])[0];if(!media||seen.has(media.id))return [];seen.add(media.id);
      const status=item.status==='saved'?'saved':item.status==='running'?'error':['ready','error','pending'].includes(item.status)?item.status:'pending';
      return [{...item,id:media.id,ref:media,status,message:item.status==='running'?'上次识别已中断，可重试。':String(item.message||'').slice(0,600)}];
    });
  }
  root.CaptureData=Object.freeze({MAX_ITEMS,MAX_BYTES,MAX_BATCH_BYTES,comparable,dimensions,terms,extraction,parse,sourceMatch,restore});
})(globalThis);
