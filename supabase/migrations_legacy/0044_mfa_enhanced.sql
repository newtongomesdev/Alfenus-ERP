-- 0044: MFA Aprimorado — Códigos de recuperação, dispositivos confiáveis e reforço de políticas.
-- Complementa as tabelas de MFA e sessões do 0023.

-- ══════════════════════════════════════════════
-- TABLE: user_recovery_codes
-- Códigos de recuperação de conta (hash SHA-256).
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  batch_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'utilizado', 'revogado', 'expirado')),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: recovery_code_events
-- Trilha de auditoria para códigos de recuperação.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recovery_code_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  recovery_code_id uuid REFERENCES public.user_recovery_codes(id),
  action text NOT NULL
    CHECK (action IN ('gerado', 'utilizado', 'revogado', 'expirado', 'regenerado')),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: trusted_devices
-- Dispositivos reconhecidos pelo usuário.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  device_name text NOT NULL,
  user_agent_summary text,
  ip_first_seen text NOT NULL,
  ip_last_seen text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  trusted_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  status text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'revogado', 'expirado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: trusted_device_events
-- Trilha de auditoria para dispositivos confiáveis.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trusted_device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.trusted_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL
    CHECK (action IN ('criado', 'confiado', 'revogado', 'expirado', 'acesso')),
  ip_address text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- ALTER: security_policies — Novos campos de enforcement MFA
-- ══════════════════════════════════════════════

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS enforcement_mode text NOT NULL DEFAULT 'opcional'
    CHECK (enforcement_mode IN ('opcional', 'recomendado', 'obrigatorio_todos', 'obrigatorio_roles', 'obrigatorio_usuarios'));

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS required_roles text[] DEFAULT '{}';

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS required_user_ids uuid[] DEFAULT '{}';

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 14;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS enforcement_start_at timestamptz;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS trusted_device_duration_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_financial_actions boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_exports boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_permission_changes boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_sensitive_documents boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_support_access_approval boolean NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- user_recovery_codes
CREATE INDEX IF NOT EXISTS user_recovery_codes_user_status_idx
  ON public.user_recovery_codes(user_id, status);
CREATE INDEX IF NOT EXISTS user_recovery_codes_user_batch_idx
  ON public.user_recovery_codes(user_id, batch_id);

-- recovery_code_events
CREATE INDEX IF NOT EXISTS recovery_code_events_user_created_idx
  ON public.recovery_code_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recovery_code_events_law_firm_idx
  ON public.recovery_code_events(law_firm_id);

-- trusted_devices
CREATE INDEX IF NOT EXISTS trusted_devices_user_status_idx
  ON public.trusted_devices(user_id, status);
CREATE INDEX IF NOT EXISTS trusted_devices_user_hash_idx
  ON public.trusted_devices(user_id, device_hash);
CREATE INDEX IF NOT EXISTS trusted_devices_law_firm_idx
  ON public.trusted_devices(law_firm_id);

-- trusted_device_events
CREATE INDEX IF NOT EXISTS trusted_device_events_device_created_idx
  ON public.trusted_device_events(device_id, created_at DESC);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_code_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_device_events ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recovery_codes TO authenticated;
GRANT SELECT, INSERT ON public.recovery_code_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_devices TO authenticated;
GRANT SELECT, INSERT ON public.trusted_device_events TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: user_recovery_codes
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all user_recovery_codes"
    ON public.user_recovery_codes FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own recovery codes"
    ON public.user_recovery_codes FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: recovery_code_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all recovery_code_events"
    ON public.recovery_code_events FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own recovery code events"
    ON public.recovery_code_events FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: trusted_devices
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all trusted_devices"
    ON public.trusted_devices FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own trusted devices"
    ON public.trusted_devices FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own trusted devices"
    ON public.trusted_devices FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own trusted devices"
    ON public.trusted_devices FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user delete own trusted devices"
    ON public.trusted_devices FOR DELETE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: trusted_device_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all trusted_device_events"
    ON public.trusted_device_events FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own trusted device events"
    ON public.trusted_device_events FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
