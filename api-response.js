(function(root){
 'use strict';
 class ApiResponseError extends Error{constructor(label,status=502){super(`${label}服务未返回有效接口响应，本机数据保留。请检查网络或服务状态后重试。`);this.name='ApiResponseError';this.code='INVALID_API_RESPONSE';this.status=status>=400?status:502}}
 async function read(response,label='当前'){
  const type=response.headers?.get?.('content-type')||'';
  if(type&&!/\bapplication\/(?:[\w.-]+\+)?json\b/i.test(type)){await Promise.resolve(response.body?.cancel?.()).catch(()=>{});throw new ApiResponseError(label,response.status)}
  let value;try{value=await response.json()}catch{throw new ApiResponseError(label,response.status)}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiResponseError(label,response.status);return value;
 }
 function sync(value,action,payload={}){
  const validRows=Array.isArray(value.rows)&&value.rows.every(row=>row&&typeof row.key==='string'&&typeof row.updated_at==='string'&&Number.isFinite(Date.parse(row.updated_at)));
  if(action==='select'){if(!validRows)throw new ApiResponseError('同步');return value}
  if(action==='upsert'){
   if(!validRows)throw new ApiResponseError('同步');const expected=payload.rows||[],received=new Set(value.rows.map(row=>row.key));if(!Number.isSafeInteger(value.count)||value.count!==expected.length||received.size!==expected.length||value.rows.length!==expected.length||expected.some(row=>!received.has(row.key)))throw new ApiResponseError('同步');return value;
  }
  throw new ApiResponseError('同步');
 }
 root.ApiResponse=Object.freeze({read,sync,ApiResponseError});
})(globalThis);
