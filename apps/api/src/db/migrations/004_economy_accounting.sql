CREATE TABLE IF NOT EXISTS credit_reservations (
  id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  operation_id TEXT NOT NULL UNIQUE,
  quote_id TEXT REFERENCES chat_quotes(id) ON DELETE SET NULL,
  run_id TEXT REFERENCES chat_runs(id) ON DELETE SET NULL,
  reserved_credits BIGINT NOT NULL CHECK (reserved_credits > 0),
  settled_credits BIGINT NOT NULL DEFAULT 0 CHECK (settled_credits >= 0),
  released_credits BIGINT NOT NULL DEFAULT 0 CHECK (released_credits >= 0),
  status TEXT NOT NULL CHECK (status IN ('RESERVED', 'SETTLED', 'RELEASED', 'EXPIRED', 'CANCELLED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  CHECK (settled_credits <= reserved_credits),
  CHECK (released_credits <= reserved_credits),
  CHECK (settled_credits + released_credits <= reserved_credits)
);

CREATE INDEX IF NOT EXISTS idx_credit_reservations_wallet_status
  ON credit_reservations(wallet_id, status);
CREATE INDEX IF NOT EXISTS idx_credit_reservations_run
  ON credit_reservations(run_id);

CREATE TABLE IF NOT EXISTS economy_budgets (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('GLOBAL', 'PROVIDER', 'MODEL', 'REWARD', 'AD_FUNDED_COMPUTE')),
  scope_id TEXT,
  amount_unit TEXT NOT NULL CHECK (amount_unit IN ('CREDITS', 'USD_MICRO')),
  limit_amount BIGINT NOT NULL CHECK (limit_amount > 0),
  currency_code TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  CHECK ((scope_type = 'GLOBAL' AND scope_id IS NULL) OR (scope_type <> 'GLOBAL' AND scope_id IS NOT NULL AND length(trim(scope_id)) > 0)),
  CHECK ((amount_unit = 'USD_MICRO' AND currency_code = 'USD') OR (amount_unit = 'CREDITS' AND currency_code IS NULL)),
  UNIQUE (scope_type, scope_id, amount_unit, starts_at, ends_at)
);

CREATE INDEX IF NOT EXISTS idx_economy_budgets_scope_period
  ON economy_budgets(scope_type, scope_id, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS provider_cost_entries (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL UNIQUE,
  provider_request_id TEXT UNIQUE,
  run_id TEXT REFERENCES chat_runs(id) ON DELETE SET NULL,
  provider_gateway_id TEXT NOT NULL REFERENCES provider_gateways(id) ON DELETE RESTRICT,
  endpoint_id TEXT REFERENCES provider_endpoints(id) ON DELETE SET NULL,
  model_logical_id TEXT REFERENCES model_catalog(logical_id) ON DELETE RESTRICT,
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cached_input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (cached_input_tokens >= 0),
  cost_microusd BIGINT NOT NULL CHECK (cost_microusd >= 0),
  currency_code TEXT NOT NULL DEFAULT 'USD' CHECK (currency_code = 'USD'),
  pricing_version TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('UPSTREAM_RESULT', 'RECONCILIATION', 'ADJUSTMENT', 'REVERSAL')),
  reversal_of TEXT REFERENCES provider_cost_entries(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((source IN ('ADJUSTMENT', 'REVERSAL') AND reversal_of IS NOT NULL) OR source IN ('UPSTREAM_RESULT', 'RECONCILIATION'))
);

CREATE INDEX IF NOT EXISTS idx_provider_cost_gateway_created
  ON provider_cost_entries(provider_gateway_id, created_at);
CREATE INDEX IF NOT EXISTS idx_provider_cost_run
  ON provider_cost_entries(run_id);

CREATE TABLE IF NOT EXISTS revenue_entries (
  id TEXT PRIMARY KEY,
  operation_id TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('AD_EVENT', 'OTHER', 'ADJUSTMENT', 'REVERSAL')),
  ad_event_id TEXT REFERENCES ad_events(id) ON DELETE SET NULL,
  gross_revenue_microusd BIGINT NOT NULL CHECK (gross_revenue_microusd >= 0),
  net_revenue_microusd BIGINT NOT NULL CHECK (net_revenue_microusd >= 0),
  currency_code TEXT NOT NULL DEFAULT 'USD' CHECK (currency_code = 'USD'),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'FINALIZED', 'REVERSED')),
  occurred_at TIMESTAMPTZ NOT NULL,
  finalized_at TIMESTAMPTZ,
  reversal_of TEXT REFERENCES revenue_entries(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (net_revenue_microusd <= gross_revenue_microusd),
  CHECK ((status = 'FINALIZED' AND finalized_at IS NOT NULL) OR status <> 'FINALIZED'),
  CHECK ((source_type IN ('ADJUSTMENT', 'REVERSAL') AND reversal_of IS NOT NULL) OR source_type IN ('AD_EVENT', 'OTHER'))
);

CREATE INDEX IF NOT EXISTS idx_revenue_status_occurred
  ON revenue_entries(status, occurred_at);
