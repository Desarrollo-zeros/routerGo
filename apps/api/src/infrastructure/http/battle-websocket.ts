import websocket from '@fastify/websocket';
import type { FastifyInstance } from 'fastify';
import type { BattleMatchmakingStore } from '../../application/ports/outbound/BattleStateStore.js';
import type { ApiKeyIdentityResolver } from '../../application/ports/outbound/ApiKeyIdentityResolver.js';
import type { ApiKeyRequestContext } from '../../application/ports/outbound/ApiKeyContextResolver.js';
import type { AuthorizePermissionUseCase } from '../../application/use-cases/AuthorizePermission.js';
import { AuthenticationRequiredError } from './http-errors.js';
import { nanoid } from 'nanoid';

type Socket = { on(event: 'message' | 'close', listener: (value?: { toString(): string }) => void): void; send(value: string): void; close(code?: number): void };
export type BattleGatewayDeps = {
  store: BattleMatchmakingStore;
  authenticateApiKey: (rawKey: string, scope: string) => Promise<ApiKeyRequestContext>;
  identity: ApiKeyIdentityResolver;
  authorize: AuthorizePermissionUseCase;
};

export function registerBattleGateway(app: FastifyInstance, deps: BattleGatewayDeps): void {
  app.register(websocket);
  app.get('/battles/ws', { websocket: true }, (socket, request) => { void handleConnection(socket as Socket, request.headers.authorization, deps); });
}

async function handleConnection(socket: Socket, authorization: string | undefined, deps: BattleGatewayDeps): Promise<void> {
  try {
    const identity = await resolveIdentity(authorization, deps);
    socket.send(JSON.stringify({ type: 'ready', userId: identity.userId }));
    socket.on('message', (value) => { void handleMessage(socket, value?.toString() ?? '', identity.userId, deps); });
  } catch { socket.close(1008); }
}

async function resolveIdentity(authorization: string | undefined, deps: BattleGatewayDeps) {
  if (!authorization?.startsWith('Bearer ')) throw new AuthenticationRequiredError();
  const context = await deps.authenticateApiKey(authorization.slice(7).trim(), 'battles.play');
  const identity = await deps.identity.resolve(context);
  if (!identity) throw new AuthenticationRequiredError();
  const decision = await deps.authorize.execute({ identity, permission: 'battles.play' });
  if (!decision.allowed) throw new AuthenticationRequiredError();
  return identity;
}

async function handleMessage(socket: Socket, raw: string, userId: string, deps: BattleGatewayDeps): Promise<void> {
  try {
    const message = parseBattleMessage(raw);
    if (message.type === 'create') {
      const state = await deps.store.create({ id: nanoid(16), category: message.category, maxPlayers: message.maxPlayers });
      await deps.store.join(state.id, userId);
      socket.send(JSON.stringify({ type: 'battle.created', state: await deps.store.read(state.id) }));
      return;
    }
    const state = await deps.store.join(message.battleId, userId);
    socket.send(JSON.stringify({ type: 'battle.joined', state }));
  } catch (error) { socket.send(JSON.stringify({ type: 'error', code: error instanceof Error ? error.message : 'BATTLE_MESSAGE_INVALID' })); }
}

type Message = { type: 'create'; category: string; maxPlayers: number } | { type: 'join'; battleId: string };
export function parseBattleMessage(raw: string): Message {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('BATTLE_MESSAGE_INVALID');
  const message = value as Record<string, unknown>;
  if (message.type === 'create' && typeof message.category === 'string' && Number.isInteger(message.maxPlayers)) return { type: 'create', category: message.category, maxPlayers: message.maxPlayers as number };
  if (message.type === 'join' && typeof message.battleId === 'string') return { type: 'join', battleId: message.battleId };
  throw new Error('BATTLE_MESSAGE_INVALID');
}
