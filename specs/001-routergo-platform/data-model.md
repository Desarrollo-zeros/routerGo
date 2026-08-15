# Data Model — RouterGo Rev.7

## Existing entities to preserve
`users`, `wallets`, `ledger_entries`, `reward_policies`, `activity_sessions`, `provider_gateways`, `provider_endpoints`, `model_catalog`, `credential_deployments`, `credential_usage_windows`, `pool_policies`, `api_routes`, `ui_navigation`, `design_tokens`, `feature_flags`, `chat_quotes`, `chat_runs`, `ad_events`, `outbox_events`, `seed_runs`.

## Additive model
### Identity
- `organizations(id,type,status,...)`
- `organization_members(organization_id,user_id,status,...)`
- `roles`, `permissions`, `role_permissions`, `member_roles`
- `audit_logs(actor,action,resource,before,after,correlation_id,created_at)`

### Economy/API
- `credit_reservations(id,wallet_id,run_id,amount,status,expires_at,idempotency_key)`
- `credit_budgets(scope,period,limit,consumed,reserved)`
- `provider_cost_entries(run_id,provider,deployment,cost_micro,source,status)`
- `revenue_entries(source_type,source_id,revenue_micro,status)`
- `api_clients(organization_id,name,status)`
- `api_keys(client_id,key_hash,prefix,scopes_json,status,expires_at,last_used_at)`
- `api_usage(client_id,key_id,run_id,model,input_tokens,output_tokens,credits,cost_micro)`

### Skills
- `skill_definitions(id,key,status,owner_context)`
- `skill_versions(skill_id,version,prompt_policy_json,model_policy_json,tool_policy_json,safety_json,status)`
- `session_classifications(session_id,intent,confidence,skill_version_id,classifier_model,latency_ms)`

### CMS/Challenges
- `content_entries`, `content_versions`, `publications`, `media_assets`
- `challenge_definitions(type,verification_strategy,status,sponsor_id,safety_profile)`
- `challenge_versions`, `challenge_completions`, `challenge_reward_rules`

### Ads
- `advertisers(organization_id,status)`
- `advertiser_accounts(balance_micro,currency,status)`
- `campaigns(status,budget_micro,start_at,end_at,moderation_status)`
- `creatives`, `placements`, `targeting_rules`, `campaign_events`

### Battle/Treasure/Risk
- `battle_matches`, `battle_players`, `battle_rounds`, `battle_answers`
- `treasure_hunts`, `treasure_steps`, `treasure_qr_tokens`, `treasure_progress`
- `risk_events`, `risk_scores`, `review_cases`

## Invariants
- User GoCredit balance >=0.
- Reservation cannot settle above reserved amount without a new authorized reservation policy.
- Every settled/released reservation has exactly one terminal state.
- API keys store only secure hashes; raw key shown once.
- Published SkillVersion/ContentVersion/ChallengeVersion is immutable.
- Campaign finalized spend cannot exceed funded/authorized budget.
- Battle scoring is server authoritative.
- QR tokens are replay-resistant and expire/version explicitly.
