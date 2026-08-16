import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import type { RuntimeManifest } from '../../config/RuntimeManifest.js';
import { DynamicRouteRegistry, type UseCaseRegistry } from './dynamic-route-registry.js';
import type { SchemaRegistry } from './schema-registry.js';
import { sseHandler, type SseDeps } from './sse-handler.js';
import { AuthenticationRequiredError, RouteNotReadyError } from './http-errors.js';
import { ApiKeyLifecycleError } from '../../application/use-cases/ApiKeyLifecycle.js';
import { ExecuteQuotedRunError } from '../../application/errors/ExecuteQuotedRunError.js';
import { ApiQuotaExceededError } from '../../application/use-cases/ChatCompletions.js';
import { PrivilegedChangeError } from '../../application/errors/PrivilegedChangeError.js';
import { AuthorizationDeniedError } from '../../application/errors/AuthorizationDeniedError.js';
import { registerBattleGateway, type BattleGatewayDeps } from './battle-websocket.js';
import type { SessionAuthPort, SessionPrincipal } from '../../application/ports/outbound/SessionAuthPort.js';

export interface BootstrapDeps {
  manifest: RuntimeManifest;
  useCases: UseCaseRegistry;
  schemas: SchemaRegistry;
  sseDeps: SseDeps;
  trustProxy?: boolean | string | number;
  battleGateway?: BattleGatewayDeps;
  session: SessionAuthPort;
}

export function toWebManifest(m: RuntimeManifest): Record<string, unknown> {
  const catalog = (m.models ?? []).map((e: Record<string, unknown>) => ({
    logical_id: e.logical_id,
    provider_model_id: e.provider_model_id,
    gateway_id: e.gateway_id,
    tier: e.tier,
    credit_price: e.credit_price,
    enabled: e.enabled,
    capabilities: (e.capabilities_json as Record<string, unknown>) ?? {},
    limits: (e.limits_json as Record<string, unknown>) ?? {},
  }));
  const featureFlags: Record<string, boolean> = {};
  for (const f of (m.flags ?? []) as Array<{ key: string; default_value: boolean }>) featureFlags[f.key] = f.default_value;
  return {
    version: m.version,
    contentHash: m.contentHash,
    apiRoutes: m.apiRoutes,
    ui: { routes: m.uiRoutes, navigation: m.uiNavigation },
    catalog,
    tokens: m.tokens,
    featureFlags,
  };
}

export function buildApp(deps: BootstrapDeps): ReturnType<typeof Fastify> {
  const app = Fastify({
    logger: { level: 'info', redact: ['headers.authorization', 'headers.cookie', 'body.apiKey'] },
    trustProxy: deps.trustProxy ?? false,
  });

  app.setErrorHandler((error, _request, reply) => { if (!handleKnownError(error, reply)) reply.send(error); });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
  app.get('/readiness', async () => ({ ready: true }));
  app.get('/runtime-manifest', async () => toWebManifest(deps.manifest));
  app.addHook('onRequest', async (request) => {
    const token = readCookie(request.headers.cookie, 'routergo_session');
    if (token) (request as SessionRequest).user = await deps.session.authenticate(token) ?? undefined;
  });
  registerAuthRoutes(app, deps.session);

  app.get('/runs/:id/events', async (req, reply) => {
    if (!(req as SessionRequest).user) return reply.code(401).send({ error: 'authentication_required' });
    await sseHandler(req as never, reply as never, deps.sseDeps);
  });

  const registry = new DynamicRouteRegistry(deps.useCases, deps.schemas);
  const reserved = ['/health', '/readiness', '/runtime-manifest', '/runs/:id/events', '/auth/'];
  const filtered = deps.manifest.apiRoutes
    .filter((r) => r.enabled)
    .filter((r) => !reserved.some((p) => r.path_template === p));
  if (filtered.length > 0) registry.register(app, filtered);
  if (deps.battleGateway) registerBattleGateway(app, deps.battleGateway);

  return app;
}

type SessionRequest = { user?: SessionPrincipal };
type AuthBody = { email?: unknown; password?: unknown };

function registerAuthRoutes(app: ReturnType<typeof Fastify>, auth: SessionAuthPort): void {
  app.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => authReply(reply, () => auth.register(readString(request.body as AuthBody, 'email'), readString(request.body as AuthBody, 'password'))));
  app.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply) => authReply(reply, () => auth.login(readString(request.body as AuthBody, 'email'), readString(request.body as AuthBody, 'password'))));
  app.get('/auth/me', async (request: FastifyRequest, reply: FastifyReply) => { const user = (request as SessionRequest).user; return user ? reply.send({ user }) : reply.code(401).send({ error: 'authentication_required' }); });
  app.post('/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => { const token = readCookie(request.headers.cookie, 'routergo_session'); if (token) await auth.logout(token); return reply.header('set-cookie', clearSessionCookie()).send({ ok: true }); });
}

async function authReply(reply: FastifyReply, operation: () => Promise<{ principal: SessionPrincipal; token: string }>): Promise<unknown> {
  try { const result = await operation(); return reply.header('set-cookie', sessionCookie(result.token)).send({ user: result.principal }); }
  catch (error) { return authFailure(reply, error); }
}

function authFailure(reply: FastifyReply, error: unknown): FastifyReply {
  if (error instanceof Error && error.message === 'InvalidCredentials') return reply.code(401).send({ error: 'invalid_credentials' });
  if (error instanceof Error && ['InvalidEmail', 'WeakPassword'].includes(error.message)) return reply.code(400).send({ error: error.message });
  if (isUniqueViolation(error)) return reply.code(409).send({ error: 'email_already_registered' });
  throw error;
}

function isUniqueViolation(error: unknown): boolean { return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === '23505'; }
function readString(body: AuthBody, key: 'email' | 'password'): string { const value = body?.[key]; if (typeof value !== 'string') throw new Error('InvalidInput'); return value; }
function sessionCookie(token: string): string { return `routergo_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`; }
function clearSessionCookie(): string { return 'routergo_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'; }
function readCookie(header: string | undefined, key: string): string | undefined { return header?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${key}=`))?.slice(key.length + 1); }

function isUnauthorizedPrivilegedChange(error: unknown): error is PrivilegedChangeError {
  return error instanceof PrivilegedChangeError && error.code === 'UNAUTHORIZED';
}

function handleKnownError(error: unknown, reply: FastifyReply): boolean {
  return handleAuthError(error, reply) || handleRunError(error, reply) || handleQuotaError(error, reply) || handlePrivilegedError(error, reply) || handleNotReadyError(error, reply);
}

function handleAuthError(error: unknown, reply: FastifyReply): boolean {
  if (error instanceof AuthenticationRequiredError || error instanceof Error && error.message === 'API_KEY_CONTEXT_NOT_FOUND') {
    reply.code(401).send({ error: 'authentication_required' });
    return true;
  }
  if (!(error instanceof ApiKeyLifecycleError)) return false;
  reply.code(apiKeyStatus(error.code)).send({ error: apiKeyError(error.code) });
  return true;
}

function handleRunError(error: unknown, reply: FastifyReply): boolean {
  if (!(error instanceof ExecuteQuotedRunError)) return false;
  reply.code(runErrorStatus(error.code)).send({ error: runErrorName(error.code) });
  return true;
}

function handleQuotaError(error: unknown, reply: FastifyReply): boolean {
  if (!(error instanceof ApiQuotaExceededError)) return false;
  reply.code(429).header('retry-after-ms', error.retryAfterMs).send({ error: error.reason.toLowerCase() });
  return true;
}

function handlePrivilegedError(error: unknown, reply: FastifyReply): boolean {
  if (isUnauthorizedPrivilegedChange(error)) {
    reply.code(403).send({ error: 'forbidden', reason: error.reason ?? 'MISSING_PERMISSION' });
    return true;
  }
  if (error instanceof AuthorizationDeniedError) {
    reply.code(403).send({ error: 'forbidden', reason: error.reason });
    return true;
  }
  return false;
}

function handleNotReadyError(error: unknown, reply: FastifyReply): boolean {
  if (!(error instanceof RouteNotReadyError)) return false;
  reply.code(501).send({ error: 'route_not_ready' });
  return true;
}

function apiKeyStatus(code: string): number {
  return code === 'SCOPE_DENIED' ? 403 : code === 'KEY_EXPIRED' ? 410 : 401;
}

function apiKeyError(code: string): string {
  if (code === 'SCOPE_DENIED') return 'scope_denied';
  if (code === 'KEY_REVOKED') return 'key_revoked';
  if (code === 'KEY_EXPIRED') return 'key_expired';
  return 'authentication_failed';
}

function runErrorStatus(code: string): number {
  if (code === 'FORBIDDEN') return 403;
  if (code === 'QUOTE_NOT_FOUND' || code === 'QUOTE_EXPIRED') return 404;
  if (code === 'BUDGET_DENIED') return 402;
  if (code === 'RECONCILIATION_REQUIRED') return 503;
  return 502;
}

function runErrorName(code: string): string {
  return code.toLowerCase();
}
