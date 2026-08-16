export interface PerformanceBudget {
  p95Ms: number;
  maxErrorRate: number;
}

export interface PerformanceMeasurement {
  p95Ms: number;
  errorRate: number;
  passed: boolean;
}

export function evaluatePerformance(samplesMs: readonly number[], errors: number, budget: PerformanceBudget): PerformanceMeasurement {
  const samples = samplesMs.filter((sample) => Number.isFinite(sample) && sample >= 0).sort((left, right) => left - right);
  const p95Ms = samples.length === 0 ? Number.POSITIVE_INFINITY : samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)];
  const errorRate = samples.length === 0 ? 1 : Math.max(0, errors) / samples.length;
  return { p95Ms, errorRate, passed: p95Ms <= budget.p95Ms && errorRate <= budget.maxErrorRate };
}
