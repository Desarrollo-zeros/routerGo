import type { ResponsesInput, ResponsesOutput, ResponsesPort } from '../ports/inbound/ResponsesPort.js';
import type { ChatCompletionsPort } from '../ports/inbound/ChatCompletionsPort.js';

export class ResponsesUseCase implements ResponsesPort {
  constructor(private readonly chat: ChatCompletionsPort) {}

  async execute(input: ResponsesInput): Promise<ResponsesOutput> {
    const result = await this.chat.execute({
      userId: input.userId,
      walletId: input.walletId,
      model: input.model,
      messages: normalizeInput(input.input),
      idempotencyKey: input.idempotencyKey,
      maxTokens: input.maxOutputTokens,
      stream: input.stream,
    });
    return {
      id: result.id,
      object: 'response',
      status: 'completed',
      model: result.model,
      output: [{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: result.choices[0].message.content }] }],
    };
  }
}

function normalizeInput(input: ResponsesInput['input']): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  if (typeof input === 'string') return [{ role: 'user', content: input }];
  return input;
}
