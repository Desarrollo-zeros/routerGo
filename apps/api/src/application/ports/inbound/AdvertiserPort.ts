export type AdvertiserAccountView = {
  accountId: string;
  balanceMicro: string;
  currency: 'USD';
  status: string;
};

export type AdvertiserCampaignView = {
  id: string;
  name: string;
  status: string;
  moderationStatus: string;
  budgetMicro: string;
  spentMicro: string;
  sponsoredLabel: string;
};

export type AdvertiserCreativeView = {
  id: string;
  campaignId: string;
  kind: string;
  moderationStatus: string;
  payload: Record<string, unknown>;
};

export type AdvertiserAnalyticsView = {
  impressions: number;
  clicks: number;
  conversions: number;
  spendMicro: string;
};

export interface AdvertiserReader {
  account(organizationId: string): Promise<AdvertiserAccountView>;
  campaigns(organizationId: string): Promise<AdvertiserCampaignView[]>;
  creatives(organizationId: string): Promise<AdvertiserCreativeView[]>;
  analytics(organizationId: string): Promise<AdvertiserAnalyticsView>;
}

export interface AdvertiserWriter {
  createCampaign(input: { organizationId: string; name: string; budgetMicro: bigint; sponsoredLabel: string }): Promise<AdvertiserCampaignView>;
  createCreative(input: { organizationId: string; campaignId: string; kind: string; payload: Record<string, unknown> }): Promise<AdvertiserCreativeView>;
  submitCampaign(input: { organizationId: string; campaignId: string }): Promise<AdvertiserCampaignView>;
}
