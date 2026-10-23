const assert = require('node:assert/strict');

(async () => {
  const { request } = await import('../provider-client.js');
  const originalFetch = globalThis.fetch;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const payload = { apiUrl: 'https://ai.hybgzs.com/v1/chat/completions', apiKey: 'synthetic-not-a-key', model: 'fixture' };
  let calls = 0;
  try {
    globalThis.fetch = async () => { calls++; throw new TypeError('Failed to fetch'); };
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
    await assert.rejects(request('test-profile', payload), error => {
      assert.equal(error.code, 'BROWSER_RESPONSE_UNAVAILABLE');
      assert.equal(error.requestPath, 'browser');
      assert.ok(error.message.includes('官网能打开也不代表 API 可调用'));
      assert.ok(!error.message.includes(payload.apiKey));
      return true;
    });
    assert.equal(calls, 1, 'No silent alternate transport or network probe');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
    await assert.rejects(request('test-profile', payload), error => error.code === 'BROWSER_OFFLINE');
    const controller = new AbortController(), cancelled = new DOMException('Cancelled', 'AbortError');
    controller.abort();
    globalThis.fetch = async () => { throw cancelled; };
    await assert.rejects(request('test-profile', payload, { signal: controller.signal }), error => error === cancelled);
    globalThis.fetch = async () => new Response('<html><title>Blocked</title></html>', { status: 403 });
    const blocked = await request('test-profile', payload), value = await blocked.json();
    assert.equal(blocked.status, 403);
    assert.equal(value.code, 'UPSTREAM_ACCESS_BLOCKED');
    assert.ok(!value.error.includes('<html'));
    globalThis.fetch = async () => Response.json({ error: { message: 'Invalid key' } }, { status: 401 });
    const denied = await request('test-profile', payload);
    assert.equal(denied.status, 401);
    assert.equal((await denied.json()).code, 'UPSTREAM_API_ERROR');
    console.log('Provider network: unreadable response, offline, abort, safe HTTP403/401, secret exclusion and no silent fallback passed.');
  } finally {
    globalThis.fetch = originalFetch;
    if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
    else delete globalThis.navigator;
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
