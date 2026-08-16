import type { ChallengeAdminReader, ChallengeAdminWriter, CreateChallengeInput } from '../ports/inbound/ChallengeAdminPort.js';

export class ListChallenges {
  constructor(private readonly reader: ChallengeAdminReader) {}
  execute() { return this.reader.list(); }
}

export class CreateChallenge {
  constructor(private readonly writer: ChallengeAdminWriter) {}
  execute(input: CreateChallengeInput) {
    if (!input.challengeKey.trim() || !input.verificationStrategy.trim() || input.maxRewardCredits <= 0n) throw new Error('INVALID_CHALLENGE');
    if (!['QUIZ', 'CODING', 'LEARNING', 'EXERCISE', 'SPONSORED'].includes(input.challengeType)) throw new Error('INVALID_CHALLENGE');
    return this.writer.create({ ...input, challengeKey: input.challengeKey.trim(), verificationStrategy: input.verificationStrategy.trim() });
  }
}

export class SubmitChallenge {
  constructor(private readonly writer: ChallengeAdminWriter) {}
  execute(challengeId: string) { if (!challengeId) throw new Error('INVALID_CHALLENGE'); return this.writer.submit(challengeId); }
}

export class ApproveChallenge {
  constructor(private readonly writer: ChallengeAdminWriter) {}
  execute(challengeId: string) { if (!challengeId) throw new Error('INVALID_CHALLENGE'); return this.writer.approve(challengeId); }
}
