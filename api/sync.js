const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://uoifrqehkfvpzqojaazh.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_G-_4O-n-Q73TbJ4R2YmG9w_7WlKHC80';
const CLOUD_KEYS = new Set([
  'ai_vocab_tool_history',
  'ai_vocab_tool_settings',
  'ai_vocab_tool_theme',
  'ai_vocab_tool_layout',
  'ai_vocab_tool_logs',
]);

function json(response, status, body) {
  response.status(status).json(body);
}

function authToken(request) {
  return String(request.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

async function supabaseFetch(path, token, options = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (options.prefer) headers.Prefer = options.prefer;
  const upstream = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers,
  });
  const text = await upstream.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: text }; }
  if (!upstream.ok) {
    const error = new Error(body?.message || body?.error || upstream.statusText || 'Supabase request failed');
    error.status = upstream.status;
    error.details = body;
    throw error;
  }
  return body;
}

async function currentUser(token) {
  return supabaseFetch('/auth/v1/user', token);
}

function allowedKeys(keys = []) {
  return [...new Set(keys.filter(key => CLOUD_KEYS.has(key)))];
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    json(response, 405, { error: 'Method not allowed' });
    return;
  }

  const token = authToken(request);
  if (!token) {
    json(response, 401, { error: 'Missing Supabase access token' });
    return;
  }

  try {
    const user = await currentUser(token);
    const payload = request.body || {};

    if (payload.action === 'select') {
      const keys = allowedKeys(payload.keys || []);
      if (!keys.length) {
        json(response, 200, { rows: [] });
        return;
      }
      const keyList = keys.map(key => encodeURIComponent(`"${key}"`)).join(',');
      const path = `/rest/v1/study_store?select=key,value&user_id=eq.${encodeURIComponent(user.id)}&key=in.(${keyList})`;
      const rows = await supabaseFetch(path, token, { method: 'GET' });
      json(response, 200, { rows });
      return;
    }

    if (payload.action === 'upsert') {
      const rows = Array.isArray(payload.rows) ? payload.rows : [];
      const safeRows = rows
        .filter(row => CLOUD_KEYS.has(row?.key))
        .map(row => ({
          user_id: user.id,
          key: row.key,
          value: row.value && typeof row.value === 'object' ? row.value : { raw: String(row.value?.raw || '') },
        }));
      if (!safeRows.length) {
        json(response, 200, { count: 0 });
        return;
      }
      await supabaseFetch('/rest/v1/study_store?on_conflict=user_id,key', token, {
        method: 'POST',
        prefer: 'resolution=merge-duplicates,return=minimal',
        body: JSON.stringify(safeRows),
      });
      json(response, 200, { count: safeRows.length });
      return;
    }

    json(response, 400, { error: 'Unknown sync action' });
  } catch (error) {
    json(response, error.status || 500, {
      error: error.message || 'Unexpected sync error',
      details: error.details || null,
    });
  }
}
