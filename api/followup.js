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

function compactContext(result) {
  return JSON.stringify({
    meta: result?.meta,
    headword: result?.headword,
    senses: result?.senses,
    collocations: result?.collocations,
    register: result?.register,
    confusions: result?.confusions,
  }).slice(0, 18000);
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

  const history = Array.isArray(payload.followups)
    ? payload.followups.slice(-8).map(item => `问：${item.question}\n答：${item.answer}`).join('\n\n')
    : '';

  try {
    await assertCanUseEnvironmentKey(request, payload);
    const upstream = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 1800,
        messages: [
          {
            role: 'system',
            content: '你是词汇追问助手。基于给定词条和上下文直接回答用户问题。回答要清楚、可读、简洁；可以用短段落和项目符号。不要返回 JSON，不要写寒暄，不要重复原词条全文。',
          },
          {
            role: 'user',
            content: [
              `当前词条 JSON：${compactContext(payload.result || {})}`,
              history ? `已有追问：\n${history}` : '已有追问：无',
              `本次追问：${question}`,
            ].join('\n\n'),
          },
        ],
      }),
    });

    if (!upstream.ok) {
      response.status(upstream.status).json({ error: await upstream.text() });
      return;
    }

    const data = await upstream.json();
    const answer = String(data.choices?.[0]?.message?.content || '').trim();
    if (!answer) {
      response.status(502).json({ error: 'Empty model response' });
      return;
    }
    response.status(200).json({ answer });
  } catch (error) {
    response.status(error.status || 500).json({ error: error.message || 'Unexpected server error' });
  }
}
