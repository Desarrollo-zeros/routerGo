# Ads core schema

T050 adds advertiser organization ownership, a separate USD micro-unit funding
account, campaign moderation/state, creatives, placements, targeting rules,
and idempotent delivery events. Campaigns carry a non-empty sponsored label and
PostgreSQL rejects spend above the authorized budget. User GoCredits and
advertiser money remain separate ledgers; funding, moderation, decisioning, and
reconciliation are later application tasks.
