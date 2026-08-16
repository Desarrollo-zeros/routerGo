import { describe, expect, it, vi } from 'vitest';
import { AdvertiserClient } from './AdvertiserClient';

describe('AdvertiserClient', () => {
  it('fails closed without an access token', async () => {
    await expect(new AdvertiserClient().load()).rejects.toThrow('ADVERTISER_SESSION_REQUIRED');
  });

  it('loads all organization-scoped read views with the token', async () => {
    const fetchMock = vi.fn().mockImplementation((path: string) => Promise.resolve({ ok: true, json: async () => responseFor(path) }));
    vi.stubGlobal('fetch', fetchMock);
    await new AdvertiserClient('http://api', 'test-token').load();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { authorization: 'Bearer test-token' } });
    vi.unstubAllGlobals();
  });

  it('creates a campaign through the authenticated write route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await new AdvertiserClient('http://api', 'test-token').createCampaign({ name: 'Launch', budgetMicro: '2500', sponsoredLabel: 'Sponsored' });
    expect(fetchMock).toHaveBeenCalledWith('http://api/advertiser/campaigns', expect.objectContaining({ method: 'POST', headers: { authorization: 'Bearer test-token', 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Launch', budgetMicro: '2500', sponsoredLabel: 'Sponsored' }) }));
    vi.unstubAllGlobals();
  });
});

function responseFor(path: string): unknown {
  if (path.endsWith('/account')) return { balanceMicro: '100', currency: 'USD', status: 'ACTIVE' };
  if (path.endsWith('/analytics')) return { impressions: 1, clicks: 0, conversions: 0, spendMicro: '0' };
  return [];
}
