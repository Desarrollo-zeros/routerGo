# Ads core schema

T050 adds advertiser organization ownership, a separate USD micro-unit funding
account, campaign moderation/state, creatives, placements, targeting rules,
and idempotent delivery events. Campaigns carry a non-empty sponsored label and
PostgreSQL rejects spend above the authorized budget. User GoCredits and
advertiser money remain separate ledgers; funding, moderation, decisioning, and
reconciliation are later application tasks.

T051 adds the pure campaign state machine: `DRAFT → REVIEW → APPROVED →
ACTIVE`, with explicit rejection, pause/resume, and terminal completion at the
budget limit. Spend is accepted only while active and never exceeds the
authorized USD micro budget.
