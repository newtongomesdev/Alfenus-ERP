-- 0041: Sistema de Onboarding e Melhorias no Fluxo de Convites
-- Tabelas de sessão e progresso de onboarding para novos escritórios,
-- e colunas adicionais em team_invitations para controle completo do ciclo de vida.

-- ══════════════════════════════════════════════
-- TABLE: onboarding_sessions
-- Sessão de onboarding vinculada a um escritório
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL UNIQUE REFERENCES public.law_firms(id) ON DELETE CASCADE,
  profile text NOT NULL DEFAULT 'padrao'
    CHECK (profile IN ('padrao', 'escritorio_grande', 'advocacia_independente', 'corporativo')),
  current_step integer NOT NULL DEFAULT 1,
  total_steps integer NOT NULL DEFAULT 18,
  completed_steps integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  skipped_steps integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  completed_optional_steps integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: onboarding_progress
-- Progresso individual de cada etapa do onboarding
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, step_key)
);

-- ══════════════════════════════════════════════
-- ALTER TABLE: team_invitations
-- Colunas adicionais para controle completo do ciclo de vida do convite
-- ══════════════════════════════════════════════

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS last_resent_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS notes text;

-- Atualizar status de convites existentes baseado nos dados atuais
UPDATE public.team_invitations
SET status = 'aceito'
WHERE status = 'pendente'
  AND accepted_at IS NOT NULL;

UPDATE public.team_invitations
SET status = 'expirado'
WHERE status = 'pendente'
  AND expires_at < now()
  AND accepted_at IS NULL;

-- ══════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ══════════════════════════════════════════════

CREATE TRIGGER onboarding_sessions_set_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER onboarding_progress_set_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- onboarding_sessions
CREATE INDEX IF NOT EXISTS onboarding_sessions_law_firm_id_idx
  ON public.onboarding_sessions(law_firm_id);
CREATE INDEX IF NOT EXISTS onboarding_sessions_profile_idx
  ON public.onboarding_sessions(profile);
CREATE INDEX IF NOT EXISTS onboarding_sessions_created_at_idx
  ON public.onboarding_sessions(created_at DESC);

-- onboarding_progress
CREATE INDEX IF NOT EXISTS onboarding_progress_session_id_idx
  ON public.onboarding_progress(session_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_law_firm_id_idx
  ON public.onboarding_progress(law_firm_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_step_key_idx
  ON public.onboarding_progress(step_key);
CREATE INDEX IF NOT EXISTS onboarding_progress_status_idx
  ON public.onboarding_progress(status);
CREATE INDEX IF NOT EXISTS onboarding_progress_session_status_idx
  ON public.onboarding_progress(session_id, status);
CREATE INDEX IF NOT EXISTS onboarding_progress_law_firm_step_idx
  ON public.onboarding_progress(law_firm_id, step_number);

-- team_invitations (novos índices para as novas colunas)
CREATE INDEX IF NOT EXISTS team_invitations_cancelled_by_idx
  ON public.team_invitations(cancelled_by);
CREATE INDEX IF NOT EXISTS team_invitations_status_idx
  ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS team_invitations_email_status_idx
  ON public.team_invitations(email, status);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress  ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress  TO authenticated;

-- ══════════════════════════════════════════════
-- RLS: onboarding_sessions
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all onboarding_sessions"
    ON public.onboarding_sessions FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members view onboarding session for their tenant"
    ON public.onboarding_sessions FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert onboarding session for their tenant"
    ON public.onboarding_sessions FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update onboarding session for their tenant"
    ON public.onboarding_sessions FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: onboarding_progress
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all onboarding_progress"
    ON public.onboarding_progress FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members view onboarding progress for their tenant"
    ON public.onboarding_progress FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert onboarding progress for their tenant"
    ON public.onboarding_progress FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update onboarding progress for their tenant"
    ON public.onboarding_progress FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
