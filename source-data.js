(function(root){
  'use strict';
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const normalize=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').replace(/\s*([:：])\s*/g,':').trim().toLocaleLowerCase('en');
  function source(value){
    if(!value||!uuid.test(value.id||'')||typeof value.name!=='string'||!value.name.trim()||value.name.length>200)throw Error('来源名称或标识无效。');
    if(!Array.isArray(value.aliases)||value.aliases.length>30||value.aliases.some(v=>typeof v!=='string'||!v.trim()||v.length>200))throw Error('来源别名最多30个，每个200字。');
    if(!['game','animation','book','video','other'].includes(value.type))throw Error('来源类型无效。');
    return {id:value.id,name:value.name.trim(),type:value.type,aliases:[...new Map(value.aliases.map(v=>[normalize(v),v.trim()])).values()].filter(v=>normalize(v)!==normalize(value.name)),revision:Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:0,deleted:value.deleted===true,...(Array.isArray(value.nodes)?{nodes:value.nodes.map(node)}:{})};
  }
  function reference(value){
    if(value===null)return null;
    if(!value||!uuid.test(value.id||'')||!['identity','alias','name','teyvat','manual'].includes(value.method)||typeof value.name!=='string'||value.name.length>200)throw Error('规范来源引用无效。');
    const result={id:value.id,method:value.method,name:value.name};
    if(value.evidence){const e=value.evidence;if(typeof e.key!=='string'||!e.key||e.key.length>400||!/^[a-f0-9]{64}$/.test(e.version||'')||typeof e.chapter!=='string'||e.chapter.length>400)throw Error('语录依据无效。');const url=new URL(e.url);if(url.origin!=='https://teyvat-scriptorium.pages.dev'||url.username||url.password||url.pathname!=='/')throw Error('语录链接无效。');result.evidence={key:e.key,version:e.version,chapter:e.chapter,url:url.href}}
    return result;
  }
  function match(scene,sources){
    const live=sources.filter(v=>!v.deleted),id=live.find(v=>v.id===scene.sourceRef?.id);
    if(id)return {method:'identity',candidates:[id]};
    const name=normalize(scene.sourceTitle);if(!name)return {method:'new',candidates:[]};
    const exact=live.filter(v=>normalize(v.name)===name||v.aliases.some(a=>normalize(a)===name));
    if(exact.length)return {method:exact.length===1?(normalize(exact[0].name)===name?'name':'alias'):'ambiguous',candidates:exact};
    return {method:'suggestion',candidates:live.filter(v=>normalize(v.name).includes(name)||name.includes(normalize(v.name))).slice(0,8)};
  }
  function health(group,sources){const s=group.scene,issues=[];if(!s.quote?.trim())issues.push('缺原句');if(!s.learningTargets?.some(v=>v.meaning?.trim()))issues.push('缺语境义');const m=match(s,sources);if(!s.sourceRef||m.method!=='identity')issues.push('来源待整理');return issues}
  function classification(scene,groups,folders,organizations){
    const names=new Set([scene.sourceTitle,...(scene.aiAnalysis?.sourceCandidates||[])].filter(v=>typeof v==='string'&&v.trim()).map(normalize)),votes=new Map(),allowed=new Map(folders.filter(v=>v.selectable!==false).map(v=>[v.id,v]));
    for(const group of groups){const peer=group.scene;if(peer.groupId===scene.groupId)continue;const sharedIdentity=scene.sourceRef?.id&&peer.sourceRef?.id===scene.sourceRef.id,conflictingIdentity=scene.sourceRef?.id&&peer.sourceRef?.id&&peer.sourceRef.id!==scene.sourceRef.id;
      if(!sharedIdentity&&(conflictingIdentity||!names.has(normalize(peer.sourceTitle))))continue;
      for(const id of new Set(organizations[peer.groupId]?.folderIds||[]))if(allowed.has(id))votes.set(id,(votes.get(id)||0)+1);
    }
    const existing=[...allowed.values()].filter(f=>votes.has(f.id)||names.has(normalize(f.name))).map(f=>({id:f.id,name:f.name,count:votes.get(f.id)||0,basis:names.has(normalize(f.name))?'名称一致':'同来源记录'})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name)||a.id.localeCompare(b.id)).slice(0,4);
    const title=String(scene.sourceTitle||scene.aiAnalysis?.sourceCandidates?.[0]||'').trim(),newNames=existing.length||!title||title.length>60||folders.some(f=>normalize(f.name)===normalize(title))?[]:[title];return {existing,newNames};
  }
  const kinds=['season','volume','arc','part','episode','chapter','quest','section'];
  function node(v){if(!v||!uuid.test(v.id||'')||!uuid.test(v.workId||'')||v.parentId&&!uuid.test(v.parentId)||!kinds.includes(v.kind)||typeof v.name!=='string'||!v.name.trim()||v.name.length>200)throw Error('来源章节身份或名称无效。');return {id:v.id,workId:v.workId,parentId:v.parentId||null,kind:v.kind,name:v.name.trim(),revision:Number.isSafeInteger(v.revision)?v.revision:1}}
  function path(v){if(v===null)return null;if(!v||!uuid.test(v.workId||'')||!Array.isArray(v.nodes)||v.nodes.length>2)throw Error('来源层级无效。');let parent=null;const nodes=v.nodes.map(n=>{const row=node({...n,workId:v.workId});if(row.parentId!==parent)throw Error('章节不属于当前来源路径。');parent=row.id;return row});return {workId:v.workId,nodes,basis:['manual','visible','context'].includes(v.basis)?v.basis:'unknown'}}
  function suggestion(v){if(v===null)return null;if(!v||typeof v!=='object'||Array.isArray(v))throw Error('来源建议无效。');const out={workId:uuid.test(v.workId||'')?v.workId:null,basis:['manual','visible','context'].includes(v.basis)?v.basis:'unknown'};for(const k of ['parent','chapter']){const n=v[k];if(n==null){out[k]=null;continue}if(typeof n.name!=='string'||!n.name.trim()||n.name.length>200||!kinds.includes(n.kind))throw Error('来源层级建议过长或无效。');out[k]={name:n.name.trim(),kind:n.kind}}return out}
  const workHints=[
    {key:'genshin-impact',name:'原神',type:'game',aliases:['Genshin Impact','原神 (Genshin Impact)','原神（Genshin Impact）']},
    {key:'honkai-star-rail',name:'崩坏：星穹铁道',type:'game',aliases:['崩坏:星穹铁道','崩坏： 星穹铁道','Honkai: Star Rail','Honkai Star Rail']}
  ];
  function hint(name){const key=normalize(name);return workHints.find(w=>[w.name,...w.aliases].some(n=>normalize(n)===key))||null}
  function legacy(value){const raw=String(value||'').trim(),parts=raw.split(/\s*[|｜]\s*/);if(parts.length<2)return {name:raw,chapter:''};const at=parts.findIndex((s,i)=>i>0&&/^(?:EP\.?\s*\d+|Episode\s+\d+|第\s*\d+\s*[集话話])/i.test(s));if(at<0)return {name:raw,chapter:''};const name=parts[0].replace(/\s*[•·]\s*(?:ENG(?:LISH)?\s+DUB|ENGLISH DUBBED)\s*$/i,'').trim();return {name:name||raw,chapter:parts.slice(at).join(' · ')}}
  function proposal(scene){const parsed=legacy(scene.sourceTitle),name=parsed.name;if(!name)return null;const h=hint(name);return {key:h?'known:'+h.key:'name:'+normalize(name),name:h?.name||name,type:h?.type||(parsed.chapter?'video':'other'),aliases:h?.aliases||[],chapter:parsed.chapter}}
  root.SourceData=Object.freeze({normalize,source,reference,match,health,classification,node,path,suggestion,kinds,workHints,hint,proposal,legacy});
})(globalThis);
