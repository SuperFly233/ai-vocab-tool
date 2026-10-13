(function attachLearningTools(root){
  const text=value=>String(value??'').trim();
  const searchKey=value=>text(value).normalize('NFKC').toLocaleLowerCase();
  function strings(value){
    if(Array.isArray(value))return value.flatMap(strings);
    if(value&&typeof value==='object')return Object.values(value).flatMap(strings);
    return typeof value==='string'?[value]:[];
  }
  function matches(value,query){
    const terms=searchKey(query).split(/\s+/).filter(Boolean);
    if(!terms.length)return true;
    const haystack=searchKey(strings(value).join('\n'));
    return terms.every(term=>haystack.includes(term));
  }
  function speechLanguage(language='',sample=''){
    const hint=searchKey(language);
    const known=[[/^(ja|jp)(-|$)|日本|日语|日文|japanese/,'ja-JP'],[/^(zh)(-|$)|中文|汉语|chinese/,'zh-CN'],[/^(ko)(-|$)|韩|korean/,'ko-KR'],[/^(fr)(-|$)|法语|french/,'fr-FR'],[/^(de)(-|$)|德语|german/,'de-DE'],[/^(es)(-|$)|西班牙|spanish/,'es-ES'],[/^(it)(-|$)|意大利|italian/,'it-IT'],[/^(ru)(-|$)|俄语|russian/,'ru-RU'],[/^(en)(-|$)|英语|english/,'en-US']];
    const explicit=known.find(([pattern])=>pattern.test(hint));
    if(explicit)return explicit[1];
    if(/[\u3040-\u30ff]/.test(sample))return 'ja-JP';
    if(/[\uac00-\ud7af]/.test(sample))return 'ko-KR';
    if(/[\u4e00-\u9fff]/.test(sample))return 'zh-CN';
    return 'en-US';
  }
  const md=value=>text(value).replace(/\\/g,'\\\\').replace(/([`*_\[\]<>#|])/g,'\\$1').replace(/\r?\n/g,'  \n');
  const section=(label,value)=>text(value)?`**${label}** ${md(value)}\n`:'';
  function fragmentMarkdown(pin={},source=''){
    return [`## ${md(pin.title||'片段')}`,source?`来自：${md(source)}`:'',section('释义',pin.meaning),section('例句',pin.example),section('译文',pin.translation),section('辨析',pin.detail)].filter(Boolean).join('\n');
  }
  function resultMarkdown(result={},options={}){
    const head=result.headword||{},meta=result.meta||{};
    const title=head.title||options.title||meta.normalized||meta.query||'词条';
    const origin=options.origin||meta.origin||meta.query;
    const lines=[`# ${md(title)}`];
    if(origin&&origin!==title)lines.push(section('原始输入',origin));
    lines.push(section('语言',head.languageTag||meta.language),section('核心义',head.coreMeaning),md(head.summary));
    const groups=[['义项',result.senses,item=>[section('词性',item.partOfSpeech),section('释义',item.meaning),section('例句',item.example),section('译文',item.translation)].filter(Boolean),item=>item.shortestLabel],['搭配',result.collocations,item=>[section('释义',item.meaning),section('例句',item.example),section('译文',item.translation),section('备注',item.note)].filter(Boolean),item=>item.phrase],['辨析',result.confusions,item=>[section('区别',item.difference),section('使用',item.usage)].filter(Boolean),item=>item.term]];
    for(const [name,items,details,titleOf] of groups){
      if(!Array.isArray(items)||!items.length)continue;
      lines.push(`## ${name}`);
      items.forEach((item,index)=>lines.push(`### ${index+1}. ${md(titleOf(item)||name)}`, ...details(item)));
    }
    if(result.register&&Object.values(result.register).some(text))lines.push('## 使用说明',section('语体',result.register.style),section('语感',result.register.tone),section('环境',result.register.environment));
    if(text(options.note))lines.push('## 个人笔记',text(options.note));
    if(Array.isArray(options.pins)&&options.pins.length)lines.push('## 收藏片段',...options.pins.map(pin=>fragmentMarkdown(pin,title).replace(/^## /,'### ')));
    return lines.filter(Boolean).join('\n\n')+'\n';
  }
  function reviewDeck(entries=[]){
    return entries.map(entry=>{
      const result=entry.result||{},head=result.headword||{},meta=result.meta||{},pin=entry.pin;
      const title=head.title||entry.title||meta.normalized||meta.query||'词条';
      const answer=pin?(pin.meaning||pin.detail||pin.translation):head.coreMeaning;
      const senses=Array.isArray(result.senses)?result.senses:[];
      return {
        key:pin?`${entry.id}:${pin.key}`:`${entry.id}:${entry.contentKey||title}`,
        historyId:entry.id,fragmentKey:pin?.key||'',sourceTitle:title,
        prompt:pin?(pin.kind==='sense'?title:pin.title||title):title,
        cue:pin?(pin.example||''):'',
        answer:answer||head.summary||senses[0]?.meaning||'暂无释义',
        example:pin?.example||senses[0]?.example||'',
        translation:pin?.translation||senses[0]?.translation||'',
        language:head.languageTag||meta.language||'',kind:pin?.kind||'word',
      };
    });
  }
  function restoreReview(cards,sourceKey,saved={}){
    saved=saved&&typeof saved==='object'?saved:{};
    const byKey=new Map(cards.map(card=>[card.key,card]));
    const valid=Array.isArray(saved.keys)?[...new Set(saved.keys.filter(key=>byKey.has(key)))]:[];
    const resume=saved.sourceKey===sourceKey&&valid.length&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<saved.keys.length;
    if(!resume)return {sourceKey,keys:cards.map(card=>card.key),index:0,ratings:{},revealed:false};
    const completed=new Set(saved.keys.slice(0,saved.index));
    const ratings=Object.fromEntries(Object.entries(saved.ratings||{}).filter(([key,value])=>valid.includes(key)&&['known','again','skip'].includes(value)));
    return {sourceKey,keys:valid,index:valid.filter(key=>completed.has(key)).length,ratings,revealed:Boolean(saved.revealed)};
  }
  function rateReview(session,rating){
    if(!session.keys[session.index]||!['known','again','skip'].includes(rating))return session;
    if(rating!=='skip'&&!session.revealed)return session;
    return {...session,index:session.index+1,revealed:false,ratings:{...session.ratings,[session.keys[session.index]]:rating}};
  }
  function shuffleReview(session,random=Math.random){
    const tail=session.keys.slice(session.index);
    for(let index=tail.length-1;index>0;index--){
      const target=Math.floor(random()*(index+1));
      [tail[index],tail[target]]=[tail[target],tail[index]];
    }
    return {...session,keys:[...session.keys.slice(0,session.index),...tail],revealed:false};
  }
  root.LearningTools={matches,speechLanguage,resultMarkdown,fragmentMarkdown,reviewDeck,restoreReview,rateReview,shuffleReview};
})(typeof window==='undefined'?globalThis:window);
