CREATE TABLE IF NOT EXISTS api_quota_policies (
  id TEXT PRIMARY KEY,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('CLIENT','KEY','MODEL')),
  scope_id TEXT NOT NULL,
  model_pattern TEXT,
  requests_per_minute INT CHECK (requests_per_minute IS NULL OR requests_per_minute > 0),
  tokens_per_minute BIGINT CHECK (tokens_per_minute IS NULL OR tokens_per_minute > 0),
  credits_per_minute BIGINT CHECK (credits_per_minute IS NULL OR credits_per_minute > 0),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (requests_per_minute IS NOT NULL OR tokens_per_minute IS NOT NULL OR credits_per_minute IS NOT NULL),
  UNIQUE (scope_type, scope_id, model_pattern)
);
CREATE INDEX IF NOT EXISTS idx_api_quota_scope ON api_quota_policies(scope_type, scope_id, enabled);
