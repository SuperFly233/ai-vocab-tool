export function upstreamFailure(upstream, text, secret = '', path = 'cloud') {
  const status = Number(upstream.status) || 502;
  const raw = String(text || '');
  let message = raw;
  try {
    const value = JSON.parse(raw);
    message = value?.error?.message || value?.message || (typeof value?.error === 'string' ? value.error : '');
  } catch {}
  const html = /<!doctype\s+html|<\/?(?:html|head|body|script|style|title)\b/i.test(message || raw);
  if (html) {
    const blocked = status === 403 || /访问已被拦截|access denied|challenge|captcha/i.test(raw);
    return {
      error: blocked
        ? (path === 'browser' ? '模型服务拦截了浏览器直连请求。本次未经过 Lexi 云端或备用中继，请核对本机网络、API 地址和服务商的访问要求。' : '模型服务返回了访问拦截页。本次请求经 Lexi 云端转发，服务商看到的不是手机或电脑的直连出口。请核对 API 专用地址和服务商支持的访问方式；切换本机代理不一定改变云端出口。')
        : `模型服务返回了网页而非 API 数据（HTTP ${status}）。请核对 API 地址及服务状态。`,
      code: blocked ? 'UPSTREAM_ACCESS_BLOCKED' : 'UPSTREAM_NON_API_RESPONSE',
      upstreamStatus: status,
      requestPath: path,
    };
  }
  message = String(message || upstream.statusText || `HTTP ${status}`);
  if (secret) message = message.split(secret).join('[已隐藏密钥]');
  message = message.replace(/data:[^\s"']+/gi, '[内嵌数据已省略]').replace(/\s+/g, ' ').trim();
  if (message.length > 600) message = message.slice(0, 600) + '…';
  return { error: message, code: 'UPSTREAM_API_ERROR', upstreamStatus: status, requestPath: path };
}
