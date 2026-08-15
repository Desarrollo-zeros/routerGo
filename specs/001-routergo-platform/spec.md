# Feature Specification: RouterGo Platform Rev.7

**Feature Branch**: `001-routergo-platform`  
**Created**: 2026-08-15  
**Status**: Approved baseline

## Vision
RouterGo provides ad-funded AI access. Users earn non-transferable GoCredits from approved engagement and spend credits through a responsive PWA or developer API. Businesses create funded ad campaigns and sponsored challenges. Operators manage content, economics, providers, routing, safety, fraud, and analytics.

## User Scenarios & Testing

### US1 — Earn and use GoCredits (P1)
A user completes an approved activity, receives ledgered credits, sees cost before AI use, and gets a streamed response.

**Independent Test**: Complete a safe challenge, verify credit once, reserve credits, execute a model request, settle actual cost, and confirm wallet invariants.

**Acceptance**:
1. Given valid verified activity, when reward is finalized, then one idempotent EARN entry is created.
2. Given sufficient balance, when AI execution starts, then maximum spend is reserved before upstream execution.
3. Given actual cost below reserve, when execution ends, then unused reserve is released and balance remains >=0.

### US2 — Developer API (P1)
A developer creates a RouterGo API key and consumes allowed models without receiving provider secrets.

**Independent Test**: Create/revoke a scoped key and call `/v1/models` plus one streaming completion under quota.

### US3 — Operator Studio/CMS (P1)
An authorized operator administers models, providers, rewards, content, campaigns, challenges, skills, feature flags, and risk workflows without unsafe hardcoding.

**Independent Test**: Publish a configuration change, observe manifest version increment, audit trail, cache invalidation, and UI/runtime adoption.

### US4 — Advertiser self-service (P2)
A business funds a balance, creates a campaign/creative or sponsored challenge, submits it for moderation, and views delivery analytics.

**Independent Test**: DRAFT -> REVIEW -> APPROVED -> ACTIVE campaign with budget cap and reconciled events.

### US5 — Challenge engine (P2)
Operators compose quizzes, coding tasks, learning tasks, approved exercise templates, QR/location treasure steps, games, and sponsored missions through typed verification strategies.

**Independent Test**: Publish one challenge of each enabled strategy without application redeploy.

### US6 — Online battles (P2)
Users join server-authoritative realtime battles for safe knowledge/coding categories with matchmaking, rounds, results, and bounded system rewards.

**Independent Test**: Two clients complete a match with authoritative timer/scoring and reconnect handling.

### US7 — Treasure hunts (P3)
Users progress through moderated public-location clues using coarse/geofenced location and/or QR proof without continuous location retention.

**Independent Test**: Complete a multi-step hunt with replay-resistant QR token and privacy-preserving location evidence.

### US8 — Intent-to-skill routing (P2)
At session start RouterGo classifies intent using a configured low-cost classifier and activates an allowed specialist skill to improve assistance quality within budget/safety policy.

**Independent Test**: Known prompt maps to a registered skill; low confidence/provider failure falls back deterministically; arbitrary skill identifiers cannot execute.

## Functional Requirements
- **FR-001**: GoCredits MUST be internal, non-transferable, non-withdrawable utility credits.
- **FR-002**: Economic mutations MUST be append-only, idempotent, auditable, and concurrency-safe.
- **FR-003**: AI requests MUST use reserve/settle accounting and configurable per-model credit pricing/budgets.
- **FR-004**: Public API MUST expose RouterGo keys/scopes/rate limits without upstream secrets.
- **FR-005**: Routing MUST support multiple providers/deployments, health, quota, cost, capability, and fallback policy.
- **FR-006**: External calls MUST use timeout, bounded retry where safe, circuit breaker, and telemetry.
- **FR-007**: Studio MUST provide RBAC and audited workflows for operator-managed configuration/content.
- **FR-008**: Advertisers MUST have isolated organizations, balances, campaigns, creatives, budgets, moderation, and analytics.
- **FR-009**: Challenge definitions MUST use typed verification strategies and versioned reward policies.
- **FR-010**: Physical rewards MUST use approved moderate templates, caps/cooldowns, stop controls, and non-physical alternatives.
- **FR-011**: Battles MUST be server-authoritative; GoCredits cannot be staked/wagered between users.
- **FR-012**: Treasure features MUST avoid continuous precise location history and require moderated public-safe locations.
- **FR-013**: Ads MUST be clearly labeled; reward rules must comply with the configured ad network/campaign policy.
- **FR-014**: Runtime skill activation MUST come only from a typed allow-listed registry.
- **FR-015**: Classifier failure/low confidence MUST not block a session.
- **FR-016**: User PWA MUST support 320px+ widths, desktop, keyboard, reduced motion, and WCAG 2.2 AA targets.
- **FR-017**: Business-operable models, prices, rewards, routes, skills, placements, navigation, and design tokens MUST be runtime-configurable and versioned.
- **FR-018**: Admin economic/config changes MUST create audit records.
- **FR-019**: Fraud/risk MUST cover replay, velocity, duplicate rewards, API abuse, ad abuse, battle cheating, and location/QR anomalies.
- **FR-020**: Economy circuit breakers MUST be able to protect inference budget before insolvency.

## Key Entities
User, Organization, Membership, Wallet, LedgerEntry, CreditReservation, Provider, Model, Deployment, ApiClient, ApiKey, SkillDefinition, SkillVersion, SessionClassification, ChallengeDefinition, ChallengeCompletion, BattleMatch, TreasureHunt, Advertiser, Campaign, Creative, AdEvent, ContentEntry, RiskEvent, AuditLog.

## Edge Cases
Provider timeout/429; stream disconnect before/after first token; duplicate completion; concurrent spend; ad event correction; classifier unavailable; low-confidence classification; revoked key during stream; depleted campaign budget; battle disconnect; QR replay; location permission denied; CMS publish conflict; manifest rollback.

## Measurable Outcomes
- **SC-001**: Wallet invariant violations = 0 under concurrency tests.
- **SC-002**: No upstream secrets are exposed to PWA/public API/logs.
- **SC-003**: p95 non-LLM API latency target <250 ms under agreed baseline load.
- **SC-004**: Session classification adds <=500 ms p95 when executed and has a non-blocking fallback.
- **SC-005**: Core mobile pages render/usefully operate at 320, 360, 390, 430 px and desktop.
- **SC-006**: 100% operator economic changes are auditable.
- **SC-007**: All critical external integrations have timeout/retry/circuit-breaker contract tests.
- **SC-008**: Reward/inference decisions expose measurable revenue-cost-margin telemetry.

## Assumptions
Initial deployment is a TypeScript modular monolith with PostgreSQL, Redis, background jobs, LiteLLM/provider adapters, PWA, and websocket realtime. Provider commercial eligibility is a launch gate per provider, not assumed.
