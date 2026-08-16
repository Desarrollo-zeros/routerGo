import { describe, expect, it } from 'vitest';
import { calculateUnitEconomics } from './UnitEconomics.js';

describe('calculateUnitEconomics', () => {
  it('shows contribution and keeps reward liability in credits', () => {
    expect(calculateUnitEconomics({ revenueMicro: 100, providerCostMicro: 30, infraCostMicro: 10, rewardLiabilityCredits: 75 })).toEqual({ revenueMicro: 100, providerCostMicro: 30, infraCostMicro: 10, rewardLiabilityCredits: 75, contributionMicro: 60 });
  });

  it('does not allow invalid monetary inputs to create a false positive margin', () => {
    expect(calculateUnitEconomics({ revenueMicro: -1, providerCostMicro: Number.NaN, infraCostMicro: 5, rewardLiabilityCredits: -4 })).toMatchObject({ contributionMicro: -5, rewardLiabilityCredits: 0 });
  });
});
