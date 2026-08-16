import { afterAll, describe, expect, it } from 'vitest';
import { buildCompositionApp, createComposition } from '../composition-root/composition';
import { loadRequiredManifest } from '../composition-root/manifest-loader';

const compositionPromise = createComposition();
const appPromise = compositionPromise.then(buildCompositionApp);

afterAll(async () => {
  const composition = await compositionPromise;
  const app = await appPromise;
  await app.close();
  await composition.redis.quit();
  await composition.pool.end();
});

describe('composition root contracts', () => {
  it('serves catalog data through the catalog use case contract', async () => {
    const composition = await compositionPromise;
    const result = await composition.useCases.getCatalog({}, {});

    expect(result).toMatchObject({ models: expect.any(Array) });
    expect((result as { models: Array<{ logicalId: string }> }).models).toEqual(
      expect.arrayContaining([expect.objectContaining({ logicalId: 'deepseek-v4-flash-free' })]),
    );
  });

  it('serves the catalog route from persisted model data', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/catalog' });

    expect(response.statusCode).toBe(200);
    expect(response.json().models).toEqual(
      expect.arrayContaining([expect.objectContaining({ logicalId: 'deepseek-v4-flash-free' })]),
    );
  });

  it('protects the OpenAI-compatible models list contract', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/v1/models' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'authentication_required' });
  });

  it('exposes chat completions without allowing unauthenticated execution', async () => {
    const app = await appPromise;
    const response = await app.inject({
      method: 'POST',
      url: '/v1/chat/completions',
      headers: { 'idempotency-key': 'test-key' },
      payload: { model: 'deepseek-v4-flash-free', messages: [{ role: 'user', content: 'hello' }] },
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'authentication_required' });
  });

  it('protects the unit-economics dashboard with its capability boundary', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/admin/economy' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'authentication_required' });
  });

  it('protects provider analytics with its capability boundary', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'GET', url: '/admin/providers/analytics' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'authentication_required' });
  });

  it('does not allow unauthenticated quote creation', async () => {
    const composition = await compositionPromise;

    await expect(composition.useCases.createQuote({}, {})).rejects.toThrow('AuthenticationRequired');
  });

  it('protects the quote route with the session boundary', async () => {
    const app = await appPromise;
    const response = await app.inject({ method: 'POST', url: '/quotes', payload: { logicalModelId: 'deepseek-v4-flash-free', idempotencyKey: 'unauthenticated-quote' } });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'authentication_required' });
  });

  it('fails composition when the runtime manifest cannot be loaded', async () => {
    const unavailablePool = { query: async () => { throw new Error('manifest unavailable'); } };

    await expect(loadRequiredManifest(unavailablePool as never)).rejects.toThrow('manifest unavailable');
  });
});
