function inferModelsUrl(apiUrl) {
  const raw = String(apiUrl || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    url.pathname = url.pathname
      .replace(/\/chat\/completions\/?$/, '/models')
      .replace(/\/responses\/?$/, '/models')
      .replace(/\/completions\/?$/, '/models');
    if (!/\/models\/?$/.test(url.pathname)) {
      url.pathname = `${url.pathname.replace(/\/$/, '')}/models`;
    }
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return raw
      .replace(/\/chat\/completions\/?$/, '/models')
      .replace(/\/responses\/?$/, '/models')
      .replace(/\/completions\/?$/, '/models')
      .replace(/\/$/, '') + '/models';
  }
}

function normalizeModels(data) {
  if (Array.isArray(data?.data)) return data.data.map(item => item?.id || item?.name).filter(Boolean);
  if (Array.isArray(data?.models)) return data.models.map(item => typeof item === 'string' ? item : item?.id || item?.name).filter(Boolean);
  if (Array.isArray(data)) return data.map(item => typeof item === 'string' ? item : item?.id || item?.name).filter(Boolean);
  return [];
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const payload = request.body || {};
  const apiUrl = inferModelsUrl(payload.apiUrl || process.env.AI_API_URL);
  const apiKey = payload.apiKey || process.env.AI_API_KEY;

  if (!apiUrl || !apiKey) {
    response.status(400).json({ error: '请先填写 API URL 和 API Key。' });
    return;
  }

  try {
    const upstream = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!upstream.ok) {
      response.status(upstream.status).json({ error: await upstream.text() });
      return;
    }
    const models = [...new Set(normalizeModels(await upstream.json()))].sort();
    response.status(200).json({ models });
  } catch (error) {
    response.status(500).json({ error: error.message || '模型列表查询失败。' });
  }
}
