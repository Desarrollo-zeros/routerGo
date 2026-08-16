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
  | { allowed: false; reason: 'CONSENT_REQUIRED' | 'REGION_NOT_ALLOWED' | 'FREQUENCY_CAP_REACHED' | 'CLICK_FRAUD_SIGNAL' | 'INVALID_POLICY_INPUT' };

export function evaluateAdEligibility(input: AdEligibilityRequest): AdEligibilityDecision {
  if (!validInput(input)) return { allowed: false, reason: 'INVALID_POLICY_INPUT' };
  if (!input.consentGranted) return { allowed: false, reason: 'CONSENT_REQUIRED' };
  if (!input.allowedRegions.includes(input.region)) return { allowed: false, reason: 'REGION_NOT_ALLOWED' };
  if (input.impressionsInWindow >= input.frequencyCap) return { allowed: false, reason: 'FREQUENCY_CAP_REACHED' };
  if (input.clickRate > input.maxClickRate) return { allowed: false, reason: 'CLICK_FRAUD_SIGNAL' };
  return { allowed: true, reason: 'ELIGIBLE' };
}

function validInput(input: AdEligibilityRequest): boolean {
  return input.region.length > 0 && input.allowedRegions.length > 0 && Number.isInteger(input.impressionsInWindow)
    && input.impressionsInWindow >= 0 && Number.isInteger(input.frequencyCap) && input.frequencyCap >= 0
    && Number.isFinite(input.clickRate) && input.clickRate >= 0 && Number.isFinite(input.maxClickRate) && input.maxClickRate >= 0;
}
