export interface AdminEconomySummary {
  unitEconomics: {
    revenueMicro: number;
    providerCostMicro: number;
    infraCostMicro: number;
    contributionMicro: number;
    rewardLiabilityCredits: number;
  };
}

export interface AdminEconomyClient {
  read(accessToken: string): Promise<AdminEconomySummary>;
}

export class HttpAdminEconomyClient implements AdminEconomyClient {
  constructor(private readonly baseUrl = '') {}

  async read(accessToken: string): Promise<AdminEconomySummary> {
    if (!accessToken.trim()) throw new Error('admin_access_token_required');
    const response = await fetch(`${this.baseUrl}/admin/economy`, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`admin_economy_${response.status}`);
    return parseEconomy(await response.json());
  }
}

function parseEconomy(value: unknown): AdminEconomySummary {
  if (!isRecord(value) || !isRecord(value.unitEconomics)) {
    throw new Error('admin_economy_invalid_response');
  }
  const unit = value.unitEconomics;
  const keys: readonly string[] = ['revenueMicro', 'providerCostMicro', 'infraCostMicro', 'contributionMicro', 'rewardLiabilityCredits'];
  if (!isNumberRecord(unit, keys)) throw new Error('admin_economy_invalid_response');
  return { unitEconomics: { revenueMicro: unit.revenueMicro, providerCostMicro: unit.providerCostMicro, infraCostMicro: unit.infraCostMicro, contributionMicro: unit.contributionMicro, rewardLiabilityCredits: unit.rewardLiabilityCredits } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNumberRecord(value: Record<string, unknown>, keys: readonly string[]): value is Record<string, number> {
  return keys.every((key) => typeof value[key] === 'number');
}
