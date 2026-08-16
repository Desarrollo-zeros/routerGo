import type { ChallengeVerificationPort, ChallengeVerificationStrategy, ChallengeVerificationInput, ChallengeVerificationResult } from '../ports/outbound/ChallengeVerification.js';

export class ChallengeVerificationRegistry implements ChallengeVerificationPort {
  private readonly strategies = new Map<string, ChallengeVerificationStrategy>();

  register(strategy: ChallengeVerificationStrategy): void {
    if (!/^[a-z][a-z0-9._-]*$/.test(strategy.key)) throw new Error('INVALID_VERIFICATION_STRATEGY_KEY');
    if (this.strategies.has(strategy.key)) throw new Error('DUPLICATE_VERIFICATION_STRATEGY');
    this.strategies.set(strategy.key, strategy);
  }

  async verify(strategyKey: string, input: ChallengeVerificationInput): Promise<ChallengeVerificationResult> {
    const strategy = this.strategies.get(strategyKey);
    if (!strategy) return { verified: false, reason: 'VERIFICATION_FAILED' };
    return strategy.verify(input);
  }
}
