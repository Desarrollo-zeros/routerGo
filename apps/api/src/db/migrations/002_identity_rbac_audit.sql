CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('PERSONAL', 'ADVERTISER', 'DEVELOPER', 'INTERNAL')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'INVITED' CHECK (status IN ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_organization ON organization_members(organization_id);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  permission_key TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  role_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'ORGANIZATION')),
  organization_id TEXT REFERENCES organizations(id) ON DELETE RESTRICT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((scope = 'GLOBAL' AND organization_id IS NULL) OR (scope = 'ORGANIZATION' AND organization_id IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_global_key ON roles(role_key) WHERE scope = 'GLOBAL';
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_organization_key ON roles(organization_id, role_key) WHERE scope = 'ORGANIZATION';

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE RESTRICT,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

CREATE TABLE IF NOT EXISTS member_roles (
  member_id TEXT NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_member_roles_role ON member_roles(role_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  actor_organization_id TEXT REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_actor_user ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

COMMENT ON COLUMN audit_logs.metadata IS 'Must be sanitized before persistence; never store passwords, API/provider/session secrets, tokens, or raw sensitive prompts.';

CREATE OR REPLACE FUNCTION enforce_member_role_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  member_organization TEXT;
  role_scope TEXT;
  role_organization TEXT;
BEGIN
  SELECT organization_id INTO member_organization FROM organization_members WHERE id = NEW.member_id;
  SELECT scope, organization_id INTO role_scope, role_organization FROM roles WHERE id = NEW.role_id;
  IF role_scope = 'ORGANIZATION' AND role_organization IS DISTINCT FROM member_organization THEN
    RAISE EXCEPTION 'organization-scoped role cannot cross organization boundary';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_role_scope_guard ON member_roles;
CREATE TRIGGER member_role_scope_guard
  BEFORE INSERT OR UPDATE ON member_roles
  FOR EACH ROW EXECUTE FUNCTION enforce_member_role_scope();

CREATE OR REPLACE FUNCTION prevent_assigned_role_retarget()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.scope, OLD.organization_id) IS DISTINCT FROM (NEW.scope, NEW.organization_id)
     AND EXISTS (SELECT 1 FROM member_roles WHERE role_id = OLD.id) THEN
    RAISE EXCEPTION 'assigned role scope cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS role_scope_update_guard ON roles;
CREATE TRIGGER role_scope_update_guard
  BEFORE UPDATE OF scope, organization_id ON roles
  FOR EACH ROW EXECUTE FUNCTION prevent_assigned_role_retarget();

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit logs are append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_log_append_only ON audit_logs;
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
