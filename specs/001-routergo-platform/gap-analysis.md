# T001 — RouterGo Rev.7 baseline audit

**Date**: 2026-08-15
**Branch**: `main` at `c7caf91`
**Scope**: repository, architecture, persistence, runtime, quality gates, Docker, security, product surfaces, and Spec Kit traceability.

## Evidence baseline

- `pnpm install --frozen-lockfile`: dependency resolution and lockfile verification passed, but the local pnpm policy stopped on ignored build scripts for `esbuild` and `msgpackr-extract`.
- Direct TypeScript checks: API and web pass.
- Direct API/web builds: API TypeScript build passes; web TypeScript build passes; Vite binary was not available in the installed workspace links.
- `scripts/check-file-lines.mjs`: passes, 137 files checked under 200 lines.
- Direct ESLint: fails on `apps/api/src/composition-root/composition.ts` (`createComposition`, 55 lines); warns about `toWebManifest` complexity 14.
- Docker: `routergo-pg` healthy on host port 5432 and `routergo-redis` healthy on host port 6380 after isolating it from the existing EBrisk Redis on 6379. The declared LiteLLM image `ghcr.io/berriai/litellm:v1.65.1` fails with `manifest unknown`.
- `db:migrate`: passes against local Postgres.
- `db:seed` twice: passes with the same seed version/checksum.
- API Vitest with Postgres/Redis enabled: 7 files and 29 tests pass.
- HTTP smoke on the running API: `/health`, `/readiness`, `/runtime-manifest`, and `/catalog` return 200; `/v1/models` returns 404; `POST /quotes` returns a generated stub response without user/auth/accounting context.
- Architecture gate: historical baseline had `.dependency-cruiser.cjs` without an installed binary; the current toolchain pins `dependency-cruiser@17.4.3` and `pnpm check:arch` passes with 146 modules and 293 dependencies.
- CI: no `.github/workflows` directory exists.
- Product surfaces: `apps/admin` and `apps/advertiser` are absent; only API and web apps exist.

## Gap classification

## Progress after the baseline audit

- T006 is implemented: composition now fails when the manifest query fails, catalog/economy use application ports, wallet access requires an authenticated request context, and unimplemented quote/run/activity/ledger routes return explicit HTTP 501 instead of synthetic success.
- T007 is implemented for the current migration contract: ledger, outbox, quote, run, provider pool, usage windows, and runtime manifest have PostgreSQL adapter contract coverage. The API suite now passes 9 files and 39 tests with local PostgreSQL/Redis.
- T003 is implemented: the root architecture gate is executable, enforces the API hexagonal restrictions and future cross-context internal boundaries, and the line-count gate passes. Four existing web feature-to-adapter imports remain explicit transitional exceptions in `.dependency-cruiser.cjs`.
- T008 is implemented: RouterGo PostgreSQL, Redis, and LiteLLM use explicit local ports and healthchecks; the LiteLLM image is pinned by digest and the full API/web validation matrix passes locally.
- The dependency-install gate is implemented: `packageManager` is pinned to `pnpm@11.19.0`, and `pnpm-workspace.yaml` allows only the inspected `esbuild` and `msgpackr-extract` build scripts. A clean Corepack install completes without `ERR_PNPM_IGNORED_BUILDS`.
- T004 is implemented: `.github/workflows/ci.yml` runs frozen install, quality gates, tests with healthchecked PostgreSQL/Redis, build, migration plus repeated seed checksum validation, and Playwright E2E with least-privilege permissions, concurrency cancellation, finite timeouts, and failure diagnostics.
- T010 is implemented: additive identity/RBAC/audit migration `002_identity_rbac_audit.sql`, multi-file migration runner, least-privilege system role/permission seeds, cross-organization role assignment guards, append-only audit persistence, and PostgreSQL integration tests are present. Seed version `2026-08-15-r2` is repeatable with a stable checksum.
- T011/T012 are converged: `ResolveIdentityContextUseCase` supplies the small verified `IdentityContext` consumed by `AuthorizePermissionUseCase`; scoped/global permission decisions are fail-closed and covered by six integration scenarios. Authentication transport, HTTP enforcement, and RBAC persistence adapters remain future work.
- T013 is implemented: `PrivilegedChangeService` requires an allowed `AccessDecision`, runs the typed mutation/audit/outbox scope through one PostgreSQL transaction, sanitizes metadata and event payloads, and uses deterministic operation IDs for idempotency. Unit tests plus PostgreSQL commit, rollback, and duplicate-operation tests cover the boundary.
- T015 is implemented: published runtime snapshots are validated, hashed, immutable, selected through an explicit active pointer, and exposed with separate API/UI projections. Publish and rollback reuse T013, enforce expected-version/idempotency/concurrency boundaries, and synchronize a versioned Redis cache after commit.
- T014 is implemented: the PWA consumes the canonical `version`/`contentHash`, `apiRoutes`, nested UI routes/navigation, feature flags, catalog, and design-token projection. Labels resolve through a local registry, screen paths come from `ui.routes`, unknown screens/labels/capabilities fail closed, and the shared contract parser is covered by web tests.
- T031/T032 are implemented: developer keys are issued once and persisted only as hashes; scoped authentication supports revocation and rotation; durable client/key/model quota policies are evaluated through an atomic Redis RPM/TPM/credit counter.
- T033 is implemented: the runtime manifest seeds `/v1/models`, and the API returns the OpenAI list/object contract from the persisted catalog.
- T034 is implemented: the runtime manifest seeds `/v1/chat/completions`; the non-streaming application flow composes quote, reserve, configured provider execution, usage propagation, and settlement/release. Provider HTTP calls consume the shared reliability boundary, and unauthenticated requests fail with 401.
- T035 is implemented: the runtime manifest seeds `/v1/responses`; Responses input/output maps through the same economic execution boundary, provider SSE is parsed through protocol strategies, and stream chunks are delivered as SSE with a terminal event.
- T036 is implemented: `/v1/models`, `/v1/chat/completions`, and `/v1/responses` resolve bearer keys through the persisted hash/lifecycle boundary, enforce scopes and active client membership, map failures to stable HTTP errors, and run layered quotas before provider execution. Existing reliability tests verify that a stream is not retried after its first visible chunk; quota persistence and typed application tests cover rate limits and budget denial.
- T040 is implemented: `apps/admin` has an independent Vite/React composition, a semantic shell with skip-link/main/navigation landmarks, reusable Button/Panel/Status primitives, responsive layout, focus-visible states, and token-backed styling. Business navigation and CMS/admin workflows remain T042-T044.
- T041 is implemented: the CMS domain owns validated slugs, append-only content versions, explicit editorial transitions, and media metadata; `CmsContentRepository` keeps persistence behind an application port. HTTP, binary storage, and Studio workflows remain later tasks.
- T050 is implemented: migration `009_ads_core.sql` adds advertiser organizations, USD-micro funding accounts, campaign moderation/budget state, creatives, placements, targeting rules, and idempotent delivery events. PostgreSQL guards campaign overruns and real persistence tests cover budget and duplicate-event invariants.
- T051 is implemented: the Ads domain campaign aggregate requires explicit review/approval before activation, supports pause/resume, and enforces fixed-precision budget exhaustion without coupling delivery to persistence.
- T052 is implemented: `AdDecisionPort` and three typed inventory strategies select only active, approved, labeled candidates, support deterministic priority and caller allow-lists, and return explicit no-fill without mutating campaign or delivery state. Delivery/reconciliation remains T053.
- T053 is implemented: campaign delivery events are recorded transactionally with unique event-key idempotency, active-campaign spend is applied once within budget, impressions remain zero-cost, and finalized ad revenue keeps the existing idempotent USD reconciliation path.
- T054 is partially scaffolded: `apps/advertiser` now has an independent responsive shell with explicit balance, campaign, creative, and analytics entry points. The authenticated transport and advertiser application workflows remain open; no disabled UI action is presented as a successful mutation.
- T055 is partially implemented at the policy boundary: pure consent, region, frequency-cap, and click-rate fraud decisions return explicit reasons from caller-supplied configuration. Durable anti-fraud telemetry and policy administration remain open application work.
- T060 is implemented: migration `010_challenges.sql` adds versioned challenge definitions, immutable version identities, bounded reward rules, and completion records with sponsor/safety metadata. Verification strategies and reward execution remain T061-T064.
- T061 is implemented: challenge verification resolves only explicitly registered typed strategies, rejects duplicate/unsafe keys, and fails closed for unknown strategy keys without dynamic imports or execution.
- T062 is implemented: challenge reward eligibility uses bigint GoCredits, challenge and daily caps, and an explicit budget-port decision; it returns no issuance side effect and fails closed on budget/circuit denial.
- T063 is implemented: the existing exercise boundary now has an approved-template verification strategy with configured repetition/duration limits, typed evidence rejection, and no direct reward side effect.
- T064 is implemented: physical challenge eligibility applies configured duration/session caps, cooldowns, explicit stop controls, invalid-input rejection, and a non-physical alternative decision.
- T070 is implemented: migration `011_skills.sql` adds versioned skill definitions/policies and bounded session classifications. Classifier adapters, registry activation, fallback, and non-blocking session activation are implemented in T071-T075; Studio administration remains open.
- T071 is implemented: `IntentClassifierPort` and a schema-constrained adapter accept only the fixed intent taxonomy, confidence range, bounded tags, and no executable extra fields.
- T072 is implemented: `SkillRegistry` resolves only typed, uniquely versioned skills and deep-freezes policy JSON so callers cannot mutate registered versions.
- T073 is implemented: intent classification falls back to deterministic keyword heuristics or configured default when budget is unavailable, confidence is low, the classifier errors, or timeout elapses; the core session is never blocked.
- T074 is implemented: session-start application resolution consumes the bounded classifier and immutable skill registry, while returning core-session availability even when the selected skill version is unavailable. HTTP transport and durable classification persistence remain separate gaps.
- T075 is implemented: schema-constrained classifier output rejects prompt-shaped unknown intent, skill, and tool fields; session resolution falls back to the configured general skill and never activates model-provided names.

### P0 — Foundation blockers

| ID | Gap | Evidence | Impact |
|---|---|---|---|
| P0-001 | The production composition is only partially real. | T034-T036 wire chat/responses through quote/reserve/provider/settle-or-release, persisted API-key authentication, quotas, and streaming reliability boundaries. | The supported completion paths are executable locally; production provider rollout and broader product gates remain open. |
| P0-002 | The migration/adapter contract required repair. | T007 aligned ledger, outbox, quote, run, pool, usage-window, and manifest adapters to `001_initial.sql`, with five real PostgreSQL contract tests. Run status transitions and economic reservation semantics still require separate tests/use cases. | The covered persistence paths are executable; reserve/settle accounting and broader lifecycle behavior remain open. |
| P0-003 | Economy is debit/refund, not QUOTE → RESERVE → EXECUTE → SETTLE → RELEASE/REFUND. | **Resolved through T026 on 2026-08-15**: T020-T025 provide durable reservations, command idempotency, unit-aware budgets, provider-cost records, fixed-precision units, locking, and fail-closed quote/run execution. T026 materializes known provider costs and finalized ad revenue through idempotent reconciliation batches, reports unresolved runs, and emits reconciliation metrics. | User-credit and known platform accounting are auditable; public rollout remains blocked until real provider adapters, HTTP authorization, and broader product rollout gates are complete. |
| P0-004 | The runtime API is not the specified RouterGo API and has no effective HTTP authorization enforcement. | **Resolved for the supported Developer API surface through T036**: `/v1/models`, `/v1/chat/completions`, and `/v1/responses` are manifest-backed, require bearer API keys, enforce lifecycle/scopes, resolve an active wallet context, and apply layered quotas. Legacy/admin routes and full identity middleware remain outside this task. | The supported Developer API has a credential and quota boundary; legacy/admin rollout remains gated. |

### P1 — High priority convergence gaps

| ID | Gap | Evidence | Impact |
|---|---|---|---|
| P1-001 | Architecture gate is declared but not installable/runnable. | **Resolved 2026-08-15**: root `dependency-cruiser@17.4.3` is pinned, and `pnpm check:arch` passes with 146 modules and 293 dependencies. | Closed locally and covered by the T004 CI quality job. |
| P1-002 | No CI quality workflow. | **Resolved 2026-08-15**: `.github/workflows/ci.yml` defines the required quality, test, build, database, and E2E jobs. | Local and workflow gates are aligned; GitHub branch protection still needs these exact checks marked required. |
| P1-003 | External provider reliability is incomplete. | **T034 consumes the existing foundation** through `HttpProviderAdapter`, configured endpoint resolution, timeout, bounded retry, backoff, and circuit breaking. Bulkhead policy and production provider rollout remain future work. | FR-005/006 are covered for the non-streaming adapter boundary; broader provider rollout remains open. |
| P1-004 | LiteLLM compose image is invalid and local Redis conflicted with another stack. | **Resolved 2026-08-15**: LiteLLM uses a fixed GHCR digest, Redis uses host port 6380, and PostgreSQL/Redis/LiteLLM report healthy after `docker compose up -d`. | Closed for the local Foundation environment; real provider execution remains intentionally out of scope. |
| P1-005 | Runtime skill routing was absent. | **Resolved 2026-08-15**: versioned skill schema, constrained classifier adapter, immutable registry, bounded fallback, non-blocking session activation, and prompt-injection rejection tests are present. | Studio skill administration and durable classification persistence remain future work. |
| P1-006 | Frontend transport boundary is violated and error handling is mostly silent. | Feature modules import `apps/web/src/adapters/*` directly; the configured architecture rule forbids this. `router.tsx` and storage/http adapters contain empty catch fallbacks. | UI cannot be verified against the declared dependency direction and failures can appear as false empty state. |

### P2 — Medium priority product/quality gaps

- Admin/Studio foundation and CMS domain are present through T041; T042 now has manifest-driven navigation plus runtime/catalog/provider read views, while authenticated transport, audited publish actions, and critical-flow E2E remain T042-T044. The advertiser application is not present.
- Generic challenge engine, exercise safety workflow, battles, treasure, risk, analytics, and audit query/reporting workflows are not implemented; T013 covers only the privileged mutation/audit/outbox write boundary.
- Web unit and Playwright coverage is green for the runtime projection, responsive widths, offline fallback, and manifest-driven navigation. Full WCAG auditing remains a later hardening task.
- Runtime manifest versioning/cache invalidation/rollback is resolved by T014/T015: `runtime_manifest_snapshots`, `runtime_manifest_state`, `runtime_ui_routes`, typed publish/rollback use cases, canonical API/UI projection, PostgreSQL contract tests, and cache miss/failure coverage are present. HTTP authentication/Studio transport remains future work.
- Observability is partial; T026 adds reconciliation counters and unresolved-run gauge, while end-to-end correlation, cost/revenue margin, reward reconciliation, and dashboard presentation remain later hardening work.
- Accessibility/responsive checks are represented by source/spec intent, not a passing browser/a11y evidence set.

### P3 — Improvements

- Split the initial SQL into reviewable additive migrations once the schema contract is repaired.
- Replace remaining `as never` casts and broad `unknown` handlers with typed application contracts.
- Refine `createComposition` and `toWebManifest` to satisfy the strict function/complexity thresholds.
- Add contract documentation for provider commercial eligibility before any public provider rollout.

## Foundation decision

Do not begin Phases 4–10 until the applicable dependencies are closed. T003, T004, T005, T006, T007, T008, T010, T011, T012, T013, T014, T015, T020, T021, T022, T023, T024, T025, T026, T030, T031, T032, T033, T034, T035, and T036 are closed locally. Legacy/admin authentication, production provider rollout, and later product surfaces remain future work.
