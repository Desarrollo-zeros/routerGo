---
name: routergo-quality
description: Validate RouterGo tests, performance, reliability, security, concurrency, responsive UI, and Spec Kit convergence.
---
# RouterGo Quality

Before completion run applicable gates:
`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm check:lines`, `pnpm check:arch`, migrations/seeds, E2E.

Critical tests:
- wallet/reserve/settle concurrency and idempotency;
- provider contract timeout/429/retry/circuit breaker;
- stream disconnect before/after first token;
- API key scope/revoke/rate/budget;
- classifier invalid/low-confidence/fallback/injection;
- campaign budget/reconciliation;
- challenge replay/duplicate reward;
- battle authoritative state/reconnect;
- QR replay/location permission fallback;
- responsive 320+ and accessibility states.

No green happy-path-only completion. Compare implementation against spec/plan/tasks and append gaps before declaring convergence.
