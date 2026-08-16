CREATE TABLE IF NOT EXISTS credit_reservation_operations (
  operation_id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES credit_reservations(id) ON DELETE RESTRICT,
  operation_kind TEXT NOT NULL CHECK (operation_kind IN ('SETTLE', 'RELEASE')),
  requested_credits BIGINT NOT NULL CHECK (requested_credits > 0),
  result_status TEXT NOT NULL CHECK (result_status IN ('RESERVED', 'SETTLED', 'RELEASED', 'EXPIRED', 'CANCELLED')),
  result_reserved_credits BIGINT NOT NULL CHECK (result_reserved_credits > 0),
  result_settled_credits BIGINT NOT NULL CHECK (result_settled_credits >= 0),
  result_released_credits BIGINT NOT NULL CHECK (result_released_credits >= 0),
  result_remaining_credits BIGINT NOT NULL CHECK (result_remaining_credits >= 0),
  result_wallet_balance BIGINT NOT NULL CHECK (result_wallet_balance >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (result_settled_credits + result_released_credits <= result_reserved_credits),
  CHECK (result_remaining_credits + result_settled_credits + result_released_credits = result_reserved_credits)
);

CREATE INDEX IF NOT EXISTS idx_credit_reservation_operations_reservation
  ON credit_reservation_operations(reservation_id);
