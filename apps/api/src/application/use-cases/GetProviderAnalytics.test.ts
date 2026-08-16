import { describe, expect, it } from 'vitest';
import { GetProviderAnalyticsUseCase } from './GetProviderAnalytics.js';

describe('GetProviderAnalyticsUseCase', () => {
  it('converts explicit provider signals into actionable alerts', async () => {
    const source = { read: async () => [{ gatewayId: 'go', health: 'DEGRADED' as const, quotaUsagePct: 91, costMicro: 20 }] };
    await expect(new GetProviderAnalyticsUseCase(source).execute({ quotaWarningPct: 75, quotaExceededPct: 90 })).resolves.toEqual([{ gatewayId: 'go', health: 'DEGRADED', quotaUsagePct: 91, costMicro: 20, alert: 'QUOTA_EXCEEDED' }]);
  });
});
