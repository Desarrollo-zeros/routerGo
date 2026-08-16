# Tasks: RouterGo Platform Rev.7

Format: `[ID] [P?] [Story] task`. `[P]` means safe parallel ownership in different files/contexts.

## Phase 0 — Baseline and governance (blocking)
- [x] T001 Audit current main against constitution; record gaps in `specs/001-routergo-platform/gap-analysis.md`.
- [x] T002 Make Rev.7 artifacts canonical and mark old `.agents/plans/*` historical.
- [x] T003 Enforce code-file <=200 lines and architecture gates across new apps/packages.
- [x] T004 [P] Add CI jobs for typecheck/lint/test/build/line/arch/secrets.
- [x] T005 [P] Add reliability test helpers for timeout/retry/circuit-breaker/idempotency.
- [x] T006 Repair composition-root wiring to real application ports/use cases and fail closed when the runtime manifest cannot load.
- [x] T007 Align PostgreSQL adapters with the canonical migration schema; add adapter contract tests for ledger, outbox, quote, run, pool, and manifest persistence.
- [x] T008 [P] Make local integration environment reproducible: explicit host-port translation, health/readiness checks, and a reviewed valid LiteLLM image reference.

## Phase 1 — Identity, RBAC, audit, runtime config
- [x] T010 [US3] Add identity/RBAC/audit migrations and idempotent seeds.
- [x] T011 [P] [US3] Implement identity domain/application ports.
- [x] T012 [P] [US3] Implement RBAC specifications/policies and tests.
- [x] T013 [US3] Implement audit outbox/application service for privileged changes.
- [x] T014 [US3] Remove frontend/business hardcoded navigation/colors/routes where runtime manifest owns them.
- [x] T015 [US3] Add manifest publish/version/cache invalidation/rollback contract tests.

## Phase 2 — Economy v2 (blocking for public API/ads)
- [x] T020 [US1] Add credit reservation/budget/provider-cost/revenue migrations.
- [x] T021 [P] [US1] Implement CreditReservation domain state + tests.
- [x] T022 [P] [US1] Implement EconomyBudgetPolicy + circuit-breaker specifications.
- [x] T023 [US1] Implement `ReserveCredits`, `SettleCredits`, `ReleaseCredits` use cases using UnitOfWork.
- [x] T024 [US1] Add concurrency/idempotency tests for reserve+settle+duplicate callbacks.
- [x] T025 [US1] Integrate quote/run flow with reserve before provider execution.
- [x] T026 [US1] Add reconciliation jobs/metrics for provider costs and ad revenue.

## Phase 3 — RouterGo Developer API
- [x] T030 [US2] Add api-client/key/usage schema; raw keys never persisted.
- [x] T031 [P] [US2] Implement API key issue/revoke/rotate/scopes.
- [x] T032 [P] [US2] Implement layered RPM/TPM/credit/model quotas with Redis + durable policy.
- [x] T033 [US2] Implement `/v1/models` contract.
- [x] T034 [US2] Implement `/v1/chat/completions` supported compatibility subset.
- [x] T035 [US2] Implement `/v1/responses` supported compatibility subset + SSE.
- [x] T036 [US2] Contract-test errors, revocation, rate limits, budget exhaustion, stream disconnect.

## Phase 4 — RouterGo Studio + CMS
- [x] T040 [US3] Create `apps/admin` composition and shared accessible UI primitives.
- [x] T041 [P] [US3] CMS content/version/publication/media domain.
- [x] T042 [P] [US3] Admin model/provider/runtime-config views with audited publish.
- [ ] T043 [P] [US3] Admin wallet/economy/read-only ledger views with privilege separation.
- [ ] T044 [US3] Responsive/a11y E2E for admin critical flows.

## Phase 5 — Ads core + advertiser
- [x] T050 [US4] Add advertiser/funding/campaign/creative/placement schema.
- [x] T051 [P] [US4] Campaign state machine + budget policy + moderation.
- [x] T052 [P] [US4] AdDecisionPort and Strategy adapters for direct/third-party/house inventory.
- [x] T053 [US4] Reconcile impressions/clicks/finalized revenue idempotently.
- [ ] T054 [US4] Create `apps/advertiser` with balance/campaign/creative/analytics flows.
- [x] T055 [US4] Add frequency caps, consent/region policy hooks, anti-click-fraud telemetry.

## Phase 6 — Generic challenges and exercise
- [x] T060 [US5] Add versioned challenge schema with typed verification strategies.
- [x] T061 [P] [US5] Implement ChallengeVerification Strategy registry.
- [x] T062 [P] [US5] Implement reward eligibility/specification and budget integration.
- [x] T063 [US5] Migrate existing exercise flow into approved challenge template strategy.
- [x] T064 [US5] Add physical safety caps/cooldowns/stop controls/non-physical alternative tests.
- [ ] T065 [US5] Studio challenge builder/publish/moderation UI.

## Phase 7 — Runtime Intent/Skill Router
- [x] T070 [US8] Add skill definition/version/classification schema and Studio workflow.
- [x] T071 [P] [US8] Implement `IntentClassifierPort` + schema-constrained provider adapter.
- [x] T072 [P] [US8] Implement typed `SkillRegistry` + immutable skill versions.
- [x] T073 [US8] Add low-confidence/timeout/budget fallback heuristics.
- [x] T074 [US8] Integrate session-start classification without blocking core session availability.
- [x] T075 [US8] Test prompt-injection attempts cannot activate unknown tools/skills.

## Phase 8 — Battles
- [x] T080 [US6] Add battle schema/state machine and server-authoritative scoring.
- [ ] T081 [P] [US6] Implement matchmaking/battle WebSocket gateway.
- [x] T082 [P] [US6] Implement Redis ephemeral match state + durable results.
- [ ] T083 [US6] Add reconnect/timeout/idempotent result/reward tests.
- [ ] T084 [US6] Responsive battle UX + reduced-motion/accessibility.

## Phase 9 — Treasure
- [x] T090 [US7] Add hunt/step/QR/progress schema and moderation rules.
- [x] T091 [P] [US7] Implement coarse geofence proof adapter with no continuous history.
- [x] T092 [P] [US7] Implement signed/expiring/replay-resistant QR proof.
- [x] T093 [US7] Add safe public-location review workflow and permission-denied alternative.
- [x] T094 [US7] Responsive map/list experience with privacy notices.

## Phase 10 — Risk, analytics, hardening, beta
- [x] T100 Add risk events/scores/review cases for reward/API/ad/battle/treasure abuse.
- [ ] T101 [P] Build unit-economics dashboard: revenue, cost, contribution, reward liability.
- [ ] T102 [P] Add provider health/quota/cost routing analytics and alerts.
- [ ] T103 Load-test critical API/realtime paths and enforce performance budgets.
- [x] T104 Run WCAG/responsive/security/secrets/provider-contract regression suite.
- [ ] T105 Execute staged beta with feature flags, economy kill switches, and rollback drills.
- [x] T106 Run Spec Kit-style analyze/converge; append all discovered gaps before declaring Rev.7 complete.

## Dependency order
T001-T005 -> T010-T015 -> T020-T026. Then Phases 3, 4 and 5 can proceed in parallel. Phase 6 requires economy + Studio foundation. Phase 7 requires routing + Studio. Battles/Treasure require identity/reward foundation. Phase 10 integrates all selected beta capabilities.
