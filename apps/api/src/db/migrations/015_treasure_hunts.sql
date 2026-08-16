CREATE TABLE IF NOT EXISTS treasure_hunts (
  id TEXT PRIMARY KEY,
  owner_organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW','APPROVED','REJECTED','ACTIVE','ARCHIVED')),
  public_location_reviewed BOOLEAN NOT NULL DEFAULT false,
  moderation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS treasure_steps (
  id TEXT PRIMARY KEY,
  hunt_id TEXT NOT NULL REFERENCES treasure_hunts(id) ON DELETE CASCADE,
  sequence INT NOT NULL CHECK (sequence > 0),
  proof_type TEXT NOT NULL CHECK (proof_type IN ('QR','COARSE_GEOFENCE')),
  location_kind TEXT NOT NULL CHECK (length(trim(location_kind)) > 0),
  geohash TEXT CHECK (geohash IS NULL OR (length(geohash) BETWEEN 1 AND 6)),
  radius_meters INT,
  UNIQUE (hunt_id, sequence),
  CHECK ((proof_type = 'QR' AND radius_meters IS NULL) OR (proof_type = 'COARSE_GEOFENCE' AND radius_meters BETWEEN 100 AND 1000))
);

CREATE TABLE IF NOT EXISTS treasure_qr_tokens (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL REFERENCES treasure_steps(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS treasure_progress (
  hunt_id TEXT NOT NULL REFERENCES treasure_hunts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  current_sequence INT NOT NULL DEFAULT 0 CHECK (current_sequence >= 0),
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED','ABANDONED')),
  last_verified_at TIMESTAMPTZ,
  PRIMARY KEY (hunt_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_treasure_hunts_status ON treasure_hunts(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_treasure_progress_user ON treasure_progress(user_id, status);
