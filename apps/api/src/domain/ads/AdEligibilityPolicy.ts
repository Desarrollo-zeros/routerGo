export type AdEligibilityRequest = {
  consentGranted: boolean;
  region: string;
  allowedRegions: readonly string[];
  impressionsInWindow: number;
  frequencyCap: number;
  clickRate: number;
  maxClickRate: number;
};

export type AdEligibilityDecision =
  | { allowed: true; reason: 'ELIGIBLE' }
  | { allowed: false; reason: 'CONSENT_REQUIRED' | 'REGION_NOT_ALLOWED' | 'FREQUENCY_CAP_REACHED' | 'CLICK_FRAUD_SIGNAL' };

export function evaluateAdEligibility(input: AdEligibilityRequest): AdEligibilityDecision {
  if (!input.consentGranted) return { allowed: false, reason: 'CONSENT_REQUIRED' };
  if (!input.allowedRegions.includes(input.region)) return { allowed: false, reason: 'REGION_NOT_ALLOWED' };
  if (input.impressionsInWindow >= input.frequencyCap) return { allowed: false, reason: 'FREQUENCY_CAP_REACHED' };
  if (input.clickRate > input.maxClickRate) return { allowed: false, reason: 'CLICK_FRAUD_SIGNAL' };
  return { allowed: true, reason: 'ELIGIBLE' };
}
