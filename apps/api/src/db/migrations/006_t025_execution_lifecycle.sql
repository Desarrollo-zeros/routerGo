ALTER TABLE chat_quotes
  ADD COLUMN IF NOT EXISTS estimated_platform_cost_microusd BIGINT NOT NULL DEFAULT 0
    CHECK (estimated_platform_cost_microusd >= 0),
  ADD COLUMN IF NOT EXISTS pricing_version TEXT NOT NULL DEFAULT 'catalog-v1';

ALTER TABLE chat_runs
  DROP CONSTRAINT IF EXISTS chat_runs_status_check;

ALTER TABLE chat_runs
  ADD CONSTRAINT chat_runs_status_check
    CHECK (status IN ('PENDING','RUNNING','STREAMING','COMPLETED','FAILED','PARTIAL','REFUNDED'));

ALTER TABLE chat_runs
  ADD COLUMN IF NOT EXISTS reservation_id TEXT REFERENCES credit_reservations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS economy_status TEXT NOT NULL DEFAULT 'UNRESERVED'
    CHECK (economy_status IN ('UNRESERVED','RESERVED','SETTLED','RELEASED','RECONCILIATION_REQUIRED')),
  ADD COLUMN IF NOT EXISTS provider_request_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_cost_microusd BIGINT NOT NULL DEFAULT 0
    CHECK (provider_cost_microusd >= 0);

CREATE INDEX IF NOT EXISTS idx_chat_runs_economy_status ON chat_runs(economy_status);
CREATE INDEX IF NOT EXISTS idx_chat_runs_reservation ON chat_runs(reservation_id);
