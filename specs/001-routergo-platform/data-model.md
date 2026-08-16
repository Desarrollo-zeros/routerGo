# Data Model — RouterGo Rev.7

## Existing entities to preserve
`users`, `wallets`, `ledger_entries`, `reward_policies`, `activity_sessions`, `provider_gateways`, `provider_endpoints`, `model_catalog`, `credential_deployments`, `credential_usage_windows`, `pool_policies`, `api_routes`, `ui_navigation`, `design_tokens`, `feature_flags`, `chat_quotes`, `chat_runs`, `ad_events`, `outbox_events`, `seed_runs`.

### Runtime manifest publication
- runtime_ui_routes(route_key,path,screen_key,enabled) is the UI screen projection and is separate from api_routes.
- runtime_manifest_snapshots(version,schema_version,content_hash,snapshot_json,created_at) stores immutable validated published snapshots.
- runtime_manifest_state(id,active_version,updated_at) is the explicit active pointer; it is not derived from MAX(version).
- Editable operational tables remain the candidate source. A published snapshot is a durable immutable projection and is retained across rollback.

## Additive model
### Identity
- `organizations(id,name,slug,kind,status,created_at,updated_at)` with unique slug and `PERSONAL`, `ADVERTISER`, `DEVELOPER`, or `INTERNAL` kind.
- `organization_members(id,organization_id,user_id,status,created_at,updated_at)` with unique `(organization_id,user_id)`.
- `roles(id,role_key,display_name,scope,organization_id,is_system,...)`; global roles have no organization and organization roles have an owning organization.
- `permissions(id,permission_key,description,is_system,created_at)` with unique capability key.
- `role_permissions(role_id,permission_id)` and `member_roles(member_id,role_id,assigned_at)`.
- `audit_logs(id,actor_user_id,actor_organization_id,action,resource_type,resource_id,before_state,after_state,metadata,correlation_id,created_at)`; no `updated_at`, and database trigger makes it append-only. T013 uses the privileged operation ID as `id` for deterministic duplicate detection.

### Economy/API
- `credit_reservations(id,wallet_id,operation_id,quote_id,run_id,reserved_credits,settled_credits,released_credits,status,expires_at,...)` stores integer GoCredits reservations. `operation_id` is unique for idempotency; the wallet foreign key is `ON DELETE RESTRICT`, while quote/run references are nullable and `ON DELETE SET NULL`. Amount checks prevent negative values and settling plus releasing more than reserved.
- `credit_reservation_operations(operation_id,reservation_id,operation_kind,requested_credits,result_*,created_at)` stores durable idempotency results for `SETTLE` and `RELEASE`; it prevents repeated callbacks from applying a second state or wallet effect.
- `economy_budgets(id,scope_type,scope_id,amount_unit,limit_amount,currency_code,starts_at,ends_at,...)` stores finite positive limits. `amount_unit` is `CREDITS` or `USD_MICRO`; USD budgets require `currency_code='USD'`, credit budgets have no currency, and global budgets have no scope ID.
- `provider_cost_entries(id,operation_id,provider_request_id,run_id,provider_gateway_id,endpoint_id,model_logical_id,input_tokens,output_tokens,cached_input_tokens,cost_microusd,currency_code,pricing_version,source,reversal_of,...)` separates token counters from fixed-precision provider cost. Operation and provider request identifiers are unique; provider gateway deletion is restricted.
- `revenue_entries(id,operation_id,source_type,ad_event_id,gross_revenue_microusd,net_revenue_microusd,currency_code,status,occurred_at,finalized_at,reversal_of,...)` records pending, finalized, or reversed USD micro-unit revenue. Net cannot exceed gross; corrections use linked adjustment/reversal rows.
- `api_clients(organization_id,name,status)`
- `api_keys(client_id,key_hash,prefix,scopes_json,status,expires_at,last_used_at)`
- `api_usage(client_id,key_id,run_id,model,input_tokens,output_tokens,credits,cost_microusd)` where `credits` are GoCredits and `cost_microusd` is fixed-precision USD micro-units.
- `api_quota_policies(scope_type,scope_id,model_pattern,requests_per_minute,tokens_per_minute,credits_per_minute)` stores enabled client/key/model quota limits; Redis consumes all configured dimensions atomically in a one-minute window.

### Skills
- `skill_definitions(id,key,status,owner_context)`
- `skill_versions(skill_id,version,prompt_policy_json,model_policy_json,tool_policy_json,safety_json,status)`
- `session_classifications(session_id,intent,confidence,skill_version_id,classifier_model,latency_ms)`

### CMS/Challenges
- `content_entries`, `content_versions`, `publications`, `media_assets`
- `challenge_definitions(type,verification_strategy,status,sponsor_id,safety_profile)`
- `challenge_versions`, `challenge_completions`, `challenge_reward_rules`

Migration `010_challenges.sql` makes challenge definitions and versions
immutable by identity, keeps published content separate from drafts, and
requires every reward rule to carry a positive maximum credit amount. The
schema does not execute verification or issue rewards; T061-T064 own those
typed application policies.

### Ads
- `advertisers(organization_id,status)`
- `advertiser_accounts(balance_micro,currency,status)`
- `campaigns(status,budget_micro,start_at,end_at,moderation_status)`
- `creatives`, `placements`, `targeting_rules`, `campaign_events`

Migration `009_ads_core.sql` enforces USD micro-unit balances, non-empty
sponsored labels, moderation/status fields, `spent_micro <= budget_micro`, and
unique delivery event keys. T052 selects eligible candidates through a typed
strategy boundary without mutating campaign or delivery state. T053 records
delivery events transactionally and applies priced spend once; finalized
revenue remains an idempotent USD reconciliation entry. Funding and policy
hooks remain T054-T055.

### Battle/Treasure/Risk
- `battle_matches`, `battle_players`, `battle_rounds`, `battle_answers`, `battle_results`
- `treasure_hunts(owner_organization_id,status,public_location_reviewed)`, `treasure_steps(sequence,proof_type,coarse_geohash,radius_meters)`, `treasure_qr_tokens(token_hash,expires_at,consumed_at)`, `treasure_progress(hunt_id,user_id,current_sequence,status)`
- `risk_events`, `risk_scores`, `review_cases`

Battle scores are server-owned integers. Answer rows store hashes and a unique
`battle_id + round_number + user_id` key, so clients cannot submit duplicate
answers or supply their own score. Matches have no stake or wager columns.
Redis stores short-lived match state with an explicit TTL; `battle_results` is the durable, one-result-per-match projection with server-owned scores and idempotent recording.

## Invariants
- User GoCredit balance >=0.
- Reservation cannot settle above reserved amount without a new authorized reservation policy.
- Every settled/released reservation has exactly one terminal state.
- API keys store only secure hashes; raw key shown once.
- Published SkillVersion/ContentVersion/ChallengeVersion is immutable.
- Campaign finalized spend cannot exceed funded/authorized budget.
- Battle scoring is server authoritative.
- QR tokens are replay-resistant and expire/version explicitly.
- Treasure moderation requires a reviewed public location, allow-listed location kinds, coarse geohash precision (maximum six characters), and bounded geofence radii; precise coordinates are not persisted.
- An organization-scoped role cannot be assigned to a membership from another organization; assigned roles cannot be retargeted across organizations.
- Audit metadata is a sanitized JSON object and audit rows cannot be updated or deleted.
- A privileged change commits its business mutation, audit row, and outbox event atomically; its outbox ID is `outbox:<operationId>`.
