import { describe, expect, it } from 'vitest';
import { RecordBattleResult } from './RecordBattleResult.js';

const input = { battleId: 'battle-1', winnerUserId: 'user-1', scores: [{ userId: 'user-1', score: 10 }, { userId: 'user-2', score: 0 }], completedAt: new Date() };

describe('RecordBattleResult', () => {
  it('validates bounded server results and delegates idempotent storage', async () => {
    const repository = { record: async () => 'RECORDED' as const };
    await expect(new RecordBattleResult(repository).execute(input)).resolves.toBe('RECORDED');
  });

  it('rejects duplicate players, negative scores, and foreign winners', async () => {
    const repository = { record: async () => 'RECORDED' as const };
    await expect(new RecordBattleResult(repository).execute({ ...input, winnerUserId: 'unknown' })).rejects.toThrow('BATTLE_WINNER_INVALID');
    await expect(new RecordBattleResult(repository).execute({ ...input, scores: [{ userId: 'user-1', score: -1 }, { userId: 'user-2', score: 0 }] })).rejects.toThrow('BATTLE_RESULT_INVALID');
  });
});
