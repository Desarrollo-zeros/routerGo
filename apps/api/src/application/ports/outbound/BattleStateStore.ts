export type BattleState = {
  id: string;
  category: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  maxPlayers?: number;
  players: readonly { userId: string; score: number }[];
  currentRound: number;
};

export interface BattleStateStore {
  save(state: BattleState, ttlSeconds: number): Promise<void>;
  read(battleId: string): Promise<BattleState | null>;
  remove(battleId: string): Promise<void>;
}

export interface BattleMatchmakingStore extends BattleStateStore {
  create(input: { id: string; category: string; maxPlayers: number }): Promise<BattleState>;
  join(battleId: string, userId: string): Promise<BattleState>;
}
