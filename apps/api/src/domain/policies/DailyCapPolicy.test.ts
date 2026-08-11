import { describe, it, expect } from 'vitest';
import { DailyCapPolicy } from './DailyCapPolicy.js';
import { Credits } from '../value-objects/Credits.js';

describe('DailyCapPolicy', () => {
  it('enforces 50 cap', () => {
    const p = new DailyCapPolicy({ dailyCapCredits: 25000n });
    expect(p.canEarn(Credits.of(20000n), Credits.of(4000n))).toBe(true);
    expect(p.canEarn(Credits.of(24000n), Credits.of(2000n))).toBe(false);
    expect(p.remaining(Credits.of(5000n)).toString()).toBe('20000');
  });
});
