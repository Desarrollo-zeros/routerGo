export type ProviderHealth = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
export type ProviderAlert = 'NONE' | 'QUOTA_WARNING' | 'QUOTA_EXCEEDED' | 'HEALTH_FAILURE';

export interface ProviderAnalyticsInput {
  gatewayId: string;
  health: ProviderHealth;
  quotaUsagePct: number;
  costMicro: number;
}

export interface ProviderAnalyticsPolicy {
  quotaWarningPct: number;
  quotaExceededPct: number;
}

export interface ProviderAnalyticsSummary extends ProviderAnalyticsInput {
  alert: ProviderAlert;
}

export function evaluateProviderAnalytics(input: ProviderAnalyticsInput, policy: ProviderAnalyticsPolicy): ProviderAnalyticsSummary {
  const quotaUsagePct = clamp(input.quotaUsagePct, 0, 100);
  const costMicro = nonNegative(input.costMicro);
  const alert = input.health === 'UNAVAILABLE' ? 'HEALTH_FAILURE' : quotaAlert(quotaUsagePct, policy);
  return { ...input, quotaUsagePct, costMicro, alert };
}

function quotaAlert(usagePct: number, policy: ProviderAnalyticsPolicy): ProviderAlert {
  if (usagePct >= policy.quotaExceededPct) return 'QUOTA_EXCEEDED';
  if (usagePct >= policy.quotaWarningPct) return 'QUOTA_WARNING';
  return 'NONE';
}

function clamp(value: number, min: number, max: number): number {
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}
