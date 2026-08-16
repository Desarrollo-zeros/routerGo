import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpAdminEconomyClient } from './AdminEconomyClient';

afterEach(() => { vi.unstubAllGlobals(); });

describe('HttpAdminEconomyClient', () => {
  it('reads the authenticated unit-economics response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ unitEconomics: sample() }), { status: 200 })));

    const result = await new HttpAdminEconomyClient('/api').read('token');

    expect(result.unitEconomics.contributionMicro).toBe(4);
    expect(fetch).toHaveBeenCalledWith('/api/admin/economy', { headers: { authorization: 'Bearer token' } });
  });

  it('rejects malformed responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ unitEconomics: { revenueMicro: '4' } }), { status: 200 })));

    await expect(new HttpAdminEconomyClient().read('token')).rejects.toThrow('admin_economy_invalid_response');
  });
});

function sample(): Record<string, number> {
  return { revenueMicro: 10, providerCostMicro: 3, infraCostMicro: 1, contributionMicro: 4, rewardLiabilityCredits: 8 };
}
