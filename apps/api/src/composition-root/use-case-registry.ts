import type { RuntimeManifest } from '../config/RuntimeManifest.js';
import type { GetCatalogPort } from '../application/ports/inbound/GetCatalogPort.js';
import type { GetEconomyPort } from '../application/ports/inbound/GetEconomyPort.js';
import type { GetWalletPort } from '../application/ports/inbound/GetWalletPort.js';
import type { ListModelsPort } from '../application/ports/inbound/ListModelsPort.js';
import type { UseCaseHandler, UseCaseRegistry } from '../infrastructure/http/dynamic-route-registry.js';
import { AuthenticationRequiredError, RouteNotReadyError } from '../infrastructure/http/http-errors.js';
import type { ChatCompletionsPort, ChatCompletionMessage } from '../application/ports/inbound/ChatCompletionsPort.js';
import type { ResponsesPort } from '../application/ports/inbound/ResponsesPort.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';

interface RegistryDeps {
  manifest: RuntimeManifest;
  catalog: GetCatalogPort;
  models: ListModelsPort;
  wallet: GetWalletPort;
  economy: GetEconomyPort;
  chatCompletions: ChatCompletionsPort;
  responses: ResponsesPort;
  authenticateApiKey: (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>;
}

export function createUseCaseRegistry(deps: RegistryDeps): UseCaseRegistry {
  return {
    healthCheck: async () => ({ status: 'ok' }),
    readinessCheck: async () => ({ ready: true }),
    getManifest: async () => deps.manifest,
    getCatalog: async () => deps.catalog.execute(),
    listModels: async (req) => { await authenticate(req, deps.authenticateApiKey, 'models.read'); return deps.models.execute(); },
    getWallet: async (req) => deps.wallet.execute(readWalletInput(req)),
    getWalletLedger: notReady,
    verifyActivity: notReady,
    createQuote: notReady,
    createRun: notReady,
    streamRun: notReady,
    getEconomy: async () => deps.economy.execute(),
    chatCompletions: async (req, reply) => deps.chatCompletions.execute(await readChatInput(req, deps.authenticateApiKey, reply)),
    responses: async (req, reply) => deps.responses.execute(await readResponsesInput(req, deps.authenticateApiKey, reply)),
  };
}

const notReady: UseCaseHandler = async () => {
  throw new RouteNotReadyError();
};

function readWalletInput(req: unknown): { userId: string; walletId: string } {
  const user = (req as { user?: { userId?: unknown; walletId?: unknown } }).user;
  if (typeof user?.userId !== 'string' || typeof user.walletId !== 'string') {
    throw new AuthenticationRequiredError();
  }
  return { userId: user.userId, walletId: user.walletId };
}

async function authenticate(req: unknown, authenticateApiKey: RegistryDeps['authenticateApiKey'], scope: string): Promise<ApiKeyRequestContext> {
  const rawKey = bearerToken(req);
  return authenticateApiKey(rawKey, scope);
}

async function readChatInput(req: unknown, authenticateApiKey: RegistryDeps['authenticateApiKey'], reply: unknown) {
  const request = req as { body?: Record<string, unknown>; headers?: Record<string, unknown>; user?: { userId?: unknown; walletId?: unknown } };
  const context = await authenticate(req, authenticateApiKey, 'chat.completions');
  const userId = context.userId;
  const walletId = context.walletId;
  const key = request.headers?.['idempotency-key'];
  if (typeof userId !== 'string' || typeof walletId !== 'string' || typeof key !== 'string') throw new AuthenticationRequiredError();
  const body = request.body ?? {};
  return { userId, walletId, clientId: context.clientId, apiKeyId: context.keyId, idempotencyKey: key, model: String(body.model ?? ''), messages: body.messages as ChatCompletionMessage[], maxTokens: body.max_tokens as number | undefined, temperature: body.temperature as number | undefined, stream: body.stream as boolean | undefined };
}

async function readResponsesInput(req: unknown, authenticateApiKey: RegistryDeps['authenticateApiKey'], reply: unknown) {
  const request = req as { body?: Record<string, unknown>; headers?: Record<string, unknown>; user?: { userId?: unknown; walletId?: unknown } };
  const context = await authenticate(req, authenticateApiKey, 'chat.completions');
  const userId = context.userId;
  const walletId = context.walletId;
  const key = request.headers?.['idempotency-key'];
  if (typeof userId !== 'string' || typeof walletId !== 'string' || typeof key !== 'string') throw new AuthenticationRequiredError();
  const body = request.body ?? {};
  const stream = body.stream as boolean | undefined;
  const response = reply as { raw?: { writeHead?: (status: number, headers: Record<string, string>) => void; write?: (data: string) => void; end?: () => void } };
  const onChunk = stream ? createSseWriter(response) : undefined;
  return { userId, walletId, clientId: context.clientId, apiKeyId: context.keyId, idempotencyKey: key, model: String(body.model ?? ''), input: body.input as string | ChatCompletionMessage[], maxOutputTokens: body.max_output_tokens as number | undefined, stream, onChunk };
}

function bearerToken(req: unknown): string {
  const headers = (req as { headers?: Record<string, unknown> }).headers;
  const authorization = headers?.authorization;
  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new AuthenticationRequiredError();
  return authorization.slice(7).trim();
}

function createSseWriter(reply: { raw?: { writeHead?: (status: number, headers: Record<string, string>) => void; write?: (data: string) => void; end?: () => void } }): (chunk: { delta: string; done: boolean }) => void {
  reply.raw?.writeHead?.(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
  return (chunk) => {
    reply.raw?.write?.(`data: ${JSON.stringify({ type: chunk.done ? 'response.completed' : 'response.output_text.delta', delta: chunk.delta })}\n\n`);
    if (chunk.done) { reply.raw?.write?.('data: [DONE]\n\n'); reply.raw?.end?.(); }
  };
}
