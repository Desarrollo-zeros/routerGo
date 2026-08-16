import { describe, expect, it } from 'vitest';
import { evaluatePerformance } from './PerformanceBudget.js';

describe('evaluatePerformance', () => {
  it('passes a healthy sample set under the p95 and error budgets', () => {
    expect(evaluatePerformance([2, 4, 5, 8, 10], 0, { p95Ms: 12, maxErrorRate: 0.01 })).toMatchObject({ p95Ms: 10, errorRate: 0, passed: true });
  });

  it('fails when latency or errors exceed the configured budget', () => {
    expect(evaluatePerformance([2, 4, 5, 8, 40], 1, { p95Ms: 20, maxErrorRate: 0.1 })).toMatchObject({ p95Ms: 40, errorRate: 0.2, passed: false });
  });
});
