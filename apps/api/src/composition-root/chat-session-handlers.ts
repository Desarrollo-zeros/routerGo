import type { CreateQuotePort } from '../application/ports/inbound/CreateQuotePort.js';
import type { ExecuteQuotedRunPort, ExecuteQuotedRunInput } from '../application/ports/inbound/ExecuteQuotedRunPort.js';
import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';
import type { RedisStreamAdapter } from '../infrastructure/adapters/redis/RedisStreamAdapter.js';

type SessionRequest = { user?: { userId?: unknown; walletId?: unknown } };
type Request = SessionRequest & { body?: unknown };
type Message = ExecuteQuotedRunInput['messages'][number];

export function createQuoteHandler(useCase: CreateQuotePort) {
  return async (request: unknown): Promise<unknown> => {
    const { userId, walletId } = sessionUser(request);
    const body = bodyOf(request);
    return useCase.execute({ userId, walletId, modelId: stringValue(body.logicalModelId), idempotencyKey: stringValue(body.idempotencyKey), maxOutputTokens: numberValue(body.maxOutputTokens) });
  };
}

export function createRunHandler(useCase: ExecuteQuotedRunPort, streams: RedisStreamAdapter) {
  return async (request: unknown): Promise<unknown> => {
    const { userId } = sessionUser(request);
    const body = bodyOf(request);
    const events = new RunEventWriter(streams);
    const result = await useCase.execute({
      userId, quoteId: stringValue(body.quoteId), idempotencyKey: stringValue(body.idempotencyKey), messages: messagesValue(body.messages), stream: body.stream !== false,
      onRunCreated: (runId) => events.start(runId), onChunk: (chunk) => events.chunk(chunk),
    });
    await events.finish(result.runId, { status: result.status, content: result.content });
    return result;
  };
}

class RunEventWriter {
  private runId: string | undefined;
  private writes = Promise.resolve();

  constructor(private readonly streams: RedisStreamAdapter) {}

  start(runId: string): void { this.runId = runId; }

  chunk(chunk: { delta: string; done: boolean }): void {
    if (!this.runId) return;
    this.writes = this.writes.then(() => this.streams.append(this.runId!, 'chunk', JSON.stringify(chunk)).then(() => undefined));
  }

  async finish(runId: string, result: { status: string; content: string }): Promise<void> {
    await this.writes;
    await this.streams.append(runId, 'done', JSON.stringify(result));
  }
}

function sessionUser(request: unknown): { userId: string; walletId: string } {
  const user = (request as Request).user;
  if (typeof user?.userId !== 'string' || typeof user.walletId !== 'string') throw new AuthenticationRequiredError();
  return { userId: user.userId, walletId: user.walletId };
}

function bodyOf(request: unknown): Record<string, unknown> {
  const body = (request as Request).body;
  if (!body || typeof body !== 'object') throw new Error('InvalidInput');
  return body as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('InvalidInput');
  return value.trim();
}

function numberValue(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number') throw new Error('InvalidInput');
  return value;
}

function messagesValue(value: unknown): Message[] {
  if (!Array.isArray(value) || value.length === 0) throw new Error('InvalidInput');
  return value.map((message) => {
    const item = message as Record<string, unknown>;
    if (!['system', 'user', 'assistant'].includes(String(item.role)) || typeof item.content !== 'string' || !item.content) throw new Error('InvalidInput');
    return { role: item.role as Message['role'], content: item.content };
  });
}
