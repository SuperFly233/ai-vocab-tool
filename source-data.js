(function(root){
  'use strict';
  const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const normalize=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase('en');
  function source(value){
    if(!value||!uuid.test(value.id||'')||typeof value.name!=='string'||!value.name.trim()||value.name.length>200)throw Error('来源名称或标识无效。');
    if(!Array.isArray(value.aliases)||value.aliases.length>30||value.aliases.some(v=>typeof v!=='string'||!v.trim()||v.length>200))throw Error('来源别名最多30个，每个200字。');
    if(!['game','animation','book','video','other'].includes(value.type))throw Error('来源类型无效。');
    return {id:value.id,name:value.name.trim(),type:value.type,aliases:[...new Map(value.aliases.map(v=>[normalize(v),v.trim()])).values()].filter(v=>normalize(v)!==normalize(value.name)),revision:Number.isSafeInteger(value.revision)&&value.revision>=0?value.revision:0,deleted:value.deleted===true};
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
  root.SourceData=Object.freeze({normalize,source,reference,match,health,classification});
})(globalThis);
