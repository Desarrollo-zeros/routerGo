---
name: routergo-business
description: Enforce RouterGo wallet, GoCredits, advertising, rewards, provider-cost, and unit-economics rules.
---
# RouterGo Business Rules

- GoCredits are internal utility credits: no cash withdrawal, transfer, fixed USD value, or fixed provider-token equivalence.
- Wallet mutations are append-only, idempotent, concurrency-safe, and auditable.
- AI flow: QUOTE -> RESERVE -> EXECUTE -> SETTLE -> RELEASE/REFUND.
- Reward issuance requires verified eligibility, policy version, abuse controls, caps, and budget.
- Advertiser funding/cash accounting is separate from user GoCredit ledger.
- Provider cost and ad revenue are reconciled from source events; estimated != finalized revenue.
- Economy policy can degrade expensive models/rewards/output before subsidy budget is exceeded.
- Campaign delivery cannot exceed authorized/funded budget.
- Sponsored content is labeled and moderated.
- User-to-user GoCredit wagering/staking is forbidden.

Any change to reward/model price/provider cost/ad budget must include an explicit unit-economics impact test or dashboard metric.
