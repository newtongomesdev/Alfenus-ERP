-- Bloco 2: Administração do SaaS
-- Trial period, per-tenant limit overrides, admin audit logs

-- ══════════════════════════════════════════════
-- TRIAL PERIOD COLUMNS
-- ══════════════════════════════════════════════

ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_starts_at timestamptz;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════
-- PER-TENANT LIMIT OVERRIDES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_limit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  limit_key text NOT NULL,
  override_value integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (law_firm_id, limit_key)
);

-- ══════════════════════════════════════════════
-- ADMIN AUDIT LOGS (platform-level, separate from tenant audit_logs)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════

ALTER TABLE tenant_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "superadmin all tenant_limit_overrides" ON tenant_limit_overrides
    FOR ALL USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "superadmin all admin_audit_logs" ON admin_audit_logs
    FOR ALL USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- EXTEND PLATFORM_USAGE_METRICS
-- ══════════════════════════════════════════════

ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS active_members_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS legal_cases_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS payments_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS payments_value_cents bigint DEFAULT 0;
