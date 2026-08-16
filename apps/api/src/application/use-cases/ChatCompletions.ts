import type { ChatCompletionsPort, ChatCompletionsInput, ChatCompletionsOutput } from '../ports/inbound/ChatCompletionsPort';
import type { CreateQuotePort } from '../ports/inbound/CreateQuotePort';
import type { ExecuteQuotedRunPort } from '../ports/inbound/ExecuteQuotedRunPort';

export interface ChatCompletionsDependencies {
  createQuote: CreateQuotePort;
  executeRun: ExecuteQuotedRunPort;
  clock: { now(): Date };
}

export class ChatCompletionsUseCase implements ChatCompletionsPort {
  constructor(private readonly dependencies: ChatCompletionsDependencies) {}

  async execute(input: ChatCompletionsInput): Promise<ChatCompletionsOutput> {
    validateInput(input);
    if (input.stream) throw new ChatCompletionsError('STREAMING_NOT_SUPPORTED');
    const quote = await this.dependencies.createQuote.execute({ userId: input.userId, walletId: input.walletId, modelId: input.model, idempotencyKey: input.idempotencyKey });
    const run = await this.dependencies.executeRun.execute({ userId: input.userId, quoteId: quote.quoteId, idempotencyKey: input.idempotencyKey, messages: input.messages, stream: false });
    const usage = usageFromContent(run.content);
    return { id: run.providerRequestId ?? run.runId, object: 'chat.completion', created: Math.floor(this.dependencies.clock.now().getTime() / 1000), model: input.model, choices: [{ index: 0, message: { role: 'assistant', content: run.content }, finish_reason: 'stop' }], usage };
  }
}

export class ChatCompletionsError extends Error {
  constructor(readonly code: 'INVALID_INPUT' | 'STREAMING_NOT_SUPPORTED') {
    super(code);
    this.name = 'ChatCompletionsError';
  }
}

function validateInput(input: ChatCompletionsInput): void {
  if (!input.userId || !input.walletId || !input.model || !input.idempotencyKey || input.messages.length === 0) throw new ChatCompletionsError('INVALID_INPUT');
  if (input.messages.some((message) => !message.content || !['system', 'user', 'assistant'].includes(message.role))) throw new ChatCompletionsError('INVALID_INPUT');
  if (input.maxTokens !== undefined && (!Number.isInteger(input.maxTokens) || input.maxTokens < 1)) throw new ChatCompletionsError('INVALID_INPUT');
}

function usageFromContent(content: string): { prompt_tokens: number; completion_tokens: number; total_tokens: number } {
  const completion = content.length === 0 ? 0 : content.trim().split(/\s+/).length;
  return { prompt_tokens: 0, completion_tokens: completion, total_tokens: completion };
}
