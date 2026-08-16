import type { BattleResultInput, BattleResultRepository, BattleResultWrite } from '../ports/outbound/BattleResultRepository.js';

export class RecordBattleResult {
  constructor(private readonly repository: BattleResultRepository) {}

  async execute(input: BattleResultInput): Promise<BattleResultWrite> {
    validate(input);
    return this.repository.record(input);
  }
}

function validate(input: BattleResultInput): void {
  validateCore(input);
  const users = new Set<string>();
  for (const score of input.scores) {
    if (!score.userId || users.has(score.userId) || !Number.isInteger(score.score) || score.score < 0) throw new Error('BATTLE_RESULT_INVALID');
    users.add(score.userId);
  }
  validateWinner(input.winnerUserId, users);
}

function validateCore(input: BattleResultInput): void {
  if (!input.battleId || input.scores.length < 2 || !Number.isFinite(input.completedAt.getTime())) throw new Error('BATTLE_RESULT_INVALID');
}

function validateWinner(winnerUserId: string | undefined, users: Set<string>): void {
  if (winnerUserId && !users.has(winnerUserId)) throw new Error('BATTLE_WINNER_INVALID');
}
