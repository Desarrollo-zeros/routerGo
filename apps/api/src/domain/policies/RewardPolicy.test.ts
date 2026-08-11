import { describe, it, expect } from 'vitest';
import { RewardPolicy } from './RewardPolicy.js';

describe('RewardPolicy', () => {
  it('calculates 500 per rep capped', () => {
    const p = new RewardPolicy({ creditsPerRep: 500n, maxRepsPerSession: 50 });
    expect(p.calculate(10).toString()).toBe('5000');
    expect(p.calculate(60).toString()).toBe('25000');
    expect(p.calculate(0).isZero()).toBe(true);
  });
  it('validates reps', () => {
    const p = new RewardPolicy({ creditsPerRep: 500n, maxRepsPerSession: 50 });
    expect(() => p.validate(51)).toThrow();
    expect(() => p.validate(-1)).toThrow();
  });
});
