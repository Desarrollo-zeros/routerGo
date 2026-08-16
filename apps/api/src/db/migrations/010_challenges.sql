CREATE TABLE IF NOT EXISTS challenge_definitions (
  id TEXT PRIMARY KEY,
  challenge_key TEXT NOT NULL UNIQUE,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('QUIZ','CODING','LEARNING','EXERCISE','SPONSORED')),
  verification_strategy TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','ARCHIVED')),
  sponsor_organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  safety_profile_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_versions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenge_definitions(id) ON DELETE RESTRICT,
  version INT NOT NULL CHECK (version > 0),
  content_json JSONB NOT NULL,
  reward_policy_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, version)
);

CREATE TABLE IF NOT EXISTS challenge_reward_rules (
  id TEXT PRIMARY KEY,
  challenge_version_id TEXT NOT NULL REFERENCES challenge_versions(id) ON DELETE RESTRICT,
  policy_json JSONB NOT NULL,
  max_reward_credits BIGINT NOT NULL CHECK (max_reward_credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenge_completions (
  id TEXT PRIMARY KEY,
  challenge_version_id TEXT NOT NULL REFERENCES challenge_versions(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN ('STARTED','SUBMITTED','VERIFIED','REJECTED')),
  evidence_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  reward_operation_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_challenge_versions_published ON challenge_versions(challenge_id, status);
CREATE INDEX IF NOT EXISTS idx_challenge_completions_user ON challenge_completions(user_id, created_at);
