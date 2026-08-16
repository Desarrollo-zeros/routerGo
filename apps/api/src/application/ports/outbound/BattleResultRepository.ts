export type BattleResultInput = {
  battleId: string;
  winnerUserId?: string;
  scores: readonly { userId: string; score: number }[];
  completedAt: Date;
};

export type BattleResultWrite = 'RECORDED' | 'DUPLICATE';

export interface BattleResultRepository {
  record(input: BattleResultInput): Promise<BattleResultWrite>;
}
