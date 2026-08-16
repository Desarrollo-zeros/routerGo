import { describe, expect, it } from 'vitest';
import { ApprovedExerciseVerificationStrategy } from './ApprovedExerciseVerificationStrategy.js';

const strategy = new ApprovedExerciseVerificationStrategy({ key: 'exercise.approved', maxReps: 50, minDurationMs: 1000 });
const input = (evidence: Record<string, unknown>) => ({ challengeId: 'exercise-1', challengeVersion: 1, evidence });

describe('ApprovedExerciseVerificationStrategy', () => {
  it('verifies evidence inside the approved template limits', async () => {
    await expect(strategy.verify(input({ claimedReps: 10, durationMs: 1500 }))).resolves.toEqual({ verified: true, reason: 'VERIFIED' });
  });

  it('rejects malformed or unsafe evidence without issuing a reward', async () => {
    await expect(strategy.verify(input({ claimedReps: '10', durationMs: 1500 }))).resolves.toEqual({ verified: false, reason: 'INVALID_EVIDENCE' });
    await expect(strategy.verify(input({ claimedReps: 51, durationMs: 1500 }))).resolves.toEqual({ verified: false, reason: 'UNSAFE_EVIDENCE' });
  });
});
