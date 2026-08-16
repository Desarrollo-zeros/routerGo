import { describe, expect, it } from 'vitest';
import { BattleMatch } from './BattleMatch.js';

const start = new Date('2026-08-15T12:00:00Z');
const round = { number: 1, promptKey: 'quiz-1', expectedAnswer: 'RouterGo', points: 10, startsAt: start, endsAt: new Date(start.getTime() + 30_000) };

function activeBattle(): BattleMatch {
  const battle = BattleMatch.create('battle-1', 'coding', 2, start);
  battle.join('user-1', start);
  battle.join('user-2', start);
  battle.start();
  battle.openRound(round);
  return battle;
}

describe('BattleMatch', () => {
  it('scores answers server-side and prevents duplicate submissions', () => {
    const battle = activeBattle();
    expect(battle.submitAnswer('user-1', 1, ' routergo ', new Date(start.getTime() + 1_000))).toMatchObject({ correct: true, points: 10 });
    expect(() => battle.submitAnswer('user-1', 1, 'RouterGo', new Date(start.getTime() + 2_000))).toThrow('BATTLE_ANSWER_DUPLICATE');
    expect(battle.snapshot().players).toContainEqual({ userId: 'user-1', score: 10, joinedAt: start });
  });

  it('rejects expired rounds and user-provided scoring', () => {
    const battle = activeBattle();
    expect(() => battle.submitAnswer('user-2', 1, 'RouterGo', new Date(start.getTime() + 31_000))).toThrow('BATTLE_ROUND_EXPIRED');
    expect(() => battle.submitAnswer('unknown', 1, 'RouterGo', new Date(start.getTime() + 1_000))).toThrow('BATTLE_ANSWER_INVALID');
  });

  it('requires two players and never introduces a stake', () => {
    const battle = BattleMatch.create('battle-2', 'learning', 2, start);
    battle.join('user-1', start);
    expect(() => battle.start()).toThrow('BATTLE_NOT_STARTABLE');
    expect(battle.snapshot()).not.toHaveProperty('stake');
  });
});
