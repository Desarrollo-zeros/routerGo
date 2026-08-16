import type { FastifyInstance } from 'fastify';
import type { RuntimeManifest } from '../../config/RuntimeManifest.js';
type ApiRouteConfig = RuntimeManifest['apiRoutes'][number];
import type { SchemaRegistry } from './schema-registry.js';
import { AuthenticationRequiredError } from './http-errors.js';

export type UseCaseHandler = (req: unknown, reply: unknown) => Promise<unknown>;

export type UseCaseRegistry = Record<string, UseCaseHandler>;

export type AuthPolicy = 'public' | 'authenticated' | 'admin';

const RESERVED_PREFIXES = ['/health', '/readiness', '/runtime-manifest'];

export class RouteValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = 'RouteValidationError';
  }
}

export class DynamicRouteRegistry {
  constructor(
    private readonly useCases: UseCaseRegistry,
    private readonly schemas: SchemaRegistry,
  ) {}

  register(fastify: FastifyInstance, routes: ApiRouteConfig[]): void {
    this.validate(routes);
    for (const r of routes) {
      if (!r.enabled) continue;
      const handler = requireHandler(this.useCases, r.use_case_key);
      const schema = buildRouteSchema(this.schemas, r);
      fastify.route({
        method: r.method,
        url: r.path_template,
        schema: schema ?? undefined,
        handler: guardedHandler(handler, r.auth_policy_key) as never,
      });
    }
  }

  private validate(routes: ApiRouteConfig[]): void {
    const seen = new Set<string>();
    for (const r of routes) {
      assertUniqueRoute(seen, r);
      assertNotReserved(r.path_template);
      assertUseCaseExists(this.useCases, r.use_case_key);
      assertSchemaKeys(this.schemas, r);
    }
  }

  static assertNoEval(key: string): void {
    if (/[;(){}]/.test(key)) throw new RouteValidationError(`Invalid key contains code: ${key}`);
  }
}

function guardedHandler(handler: UseCaseHandler, policy: string): UseCaseHandler {
  if (policy !== 'admin') return handler;
  return async () => {
    throw new AuthenticationRequiredError();
  };
}

function requireHandler(registry: UseCaseRegistry, key: string): UseCaseHandler {
  const h = registry[key];
  if (!h) throw new RouteValidationError(`use_case_key not registered: ${key}`);
  return h;
}

function buildRouteSchema(schemas: SchemaRegistry, r: ApiRouteConfig): Record<string, unknown> | null {
  const schema: Record<string, unknown> = {};
  if (r.request_schema_key) schema.body = schemas.require(r.request_schema_key);
  if (r.response_schema_key) schema.response = { 200: schemas.require(r.response_schema_key) };
  return Object.keys(schema).length ? schema : null;
}

function assertUniqueRoute(seen: Set<string>, r: ApiRouteConfig): void {
  const key = `${r.method}:${r.path_template}`;
  if (seen.has(key)) throw new RouteValidationError(`Duplicate route: ${key}`);
  seen.add(key);
}

function assertNotReserved(path: string): void {
  if (RESERVED_PREFIXES.some((p) => path.startsWith(p))) {
    throw new RouteValidationError(`Route uses reserved prefix: ${path}`);
  }
}

function assertUseCaseExists(registry: UseCaseRegistry, key: string): void {
  if (!registry[key]) throw new RouteValidationError(`use_case_key not in typed registry: ${key}`);
}

function assertSchemaKeys(schemas: SchemaRegistry, r: ApiRouteConfig): void {
  if (r.request_schema_key && !schemas.has(r.request_schema_key)) {
    throw new RouteValidationError(`request_schema_key not registered: ${r.request_schema_key}`);
  }
  if (r.response_schema_key && !schemas.has(r.response_schema_key)) {
    throw new RouteValidationError(`response_schema_key not registered: ${r.response_schema_key}`);
  }
}
