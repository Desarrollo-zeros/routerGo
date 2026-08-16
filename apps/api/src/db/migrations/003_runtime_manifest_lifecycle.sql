CREATE TABLE IF NOT EXISTS runtime_ui_routes (
  route_key TEXT PRIMARY KEY,
  path TEXT NOT NULL UNIQUE,
  screen_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO runtime_ui_routes(route_key, path, screen_key, enabled) VALUES
  ('catalog-list', '/catalog', 'catalog', true),
  ('wallet-get', '/wallet', 'wallet', true),
  ('activity-verify', '/', 'activity', true),
  ('quote-create', '/chat', 'chat', true),
  ('admin-economy', '/economy', 'admin-economy', true)
ON CONFLICT (route_key) DO NOTHING;

ALTER TABLE ui_navigation DROP CONSTRAINT IF EXISTS ui_navigation_route_key_fkey;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ui_navigation_runtime_route_fkey'
  ) THEN
    ALTER TABLE ui_navigation
      ADD CONSTRAINT ui_navigation_runtime_route_fkey
      FOREIGN KEY (route_key) REFERENCES runtime_ui_routes(route_key) ON DELETE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS runtime_manifest_snapshots (
  version BIGINT PRIMARY KEY CHECK (version > 0),
  schema_version TEXT NOT NULL,
  content_hash TEXT NOT NULL UNIQUE,
  snapshot_json JSONB NOT NULL CHECK (jsonb_typeof(snapshot_json) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS runtime_manifest_state (
  id TEXT PRIMARY KEY CHECK (id = 'active'),
  active_version BIGINT NOT NULL REFERENCES runtime_manifest_snapshots(version),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_runtime_manifest_snapshot_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'published runtime manifest snapshots are immutable';
END;
$$;

DROP TRIGGER IF EXISTS runtime_manifest_snapshot_append_only ON runtime_manifest_snapshots;
CREATE TRIGGER runtime_manifest_snapshot_append_only
  BEFORE UPDATE OR DELETE ON runtime_manifest_snapshots
  FOR EACH ROW EXECUTE FUNCTION prevent_runtime_manifest_snapshot_mutation();

CREATE INDEX IF NOT EXISTS idx_runtime_manifest_state_version
  ON runtime_manifest_state(active_version);
