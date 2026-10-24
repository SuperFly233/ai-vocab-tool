let dictionary=null,loading=null;
async function load(){
  if(dictionary)return dictionary;
  if(!loading)loading=fetch('/vendor/word-list/words.txt').then(async response=>{
    if(!response.ok)throw new Error('Dictionary unavailable');
    const text=await response.text();if(text.length>3200000)throw new Error('Dictionary too large');
    const words=[...new Set(text.split(/\r?\n/).map(v=>v.trim().toLowerCase()).filter(v=>/^[a-z'-]+$/.test(v)))].sort();
    return dictionary={words,set:new Set(words)};
  }).catch(error=>{loading=null;throw error});
  return loading;
}
function near(word,set){
  const candidates=new Set(),add=value=>{if(value!==word&&set.has(value))candidates.add(value)};
  for(let i=0;i<word.length;i++){
    add(word.slice(0,i)+word.slice(i+1));
    if(i+1<word.length)add(word.slice(0,i)+word[i+1]+word[i]+word.slice(i+2));
    for(const char of 'abcdefghijklmnopqrstuvwxyz')add(word.slice(0,i)+char+word.slice(i+1));
  }
  for(let i=0;i<=word.length;i++)for(const char of 'abcdefghijklmnopqrstuvwxyz')add(word.slice(0,i)+char+word.slice(i));
  return [...candidates].sort((a,b)=>a.length-b.length||a.localeCompare(b)).slice(0,8);
}
self.onmessage=async({data})=>{
  const {id,text}=data||{},query=String(text||'').toLowerCase();
  if(!/^[a-z'-]{2,40}$/.test(query)){postMessage({id,items:[]});return}
  try{
    const {words,set}=await load();let low=0,high=words.length;
    while(low<high){const mid=(low+high)>>>1;if(words[mid]<query)low=mid+1;else high=mid}
    const matches=[];for(let i=low;i<words.length&&matches.length<256&&words[i].startsWith(query);i++)matches.push(words[i]);
    const items=matches.sort((a,b)=>a.length-b.length||a.localeCompare(b)).slice(0,8).map(value=>({value,kind:'lexicon'}));
    if(!items.length&&query.length>=4)items.push(...near(query,set).map(value=>({value,kind:'spelling'})));
    postMessage({id,items});
  }catch{postMessage({id,items:[],unavailable:true})}
};
