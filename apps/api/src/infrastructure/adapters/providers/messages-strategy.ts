import type {
  ProtocolStrategy,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamChunk,
} from './protocol-strategy.js';

export class MessagesStrategy implements ProtocolStrategy {
  readonly protocol = 'messages' as const;

  buildRequest(req: ProviderRequest): { urlPath: string; body: Record<string, unknown> } {
    return { urlPath: '/messages', body: buildBody(req) };
  }

  parseResponse(raw: unknown): ProviderResponse {
    const r = raw as Record<string, unknown>;
    const text = extractText(r);
    const usage = extractUsage(r);
    return { id: String(r.id ?? ''), content: text, usage, raw };
  }

  parseChunk(raw: unknown): ProviderStreamChunk {
    const r = raw as Record<string, unknown>;
    if (isStopChunk(r)) return { delta: '', done: true };
    return { delta: extractDelta(r), done: false };
  }
}

function buildBody(req: ProviderRequest): Record<string, unknown> {
  const system = req.messages.find((m) => m.role === 'system');
  const rest = req.messages.filter((m) => m.role !== 'system');
  return {
    model: req.model,
    system: system?.content,
    messages: rest.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stream: req.stream ?? false,
  };
}

function extractText(r: Record<string, unknown>): string {
  const content = r.content as Array<Record<string, unknown>> | undefined;
  if (content?.[0]?.text) return String(content[0].text);
  return String(r.content ?? '');
}

function extractUsage(r: Record<string, unknown>): { inputTokens: number; outputTokens: number } | undefined {
  const usage = r.usage as { input_tokens?: number; output_tokens?: number } | undefined;
  if (!usage) return undefined;
  return { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0 };
}

function isStopChunk(r: Record<string, unknown>): boolean {
  return r.type === 'message_stop' || r.type === 'content_block_stop';
}

function extractDelta(r: Record<string, unknown>): string {
  const delta = (r.delta as Record<string, unknown>)?.text as string | undefined;
  return delta ?? '';
}
