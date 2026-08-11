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

export function buildApp(deps: BootstrapDeps): ReturnType<typeof Fastify> {
  const app = Fastify({
    logger: { level: 'info', redact: ['headers.authorization', 'headers.cookie', 'body.apiKey'] },
    trustProxy: deps.trustProxy ?? false,
  });

  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
  app.get('/readiness', async () => ({ ready: true }));
  app.get('/runtime-manifest', async () => deps.manifest);

  app.get('/runs/:id/events', async (req, reply) => {
    await sseHandler(req as never, reply as never, deps.sseDeps);
  });

  const registry = new DynamicRouteRegistry(deps.useCases, deps.schemas);
  const filtered = deps.manifest.routes.filter((r) => r.enabled);
  if (filtered.length > 0) registry.register(app, filtered);

  return app;
}
