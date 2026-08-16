import type Redis from 'ioredis';
import type { BattleState, BattleStateStore } from '../../../application/ports/outbound/BattleStateStore.js';

export class RedisBattleStateStore implements BattleStateStore {
  constructor(private readonly redis: Redis) {}

  async save(state: BattleState, ttlSeconds: number): Promise<void> {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) throw new Error('BATTLE_STATE_TTL_INVALID');
    await this.redis.set(key(state.id), JSON.stringify(state), 'EX', ttlSeconds);
  }

  async read(battleId: string): Promise<BattleState | null> {
    const raw = await this.redis.get(key(battleId));
    return raw ? parseState(raw) : null;
  }

  async remove(battleId: string): Promise<void> {
    await this.redis.del(key(battleId));
  }
}

function key(battleId: string): string {
  return `battle:state:${battleId}`;
}

function parseState(raw: string): BattleState {
  const value: unknown = JSON.parse(raw);
  if (!isBattleState(value)) throw new Error('BATTLE_STATE_INVALID');
  return value;
}

function isBattleState(value: unknown): value is BattleState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Record<string, unknown>;
  const statuses = ['WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  return typeof state.id === 'string'
    && typeof state.category === 'string'
    && typeof state.status === 'string'
    && statuses.includes(state.status)
    && Number.isInteger(state.currentRound)
    && Array.isArray(state.players)
    && state.players.every(isBattlePlayer);
}

function isBattlePlayer(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const player = value as Record<string, unknown>;
  return typeof player.userId === 'string'
    && typeof player.score === 'number'
    && Number.isInteger(player.score)
    && player.score >= 0;
}
