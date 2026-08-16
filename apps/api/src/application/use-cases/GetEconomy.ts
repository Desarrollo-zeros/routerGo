import type { GetEconomyInput, GetEconomyOutput, WindowUsageDto } from '../ports/inbound/GetEconomyPort.js';
import type { GetEconomyPort } from '../ports/inbound/GetEconomyPort.js';
import { calculateUnitEconomics } from '../../domain/economy/UnitEconomics.js';

export const GO_PROMO_USD = 5;
export const GO_RENEWAL_USD = 10;
export const GO_PROMO_MICRO = GO_PROMO_USD * 1_000_000;
export const GO_RENEWAL_MICRO = GO_RENEWAL_USD * 1_000_000;
export const CUT_PCT = 80;
export const WARN_PCT = 75;

export const WINDOW_LIMITS_MICRO: Record<string, number> = {
  '5H': 12_000_000,
  WEEK: 30_000_000,
  MONTH: 60_000_000,
};

export function goMonthlyCostMicro(m: number, isPromo: boolean): number {
  return m * (isPromo ? GO_PROMO_MICRO : GO_RENEWAL_MICRO);
}

export function usagePct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return (used / limit) * 100;
}

export function isCut(pct: number): boolean {
  return pct >= CUT_PCT;
}
export function isWarn(pct: number): boolean {
  return pct >= WARN_PCT;
}

export function contributionMicro(operatorRevenueMicro: number, providerCostMicro: number, infraMicro: number): number {
  return operatorRevenueMicro - providerCostMicro - infraMicro;
}

function buildWindowDto(scopeId: string, windowType: '5H' | 'WEEK' | 'MONTH', used: number): WindowUsageDto {
  const limit = WINDOW_LIMITS_MICRO[windowType];
  const pct = usagePct(used, limit);
  return { quotaScopeId: scopeId, windowType, usedMicro: used, limitMicro: limit, pct, cut: isCut(pct), warn: isWarn(pct) };
}

export interface EconomyDeps {
  getGoCount?: () => Promise<number>;
  getWindows?: () => Promise<Array<{ quotaScopeId: string; windowType: string; usedMicro: number }>>;
  getOperatorRevenueMicro?: () => Promise<number>;
  getInfraMicro?: () => Promise<number>;
  getProviderCostMicro?: () => Promise<number>;
  getRewardLiabilityCredits?: () => Promise<number>;
}

export class GetEconomyUseCase implements GetEconomyPort {
  constructor(private readonly deps: EconomyDeps = {}) {}

  async execute(input: GetEconomyInput = {}): Promise<GetEconomyOutput> {
    const m = await this.resolveM();
    const isPromo = input.isPromo ?? false;
    const promoMonthlyUsd = (m * GO_PROMO_USD);
    const renewalMonthlyUsd = (m * GO_RENEWAL_USD);
    const effectiveMonthlyUsd = isPromo ? promoMonthlyUsd : renewalMonthlyUsd;
    const providerCostMicro = this.deps.getProviderCostMicro ? await this.deps.getProviderCostMicro() : goMonthlyCostMicro(m, isPromo);
    const operatorRevenueMicro = input.operatorRevenueUsdMicro ?? await this.resolveRevenue();
    const infraMicro = input.infraUsdMicro ?? await this.resolveInfra();
    const rewardLiabilityCredits = await this.resolveRewardLiability();
    const contrib = contributionMicro(operatorRevenueMicro, providerCostMicro, infraMicro);
    const unitEconomics = calculateUnitEconomics({ revenueMicro: operatorRevenueMicro, providerCostMicro, infraCostMicro: infraMicro, rewardLiabilityCredits });
    const scopes = await this.resolveScopes();
    return {
      go: { m, promoMonthlyUsd, renewalMonthlyUsd, effectiveMonthlyUsd },
      windows: { limitsMicro: { ...WINDOW_LIMITS_MICRO }, thresholds: { cutPct: CUT_PCT, warnPct: WARN_PCT }, scopes },
      contribution: { operatorRevenueMicro, providerCostMicro, infraMicro, contributionMicro: contrib },
      unitEconomics,
      dau: input.dau ?? 0,
    };
  }

  private async resolveM(): Promise<number> {
    if (this.deps.getGoCount) return this.deps.getGoCount();
    return 3;
  }
  private async resolveRevenue(): Promise<number> {
    if (this.deps.getOperatorRevenueMicro) return this.deps.getOperatorRevenueMicro();
    return 0;
  }
  private async resolveInfra(): Promise<number> {
    if (this.deps.getInfraMicro) return this.deps.getInfraMicro();
    return 0;
  }
  private async resolveRewardLiability(): Promise<number> {
    if (this.deps.getRewardLiabilityCredits) return this.deps.getRewardLiabilityCredits();
    return 0;
  }
  private async resolveScopes(): Promise<WindowUsageDto[]> {
    if (this.deps.getWindows) {
      const rows = await this.deps.getWindows();
      return rows.map((r) => buildWindowDto(r.quotaScopeId, r.windowType as never, r.usedMicro));
    }
    return [];
  }

  // helpers exposed for tests / metrics
  calcGoMonthly(m: number, promo: boolean): number { return goMonthlyCostMicro(m, promo); }
  calcPct(used: number, limit: number): number { return usagePct(used, limit); }
  checkCut(pct: number): boolean { return isCut(pct); }
  checkWarn(pct: number): boolean { return isWarn(pct); }
}
