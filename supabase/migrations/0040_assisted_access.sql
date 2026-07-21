-- 0040: Sistema de Acesso Assistido (Assisted Access)
-- Permite que operadores de suporte acessem temporariamente dados de um tenant
-- com aprovação explícita do administrador do escritório.

-- ══════════════════════════════════════════════
-- TABLE: support_access_requests
-- Solicitação de acesso do operador ao tenant
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  support_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  technical_description text,
  requested_duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN (
      'rascunho',
      'pendente',
      'visualizada',
      'aprovada',
      'aprovada_com_restrições',
      'recusada',
      'cancelada',
      'expirada',
      'utilizada',
      'encerrada'
    )),
  viewed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  approved_duration_minutes integer,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_access_request_scopes
-- Escopos de acesso por solicitação
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_request_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.support_access_requests(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  module text NOT NULL,
  actions text[] NOT NULL DEFAULT ARRAY['visualizar']::text[],
  resource_ids uuid[],
  restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_access_sessions
-- Sessão ativa de acesso assistido
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_request_id uuid NOT NULL REFERENCES public.support_access_requests(id),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL,
  approved_by uuid NOT NULL,
  support_ticket_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  ended_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  revocation_reason text,
  status text NOT NULL DEFAULT 'aguardando_inicio'
    CHECK (status IN (
      'aguardando_inicio',
      'ativa',
      'suspensa',
      'encerrada',
      'revogada',
      'expirada'
    )),
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_access_events
-- Log de auditoria imutável
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.support_access_sessions(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.support_access_requests(id) ON DELETE SET NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL,
  event_type text NOT NULL,
  module text,
  action_name text,
  entity_type text,
  entity_id uuid,
  route text,
  result text NOT NULL DEFAULT 'success',
  reason text,
  ip_address inet,
  user_agent text,
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ══════════════════════════════════════════════

CREATE TRIGGER support_access_requests_set_updated_at
  BEFORE UPDATE ON public.support_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- support_access_requests
CREATE INDEX IF NOT EXISTS support_access_requests_law_firm_id_idx
  ON public.support_access_requests(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_requests_status_idx
  ON public.support_access_requests(status);
CREATE INDEX IF NOT EXISTS support_access_requests_requested_by_idx
  ON public.support_access_requests(requested_by);
CREATE INDEX IF NOT EXISTS support_access_requests_support_ticket_id_idx
  ON public.support_access_requests(support_ticket_id);
CREATE INDEX IF NOT EXISTS support_access_requests_created_at_idx
  ON public.support_access_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS support_access_requests_law_firm_status_idx
  ON public.support_access_requests(law_firm_id, status);

-- support_access_request_scopes
CREATE INDEX IF NOT EXISTS support_access_request_scopes_request_id_idx
  ON public.support_access_request_scopes(request_id);
CREATE INDEX IF NOT EXISTS support_access_request_scopes_law_firm_id_idx
  ON public.support_access_request_scopes(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_request_scopes_module_idx
  ON public.support_access_request_scopes(module);

-- support_access_sessions
CREATE INDEX IF NOT EXISTS support_access_sessions_access_request_id_idx
  ON public.support_access_sessions(access_request_id);
CREATE INDEX IF NOT EXISTS support_access_sessions_law_firm_id_idx
  ON public.support_access_sessions(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_sessions_operator_id_idx
  ON public.support_access_sessions(operator_id);
CREATE INDEX IF NOT EXISTS support_access_sessions_status_idx
  ON public.support_access_sessions(status);
CREATE INDEX IF NOT EXISTS support_access_sessions_expires_at_idx
  ON public.support_access_sessions(expires_at);
CREATE INDEX IF NOT EXISTS support_access_sessions_law_firm_status_idx
  ON public.support_access_sessions(law_firm_id, status);
CREATE INDEX IF NOT EXISTS support_access_sessions_law_firm_operator_idx
  ON public.support_access_sessions(law_firm_id, operator_id);

-- support_access_events
CREATE INDEX IF NOT EXISTS support_access_events_session_id_idx
  ON public.support_access_events(session_id);
CREATE INDEX IF NOT EXISTS support_access_events_request_id_idx
  ON public.support_access_events(request_id);
CREATE INDEX IF NOT EXISTS support_access_events_law_firm_id_idx
  ON public.support_access_events(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_events_operator_id_idx
  ON public.support_access_events(operator_id);
CREATE INDEX IF NOT EXISTS support_access_events_event_type_idx
  ON public.support_access_events(event_type);
CREATE INDEX IF NOT EXISTS support_access_events_created_at_idx
  ON public.support_access_events(created_at DESC);
CREATE INDEX IF NOT EXISTS support_access_events_law_firm_event_type_idx
  ON public.support_access_events(law_firm_id, event_type);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.support_access_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_request_scopes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_events          ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_access_requests       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_access_request_scopes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_access_sessions       TO authenticated;
GRANT SELECT, INSERT                ON public.support_access_events         TO authenticated;

-- ══════════════════════════════════════════════
-- RLS: support_access_requests
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_requests"
    ON public.support_access_requests FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators select requests they created"
    ON public.support_access_requests FOR SELECT
    USING (requested_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators insert own requests"
    ON public.support_access_requests FOR INSERT
    WITH CHECK (requested_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators update own draft/cancelled requests"
    ON public.support_access_requests FOR UPDATE
    USING (
      requested_by = auth.uid()
      AND status IN ('rascunho', 'pendente')
    )
    WITH CHECK (
      requested_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins view requests for their tenant"
    ON public.support_access_requests FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins approve/reject requests"
    ON public.support_access_requests FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_access_request_scopes
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_request_scopes"
    ON public.support_access_request_scopes FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators manage scopes on own requests"
    ON public.support_access_request_scopes FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.support_access_requests r
        WHERE r.id = support_access_request_scopes.request_id
          AND r.requested_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.support_access_requests r
        WHERE r.id = support_access_request_scopes.request_id
          AND r.requested_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins view and approve scopes for their tenant"
    ON public.support_access_request_scopes FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins update scopes for approval"
    ON public.support_access_request_scopes FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins insert scopes for their tenant"
    ON public.support_access_request_scopes FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_access_sessions
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_sessions"
    ON public.support_access_sessions FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators view their own sessions"
    ON public.support_access_sessions FOR SELECT
    USING (operator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators update activity on own sessions"
    ON public.support_access_sessions FOR UPDATE
    USING (operator_id = auth.uid())
    WITH CHECK (operator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins view sessions for their tenant"
    ON public.support_access_sessions FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins manage sessions for their tenant"
    ON public.support_access_sessions FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins insert sessions for their tenant"
    ON public.support_access_sessions FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_access_events
-- Log de auditoria imutável — INSERT amplo, SELECT/UPDATE/DELETE superadmin
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_events"
    ON public.support_access_events FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated users insert events for their tenant"
    ON public.support_access_events FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated users insert own events"
    ON public.support_access_events FOR INSERT
    WITH CHECK (operator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
