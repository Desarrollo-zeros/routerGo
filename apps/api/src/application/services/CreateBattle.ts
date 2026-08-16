import { nanoid } from 'nanoid';
import type { BattleMatchmakingStore, BattleState } from '../ports/outbound/BattleStateStore.js';

export class CreateBattle {
  constructor(private readonly store: BattleMatchmakingStore) {}

  async execute(input: { userId: string; category?: string; maxPlayers?: number }): Promise<BattleState> {
    if (!input.userId) throw new Error('BATTLE_USER_INVALID');
    const state = await this.store.create({ id: nanoid(16), category: input.category ?? 'learning', maxPlayers: input.maxPlayers ?? 2 });
    return this.store.join(state.id, input.userId);
  }
}
