export type BattleStatus = 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type BattleRound = { number: number; promptKey: string; expectedAnswer: string; points: number; startsAt: Date; endsAt: Date };
export type BattlePlayer = { userId: string; score: number; joinedAt: Date };
export type BattleAnswer = { userId: string; round: number; correct: boolean; points: number; submittedAt: Date };

export class BattleMatch {
  private status: BattleStatus = 'WAITING';
  private readonly players = new Map<string, BattlePlayer>();
  private readonly rounds = new Map<number, BattleRound>();
  private readonly answers = new Map<string, BattleAnswer>();

  private constructor(private readonly id: string, private readonly maxPlayers: number, private readonly category: string, private readonly createdAt: Date) {}

  static create(id: string, category: string, maxPlayers: number, createdAt: Date): BattleMatch {
    if (!id || !category || !Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 8) throw new Error('INVALID_BATTLE_CONFIG');
    return new BattleMatch(id, maxPlayers, category, createdAt);
  }

  join(userId: string, joinedAt: Date): void {
    if (this.status !== 'WAITING') throw new Error('BATTLE_NOT_JOINABLE');
    if (!userId || this.players.has(userId)) throw new Error('BATTLE_PLAYER_INVALID');
    if (this.players.size >= this.maxPlayers) throw new Error('BATTLE_FULL');
    this.players.set(userId, { userId, score: 0, joinedAt });
  }

  start(): void {
    if (this.status !== 'WAITING' || this.players.size < 2) throw new Error('BATTLE_NOT_STARTABLE');
    this.status = 'ACTIVE';
  }

  openRound(round: BattleRound): void {
    if (this.status !== 'ACTIVE' || round.number < 1 || round.endsAt <= round.startsAt || round.points < 0) throw new Error('BATTLE_ROUND_INVALID');
    if (this.rounds.has(round.number)) throw new Error('BATTLE_ROUND_DUPLICATE');
    this.rounds.set(round.number, { ...round });
  }

  submitAnswer(userId: string, roundNumber: number, answer: string, submittedAt: Date): BattleAnswer {
    const round = this.rounds.get(roundNumber);
    if (this.status !== 'ACTIVE' || !round || !this.players.has(userId)) throw new Error('BATTLE_ANSWER_INVALID');
    if (submittedAt < round.startsAt || submittedAt > round.endsAt) throw new Error('BATTLE_ROUND_EXPIRED');
    const key = `${roundNumber}:${userId}`;
    if (this.answers.has(key)) throw new Error('BATTLE_ANSWER_DUPLICATE');
    const correct = normalize(answer) === normalize(round.expectedAnswer);
    const result = { userId, round: roundNumber, correct, points: correct ? round.points : 0, submittedAt };
    this.answers.set(key, result);
    const player = this.players.get(userId);
    if (player) player.score += result.points;
    return result;
  }

  finish(): void {
    if (this.status !== 'ACTIVE') throw new Error('BATTLE_NOT_FINISHABLE');
    this.status = 'COMPLETED';
  }

  snapshot(): { id: string; category: string; status: BattleStatus; createdAt: Date; players: readonly BattlePlayer[]; rounds: readonly BattleRound[]; answers: readonly BattleAnswer[] } {
    return { id: this.id, category: this.category, status: this.status, createdAt: this.createdAt, players: [...this.players.values()], rounds: [...this.rounds.values()], answers: [...this.answers.values()] };
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}
