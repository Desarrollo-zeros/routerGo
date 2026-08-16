import { describe, expect, it } from 'vitest';
import { ChatCompletionsError, ChatCompletionsUseCase } from '../application/use-cases/ChatCompletions';

const clock = { now: () => new Date('2030-01-01T00:00:00Z') };

function create() {
  const calls: string[] = [];
  const useCase = new ChatCompletionsUseCase({
    clock,
    createQuote: { execute: async (input) => { calls.push(`quote:${input.modelId}`); return { quoteId: 'quote-1', creditPrice: '2', expiresAt: '2030-01-01T00:05:00Z', reused: false }; } },
    executeRun: { execute: async (input) => { calls.push(`run:${input.quoteId}`); return { runId: 'run-1', status: 'COMPLETED', economyStatus: 'SETTLED', content: 'hello world', actualUserCredits: 2n, providerRequestId: 'provider-1', reused: false }; } },
  });
  return { calls, useCase };
}

describe('chat completions application boundary', () => {
  it('composes quote and execution into the OpenAI response shape', async () => {
    const { calls, useCase } = create();
    const result = await useCase.execute({ userId: 'user-1', walletId: 'wallet-1', model: 'model-1', messages: [{ role: 'user', content: 'hello' }], idempotencyKey: 'request-1' });
    expect(calls).toEqual(['quote:model-1', 'run:quote-1']);
    expect(result).toMatchObject({ id: 'provider-1', object: 'chat.completion', model: 'model-1', choices: [{ message: { role: 'assistant', content: 'hello world' } }] });
  });

  it('rejects streaming until the streaming boundary is implemented', async () => {
    const { useCase } = create();
    await expect(useCase.execute({ userId: 'u', walletId: 'w', model: 'm', messages: [{ role: 'user', content: 'x' }], idempotencyKey: 'k', stream: true })).rejects.toMatchObject({ code: 'STREAMING_NOT_SUPPORTED' });
  });

  it('rejects empty requests before economic operations', async () => {
    const { useCase } = create();
    await expect(useCase.execute({ userId: 'u', walletId: 'w', model: 'm', messages: [], idempotencyKey: 'k' })).rejects.toBeInstanceOf(ChatCompletionsError);
  });
});
