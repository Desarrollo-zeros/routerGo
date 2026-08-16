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
import type { ApiKeyIdentityResolver } from '../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { AuthorizePermissionUseCase } from '../application/use-cases/AuthorizePermission.js';
import type { PublishRuntimeManifest } from '../application/use-cases/PublishRuntimeManifest.js';
import type { RollbackRuntimeManifest } from '../application/use-cases/RollbackRuntimeManifest.js';
import type { GetLedgerPort } from '../application/ports/inbound/GetLedgerPort.js';
import { AuthorizationDeniedError } from '../application/errors/AuthorizationDeniedError.js';
import type { AdvertiserHandlers } from './advertiser-handlers.js';
import { advertiserRead, advertiserWrite } from './advertiser-handlers.js';

interface RegistryDeps {
  manifest: RuntimeManifest;
  catalog: GetCatalogPort;
  models: ListModelsPort;
  wallet: GetWalletPort;
  economy: GetEconomyPort;
  chatCompletions: ChatCompletionsPort;
  responses: ResponsesPort;
  authenticateApiKey: (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>;
  resolveApiKeyIdentity: ApiKeyIdentityResolver;
  authorizePermission: AuthorizePermissionUseCase;
  publishRuntime: PublishRuntimeManifest;
  rollbackRuntime: RollbackRuntimeManifest;
  ledger: GetLedgerPort;
  advertiser: AdvertiserHandlers;
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
    getEconomy: async (req) => executeEconomy(req, deps),
    getLedger: async (req) => executeLedger(req, deps),
    getAdminWallet: async (req) => executeAdminWallet(req, deps),
    publishRuntime: async (req) => executePublish(req, deps),
    rollbackRuntime: async (req) => executeRollback(req, deps),
    advertiserAccount: async (req) => advertiserRead(req, deps, 'account'),
    advertiserCampaigns: async (req) => advertiserRead(req, deps, 'campaigns'),
    advertiserCreatives: async (req) => advertiserRead(req, deps, 'creatives'),
    advertiserAnalytics: async (req) => advertiserRead(req, deps, 'analytics'),
    advertiserCreateCampaign: async (req) => advertiserWrite(req, deps, 'createCampaign'),
    advertiserCreateCreative: async (req) => advertiserWrite(req, deps, 'createCreative'),
    advertiserSubmitCampaign: async (req) => advertiserWrite(req, deps, 'submitCampaign'),
    chatCompletions: async (req, reply) => deps.chatCompletions.execute(await readChatInput(req, deps.authenticateApiKey, reply)),
    responses: async (req, reply) => deps.responses.execute(await readResponsesInput(req, deps.authenticateApiKey, reply)),
  };
}


async function executePublish(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const context = await authenticate(req, deps.authenticateApiKey, 'runtime.publish');
  const identity = await requireIdentity(context, deps.resolveApiKeyIdentity);
  const decision = await deps.authorizePermission.execute({ identity, permission: 'runtime.publish' });
  return deps.publishRuntime.execute({ identity, decision, operationId: requiredHeader(req, 'idempotency-key'), correlationId: correlationId(req) });
}

async function executeEconomy(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const context = await authenticate(req, deps.authenticateApiKey, 'economy.read');
  const identity = await requireIdentity(context, deps.resolveApiKeyIdentity);
  const decision = await deps.authorizePermission.execute({ identity, permission: 'economy.read' });
  requireAllowed(decision);
  return deps.economy.execute();
}

async function executeLedger(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const context = await authenticate(req, deps.authenticateApiKey, 'audit.read');
  const identity = await requireIdentity(context, deps.resolveApiKeyIdentity);
  const decision = await deps.authorizePermission.execute({ identity, permission: 'audit.read' });
  requireAllowed(decision);
  return deps.ledger.execute({ identity, limit: queryLimit(req) });
}

async function executeAdminWallet(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const context = await authenticate(req, deps.authenticateApiKey, 'economy.read');
  const identity = await requireIdentity(context, deps.resolveApiKeyIdentity);
  const decision = await deps.authorizePermission.execute({ identity, permission: 'wallet.read' });
  requireAllowed(decision);
  return deps.wallet.execute({ userId: context.userId, walletId: context.walletId });
}

async function executeRollback(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const context = await authenticate(req, deps.authenticateApiKey, 'runtime.rollback');
  const identity = await requireIdentity(context, deps.resolveApiKeyIdentity);
  const decision = await deps.authorizePermission.execute({ identity, permission: 'runtime.publish' });
  const body = requestBody(req);
  const targetVersion = body.targetVersion;
  if (typeof targetVersion !== 'number' || !Number.isInteger(targetVersion) || targetVersion < 1) throw new Error('INVALID_RUNTIME_ROLLBACK');
  return deps.rollbackRuntime.execute({ identity, decision, operationId: requiredHeader(req, 'idempotency-key'), correlationId: correlationId(req), targetVersion });
}

async function requireIdentity(context: ApiKeyRequestContext, resolver: ApiKeyIdentityResolver) {
  const identity = await resolver.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  return identity;
}

function requestBody(req: unknown): Record<string, unknown> {
  const body = (req as { body?: unknown }).body;
  return typeof body === 'object' && body !== null ? body as Record<string, unknown> : {};
}

function requiredHeader(req: unknown, name: string): string {
  const headers = (req as { headers?: Record<string, unknown> }).headers;
  const value = headers?.[name];
  if (typeof value !== 'string' || !value.trim()) throw new AuthenticationRequiredError();
  return value.trim();
}

function correlationId(req: unknown): string {
  const headers = (req as { headers?: Record<string, unknown> }).headers;
  const value = headers?.['x-correlation-id'];
  return typeof value === 'string' && value.trim() ? value.trim() : requiredHeader(req, 'idempotency-key');
}

function requireAllowed(decision: { allowed: boolean; reason: 'ALLOWED' | 'MISSING_PERMISSION' | 'NO_ACTIVE_MEMBERSHIP' | 'WRONG_ORGANIZATION' | 'INACTIVE_ROLE' }): void {
  if (!decision.allowed) throw new AuthorizationDeniedError(decision.reason);
}

function queryLimit(req: unknown): number | undefined {
  const query = (req as { query?: Record<string, unknown> }).query;
  const value = query?.limit;
  return typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : undefined;
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
