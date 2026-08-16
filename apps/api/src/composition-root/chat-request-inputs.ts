import type { ChatCompletionsPort, ChatCompletionMessage } from '../application/ports/inbound/ChatCompletionsPort.js';
import type { ResponsesPort } from '../application/ports/inbound/ResponsesPort.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';
import { AuthenticationRequiredError } from '../infrastructure/http/http-errors.js';

type Authenticator = (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>;

export async function readChatInput(req: unknown, authenticateApiKey: Authenticator): Promise<Parameters<ChatCompletionsPort['execute']>[0]> {
  const request = requestShape(req);
  const context = await authenticate(req, authenticateApiKey, 'chat.completions');
  const key = request.headers?.['idempotency-key'];
  if (typeof key !== 'string') throw new AuthenticationRequiredError();
  const body = request.body ?? {};
  return { userId: context.userId, walletId: context.walletId, clientId: context.clientId, apiKeyId: context.keyId, idempotencyKey: key, model: String(body.model ?? ''), messages: body.messages as ChatCompletionMessage[], maxTokens: body.max_tokens as number | undefined, temperature: body.temperature as number | undefined, stream: body.stream as boolean | undefined };
}

export async function readResponsesInput(req: unknown, authenticateApiKey: Authenticator, reply: unknown): Promise<Parameters<ResponsesPort['execute']>[0]> {
  const request = requestShape(req);
  const context = await authenticate(req, authenticateApiKey, 'chat.completions');
  const key = request.headers?.['idempotency-key'];
  if (typeof key !== 'string') throw new AuthenticationRequiredError();
  const body = request.body ?? {};
  const stream = body.stream as boolean | undefined;
  return { userId: context.userId, walletId: context.walletId, clientId: context.clientId, apiKeyId: context.keyId, idempotencyKey: key, model: String(body.model ?? ''), input: body.input as string | ChatCompletionMessage[], maxOutputTokens: body.max_output_tokens as number | undefined, stream, onChunk: stream ? createSseWriter(reply) : undefined };
}

function requestShape(req: unknown): { body?: Record<string, unknown>; headers?: Record<string, unknown> } {
  const request = req as { body?: unknown; headers?: unknown };
  return { body: isRecord(request.body) ? request.body : undefined, headers: isRecord(request.headers) ? request.headers : undefined };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }

async function authenticate(req: unknown, authenticateApiKey: Authenticator, scope: string): Promise<ApiKeyRequestContext> {
  const headers = requestShape(req).headers;
  const authorization = headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new AuthenticationRequiredError();
  return authenticateApiKey(authorization.slice(7).trim(), scope);
}

function createSseWriter(reply: unknown): (chunk: { delta: string; done: boolean }) => void {
  const raw = (reply as { raw?: { writeHead?: (status: number, headers: Record<string, string>) => void; write?: (data: string) => void; end?: () => void } }).raw;
  raw?.writeHead?.(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  return (chunk) => { raw?.write?.(`data: ${JSON.stringify({ type: chunk.done ? 'response.completed' : 'response.output_text.delta', delta: chunk.delta })}\n\n`); if (chunk.done) { raw?.write?.('data: [DONE]\n\n'); raw?.end?.(); } };
}
