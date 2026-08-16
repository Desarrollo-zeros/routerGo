export type AdvertiserSnapshot = {
  account: { balanceMicro: string; currency: string; status: string };
  campaigns: Array<{ id: string; name: string; status: string; budgetMicro: string; spentMicro: string }>;
  creatives: Array<{ id: string; campaignId: string; kind: string; moderationStatus: string }>;
  analytics: { impressions: number; clicks: number; conversions: number; spendMicro: string };
};

export class AdvertiserClient {
  constructor(private readonly baseUrl = '', private readonly accessToken?: string) {}
  async load(): Promise<AdvertiserSnapshot> {
    if (!this.accessToken) throw new Error('ADVERTISER_SESSION_REQUIRED');
    const headers = { authorization: `Bearer ${this.accessToken}` };
    const [account, campaigns, creatives, analytics] = await Promise.all([
      this.get('/advertiser/account', headers), this.get('/advertiser/campaigns', headers),
      this.get('/advertiser/creatives', headers), this.get('/advertiser/analytics', headers),
    ]);
    return { account, campaigns, creatives, analytics } as AdvertiserSnapshot;
  }
  async createCampaign(input: { name: string; budgetMicro: string; sponsoredLabel: string }): Promise<void> {
    const response = await fetch(`${this.baseUrl}/advertiser/campaigns`, { method: 'POST', headers: { ...this.headers(), 'content-type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`ADVERTISER_REQUEST_${response.status}`);
  }
  private async get(path: string, headers: Record<string, string>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, { headers: { ...headers, ...this.headers() } });
    if (!response.ok) throw new Error(`ADVERTISER_REQUEST_${response.status}`);
    return response.json();
  }
  private headers(): Record<string, string> {
    if (!this.accessToken?.trim()) throw new Error('ADVERTISER_SESSION_REQUIRED');
    return { authorization: `Bearer ${this.accessToken}` };
  }
}
