-- 0045: Sessões Aprimoradas, Detecção de Risco e Step-Up de Confiança.
-- Modelagem avançada de sessões, log imutável de eventos, flags de risco
-- e autorizações temporárias de elevação de privilégio (step-up).

-- ══════════════════════════════════════════════
-- TABLE: user_sessions
-- Modelo de sessão aprimorado com rastreio de
-- dispositivo, IP e nível MFA.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_session_id text,
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
  device_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  ip_first_seen text,
  ip_last_seen text,
  user_agent text,
  mfa_level text NOT NULL DEFAULT 'none'
    CHECK (mfa_level IN ('none', 'totp', 'recovery_code')),
  status text NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'expirada', 'revogada', 'encerrada', 'suspeita')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: session_events
-- Log imutável de auditoria para sessões.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'criada', 'renovada', 'revogada', 'encerrada', 'expirada',
      'suspeita_detectada', 'ip_mudou', 'device_mudou',
      'mfa_validado', 'step_up_aprovado', 'step_up_negado'
    )),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: session_risk_flags
-- Flags de detecção de risco para sessões.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.session_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  risk_type text NOT NULL
    CHECK (risk_type IN (
      'novo_dispositivo', 'ip_desconhecido', 'ua_mudanca_brusca',
      'multiplas_sessoes', 'tentativas_falhas', 'uso_recovery_code',
      'mfa_reset_recente', 'acesso_fora_horario', 'bloqueado_por_politica',
      'pos_alteracao_senha'
    )),
  risk_level text NOT NULL DEFAULT 'informativo'
    CHECK (risk_level IN ('informativo', 'atencao', 'alto_risco')),
  description text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: step_up_authorizations
-- Autorizações temporárias de elevação de confiança.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.step_up_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  action_type text NOT NULL
    CHECK (action_type IN (
      'mfa_enable', 'mfa_disable', 'password_change', 'email_change',
      'permission_change', 'owner_change', 'admin_invite',
      'sensitive_document', 'data_export', 'financial_change',
      'support_access', 'policy_change', 'api_key',
      'recovery_code_regenerate'
    )),
  auth_method text NOT NULL
    CHECK (auth_method IN ('password', 'totp', 'recovery_code')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  consumed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TRIGGERS: set_updated_at
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE TRIGGER user_sessions_set_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- user_sessions
CREATE INDEX IF NOT EXISTS user_sessions_user_status_idx
  ON public.user_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS user_sessions_law_firm_status_idx
  ON public.user_sessions(law_firm_id, status);
CREATE INDEX IF NOT EXISTS user_sessions_provider_session_idx
  ON public.user_sessions(provider_session_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_active_idx
  ON public.user_sessions(expires_at) WHERE status = 'ativa';

-- session_events
CREATE INDEX IF NOT EXISTS session_events_user_created_idx
  ON public.session_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_events_law_firm_created_idx
  ON public.session_events(law_firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_events_session_idx
  ON public.session_events(session_id);

-- session_risk_flags
CREATE INDEX IF NOT EXISTS session_risk_flags_user_resolved_created_idx
  ON public.session_risk_flags(user_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS session_risk_flags_law_firm_risk_level_idx
  ON public.session_risk_flags(law_firm_id, risk_level);

-- step_up_authorizations
CREATE INDEX IF NOT EXISTS step_up_authorizations_user_action_consumed_expires_idx
  ON public.step_up_authorizations(user_id, action_type, consumed, expires_at);
CREATE INDEX IF NOT EXISTS step_up_authorizations_session_idx
  ON public.step_up_authorizations(session_id);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_up_authorizations ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT SELECT, INSERT ON public.session_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_risk_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_up_authorizations TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: user_sessions
-- Usuário vê suas próprias sessões; superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all user_sessions"
    ON public.user_sessions FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own user_sessions"
    ON public.user_sessions FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own user_sessions"
    ON public.user_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own user_sessions"
    ON public.user_sessions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: session_events
-- Imutável: usuário vê os seus; admin tem ALL.
-- Sem UPDATE/DELETE — log de auditoria imutável.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all session_events"
    ON public.session_events FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "admin all session_events"
    ON public.session_events FOR ALL
    USING (
      public.has_law_firm_role(
        law_firm_id,
        ARRAY['proprietario', 'administrador']::public.member_role[]
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own session_events"
    ON public.session_events FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: session_risk_flags
-- Usuário vê os seus; superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all session_risk_flags"
    ON public.session_risk_flags FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own session_risk_flags"
    ON public.session_risk_flags FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own session_risk_flags"
    ON public.session_risk_flags FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own session_risk_flags"
    ON public.session_risk_flags FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: step_up_authorizations
-- Usuário vê as suas; superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all step_up_authorizations"
    ON public.step_up_authorizations FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own step_up_authorizations"
    ON public.step_up_authorizations FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own step_up_authorizations"
    ON public.step_up_authorizations FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own step_up_authorizations"
    ON public.step_up_authorizations FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
