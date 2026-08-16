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
    assertStreamingBoundary(input);
    const quote = await this.dependencies.createQuote.execute(toQuoteInput(input));
    const run = await this.dependencies.executeRun.execute({ userId: input.userId, quoteId: quote.quoteId, idempotencyKey: input.idempotencyKey, messages: input.messages, stream: input.stream, onChunk: input.onChunk });
    const usage = { prompt_tokens: run.usage?.inputTokens ?? 0, completion_tokens: run.usage?.outputTokens ?? 0, total_tokens: (run.usage?.inputTokens ?? 0) + (run.usage?.outputTokens ?? 0) };
    return { id: run.providerRequestId ?? run.runId, object: 'chat.completion', created: Math.floor(this.dependencies.clock.now().getTime() / 1000), model: input.model, choices: [{ index: 0, message: { role: 'assistant', content: run.content }, finish_reason: 'stop' }], usage };
  }
}

function assertStreamingBoundary(input: ChatCompletionsInput): void {
  if (input.stream && !input.onChunk) throw new ChatCompletionsError('STREAMING_NOT_SUPPORTED');
}

function toQuoteInput(input: ChatCompletionsInput) {
  return { userId: input.userId, walletId: input.walletId, modelId: input.model, idempotencyKey: input.idempotencyKey, maxOutputTokens: input.maxTokens };
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
