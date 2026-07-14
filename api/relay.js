const RELAY_HEADER = 'x-ai-vocab-relay';

function headerValue(request, name) {
  const headers = request?.headers || {};
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || '';
}

export function ipv6Blocked(text) {
  const value = String(text || '');
  const hasIpv6Hint = /正在使用\s*IPv6\s*访问|很抱歉您正在使用IPv6访问|姝ｅ湪浣跨敤\s*IPv6\s*璁块棶|寰堟姳姝夋偍姝ｅ湪浣跨敤IPv6璁块棶|ipv6/i.test(value);
  const looksLikeBlockPage = /<html|访问|抱歉|璁块棶|鎶辨瓑|forbidden|403/i.test(value);
  return hasIpv6Hint && looksLikeBlockPage;
}

export function relayBaseUrl() {
  return String(process.env.AI_IPV4_RELAY_BASE_URL || process.env.AI_RELAY_BASE_URL || '').replace(/\/+$/, '');
}

export function canRelay(request) {
  return Boolean(relayBaseUrl()) && headerValue(request, RELAY_HEADER) !== '1';
}

export async function relayApiRequest(request, response, endpoint, payload) {
  const base = relayBaseUrl();
  if (!base) return false;

  const headers = {
    'Content-Type': 'application/json',
    [RELAY_HEADER]: '1',
  };
  const authorization = headerValue(request, 'authorization');
  if (authorization) headers.Authorization = authorization;

  const upstream = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload || {}),
  });

  const contentType = upstream.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream') && upstream.body) {
    response.writeHead(upstream.status, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const reader = upstream.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) response.write(value);
    }
    response.end();
    return true;
  }

  const text = await upstream.text();
  if (contentType) response.setHeader?.('Content-Type', contentType);
  try {
    response.status(upstream.status).json(JSON.parse(text));
  } catch {
    response.status(upstream.status).json({ error: text || upstream.statusText || `HTTP ${upstream.status}` });
  }
  return true;
}

export async function relayIfIpv6Blocked({ request, response, endpoint, payload, status = 502, text = '' }) {
  if (!ipv6Blocked(text) || !canRelay(request)) return false;
  try {
    await relayApiRequest(request, response, endpoint, payload);
    return true;
  } catch (error) {
    response.status(status || 502).json({
      error: `上游 API 拒绝 IPv6 出口，且 IPv4 relay 也失败：${error.message || error}`,
    });
    return true;
  }
}
