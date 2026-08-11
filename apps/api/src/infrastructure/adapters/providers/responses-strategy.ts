import type {
  ProtocolStrategy,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamChunk,
} from './protocol-strategy.js';

export class ResponsesStrategy implements ProtocolStrategy {
  readonly protocol = 'responses' as const;

  buildRequest(req: ProviderRequest): { urlPath: string; body: Record<string, unknown> } {
    return {
      urlPath: '/responses',
      body: {
        model: req.model,
        input: req.messages.map((m) => ({ role: m.role, content: m.content })),
        max_output_tokens: req.maxTokens,
        temperature: req.temperature,
        stream: req.stream ?? false,
      },
    };
  }

  parseResponse(raw: unknown): ProviderResponse {
    const r = raw as Record<string, unknown>;
    const output = r.output as Array<Record<string, unknown>> | undefined;
    const text = extractText(output) ?? (r.content as string) ?? '';
    const usage = r.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    return {
      id: String(r.id ?? ''),
      content: text,
      usage: usage ? { inputTokens: usage.input_tokens ?? 0, outputTokens: usage.output_tokens ?? 0 } : undefined,
      raw,
    };
  }

  parseChunk(raw: unknown): ProviderStreamChunk {
    const r = raw as Record<string, unknown>;
    if (r.type === 'response.completed' || r.type === 'response.done') {
      return { delta: '', done: true };
    }
    const delta = (r.delta as string) ?? (r.text as string) ?? '';
    return { delta, done: false };
  }
}

function extractText(output: Array<Record<string, unknown>> | undefined): string | null {
  if (!output || output.length === 0) return null;
  const first = output[0] as Record<string, unknown>;
  const content = first.content as Array<Record<string, unknown>> | undefined;
  if (!content || content.length === 0) return null;
  return String(content[0]?.text ?? '');
}
