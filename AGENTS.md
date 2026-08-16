# RouterGo — Agent Operating Manual

When the persistent objective is completing the RouterGo MVP, use the
repository skill `.agents/skills/routergo-autopilot/SKILL.md` as the operating
algorithm. Reconcile its checkpoint with Git, Specs, tasks, tests, and current
runtime state before acting; the checkpoint is operational state, not a source
of truth.

## Mission
Build RouterGo as an ad-funded, multi-provider AI access platform. Users earn internal GoCredits through approved activities and spend them on AI access. Businesses fund campaigns/challenges. Operators manage product, economy, providers, ads, content, risk, and configuration.

## Mandatory reading order
1. `.specify/memory/constitution.md`
2. `specs/001-routergo-platform/spec.md`
3. `specs/001-routergo-platform/plan.md`
4. `specs/001-routergo-platform/tasks.md`
5. Relevant `.agents/skills/routergo-*/SKILL.md`
6. Existing code/ADRs for the bounded context being changed

Old `.agents/plans/2026-08-09-esfuerzo-tokens.md` and `2026-08-10-routergo-execution.md` are historical only after Rev.7; never use them as current requirements.

## Non-negotiable engineering rules
- SOLID and hexagonal architecture.
- No versioned code file >200 physical lines.
- Functions <=40 lines, CC <=8, <=4 parameters unless ADR-approved.
- No God services, generic repositories, framework leakage into domain, or arbitrary runtime eval/import.
- Business configuration belongs in PostgreSQL/runtime manifest when operator-editable.
- Every external call: timeout + bounded retry where safe + jitter/backoff + circuit breaker + telemetry.
- Never retry a non-idempotent mutation without an idempotency key.
- Never silently restart an LLM stream on another provider after first emitted token.
- Preserve ledger consistency and non-negative balances under concurrency.
- UI is mobile-first from 320 px and must also work on desktop; WCAG 2.2 AA.
- Tests are part of implementation, not optional cleanup.

## Approved architectural patterns
Use patterns only when they solve a concrete problem:
- Strategy: provider protocols, reward verification, ad decision policies.
- Abstract Factory: provider/ad adapters.
- Repository + Data Mapper: persistence boundaries.
- Unit of Work: wallet/reserve/settle/accounting mutations.
- Specification: eligibility, quota, campaign targeting.
- State: activity, battle, campaign, content workflow.
- Facade: user-facing orchestration without leaking subsystems.
- Registry: typed runtime handlers/configuration.
- Domain Events + Transactional Outbox: cross-context integration.
- Circuit Breaker + Bulkhead: providers/ad networks/realtime dependencies.
- Headless/Compound Components: reusable accessible UI.

## Bounded contexts
`identity`, `economy`, `wallet`, `ai-routing`, `developer-api`, `challenges`, `exercise`, `battle`, `treasure`, `cms`, `ads`, `advertiser`, `risk`, `analytics`, `notifications`.

A task must name its owning context before code changes. Do not join contexts through direct table writes. Prefer application contracts/events.

## Runtime skill routing
RouterGo may classify the user's initial session intent with a cheap configured classifier model (for example a low-cost fast model) behind `IntentClassifierPort`. The classifier returns a constrained taxonomy + confidence; it never selects arbitrary executable code. A typed `SkillRegistry` maps allowed intents to RouterGo skills. Low-confidence or unavailable classifier falls back to deterministic heuristics/default skill. Store minimal classification metadata, not sensitive raw prompts unless needed and consented.

Suggested intents: `coding`, `reasoning`, `research`, `writing`, `data`, `learning`, `support`, `creative`, `general`.

## Product skills
Runtime user skills are product configuration, distinct from Codex development skills. Each runtime skill defines system guidance, model policy, allowed tools, max budget, safety policy, telemetry tags, and fallback. Operators version and publish skills through Studio; deployments are immutable and auditable.

## MCP policy
`tools/mcp-routergo` is a development MCP for Codex/agents. It exposes repository rules/spec context and task classification helpers. It must be read-only by default. Product runtime capabilities are regular application ports; do not make the production system depend on a developer MCP.

## Database/economy rules
- GoCredits != provider tokens != money.
- Ledger is append-only for economic events.
- Public AI execution uses `QUOTE -> RESERVE -> EXECUTE -> SETTLE -> RELEASE/REFUND`.
- Rewards have policy version, caps, anti-abuse evidence, and budget source.
- Provider/ad cost and revenue entries reconcile to source events.
- Circuit breakers can reduce rewards/model availability/output limits when subsidy budgets are endangered.

## Physical activity safety
Only approved, moderate, age-appropriate challenge templates may be rewarded. No advertiser-authored arbitrary physical instructions, max-effort contests, pain/endurance escalation, or dangerous challenges. Enforce per-session/daily caps, cooldowns, stop controls, and non-physical alternatives.

## Workflow (Spec Kit aligned)
For every non-trivial feature:
1. Inspect current code and identify gaps.
2. Clarify unknowns; record assumptions explicitly.
3. Create/update feature `spec.md` with independently testable stories.
4. Create/update `plan.md`, data model, research, contracts, quickstart.
5. Generate `tasks.md` grouped by user story and parallel-safe files.
6. Run consistency analysis before implementation.
7. Implement test-first for critical rules.
8. Run all quality gates and converge docs to reality.

## Required validation
```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check:lines
pnpm check:arch
pnpm db:migrate
pnpm db:seed
pnpm test:e2e
```
Run only applicable destructive/integration commands against safe local/test infrastructure.

## Definition of done
A story is done only when acceptance scenarios pass; relevant tests exist; retries/timeouts/observability are implemented; files respect limits; responsive/a11y behavior is verified; economic/security impact is reviewed; secrets are absent; migrations/seeds are repeatable; and spec/plan/tasks/ADRs match reality.
