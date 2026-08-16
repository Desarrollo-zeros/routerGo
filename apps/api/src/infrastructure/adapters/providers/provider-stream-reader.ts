import type { ProtocolStrategy, ProviderResponse, ProviderStreamChunk } from './protocol-strategy.js';

export interface StreamReaderOptions {
  body: ReadableStream<Uint8Array>;
  strategy: ProtocolStrategy;
  requestId: string | null;
  onChunk: (chunk: ProviderStreamChunk) => void;
}

export async function readProviderStream(options: StreamReaderOptions): Promise<ProviderResponse> {
  const reader = options.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let usage: ProviderResponse['usage'];
  let id = options.requestId ?? '';
  while (true) {
    const next = await reader.read();
    buffer += decoder.decode(next.value ?? new Uint8Array(), { stream: !next.done });
    const parsed = parseLines(buffer, options, { content, usage, id });
    buffer = parsed.buffer; content = parsed.state.content; usage = parsed.state.usage; id = parsed.state.id;
    if (next.done) break;
  }
  return { id, content, usage, raw: undefined, requestId: id };
}

function parseLines(buffer: string, options: StreamReaderOptions, state: { content: string; usage: ProviderResponse['usage']; id: string }): { buffer: string; state: { content: string; usage: ProviderResponse['usage']; id: string } } {
  const lines = buffer.split('\n');
  const remainder = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    const payload = line.slice(5).trim();
    if (payload === '[DONE]') { options.onChunk({ delta: '', done: true, usage: state.usage }); continue; }
    const raw = JSON.parse(payload) as Record<string, unknown>;
    const chunk = options.strategy.parseChunk(raw);
    state.content += chunk.delta;
    state.usage = chunk.usage ?? state.usage;
    options.onChunk(chunk);
    if (chunk.done) state.id = state.id || String(raw.id ?? '');
  }
  return { buffer: remainder, state };
}
