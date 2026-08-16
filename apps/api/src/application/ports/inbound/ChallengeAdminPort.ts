export type ChallengeAdminView = {
  id: string;
  challengeKey: string;
  challengeType: string;
  verificationStrategy: string;
  status: string;
  version: number;
  versionStatus: string;
  maxRewardCredits: string;
};

export type CreateChallengeInput = {
  challengeKey: string;
  challengeType: string;
  verificationStrategy: string;
  content: Record<string, unknown>;
  rewardPolicy: Record<string, unknown>;
  maxRewardCredits: bigint;
};

export interface ChallengeAdminReader { list(): Promise<ChallengeAdminView[]>; }
export interface ChallengeAdminWriter {
  create(input: CreateChallengeInput): Promise<ChallengeAdminView>;
  submit(challengeId: string): Promise<ChallengeAdminView>;
  approve(challengeId: string): Promise<ChallengeAdminView>;
}
