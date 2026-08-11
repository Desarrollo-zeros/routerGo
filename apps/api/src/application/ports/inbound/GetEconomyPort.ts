export interface GetEconomyInput {
  isPromo?: boolean;
  dau?: number;
  operatorRevenueUsdMicro?: number;
  infraUsdMicro?: number;
}

export interface WindowUsageDto {
  quotaScopeId: string;
  windowType: '5H' | 'WEEK' | 'MONTH';
  usedMicro: number;
  limitMicro: number;
  pct: number;
  cut: boolean;
  warn: boolean;
}

export interface GetEconomyOutput {
  go: { m: number; promoMonthlyUsd: number; renewalMonthlyUsd: number; effectiveMonthlyUsd: number };
  windows: { limitsMicro: Record<string, number>; thresholds: { cutPct: number; warnPct: number }; scopes: WindowUsageDto[] };
  contribution: { operatorRevenueMicro: number; providerCostMicro: number; infraMicro: number; contributionMicro: number };
  dau: number;
}

export interface GetEconomyPort {
  execute(input?: GetEconomyInput): Promise<GetEconomyOutput>;
}
