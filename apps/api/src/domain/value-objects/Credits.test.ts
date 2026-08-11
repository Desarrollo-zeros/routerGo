import { describe, it, expect } from 'vitest';
import { Credits } from './Credits.js';

describe('Credits', () => {
  it('adds and subtracts', () => {
    const a = Credits.of(500n);
    const b = Credits.of(300n);
    expect(a.add(b).toString()).toBe('800');
    expect(a.subtract(b).toString()).toBe('200');
  });
  it('gte and zero', () => {
    expect(Credits.zero().isZero()).toBe(true);
    expect(Credits.of(100n).gte(Credits.of(50n))).toBe(true);
    expect(Credits.of(50n).gte(Credits.of(100n))).toBe(false);
  });
  it('negative not allowed', () => {
    expect(Credits.of(-1n).isNegative()).toBe(true);
  });
});
