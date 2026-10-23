// Parse provider SSE incrementally, including an unterminated final frame.
export async function* modelEvents(body) {
  const reader = body?.getReader();
  if (!reader) throw new Error('当前模型接口没有返回可读取的流。');
  const decoder = new TextDecoder();
  let buffer = '';
  const parse = frame => {
    const raw = frame.split(/\r?\n/).filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart()).join('\n').trim();
    if (!raw || raw === '[DONE]') return raw === '[DONE]' ? { done: true } : null;
    try { return JSON.parse(raw); } catch { return null; }
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() || '';
      if (done && buffer.trim()) { frames.push(buffer); buffer = ''; }
      for (const frame of frames) {
        const event = parse(frame);
        if (!event) continue;
        if (event.done) return;
        if (event.error) throw new Error(event.error.message || String(event.error));
        yield event;
      }
      if (done) return;
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function streamHeaders(response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'X-Lexi-Stream': 'live',
  });
  response.flushHeaders?.();
}
