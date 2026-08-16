import type { AdEligibilityDecision } from '../../../domain/ads/AdEligibilityPolicy.js';
import type { AdEligibilityRequest } from '../../../domain/ads/AdEligibilityPolicy.js';

export type AdEligibilityTelemetryInput = {
  id: string;
  eventKey: string;
  campaignId: string;
  placementId?: string;
  decision: AdEligibilityDecision['reason'];
  allowed: boolean;
  region: string;
  consentGranted: boolean;
  impressionsInWindow: number;
  frequencyCap: number;
  clickRateBps: number;
  maxClickRateBps: number;
};

export type AdEligibilityTelemetryResult = 'RECORDED' | 'DUPLICATE';

export interface AdEligibilityTelemetry {
  record(input: AdEligibilityTelemetryInput): Promise<AdEligibilityTelemetryResult>;
}

export type AdEligibilityGateInput = AdEligibilityRequest & { id: string; eventKey: string; campaignId: string; placementId?: string };
export interface AdEligibilityGate {
  execute(input: AdEligibilityGateInput): Promise<{ decision: AdEligibilityDecision | { allowed: false; reason: 'TELEMETRY_UNAVAILABLE' } }>;
}
