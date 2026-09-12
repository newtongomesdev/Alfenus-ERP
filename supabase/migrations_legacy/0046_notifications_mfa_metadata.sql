-- 0046: Notificações de Segurança e Metadados de MFA/Sessões.
-- Tabela de notificações internas de segurança, enriquecimento
-- de mfa_enrollments e active_sessions com campos de metadados.

-- ══════════════════════════════════════════════
-- TABLE: security_notifications
-- Notificações internas de segurança para o usuário.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  notification_type text NOT NULL
    CHECK (notification_type IN (
      'mfa_activated', 'mfa_deactivated', 'mfa_reset',
      'recovery_code_used', 'recovery_codes_regenerated',
      'new_session', 'new_device_trusted', 'session_revoked_remote',
      'password_changed', 'unusual_activity', 'mfa_policy_changed',
      'grace_period_ending', 'mfa_required_not_configured',
      'multiple_failures', 'admin_recovery', 'high_risk_session',
      'step_up_required'
    )),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- ALTER: mfa_enrollments — Novos campos de metadados
-- ══════════════════════════════════════════════

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS last_challenge_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS deactivation_reason text;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS reset_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS reset_by uuid;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'desativado';

DO $$ BEGIN
  ALTER TABLE public.mfa_enrollments
    ADD CONSTRAINT mfa_enrollments_status_check
    CHECK (status IN (
      'desativado', 'configuracao_iniciada', 'aguardando_confirmacao',
      'ativo', 'recuperacao_pendente', 'suspenso', 'redefinicao_solicitada'
    ));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- ALTER: active_sessions — Novos campos de metadados
-- ══════════════════════════════════════════════

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS mfa_level text NOT NULL DEFAULT 'none';

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS device_id uuid;

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

DO $$ BEGIN
  ALTER TABLE public.active_sessions
    ADD CONSTRAINT active_sessions_status_check
    CHECK (status IN ('ativa', 'expirada', 'revogada', 'encerrada', 'suspeita'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- security_notifications
CREATE INDEX IF NOT EXISTS security_notifications_user_read_created_idx
  ON public.security_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS security_notifications_law_firm_created_idx
  ON public.security_notifications(law_firm_id, created_at DESC);

-- mfa_enrollments (novos índices para campos adicionados)
CREATE INDEX IF NOT EXISTS mfa_enrollments_status_idx
  ON public.mfa_enrollments(status);

-- active_sessions (novos índices para campos adicionados)
CREATE INDEX IF NOT EXISTS active_sessions_status_idx
  ON public.active_sessions(status);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.security_notifications ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_notifications TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: security_notifications
-- Usuário SELECT/UPDATE nas suas (flag read);
-- superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all security_notifications"
    ON public.security_notifications FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own security_notifications"
    ON public.security_notifications FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own security_notifications"
    ON public.security_notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own security_notifications"
    ON public.security_notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
