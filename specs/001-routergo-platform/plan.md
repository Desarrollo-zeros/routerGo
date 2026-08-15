# Implementation Plan: RouterGo Platform Rev.7

**Branch**: `001-routergo-platform` | **Date**: 2026-08-15 | **Spec**: `spec.md`

## Summary
Evolve the existing RouterGo monorepo rather than rewrite it. Preserve working wallet/provider/runtime foundations, repair hardcoded/fallback gaps, then add identity/RBAC, reserve-settle economy, public API, Studio/CMS, ads/advertiser, generic challenges, skill routing, battles, treasure, risk, and analytics as bounded contexts.

## Technical Context
**Language**: TypeScript strict, Node >=20  
**Web**: React/Vite PWA, responsive 320px -> desktop  
**API**: Fastify modular monolith  
**Storage**: PostgreSQL durable, Redis ephemeral coordination/cache/streams  
**Async**: BullMQ/outbox  
**Realtime**: WebSocket for battles; SSE for LLM streams  
**AI routing**: provider adapters/LiteLLM behind RouterGo policy  
**Testing**: Vitest, contract/integration/concurrency, Playwright E2E/a11y  
**Architecture**: hexagonal + bounded contexts + runtime manifest  
**Performance**: p95 non-LLM API <250ms baseline; classifier <=500ms p95; avoid blocking ad/classifier calls in critical response path

## Constitution Check
PASS only if each phase preserves: SOLID/hexagonal boundaries; code files <=200 lines; safe bounded retries; idempotent accounting; no upstream secrets; responsive/a11y; physical challenge safety; spec/test traceability. Any exception requires ADR before implementation.

## Target Project Structure
```text
apps/
  api/             # HTTP + application composition
  web/             # user PWA
  admin/           # RouterGo Studio (add when implemented)
  advertiser/      # advertiser portal (add when implemented)
  worker/          # background workers (extract if current API worker grows)
packages/
  shared/          # contracts/types only
  ui/              # reusable headless UI (future extraction)
  observability/   # telemetry primitives (future extraction)
tools/
  mcp-routergo/    # Codex development MCP
specs/
  001-routergo-platform/
```

## Bounded Context Design
1. **identity**: users, organizations, memberships, roles/permissions, sessions.
2. **wallet/economy**: wallet, ledger, reservations, budgets, cost/revenue reconciliation.
3. **ai-routing**: model catalog, deployments, capabilities, health/quota/cost policy.
4. **developer-api**: API clients/keys/scopes/rate/token budgets.
5. **skills**: session classifier, skill registry, versions, policies, activation telemetry.
6. **cms**: content/version/publication/media/localization.
7. **ads/advertiser**: advertisers, funding, campaigns, creatives, placements, moderation, events.
8. **challenges**: generic definitions/instances/completions/reward policy.
9. **exercise**: approved pose templates/evidence and safety caps.
10. **battle**: matchmaking, authoritative rounds/scoring/reconnect.
11. **treasure**: hunts/steps/geofence/QR proof without continuous tracking.
12. **risk/analytics**: risk events/cases and business/product observability.

## Key Patterns
- Provider/verification/ad algorithms: Strategy.
- Adapter creation: Abstract Factory.
- DB: Repository + Data Mapper + Unit of Work.
- Eligibility/quota/targeting: Specification.
- Long workflows: State.
- Cross-context: Domain Events + Outbox.
- Provider resilience: Circuit Breaker + Bulkhead + bounded retry.
- Runtime handlers: typed Registry, never eval.
- UI: headless/compound components + design tokens.

## Reliability Policy
- Define deadline per upstream call.
- Retry only transient failures and only while operation is safe/idempotent.
- Exponential backoff + jitter, bounded attempts and total deadline.
- Honor provider retry-after when within budget.
- Circuit break repeated failures; bulkhead expensive providers.
- LLM streaming: provider switch allowed only before first user-visible token unless protocol explicitly supports resumable same-run semantics.
- All attempts share correlation/run ID and emit metrics.

## Intent/Skill Router
At session start: normalize minimal prompt features -> `IntentClassifierPort` -> schema-constrained `{intent, confidence, tags}` -> validate -> `SkillRegistry` allow-list -> activate immutable `SkillVersion`. Use configured cheap classifier (e.g. a fast low-cost model) only if budget/latency/availability policy allows. Fallback: deterministic heuristic/default general skill. Never execute model-provided code/tool names directly.

## Data Migration Direction
Keep existing tables. Add additive migrations for reservations, organizations/RBAC, developer keys, skills, ads detail, challenges, battles, treasure, audit/risk, revenue/cost ledgers. Do not overload the existing `ledger_entries` with ad/company cash accounting; separate financial/reconciliation entities from user GoCredits.

## Frontend Plan
- User PWA: Home, Challenges, Battles, AI, Profile/Developer.
- Studio: Dashboard, Users, Wallet/Ledger, Economy, Providers/Models, Skills, CMS, Challenges, Battles, Treasure, Advertisers/Campaigns, Risk, Analytics, Flags/Audit.
- Advertiser: Balance, Campaigns, Creatives, Sponsored Challenges, Audiences, Analytics, Team/Billing.
- Design tokens align dark DevZeros/RouterGo visual language, but all critical contrast is automated/verified.

## Delivery Phases
0. Baseline audit + remove obsolete plan authority + CI quality gates.
1. Identity/RBAC/audit foundation and manifest correctness.
2. Economy v2: reserve/settle, budgets, cost/revenue entries, circuit breaker.
3. RouterGo public API and API-key security/quotas.
4. Studio/CMS with versioned publish workflows.
5. Ads core + advertiser funding/campaign moderation.
6. Advertiser portal.
7. Generic Challenge Engine + approved exercise evolution.
8. Runtime Intent/Skill Router + Studio skill management.
9. Battle realtime engine.
10. Treasure engine.
11. Risk/fraud expansion + analytics/unit economics.
12. PWA UX/performance/a11y hardening and staged beta.

## Parallelization
After phases 0-2: API, Studio/CMS, Ads can proceed in parallel. After challenge/identity contracts stabilize: Skills, Battle, Treasure can proceed independently. Assign agents by bounded context and exact file ownership; no two agents edit shared composition/migration index simultaneously without integration ownership.

## Rollout Gates
No public provider until commercial compatibility is documented. No physical sponsored challenge until safety moderation exists. No advertiser spend until reconciliation/idempotency exists. No public API until key revocation/rate/budget controls pass. No broad beta until economy dashboard can prove cost/revenue contribution.
