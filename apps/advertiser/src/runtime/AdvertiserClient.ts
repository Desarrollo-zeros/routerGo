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
  private async get(path: string, headers: Record<string, string>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, { headers });
    if (!response.ok) throw new Error(`ADVERTISER_REQUEST_${response.status}`);
    return response.json();
  }
}
