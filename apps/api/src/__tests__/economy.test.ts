import { describe, it, expect } from 'vitest';
import { GetEconomyUseCase, GO_PROMO_MICRO, GO_RENEWAL_MICRO, WINDOW_LIMITS_MICRO, CUT_PCT, WARN_PCT, usagePct } from '../application/use-cases/GetEconomy.js';
import { metrics } from '../infrastructure/metrics/otel-metrics.js';

describe('economy', () => {
  it('M=3 promo $15 vs renovación $30', async () => {
    const sut = new GetEconomyUseCase({ getGoCount: async () => 3 });
    const promo = await sut.execute({ isPromo: true });
    const renewal = await sut.execute({ isPromo: false });
    expect(promo.go.m).toBe(3);
    expect(promo.go.promoMonthlyUsd).toBe(15);
    expect(promo.contribution.providerCostMicro).toBe(3 * GO_PROMO_MICRO);
    expect(promo.contribution.providerCostMicro).toBe(15_000_000);
    expect(renewal.go.renewalMonthlyUsd).toBe(30);
    expect(renewal.contribution.providerCostMicro).toBe(3 * GO_RENEWAL_MICRO);
    expect(renewal.contribution.providerCostMicro).toBe(30_000_000);
    expect(renewal.go.effectiveMonthlyUsd).toBe(30);
    expect(promo.go.effectiveMonthlyUsd).toBe(15);
  });

  it('contribution = revenue - provider - infra', async () => {
    const sut = new GetEconomyUseCase({ getGoCount: async () => 3 });
    const out = await sut.execute({ isPromo: false, operatorRevenueUsdMicro: 100_000_000, infraUsdMicro: 10_000_000 });
    expect(out.contribution.operatorRevenueMicro).toBe(100_000_000);
    expect(out.contribution.providerCostMicro).toBe(30_000_000);
    expect(out.contribution.infraMicro).toBe(10_000_000);
    expect(out.contribution.contributionMicro).toBe(60_000_000);
  });

  it('exposes persisted unit-economics measures and reward liability', async () => {
    const sut = new GetEconomyUseCase({
      getGoCount: async () => 0,
      getProviderCostMicro: async () => 30,
      getOperatorRevenueMicro: async () => 100,
      getRewardLiabilityCredits: async () => 75,
    });
    await expect(sut.execute()).resolves.toMatchObject({ unitEconomics: { revenueMicro: 100, providerCostMicro: 30, contributionMicro: 70, rewardLiabilityCredits: 75 } });
  });

  it('corte 80% y alerta 75% por quota_scope_id', async () => {
    expect(CUT_PCT).toBe(80);
    expect(WARN_PCT).toBe(75);
    expect(WINDOW_LIMITS_MICRO['5H']).toBe(12_000_000);
    expect(WINDOW_LIMITS_MICRO['WEEK']).toBe(30_000_000);
    expect(WINDOW_LIMITS_MICRO['MONTH']).toBe(60_000_000);
    const sut = new GetEconomyUseCase({
      getGoCount: async () => 3,
      getWindows: async () => [
        { quotaScopeId: 'scope-go-1', windowType: '5H', usedMicro: 9_600_000 },
        { quotaScopeId: 'scope-go-1', windowType: 'WEEK', usedMicro: 22_500_000 },
        { quotaScopeId: 'scope-go-1', windowType: 'MONTH', usedMicro: 30_000_000 },
        { quotaScopeId: 'scope-go-2', windowType: '5H', usedMicro: 9_000_000 },
      ],
    });
    const out = await sut.execute();
    const fiveH = out.windows.scopes.find((s) => s.windowType === '5H' && s.usedMicro === 9_600_000)!;
    expect(fiveH.pct).toBeCloseTo(80);
    expect(fiveH.cut).toBe(true);
    expect(fiveH.warn).toBe(true);
    const warn = out.windows.scopes.find((s) => s.usedMicro === 22_500_000)!;
    expect(warn.pct).toBeCloseTo(75);
    expect(warn.cut).toBe(false);
    expect(warn.warn).toBe(true);
    const ok = out.windows.scopes.find((s) => s.usedMicro === 30_000_000)!;
    expect(ok.pct).toBe(50);
    expect(ok.cut).toBe(false);
    expect(ok.warn).toBe(false);
    const justBelowCut = usagePct(9_599_999, 12_000_000);
    expect(justBelowCut).toBeLessThan(80);
    const sut2 = new GetEconomyUseCase();
    expect(sut2.checkCut(80)).toBe(true);
    expect(sut2.checkCut(79.9)).toBe(false);
    expect(sut2.checkWarn(75)).toBe(true);
    expect(sut2.checkWarn(74.9)).toBe(false);
  });

  it('métricas otel registradas', () => {
    expect(metrics.llmRequestsTotal.name).toBe('llm_requests_total');
    expect(metrics.ttftHistogram.name).toBe('llm_ttft_seconds');
    expect(metrics.credentialWindowUsagePct.name).toBe('credential_window_usage_pct');
    expect(metrics.provider429Total.name).toBe('provider_429_total');
    metrics.recordLlmRequest({ model: 'gpt-5.6-luna', status: 'ok' });
    metrics.recordTtft(0.42, { model: 'gpt-5.6-luna' });
    metrics.setWindowUsage(80, { quota_scope_id: 'scope-go-1', window_type: '5H' });
    metrics.inc429({ gateway: 'gw-go', quota_scope_id: 'scope-go-1' });
    expect(metrics.llmRequestsTotal.values.length).toBeGreaterThan(0);
    expect(metrics.ttftHistogram.values.length).toBeGreaterThan(0);
    expect(metrics.credentialWindowUsagePct.values.length).toBeGreaterThan(0);
    expect(metrics.provider429Total.values.length).toBeGreaterThan(0);
  });
});
