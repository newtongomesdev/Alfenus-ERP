-- 0043: Gestão de Incidentes de Segurança
-- Registra, acompanha e resolve incidentes de segurança
-- com trilha de auditoria completa.

-- ══════════════════════════════════════════════
-- TABLE: security_incidents
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL
    CHECK (severity IN ('baixa', 'media', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'investigando', 'resolvido', 'fechado')),
  reported_by uuid NOT NULL,
  assigned_to uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: security_incident_events
-- Trilha de auditoria para mudanças de status
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ══════════════════════════════════════════════

CREATE TRIGGER security_incidents_set_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS security_incidents_law_firm_id_idx
  ON public.security_incidents(law_firm_id);
CREATE INDEX IF NOT EXISTS security_incidents_status_idx
  ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS security_incidents_severity_idx
  ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS security_incidents_reported_by_idx
  ON public.security_incidents(reported_by);
CREATE INDEX IF NOT EXISTS security_incidents_assigned_to_idx
  ON public.security_incidents(assigned_to);
CREATE INDEX IF NOT EXISTS security_incidents_created_at_idx
  ON public.security_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS security_incidents_law_firm_status_idx
  ON public.security_incidents(law_firm_id, status);
CREATE INDEX IF NOT EXISTS security_incidents_law_firm_severity_idx
  ON public.security_incidents(law_firm_id, severity);

-- security_incident_events
CREATE INDEX IF NOT EXISTS security_incident_events_incident_id_idx
  ON public.security_incident_events(incident_id);
CREATE INDEX IF NOT EXISTS security_incident_events_law_firm_id_idx
  ON public.security_incident_events(law_firm_id);
CREATE INDEX IF NOT EXISTS security_incident_events_created_at_idx
  ON public.security_incident_events(created_at DESC);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incident_events ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON public.security_incidents TO authenticated;
GRANT SELECT, INSERT ON public.security_incident_events TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: security_incidents
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all security_incidents"
    ON public.security_incidents FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select security_incidents"
    ON public.security_incidents FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant insert security_incidents"
    ON public.security_incidents FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant update security_incidents"
    ON public.security_incidents FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: security_incident_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all security_incident_events"
    ON public.security_incident_events FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select security_incident_events"
    ON public.security_incident_events FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant insert security_incident_events"
    ON public.security_incident_events FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
