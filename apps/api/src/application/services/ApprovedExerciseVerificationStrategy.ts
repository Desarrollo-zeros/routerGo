import type { ChallengeVerificationInput, ChallengeVerificationResult, ChallengeVerificationStrategy } from '../ports/outbound/ChallengeVerification.js';

export type ApprovedExerciseTemplate = {
  key: string;
  maxReps: number;
  minDurationMs: number;
};

export class ApprovedExerciseVerificationStrategy implements ChallengeVerificationStrategy {
  readonly key: string;

  constructor(private readonly template: ApprovedExerciseTemplate) {
    this.key = template.key;
  }

  async verify(input: ChallengeVerificationInput): Promise<ChallengeVerificationResult> {
    const reps = input.evidence.claimedReps;
    const durationMs = input.evidence.durationMs;
    if (!isNonNegativeInteger(reps) || !isNonNegativeInteger(durationMs)) return { verified: false, reason: 'INVALID_EVIDENCE' };
    if (reps > this.template.maxReps || durationMs < this.template.minDurationMs) return { verified: false, reason: 'UNSAFE_EVIDENCE' };
    return { verified: true, reason: 'VERIFIED' };
  }
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
