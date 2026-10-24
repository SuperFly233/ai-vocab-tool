(function(root){
 const scopeKeys=['word','meaning','example','collocation','confusion','other'];
 const filterKeys=['entryType','language','direction','pos','style','folder','time'];
 const defaults={history:{sort:'updated',sortDir:'desc',filtersOpen:false,searchScopes:scopeKeys,filters:Object.fromEntries(filterKeys.map(key=>[key,[]]))},folders:{sort:'updated',searchScope:'all',contentType:'all'},scenes:{source:'',media:'',study:'',sort:'updated',group:'flat',favorite:''}};
 const choice=(value,allowed,fallback)=>allowed.includes(value)?value:fallback;
 const strings=value=>Array.isArray(value)?[...new Set(value.filter(item=>typeof item==='string'&&item.length<=400))].sort().slice(0,40):[];
 function normalize(page,value={}){
  if(page==='history'){
   const scopes=strings(value.searchScopes).filter(key=>scopeKeys.includes(key));
   return {sort:choice(value.sort,['updated','created','text','language','rolls','followups'],'updated'),sortDir:choice(value.sortDir,['asc','desc'],'desc'),filtersOpen:value.filtersOpen===true,searchScopes:scopes.length?scopes:[...scopeKeys],filters:Object.fromEntries(filterKeys.map(key=>[key,strings(value.filters?.[key])]))};
  }
  if(page==='folders')return {sort:choice(value.sort,['updated','created','title'],'updated'),searchScope:choice(value.searchScope,['all','current'],'all'),contentType:choice(value.contentType,['all','entry','scene'],'all')};
  if(page==='scenes')return {source:typeof value.source==='string'?value.source.slice(0,400):'',media:choice(value.media,['','image/','video/','text'],''),study:choice(value.study,['','new','review','mastered'],''),sort:choice(value.sort,['updated','created'],'updated'),group:choice(value.group,['flat','source'],'flat'),favorite:choice(value.favorite,['','favorite','pinned'],'')};
  return null;
 }
 function records(raw){
  const out={};for(const page of Object.keys(defaults)){const value=raw?.[page],clock=Date.parse(value?.updatedAt);if(Number.isFinite(clock))out[page]={value:normalize(page,value.value),updatedAt:new Date(clock).toISOString()}}
  return out;
 }
 function merge(a,b){
  const left=records(a),right=records(b),out={};
  for(const page of Object.keys(defaults)){const x=left[page],y=right[page];if(x||y)out[page]=!x?y:!y?x:Date.parse(x.updatedAt)!==Date.parse(y.updatedAt)?Date.parse(x.updatedAt)>Date.parse(y.updatedAt)?x:y:JSON.stringify(x.value)>JSON.stringify(y.value)?x:y}
  return out;
 }
 function get(page,settings){return normalize(page,settings.rememberViewFilters===false?defaults[page]:records(settings.viewPreferences)[page]?.value||defaults[page])}
 function update(page,value,settings){
  const stored=records(settings.viewPreferences),clock=new Date(Math.max(Date.now(),Date.parse(stored[page]?.updatedAt)||0)+1).toISOString();
  return {...settings,viewPreferences:{...stored,[page]:{value:normalize(page,value),updatedAt:clock}},updatedAt:clock};
 }
 root.ViewPreferences={defaults,normalize,records,merge,get,update};
})(globalThis);
