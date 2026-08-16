import Fastify from 'fastify';
import type { RuntimeManifest } from '../../config/RuntimeManifest.js';
import { DynamicRouteRegistry, type UseCaseRegistry } from './dynamic-route-registry.js';
import type { SchemaRegistry } from './schema-registry.js';
import { sseHandler, type SseDeps } from './sse-handler.js';

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
    manifest_version: (m as unknown as { version: number }).version ?? 1,
    version: (m as unknown as { version: number }).version ?? 1,
    contentHash: m.contentHash,
    apiRoutes: m.apiRoutes,
    uiRoutes: m.uiRoutes,
    ui: { routes: m.uiRoutes, navigation: m.uiNavigation },
    routes: m.routes ?? [],
    catalog,
    models: m.models ?? [],
    gateways: m.gateways ?? [],
    endpoints: m.endpoints ?? [],
    tokens: m.tokens ?? [],
    navigation: m.uiNavigation ?? [],
    feature_flags: featureFlags,
    flags: m.flags ?? [],
    poolPolicies: (m as unknown as { poolPolicies: unknown[] }).poolPolicies ?? [],
  };
}

export function buildApp(deps: BootstrapDeps): ReturnType<typeof Fastify> {
  const app = Fastify({
    logger: { level: 'info', redact: ['headers.authorization', 'headers.cookie', 'body.apiKey'] },
    trustProxy: deps.trustProxy ?? false,
  });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
  app.get('/readiness', async () => ({ ready: true }));
  app.get('/runtime-manifest', async () => toWebManifest(deps.manifest));

  app.get('/runs/:id/events', async (req, reply) => {
    await sseHandler(req as never, reply as never, deps.sseDeps);
  });

  const registry = new DynamicRouteRegistry(deps.useCases, deps.schemas);
  const reserved = ['/health', '/readiness', '/runtime-manifest', '/runs/:id/events'];
  const filtered = deps.manifest.routes
    .filter((r) => r.enabled)
    .filter((r) => !reserved.some((p) => r.path_template === p));
  if (filtered.length > 0) registry.register(app, filtered);

  return app;
}
