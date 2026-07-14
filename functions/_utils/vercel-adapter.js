export function installProcessEnv(env = {}) {
  const processLike = globalThis.process && typeof globalThis.process === 'object'
    ? globalThis.process
    : {};
  processLike.env = { ...(processLike.env || {}), ...env };
  globalThis.process = processLike;
}

function headersObject(headers) {
  const output = {};
  for (const [key, value] of headers.entries()) output[key.toLowerCase()] = value;
  return output;
}

async function requestBody(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return request.json().catch(() => ({}));
  }
  const text = await request.text().catch(() => '');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { rawBody: text };
  }
}

class VercelLikeResponse {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.encoder = new TextEncoder();
    this.sent = false;
    this.streamStarted = false;
    this.writeChain = Promise.resolve();
    this.responsePromise = new Promise(resolve => {
      this.resolveResponse = resolve;
    });
  }

  status(code) {
    this.statusCode = Number(code) || 200;
    return this;
  }

  setHeader(key, value) {
    this.headers.set(key, value);
    return this;
  }

  writeHead(code, headers = {}) {
    this.status(code);
    Object.entries(headers || {}).forEach(([key, value]) => this.headers.set(key, value));
    this.ensureStream();
    return this;
  }

  ensureStream() {
    if (this.streamStarted) return;
    const stream = new TransformStream();
    this.writer = stream.writable.getWriter();
    this.streamStarted = true;
    this.sent = true;
    this.resolveResponse(new Response(stream.readable, {
      status: this.statusCode,
      headers: this.headers,
    }));
  }

  write(chunk) {
    this.ensureStream();
    const data = chunk instanceof Uint8Array ? chunk : this.encoder.encode(String(chunk ?? ''));
    this.writeChain = this.writeChain.then(() => this.writer.write(data));
    return true;
  }

  end(chunk = '') {
    if (this.streamStarted) {
      if (chunk) this.write(chunk);
      this.writeChain = this.writeChain.then(() => this.writer.close()).catch(() => {});
      return;
    }
    this.sent = true;
    this.resolveResponse(new Response(chunk || '', {
      status: this.statusCode,
      headers: this.headers,
    }));
  }

  json(body) {
    if (!this.headers.has('content-type')) {
      this.headers.set('content-type', 'application/json; charset=utf-8');
    }
    this.sent = true;
    this.resolveResponse(new Response(JSON.stringify(body ?? null), {
      status: this.statusCode,
      headers: this.headers,
    }));
  }

  async flush() {
    await this.writeChain.catch(() => {});
  }
}

export async function runVercelHandler(handler, context) {
  installProcessEnv(context.env);
  const response = new VercelLikeResponse();
  const request = {
    method: context.request.method,
    url: context.request.url,
    headers: headersObject(context.request.headers),
    body: await requestBody(context.request),
  };

  const work = Promise.resolve(handler(request, response))
    .then(async () => {
      if (!response.sent) response.end();
      await response.flush();
    })
    .catch(error => {
      if (response.sent) {
        response.write(`data: ${JSON.stringify({ error: error.message || 'Unexpected server error' })}\n\n`);
        response.end();
        return;
      }
      response.status(error.status || 500).json({ error: error.message || 'Unexpected server error' });
    });

  context.waitUntil?.(work);
  return response.responsePromise;
}

export async function runVercelModule(importModule, context) {
  installProcessEnv(context.env);
  const mod = await importModule();
  return runVercelHandler(mod.default, context);
}
