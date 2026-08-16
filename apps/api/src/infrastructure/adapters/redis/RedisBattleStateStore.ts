import type Redis from 'ioredis';
import type { BattleMatchmakingStore, BattleState, BattleStateStore } from '../../../application/ports/outbound/BattleStateStore.js';

export class RedisBattleStateStore implements BattleMatchmakingStore {
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

  async create(input: { id: string; category: string; maxPlayers: number }): Promise<BattleState> {
    if (!Number.isInteger(input.maxPlayers) || input.maxPlayers < 2 || input.maxPlayers > 8) throw new Error('BATTLE_CONFIG_INVALID');
    const state: BattleState = { id: input.id, category: input.category, maxPlayers: input.maxPlayers, status: 'WAITING', players: [], currentRound: 0 };
    await this.save(state, 300);
    return state;
  }

  async join(battleId: string, userId: string): Promise<BattleState> {
    if (!userId) throw new Error('BATTLE_USER_INVALID');
    const redisKey = key(battleId);
    const result = await this.redis.eval(JOIN_SCRIPT, 1, redisKey, userId, 300) as string;
    if (result === 'BATTLE_NOT_FOUND' || result === 'BATTLE_NOT_JOINABLE') throw new Error(result);
    return parseState(result);
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
  return hasBattleIdentity(state) && hasBattleStatus(state, statuses) && hasBattlePlayers(state);
}

function hasBattleIdentity(state: Record<string, unknown>): boolean {
  return typeof state.id === 'string' && typeof state.category === 'string';
}

function hasBattleStatus(state: Record<string, unknown>, statuses: string[]): boolean {
  return typeof state.status === 'string' && statuses.includes(state.status)
    && Number.isInteger(state.currentRound)
    && (state.maxPlayers === undefined || Number.isInteger(state.maxPlayers));
}

function hasBattlePlayers(state: Record<string, unknown>): boolean {
  return Array.isArray(state.players) && state.players.every(isBattlePlayer);
}

function isBattlePlayer(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const player = value as Record<string, unknown>;
  return typeof player.userId === 'string'
    && typeof player.score === 'number'
    && Number.isInteger(player.score)
    && player.score >= 0;
}

const JOIN_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if not raw then return 'BATTLE_NOT_FOUND' end
local state = cjson.decode(raw)
for _, player in ipairs(state.players) do
  if player.userId == ARGV[1] then return raw end
end
local maxPlayers = state.maxPlayers or 8
if state.status ~= 'WAITING' or #state.players >= maxPlayers then return 'BATTLE_NOT_JOINABLE' end
table.insert(state.players, { userId = ARGV[1], score = 0 })
local next = cjson.encode(state)
redis.call('SET', KEYS[1], next, 'EX', ARGV[2])
return next
`;
