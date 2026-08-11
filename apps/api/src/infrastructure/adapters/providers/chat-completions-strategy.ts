import type {
  ProtocolStrategy,
  ProviderRequest,
  ProviderResponse,
  ProviderStreamChunk,
} from './protocol-strategy.js';

export class ChatCompletionsStrategy implements ProtocolStrategy {
  readonly protocol = 'chat_completions' as const;

  buildRequest(req: ProviderRequest): { urlPath: string; body: Record<string, unknown> } {
    return { urlPath: '/chat/completions', body: buildBody(req) };
  }

  parseResponse(raw: unknown): ProviderResponse {
    const r = raw as Record<string, unknown>;
    const text = extractText(r);
    const usage = extractUsage(r);
    return { id: String(r.id ?? ''), content: text, usage, raw };
  }

  parseChunk(raw: unknown): ProviderStreamChunk {
    const r = raw as Record<string, unknown>;
    const choices = r.choices as Array<Record<string, unknown>> | undefined;
    if (!choices || choices.length === 0) return handleEmptyChoices(r);
    return handleDeltaChoice(choices[0]);
  }
}

function buildBody(req: ProviderRequest): Record<string, unknown> {
  return {
    model: req.model,
    messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: req.maxTokens,
    temperature: req.temperature,
    stream: req.stream ?? false,
  };
}

function extractText(r: Record<string, unknown>): string {
  const choices = r.choices as Array<Record<string, unknown>> | undefined;
  const msg = choices?.[0]?.message as Record<string, unknown> | undefined;
  const content = msg?.content;
  return String(content ?? '');
}

function extractUsage(r: Record<string, unknown>): { inputTokens: number; outputTokens: number } | undefined {
  const usage = r.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  if (!usage) return undefined;
  return { inputTokens: usage.prompt_tokens ?? 0, outputTokens: usage.completion_tokens ?? 0 };
}

function handleEmptyChoices(r: Record<string, unknown>): ProviderStreamChunk {
  const done = (r as Record<string, unknown>).done === true;
  return { delta: '', done };
}

function handleDeltaChoice(choice: Record<string, unknown>): ProviderStreamChunk {
  const delta = (choice.delta as Record<string, unknown>)?.content as string | undefined;
  const finish = choice.finish_reason as string | null | undefined;
  return { delta: delta ?? '', done: finish != null };
}
