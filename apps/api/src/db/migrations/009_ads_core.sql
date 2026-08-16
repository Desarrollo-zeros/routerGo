CREATE TABLE IF NOT EXISTS advertisers (
  organization_id TEXT PRIMARY KEY REFERENCES organizations(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS advertiser_accounts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL UNIQUE REFERENCES advertisers(organization_id) ON DELETE RESTRICT,
  balance_micro BIGINT NOT NULL DEFAULT 0 CHECK (balance_micro >= 0),
  currency_code TEXT NOT NULL DEFAULT 'USD' CHECK (currency_code = 'USD'),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','FROZEN','CLOSED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES advertisers(organization_id) ON DELETE RESTRICT,
  account_id TEXT NOT NULL REFERENCES advertiser_accounts(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','REVIEW','APPROVED','ACTIVE','PAUSED','COMPLETED','REJECTED')),
  moderation_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (moderation_status IN ('DRAFT','REVIEW','APPROVED','REJECTED')),
  budget_micro BIGINT NOT NULL CHECK (budget_micro > 0),
  spent_micro BIGINT NOT NULL DEFAULT 0 CHECK (spent_micro >= 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  sponsored_label TEXT NOT NULL DEFAULT 'Sponsored' CHECK (length(trim(sponsored_label)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (spent_micro <= budget_micro),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at),
  UNIQUE (id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_org_status ON campaigns(organization_id, status);

CREATE TABLE IF NOT EXISTS creatives (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('TEXT','IMAGE','VIDEO','CHALLENGE')),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  moderation_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (moderation_status IN ('DRAFT','REVIEW','APPROVED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS placements (
  id TEXT PRIMARY KEY,
  placement_key TEXT NOT NULL UNIQUE,
  surface TEXT NOT NULL CHECK (surface IN ('PWA','STUDIO','CHALLENGE','DEVELOPER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS targeting_rules (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS campaign_events (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT,
  placement_id TEXT REFERENCES placements(id) ON DELETE RESTRICT,
  event_key TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('IMPRESSION','CLICK','CONVERSION','REWARD')),
  amount_micro BIGINT NOT NULL DEFAULT 0 CHECK (amount_micro >= 0),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign_time ON campaign_events(campaign_id, occurred_at);

CREATE OR REPLACE FUNCTION prevent_campaign_overrun() RETURNS trigger AS $$
BEGIN
  IF NEW.spent_micro > NEW.budget_micro THEN
    RAISE EXCEPTION 'CAMPAIGN_BUDGET_EXCEEDED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaigns_budget_guard ON campaigns;
CREATE TRIGGER campaigns_budget_guard
  BEFORE INSERT OR UPDATE OF spent_micro, budget_micro ON campaigns
  FOR EACH ROW EXECUTE FUNCTION prevent_campaign_overrun();
