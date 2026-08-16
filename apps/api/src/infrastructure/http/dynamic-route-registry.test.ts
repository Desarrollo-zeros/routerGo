import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { DynamicRouteRegistry } from './dynamic-route-registry.js';
import { SchemaRegistry } from './schema-registry.js';
import { AuthenticationRequiredError } from './http-errors.js';

const schemas = new SchemaRegistry();

describe('DynamicRouteRegistry', () => {
  it('fails closed for admin routes before an authenticated admin boundary exists', async () => {
    const app = Fastify();
    app.setErrorHandler((error, _request, reply) => {
      if (error instanceof AuthenticationRequiredError) return reply.code(401).send({ error: 'authentication_required' });
      return reply.send(error);
    });
    let called = false;
    new DynamicRouteRegistry({ adminView: async () => { called = true; return {}; } }, schemas).register(app, [{
      route_key: 'admin-view', method: 'GET', path_template: '/admin/view', version: 'v1', use_case_key: 'adminView', auth_policy_key: 'admin', request_schema_key: null, response_schema_key: null, enabled: true, manifest_version: 1,
    }]);
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/admin/view' });
    expect(response.statusCode).toBe(401);
    expect(called).toBe(false);
    await app.close();
  });

  it('keeps public route handlers available', async () => {
    const app = Fastify();
    new DynamicRouteRegistry({ health: async () => ({ status: 'ok' }) }, schemas).register(app, [{
      route_key: 'health', method: 'GET', path_template: '/public-health', version: 'v1', use_case_key: 'health', auth_policy_key: 'public', request_schema_key: null, response_schema_key: null, enabled: true, manifest_version: 1,
    }]);
    await app.ready();
    const response = await app.inject({ method: 'GET', url: '/public-health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
    await app.close();
  });
});
