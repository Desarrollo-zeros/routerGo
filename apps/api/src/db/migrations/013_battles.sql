CREATE TABLE IF NOT EXISTS battle_matches (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (length(trim(category)) > 0),
  status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','ACTIVE','COMPLETED','CANCELLED')),
  max_players INT NOT NULL CHECK (max_players BETWEEN 2 AND 8),
  current_round INT NOT NULL DEFAULT 0 CHECK (current_round >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS battle_players (
  battle_id TEXT NOT NULL REFERENCES battle_matches(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  score INT NOT NULL DEFAULT 0 CHECK (score >= 0),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, user_id)
);

CREATE TABLE IF NOT EXISTS battle_rounds (
  battle_id TEXT NOT NULL REFERENCES battle_matches(id) ON DELETE CASCADE,
  round_number INT NOT NULL CHECK (round_number > 0),
  prompt_key TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  points INT NOT NULL CHECK (points >= 0),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (battle_id, round_number),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS battle_answers (
  battle_id TEXT NOT NULL,
  round_number INT NOT NULL,
  user_id TEXT NOT NULL,
  answer_hash TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points INT NOT NULL CHECK (points >= 0),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (battle_id, round_number, user_id),
  FOREIGN KEY (battle_id, round_number) REFERENCES battle_rounds(battle_id, round_number) ON DELETE CASCADE,
  FOREIGN KEY (battle_id, user_id) REFERENCES battle_players(battle_id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_battle_matches_status ON battle_matches(status, created_at);
