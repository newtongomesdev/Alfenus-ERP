-- 0042: Logs de Acesso a Documentos
-- Registra visualizações, downloads, edições e compartilhamentos de documentos
-- para auditoria e conformidade com LGPD.

-- ══════════════════════════════════════════════
-- TABLE: document_access_logs
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('view', 'download', 'edit', 'share')),
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS document_access_logs_document_id_idx
  ON public.document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS document_access_logs_user_id_idx
  ON public.document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS document_access_logs_created_at_idx
  ON public.document_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS document_access_logs_law_firm_id_idx
  ON public.document_access_logs(law_firm_id);
CREATE INDEX IF NOT EXISTS document_access_logs_law_firm_document_idx
  ON public.document_access_logs(law_firm_id, document_id);
CREATE INDEX IF NOT EXISTS document_access_logs_law_firm_user_idx
  ON public.document_access_logs(law_firm_id, user_id);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT ON public.document_access_logs TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all document_access_logs"
    ON public.document_access_logs FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select document_access_logs"
    ON public.document_access_logs FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant insert document_access_logs"
    ON public.document_access_logs FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
