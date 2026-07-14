import { ipv6Blocked, relayIfIpv6Blocked } from './relay.js';

async function assertCanUseEnvironmentKey(request, payload) {
  if (payload.apiKey) return;
  const admins = String(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  if (!admins.length) return;

  const token = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    const error = new Error('当前部署限制为管理员使用环境变量 API。请登录管理员账号，或在设置里填写自己的 API Key。');
    error.status = 403;
    throw error;
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uoifrqehkfvpzqojaazh.supabase.co';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
  const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!authResponse.ok) {
    const error = new Error('登录状态无效。请重新登录管理员账号，或在设置里填写自己的 API Key。');
    error.status = 403;
    throw error;
  }
  const user = await authResponse.json();
  if (!admins.includes(String(user.email || '').toLowerCase())) {
    const error = new Error('当前账号没有使用环境变量 API 的权限。请在设置里填写自己的 API Key。');
    error.status = 403;
    throw error;
  }
}

function compactError(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 360);
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = request.body || {};
  const apiUrl = payload.apiUrl || process.env.AI_API_URL;
  const apiKey = payload.apiKey || process.env.AI_API_KEY;
  const model = payload.model || process.env.AI_MODEL || 'gpt-4o-mini';

  if (!apiUrl || !apiKey) {
    response.status(400).json({ error: '请先填写 API URL 和 API Key，或配置 Vercel 环境变量。' });
    return;
  }

  try {
    await assertCanUseEnvironmentKey(request, payload);
    const started = Date.now();
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        max_tokens: 4,
        messages: [
          { role: 'system', content: 'Return exactly OK.' },
          { role: 'user', content: 'ping' },
        ],
      }),
    });

    const elapsedMs = Date.now() - started;
    const text = await upstream.text();
    if (ipv6Blocked(text) && await relayIfIpv6Blocked({ request, response, endpoint: 'test-profile', payload, status: upstream.status, text })) {
      return;
    }
    if (!upstream.ok) {
      response.status(upstream.status).json({
        ok: false,
        status: upstream.status,
        elapsedMs,
        error: compactError(text) || upstream.statusText || `HTTP ${upstream.status}`,
      });
      return;
    }

    let body = null;
    try {
      body = JSON.parse(text);
    } catch {}
    const content = String(body?.choices?.[0]?.message?.content || body?.choices?.[0]?.text || '').trim();
    response.status(200).json({
      ok: true,
      status: upstream.status,
      elapsedMs,
      model,
      sample: content.slice(0, 80),
    });
  } catch (error) {
    response.status(error.status || 500).json({ ok: false, error: error.message || '连接测试失败。' });
  }
}
