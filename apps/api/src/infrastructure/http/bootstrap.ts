import Fastify from 'fastify';
import type { RuntimeManifest } from '../../config/RuntimeManifest.js';
import { DynamicRouteRegistry, type UseCaseRegistry } from './dynamic-route-registry.js';
import type { SchemaRegistry } from './schema-registry.js';
import { sseHandler, type SseDeps } from './sse-handler.js';
import { AuthenticationRequiredError, RouteNotReadyError } from './http-errors.js';
import { ApiKeyLifecycleError } from '../../application/use-cases/ApiKeyLifecycle.js';
import { ExecuteQuotedRunError } from '../../application/errors/ExecuteQuotedRunError.js';
import { ApiQuotaExceededError } from '../../application/use-cases/ChatCompletions.js';

export interface BootstrapDeps {
  manifest: RuntimeManifest;
  useCases: UseCaseRegistry;
  schemas: SchemaRegistry;
  sseDeps: SseDeps;
  trustProxy?: boolean | string | number;
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

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AuthenticationRequiredError) return reply.code(401).send({ error: 'authentication_required' });
    if (error instanceof ApiKeyLifecycleError) return reply.code(apiKeyStatus(error.code)).send({ error: apiKeyError(error.code) });
    if (error instanceof Error && error.message === 'API_KEY_CONTEXT_NOT_FOUND') return reply.code(401).send({ error: 'authentication_required' });
    if (error instanceof ExecuteQuotedRunError) return reply.code(runErrorStatus(error.code)).send({ error: runErrorName(error.code) });
    if (error instanceof ApiQuotaExceededError) return reply.code(429).header('retry-after-ms', error.retryAfterMs).send({ error: error.reason.toLowerCase() });
    if (error instanceof RouteNotReadyError) return reply.code(501).send({ error: 'route_not_ready' });
    return reply.send(error);
  });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
  app.get('/readiness', async () => ({ ready: true }));
  app.get('/runtime-manifest', async () => toWebManifest(deps.manifest));

  app.get('/runs/:id/events', async (req, reply) => {
    await sseHandler(req as never, reply as never, deps.sseDeps);
  });

  const registry = new DynamicRouteRegistry(deps.useCases, deps.schemas);
  const reserved = ['/health', '/readiness', '/runtime-manifest', '/runs/:id/events'];
  const filtered = deps.manifest.apiRoutes
    .filter((r) => r.enabled)
    .filter((r) => !reserved.some((p) => r.path_template === p));
  if (filtered.length > 0) registry.register(app, filtered);

  return app;
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
