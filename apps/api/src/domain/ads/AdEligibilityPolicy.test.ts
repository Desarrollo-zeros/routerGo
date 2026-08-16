import { describe, expect, it } from 'vitest';
import { evaluateAdEligibility, type AdEligibilityRequest } from './AdEligibilityPolicy.js';

const base = (): AdEligibilityRequest => ({ consentGranted: true, region: 'CO', allowedRegions: ['CO'], impressionsInWindow: 1, frequencyCap: 3, clickRate: 0.02, maxClickRate: 0.1 });

describe('evaluateAdEligibility', () => {
  it('allows a consented request inside configured policy limits', () => expect(evaluateAdEligibility(base())).toEqual({ allowed: true, reason: 'ELIGIBLE' }));

  it.each([
    ['CONSENT_REQUIRED', { consentGranted: false }],
    ['REGION_NOT_ALLOWED', { region: 'US' }],
    ['FREQUENCY_CAP_REACHED', { impressionsInWindow: 3 }],
    ['CLICK_FRAUD_SIGNAL', { clickRate: 0.11 }],
  ] as const)('denies with the explicit %s reason', (reason, override) => {
    expect(evaluateAdEligibility({ ...base(), ...override })).toEqual({ allowed: false, reason });
  });

  it('rejects invalid counters and rates before eligibility checks', () => {
    expect(evaluateAdEligibility({ ...base(), impressionsInWindow: -1 })).toEqual({ allowed: false, reason: 'INVALID_POLICY_INPUT' });
    expect(evaluateAdEligibility({ ...base(), clickRate: Number.NaN })).toEqual({ allowed: false, reason: 'INVALID_POLICY_INPUT' });
  });
});
