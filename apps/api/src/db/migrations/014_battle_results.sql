CREATE TABLE IF NOT EXISTS battle_results (
  battle_id TEXT PRIMARY KEY REFERENCES battle_matches(id) ON DELETE RESTRICT,
  winner_user_id TEXT REFERENCES users(id) ON DELETE RESTRICT,
  scores_json JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
