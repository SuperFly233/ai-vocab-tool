import { relayIfIpv6Blocked } from './relay.js';
import { upstreamFailure } from './upstream-error.js';
import { followupMessages } from '../provider-contract.js';
import { modelEvents, streamHeaders } from './model-stream.js';

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

function writeStreamEvent(response, data) {
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamFollowup(upstream, response) {
  streamHeaders(response);
  let thinking = false;
  let contentStarted = false;
  try {
    for await (const parsed of modelEvents(upstream.body)) {
      const choice = parsed.choices?.[0];
      if (choice?.delta?.reasoning_content && !thinking && !contentStarted) {
        thinking = true;
        writeStreamEvent(response, { status: 'thinking' });
      }
      const delta = choice?.delta?.content ?? choice?.message?.content ?? choice?.text ?? '';
      if (delta) {
        contentStarted = true;
        writeStreamEvent(response, { delta });
      }
    }
    writeStreamEvent(response, { done: true });
  } catch (error) {
    writeStreamEvent(response, { error: error.message || '流式追问中断。' });
  } finally {
    response.end();
  }
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
  const question = String(payload.question || '').trim();

  if (!apiUrl || !apiKey) {
    response.status(501).json({ error: '请先在设置里填写 API URL 和 API Key，或配置 Vercel 环境变量 AI_API_URL / AI_API_KEY。' });
    return;
  }
  if (!question) {
    response.status(400).json({ error: '请输入追问内容。' });
    return;
  }

  try {
    await assertCanUseEnvironmentKey(request, payload);
    const stream = Boolean(payload.stream);
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: stream ? 'text/event-stream' : 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: payload.purpose==='scene-title'?0.1:0.3,
        max_tokens: payload.purpose==='scene-title'?128:1800,
        stream,
        messages: followupMessages(payload, question),
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      if (await relayIfIpv6Blocked({ request, response, endpoint: 'followup', payload, status: upstream.status, text })) return;
      response.status(upstream.status).json(upstreamFailure(upstream, text, apiKey));
      return;
    }

    const upstreamContentType = upstream.headers.get('content-type') || '';
    if (stream && upstreamContentType.toLowerCase().includes('text/event-stream')) {
      await streamFollowup(upstream, response);
      return;
    }

    const data = await upstream.json();
    const answer = String(data.choices?.[0]?.message?.content || '').trim();
    if (!answer) {
      response.status(502).json({ error: 'Empty model response' });
      return;
    }
    if (stream) response.setHeader('X-Lexi-Stream', 'buffered');
    response.status(200).json({ answer });
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message || 'Unexpected server error' });
  }
}
