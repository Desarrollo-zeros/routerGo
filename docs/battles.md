# Battles

## Matchmaking gateway

The API exposes an authenticated WebSocket endpoint at `/battles/ws`. Clients
send the API key in the `Authorization: Bearer <key>` handshake header; keys
must include the `battles.play` scope and the resolved identity must be
authorized before the connection receives the `ready` event.

The initial protocol is intentionally bounded:

- `{"type":"create","category":"coding","maxPlayers":2}` creates a
  waiting match and joins the creator.
- `{"type":"join","battleId":"..."}` joins an available match.
- The gateway emits `battle.created`, `battle.joined`, and structured `error`
  messages.

Ephemeral matchmaking state is stored in Redis with a five-minute TTL. Join
updates use a Lua transaction so concurrent joins cannot exceed the configured
player limit or duplicate a player. Durable battle results remain the concern
of the result application port and PostgreSQL adapter.

Reconnect, timeout, idempotent completion, reward integration, and the battle
UI are tracked separately in T083 and T084.

The resilience boundary is covered by persistence tests: reconnect reads the
same Redis match state, expired rounds reject answers, concurrent completion
records one PostgreSQL result, and reward decisions remain bounded by the
configured challenge and daily caps.
