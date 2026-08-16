CREATE TABLE IF NOT EXISTS api_clients (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','REVOKED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_clients_org_status ON api_clients(organization_id, status);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE RESTRICT,
  key_hash TEXT NOT NULL UNIQUE CHECK (length(key_hash) >= 64),
  prefix TEXT NOT NULL CHECK (length(prefix) BETWEEN 4 AND 32),
  scopes_json JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(scopes_json) = 'array'),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  CHECK (status <> 'REVOKED' OR revoked_at IS NOT NULL),
  CHECK (status <> 'EXPIRED' OR expires_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_client_status ON api_keys(client_id, status);
CREATE INDEX IF NOT EXISTS idx_api_keys_expiry ON api_keys(expires_at) WHERE status = 'ACTIVE';

CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES api_clients(id) ON DELETE RESTRICT,
  key_id TEXT NOT NULL REFERENCES api_keys(id) ON DELETE RESTRICT,
  run_id TEXT REFERENCES chat_runs(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  input_tokens BIGINT NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens BIGINT NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  credits BIGINT NOT NULL DEFAULT 0 CHECK (credits >= 0),
  cost_microusd BIGINT NOT NULL DEFAULT 0 CHECK (cost_microusd >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_client_time ON api_usage(client_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_key_time ON api_usage(key_id, occurred_at);
