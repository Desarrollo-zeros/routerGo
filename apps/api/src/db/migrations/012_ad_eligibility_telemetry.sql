CREATE TABLE IF NOT EXISTS ad_eligibility_events (
  id TEXT PRIMARY KEY,
  event_key TEXT NOT NULL UNIQUE,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  placement_id TEXT REFERENCES placements(id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('ELIGIBLE','CONSENT_REQUIRED','REGION_NOT_ALLOWED','FREQUENCY_CAP_REACHED','CLICK_FRAUD_SIGNAL','INVALID_POLICY_INPUT')),
  allowed BOOLEAN NOT NULL,
  region_code TEXT NOT NULL CHECK (length(trim(region_code)) > 0),
  consent_granted BOOLEAN NOT NULL,
  impressions_in_window INT NOT NULL CHECK (impressions_in_window >= 0),
  frequency_cap INT NOT NULL CHECK (frequency_cap >= 0),
  click_rate_bps INT NOT NULL CHECK (click_rate_bps >= 0),
  max_click_rate_bps INT NOT NULL CHECK (max_click_rate_bps >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_eligibility_campaign_time ON ad_eligibility_events(campaign_id, occurred_at);
