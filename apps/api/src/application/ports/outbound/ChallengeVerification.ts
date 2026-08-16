export type ChallengeVerificationInput = {
  challengeId: string;
  challengeVersion: number;
  evidence: Readonly<Record<string, unknown>>;
};

export type ChallengeVerificationResult =
  | { verified: true; reason: 'VERIFIED' }
  | { verified: false; reason: 'INVALID_EVIDENCE' | 'UNSAFE_EVIDENCE' | 'VERIFICATION_FAILED' };

export interface ChallengeVerificationStrategy {
  readonly key: string;
  verify(input: ChallengeVerificationInput): Promise<ChallengeVerificationResult>;
}

export interface ChallengeVerificationPort {
  verify(strategyKey: string, input: ChallengeVerificationInput): Promise<ChallengeVerificationResult>;
}
