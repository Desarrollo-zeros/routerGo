import { evaluateAdEligibility, type AdEligibilityDecision } from '../../domain/ads/AdEligibilityPolicy.js';
import type { AdEligibilityGate, AdEligibilityGateInput, AdEligibilityTelemetry, AdEligibilityTelemetryInput } from '../ports/outbound/AdEligibilityTelemetry.js';

type Outcome = { decision: AdEligibilityDecision | { allowed: false; reason: 'TELEMETRY_UNAVAILABLE' }; telemetry: 'RECORDED' | 'DUPLICATE' | 'UNAVAILABLE' };

export class EvaluateAdEligibility implements AdEligibilityGate {
  constructor(private readonly telemetry: AdEligibilityTelemetry) {}

  async execute(input: AdEligibilityGateInput): Promise<Outcome> {
    const decision = evaluateAdEligibility(input);
    try {
      const result = await this.telemetry.record(toTelemetry(input, decision));
      return { decision, telemetry: result };
    } catch {
      return { decision: { allowed: false, reason: 'TELEMETRY_UNAVAILABLE' }, telemetry: 'UNAVAILABLE' };
    }
  }
}

function toTelemetry(input: AdEligibilityGateInput, decision: AdEligibilityDecision): AdEligibilityTelemetryInput {
  return { id: input.id, eventKey: input.eventKey, campaignId: input.campaignId, placementId: input.placementId, decision: decision.reason, allowed: decision.allowed, region: input.region, consentGranted: input.consentGranted, impressionsInWindow: input.impressionsInWindow, frequencyCap: input.frequencyCap, clickRateBps: Math.round(input.clickRate * 10_000), maxClickRateBps: Math.round(input.maxClickRate * 10_000) };
}
