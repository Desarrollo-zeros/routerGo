import { describe, expect, it } from 'vitest';
import { parseBattleMessage } from './battle-websocket.js';

describe('battle websocket protocol', () => {
  it('accepts only bounded create and join messages', () => {
    expect(parseBattleMessage('{"type":"create","category":"coding","maxPlayers":2}')).toEqual({ type: 'create', category: 'coding', maxPlayers: 2 });
    expect(parseBattleMessage('{"type":"join","battleId":"battle-1"}')).toEqual({ type: 'join', battleId: 'battle-1' });
    expect(() => parseBattleMessage('{"type":"create","category":"coding","maxPlayers":2.5}')).toThrow('BATTLE_MESSAGE_INVALID');
  });

  it('rejects malformed or unknown messages', () => {
    expect(() => parseBattleMessage('not-json')).toThrow();
    expect(() => parseBattleMessage('{"type":"start"}')).toThrow('BATTLE_MESSAGE_INVALID');
  });
});
