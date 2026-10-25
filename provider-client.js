import { modelEvents } from './model-stream.js?v=0.36.2';
import { safeParseJSON,lookupUserPrompt,followupMessages } from './provider-contract.js?v=0.42.2';
import { upstreamFailure } from './upstream-error.js?v=0.36.2';

const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','X-Lexi-Request-Path':'browser'}});
let promptPromise;
async function defaultPrompt(){
  if(!promptPromise)promptPromise=fetch('/api/config').then(async response=>{
    if(!response.ok)throw Error('无法读取查询规则，请稍后重试。');
    const data=await response.json();if(!data.defaultAnalyzePrompt)throw Error('查询规则未就绪。');return data.defaultAnalyzePrompt;
  }).catch(error=>{promptPromise=null;throw error});
  return promptPromise;
}
function canDirect(payload={}){
  try{const url=new URL(payload.apiUrl);return Boolean(payload.apiKey)&&url.protocol==='https:'&&url.hostname==='ai.hybgzs.com'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&/^\/v1\/chat\/completions\/?$/.test(url.pathname)&&!url.search&&!url.hash}catch{return false}
}
async function request(endpoint,payload,{signal}={}){
  if(!canDirect(payload))throw Error('此接口未启用浏览器直连。');
  if(!['analyze','followup','models','test-profile'].includes(endpoint))throw Error('不支持的模型操作。');
  const model=payload.model||'gpt-4o-mini',stream=Boolean(payload.stream),started=performance.now();
  const headers={'Content-Type':'application/json',Authorization:`Bearer ${payload.apiKey}`};
  const options={headers,credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal};
  const send=async(body,url=payload.apiUrl)=>{
    try{return await fetch(url,{...options,method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})})}
    catch(error){
      if(signal?.aborted)throw error;
      const offline=globalThis.navigator?.onLine===false;
      const failure=Error(offline
        ? '浏览器直连失败：当前设备报告离线，请恢复网络后重试。未自动改走云端或备用中继。'
        : '浏览器直连失败：未取得可读的 API 响应，不能据此判断模型或密钥错误。请用同一浏览器检查 ai.hybgzs.com 是否可访问，并核对代理分流、浏览器拦截及 API 跨域设置；官网能打开也不代表 API 可调用。未自动改走云端或备用中继。');
      failure.code=offline?'BROWSER_OFFLINE':'BROWSER_RESPONSE_UNAVAILABLE';
      failure.requestPath='browser';
      throw failure;
    }
  };
  const failure=async response=>json(upstreamFailure(response,await response.text(),payload.apiKey,'browser'),response.status);
  if(endpoint==='models'){
    const response=await send(null,new URL('/v1/models',payload.apiUrl).href);if(!response.ok)return failure(response);
    const data=await response.json(),items=Array.isArray(data?.data)?data.data:Array.isArray(data?.models)?data.models:Array.isArray(data)?data:[];
    return json({models:[...new Set(items.map(item=>typeof item==='string'?item:item?.id||item?.name).filter(Boolean))].sort()});
  }
  let messages,max_tokens,temperature;
  if(endpoint==='analyze'){messages=[{role:'system',content:payload.systemPrompt?.trim()||await defaultPrompt()},{role:'user',content:lookupUserPrompt(payload)}];max_tokens=9000;temperature=.2}
  else if(endpoint==='followup'){messages=followupMessages(payload,String(payload.question||'').trim());max_tokens=payload.purpose==='scene-title'?128:payload.purpose==='entry-supplement'?9000:1800;temperature=payload.purpose==='scene-title'?0.1:0.3}
  else{messages=[{role:'system',content:'Return exactly OK.'},{role:'user',content:'ping'}];max_tokens=4;temperature=0}
  const upstream=await send({model,temperature,max_tokens,stream:stream&&endpoint!=='test-profile',...(!stream&&endpoint==='analyze'?{response_format:{type:'json_object'}}:{}),messages});
  if(!upstream.ok)return failure(upstream);
  async function parse(content){
    try{return safeParseJSON(content)}catch{
      const response=await send({model,temperature:0,max_tokens:9000,response_format:{type:'json_object'},messages:[{role:'system',content:'你是 JSON 修复器。只返回合法 JSON，不要 Markdown、不要解释。保留原始字段名和内容；只修复逗号、引号、转义、括号闭合等格式问题。'},{role:'user',content:`修复下面这段 JSON，使它可以被 JSON.parse 解析：\n${String(content||'').slice(0,24000)}`}]});
      if(!response.ok)throw Error((await (await failure(response)).json()).error);
      const data=await response.json();return safeParseJSON(data.choices?.[0]?.message?.content);
    }
  }
  if(stream&&upstream.body&&(upstream.headers.get('content-type')||'').includes('text/event-stream')){
    const encoder=new TextEncoder(),iterator=modelEvents(upstream.body);let content='',thinking=false,cancelled=false;
    const body=new ReadableStream({
      async start(controller){
        const emit=data=>{if(!cancelled)controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))};
        try{
          for await(const event of iterator){const choice=event.choices?.[0];if(choice?.delta?.reasoning_content&&!content&&!thinking){thinking=true;emit({status:'thinking'})}const delta=choice?.delta?.content??choice?.message?.content??choice?.text??'';if(delta){content+=delta;if(content.length>2000000)throw Error('模型返回内容过长，已停止接收。');emit({delta})}}
          if(!content.trim())throw Error('模型没有返回正文。');
          emit(endpoint==='analyze'?{result:await parse(content),done:true}:{done:true});
        }catch(error){emit({error:error.message||'直连流式请求中断。'})}finally{if(!cancelled)controller.close()}
      },
      async cancel(){cancelled=true;await iterator.return?.()},
    });
    return new Response(body,{headers:{'Content-Type':'text/event-stream','X-Lexi-Request-Path':'browser'}});
  }
  const data=await upstream.json(),content=data.choices?.[0]?.message?.content;
  if(endpoint==='test-profile')return json({ok:true,elapsedMs:Math.round(performance.now()-started),model:data.model||model});
  if(!content)throw Error('模型没有返回正文。');
  return json(endpoint==='analyze'?await parse(content):{answer:String(content).trim()});
}
globalThis.ProviderClient=Object.freeze({canDirect,request});
export {canDirect,request};
