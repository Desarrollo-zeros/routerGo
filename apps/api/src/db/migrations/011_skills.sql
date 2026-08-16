CREATE TABLE IF NOT EXISTS skill_definitions (
  id TEXT PRIMARY KEY,
  skill_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','ARCHIVED')),
  owner_context TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_versions (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skill_definitions(id) ON DELETE RESTRICT,
  version INT NOT NULL CHECK (version > 0),
  prompt_policy_json JSONB NOT NULL,
  model_policy_json JSONB NOT NULL,
  tool_policy_json JSONB NOT NULL,
  safety_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (skill_id, version)
);

CREATE TABLE IF NOT EXISTS session_classifications (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('coding','reasoning','research','writing','data','learning','support','creative','general')),
  confidence NUMERIC(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  skill_version_id TEXT REFERENCES skill_versions(id) ON DELETE RESTRICT,
  classifier_model TEXT,
  latency_ms INT CHECK (latency_ms IS NULL OR latency_ms >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_published ON skill_versions(skill_id, status);
CREATE INDEX IF NOT EXISTS idx_session_classifications_session ON session_classifications(session_id, created_at);
