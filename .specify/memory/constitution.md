# RouterGo Constitution

## Core Principles

### I. SOLID + Hexagonal Boundaries (NON-NEGOTIABLE)
Every business capability is owned by a bounded context. Domain is framework-free; application depends on domain and ports; infrastructure implements ports; composition roots wire dependencies. Dependencies point inward. Cross-context behavior uses explicit contracts/events rather than table coupling.

### II. Small, Explicit, Patterned Code
No versioned code file exceeds 200 physical lines. Functions are <=40 lines and cyclomatic complexity <=8 unless an ADR justifies an exception. Patterns are used deliberately, never decoratively. Approved defaults: Strategy, Abstract Factory, Adapter, Repository, Unit of Work, Specification, State, Facade, Registry, Domain Events/Outbox, Circuit Breaker, Bulkhead, and Headless/Compound Components.

### III. Economic Safety Before Growth
GoCredits are internal utility credits, not money and not a fixed proxy for LLM tokens. Every mutation is ledgered and idempotent. AI consumption reserves before execution and settles actual usage. Provider costs and ad revenue are reconciled. Reward issuance is bounded by a risk-adjusted budget and circuit breakers prevent uncontrolled subsidy.

### IV. Reliability, Speed, and Measurability
External calls have timeouts, bounded retries, backoff/jitter, circuit breakers, structured telemetry, and correlation IDs. Retries must preserve idempotency. Streaming generations cannot be silently replayed after the first token. Performance budgets are testable and regressions block completion.

### V. Safety, Privacy, and Least Privilege
Secrets remain outside source and plaintext DB. Users never receive upstream provider credentials. Physical challenges use approved safe templates, caps, and cooldowns. Raw exercise video is not persisted by default; precise continuous location history is prohibited. Ads and sponsored challenges are labeled and moderated. Authorization follows least privilege and all administrative economic actions are audited.

### VI. Spec-Driven, Testable Delivery
Each feature has a Spec Kit-style spec, plan, tasks, acceptance scenarios, measurable success criteria, and explicit constitution check. Critical business rules, concurrency, provider contracts, retries, responsive behavior, and accessibility require tests. Documentation and implementation converge before a feature is closed.

## Product Constraints
- Product surfaces: RouterGo PWA, RouterGo API, RouterGo Studio, RouterGo Ads Manager.
- Primary runtime: TypeScript modular monolith until measured scale justifies extraction.
- PostgreSQL is the durable source of business configuration; Redis is ephemeral coordination/cache/stream state.
- Business configuration must not be hardcoded in UI/API when operators need to change it without deploy.
- Public AI endpoints use RouterGo credentials, budgets, quotas, and policy; never proxy raw provider credentials.
- Any provider integration requires documented commercial/technical compatibility before public rollout.
- Accessibility target: WCAG 2.2 AA.
- Supported web widths begin at 320 px and include phone, tablet, and desktop.

## Quality Gates
A change cannot ship if any applicable gate fails:
1. Typecheck, lint, tests, build.
2. 200-line code-file gate and architecture dependency gate.
3. Migration + idempotent seed validation for DB/config changes.
4. Unit/contract/integration/concurrency tests for critical business behavior.
5. Performance budget verification for affected hot paths.
6. Retry/idempotency/circuit-breaker review for external dependencies.
7. Security, secrets, RBAC, audit, and abuse review.
8. Responsive/a11y validation for UI changes.
9. Unit-economics impact review for reward, model, provider, or ad changes.
10. Spec/plan/tasks/ADR synchronization.

## Governance
This constitution supersedes implementation convenience, old plans, and agent preferences. Changes require an explicit constitution amendment with rationale and migration impact. Exceptions to hard engineering limits require an ADR before code is merged. Agents must surface conflicts rather than bypass them.

**Version**: 1.0.0 | **Ratified**: 2026-08-15 | **Last Amended**: 2026-08-15
