import type { RuntimeManifest } from '../config/RuntimeManifest.js';
import type { GetCatalogPort } from '../application/ports/inbound/GetCatalogPort.js';
import type { GetEconomyPort } from '../application/ports/inbound/GetEconomyPort.js';
import type { GetProviderAnalyticsPort } from '../application/ports/inbound/GetProviderAnalyticsPort.js';
import type { GetWalletPort } from '../application/ports/inbound/GetWalletPort.js';
import type { ListModelsPort } from '../application/ports/inbound/ListModelsPort.js';
import type { UseCaseHandler, UseCaseRegistry } from '../infrastructure/http/dynamic-route-registry.js';
import { AuthenticationRequiredError, RouteNotReadyError } from '../infrastructure/http/http-errors.js';
import type { ChatCompletionsPort } from '../application/ports/inbound/ChatCompletionsPort.js'; import type { ResponsesPort } from '../application/ports/inbound/ResponsesPort.js';
import { readChatInput, readResponsesInput } from './chat-request-inputs.js';
import type { ApiKeyRequestContext } from '../application/ports/outbound/ApiKeyContextResolver.js';
import type { ApiKeyIdentityResolver } from '../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { AuthorizePermissionUseCase } from '../application/use-cases/AuthorizePermission.js';
import type { PublishRuntimeManifest } from '../application/use-cases/PublishRuntimeManifest.js';
import type { RollbackRuntimeManifest } from '../application/use-cases/RollbackRuntimeManifest.js';
import type { GetLedgerPort } from '../application/ports/inbound/GetLedgerPort.js';
import { AuthorizationDeniedError } from '../application/errors/AuthorizationDeniedError.js';
import type { AdvertiserHandlers } from './advertiser-handlers.js'; import { advertiserRead, advertiserWrite } from './advertiser-handlers.js';
import type { ChallengeHandlers } from './challenge-handlers.js'; import { listChallenges, createChallenge, submitChallenge, approveChallenge } from './challenge-handlers.js';
import { providerAnalyticsRead } from './provider-handlers.js';
import type { VerifyActivityPort } from '../application/ports/inbound/VerifyActivityPort.js';
import type { WalletLedgerReader } from '../application/ports/outbound/WalletLedgerReader.js';
import type { CreateQuotePort } from '../application/ports/inbound/CreateQuotePort.js';
import type { ExecuteQuotedRunPort } from '../application/ports/inbound/ExecuteQuotedRunPort.js';
import type { RedisStreamAdapter } from '../infrastructure/adapters/redis/RedisStreamAdapter.js';
import { createQuoteHandler, createRunHandler } from './chat-session-handlers.js';
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
  challenges: ChallengeHandlers;
  providerAnalytics: GetProviderAnalyticsPort;
  verifyActivity: VerifyActivityPort;
  walletLedger: WalletLedgerReader;
  createQuote: CreateQuotePort;
  executeRun: ExecuteQuotedRunPort;
  streams: RedisStreamAdapter;
}
export function createUseCaseRegistry(deps: RegistryDeps): UseCaseRegistry {
  return {
    healthCheck: async () => ({ status: 'ok' }),
    readinessCheck: async () => ({ ready: true }),
    getManifest: async () => deps.manifest,
    getCatalog: async () => deps.catalog.execute(),
    listModels: async (req) => { await authenticate(req, deps.authenticateApiKey, 'models.read'); return deps.models.execute(); },
    getWallet: async (req) => deps.wallet.execute(readWalletInput(req)),
    getWalletLedger: async (req) => executeWalletLedger(req, deps),
    verifyActivity: async (req) => executeVerifyActivity(req, deps),
    createQuote: createQuoteHandler(deps.createQuote),
    createRun: createRunHandler(deps.executeRun, deps.streams),
    streamRun: notReady,
    getEconomy: async (req) => executeEconomy(req, deps),
    getProviderAnalytics: async (req) => providerAnalyticsRead(req, { analytics: deps.providerAnalytics, authenticateApiKey: deps.authenticateApiKey, identity: deps.resolveApiKeyIdentity, authorize: deps.authorizePermission }),
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
    adminChallenges: async (req) => listChallenges(req, deps), adminChallengeCreate: async (req) => createChallenge(req, deps),
    adminChallengeSubmit: async (req) => submitChallenge(req, deps), adminChallengeApprove: async (req) => approveChallenge(req, deps),
    chatCompletions: async (req) => deps.chatCompletions.execute(await readChatInput(req, deps.authenticateApiKey)),
    responses: async (req, reply) => deps.responses.execute(await readResponsesInput(req, deps.authenticateApiKey, reply)),
  };
}

async function executeWalletLedger(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const user = sessionUser(req);
  if (!user) throw new AuthenticationRequiredError();
  return { entries: await deps.walletLedger.listByWallet(user.walletId, queryLimit(req) ?? 50) };
}

async function executeVerifyActivity(req: unknown, deps: RegistryDeps): Promise<unknown> {
  const user = sessionUser(req); const body = requestBody(req); const params = requestParams(req);
  if (!user || typeof params.id !== 'string') throw new AuthenticationRequiredError();
  const headers = (req as { headers?: Record<string, unknown> }).headers ?? {};
  const reps = Number(body.reps); const sessionId = typeof body.sessionId === 'string' ? body.sessionId : params.id;
  const bodyKey = typeof body.challenge_nonce === 'string' ? body.challenge_nonce : '';
  const key = typeof headers['idempotency-key'] === 'string' ? headers['idempotency-key'] : bodyKey;
  return deps.verifyActivity.execute({ userId: user.userId, walletId: user.walletId, sessionId, reps, idempotencyKey: key, challengeNonce: key });
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

function requestParams(req: unknown): Record<string, unknown> { const params = (req as { params?: unknown }).params; return typeof params === 'object' && params !== null ? params as Record<string, unknown> : {}; }
function sessionUser(req: unknown): { userId: string; walletId: string } | undefined {
  const user = (req as { user?: { userId?: unknown; walletId?: unknown } }).user;
  return typeof user?.userId === 'string' && typeof user.walletId === 'string' ? { userId: user.userId, walletId: user.walletId } : undefined;
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

function bearerToken(req: unknown): string { const headers = (req as { headers?: Record<string, unknown> }).headers; const authorization = headers?.authorization; if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) throw new AuthenticationRequiredError(); return authorization.slice(7).trim(); }
