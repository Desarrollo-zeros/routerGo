import { describe, expect, it } from 'vitest';
import { evaluateProviderAnalytics } from './ProviderAnalytics.js';

const policy = { quotaWarningPct: 75, quotaExceededPct: 90 };

describe('evaluateProviderAnalytics', () => {
  it('raises quota warning without treating a healthy provider as failed', () => {
    expect(evaluateProviderAnalytics({ gatewayId: 'go', health: 'HEALTHY', quotaUsagePct: 80, costMicro: 12 }, policy)).toMatchObject({ alert: 'QUOTA_WARNING', health: 'HEALTHY' });
  });

  it('prioritizes health failure and bounds malformed metrics', () => {
    expect(evaluateProviderAnalytics({ gatewayId: 'go', health: 'UNAVAILABLE', quotaUsagePct: 120, costMicro: -1 }, policy)).toMatchObject({ alert: 'HEALTH_FAILURE', quotaUsagePct: 100, costMicro: 0 });
  });
});
