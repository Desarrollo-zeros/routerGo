CREATE TABLE IF NOT EXISTS risk_events (
  id TEXT PRIMARY KEY,
  subject_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  category TEXT NOT NULL CHECK (category IN ('REWARD','API','AD','BATTLE','TREASURE')),
  event_key TEXT NOT NULL UNIQUE,
  severity INT NOT NULL CHECK (severity BETWEEN 0 AND 100),
  signal_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS risk_scores (
  subject_user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  action TEXT NOT NULL CHECK (action IN ('NORMAL','REVIEW','BLOCKED')),
  policy_version TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_cases (
  id TEXT PRIMARY KEY,
  subject_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  risk_event_id TEXT REFERENCES risk_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','IN_REVIEW','RESOLVED','DISMISSED')),
  reason TEXT NOT NULL CHECK (length(trim(reason)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_risk_events_subject ON risk_events(subject_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_review_cases_status ON review_cases(status, created_at);
