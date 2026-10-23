import assert from 'node:assert/strict';
import { upstreamFailure } from '../api/upstream-error.js';
const blocked='<html lang="zh"><head><title>访问已被拦截</title><style>body{background:url(data:image/jpeg;base64,'+'A'.repeat(50000)+')}</style></head><body>Blocked</body></html>';
const failure=upstreamFailure({status:403},blocked);
assert.equal(failure.code,'UPSTREAM_ACCESS_BLOCKED');
assert.equal(failure.requestPath,'cloud');
assert.ok(failure.error.includes('云端转发'));
assert.ok(failure.error.length<250&&!/html|base64|AAAA/.test(failure.error));
assert.equal(upstreamFailure({status:502},'<html>offline</html>').code,'UPSTREAM_NON_API_RESPONSE');
assert.equal(upstreamFailure({status:429},'{"error":{"message":"Rate limited"}}').error,'Rate limited');
assert.equal(upstreamFailure({status:401},'{"error":{"message":"Key test-secret invalid"}}','test-secret').error,'Key [已隐藏密钥] invalid');
assert.ok(upstreamFailure({status:500},'x'.repeat(2000)).error.endsWith('…'));
const originalFetch=globalThis.fetch;
try{
  globalThis.fetch=async()=>new Response(blocked,{status:403,headers:{'Content-Type':'text/html'}});
  for(const file of ['analyze','followup','models','test-profile']){
    const handler=(await import(`../api/${file}.js`)).default;
    const response={status(value){this.code=value;return this},json(value){this.body=value}};
    await handler({method:'POST',headers:{'x-ai-vocab-relay':'1'},body:{apiUrl:'https://example.invalid/v1/chat/completions',apiKey:'synthetic-secret',model:'synthetic',query:'word',question:'Meaning?'}},response);
    assert.equal(response.code,403,file);assert.equal(response.body.code,'UPSTREAM_ACCESS_BLOCKED',file);
    assert.ok(!JSON.stringify(response.body).includes('<html'),file);
  }
}finally{globalThis.fetch=originalFetch}
console.log('Upstream errors: 4 endpoints preserve HTTP status, hide HTML/base64/secrets, retain bounded JSON errors and clarify cloud path.');
