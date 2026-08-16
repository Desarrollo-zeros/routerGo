import Fastify from 'fastify';
import { afterAll, describe, expect, it } from 'vitest';
import { evaluatePerformance } from '../domain/performance/PerformanceBudget.js';

const app = Fastify();
app.get('/health', async () => ({ status: 'ok' }));
const ready = app.ready();

afterAll(async () => app.close());

describe('critical API performance budget', () => {
  it('keeps the public health path within the local smoke budget', async () => {
    await ready;
    const samples: number[] = [];
    let errors = 0;
    for (let index = 0; index < 100; index += 1) {
      const start = performance.now();
      const response = await app.inject({ method: 'GET', url: '/health' });
      samples.push(performance.now() - start);
      if (response.statusCode !== 200) errors += 1;
    }
    expect(evaluatePerformance(samples, errors, { p95Ms: 250, maxErrorRate: 0 })).toMatchObject({ passed: true });
  });
});
