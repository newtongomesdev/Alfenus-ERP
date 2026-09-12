-- 0039: Sistema de Suporte ao Cliente (Support Tickets)
-- Multi-tenant SaaS com RLS

-- ══════════════════════════════════════════════
-- TABLE: support_categories
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_tickets
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  protocol text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  category_id uuid REFERENCES public.support_categories(id),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'aguardando_suporte', 'em_analise', 'aguardando_cliente', 'resolvido', 'fechado', 'cancelado')),
  assigned_to uuid,
  route_origin text,
  app_version text,
  browser_info text,
  os_info text,
  error_identifier text,
  technical_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_messages
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('client', 'support', 'system')),
  message_type text NOT NULL DEFAULT 'message'
    CHECK (message_type IN ('message', 'internal_note', 'system', 'info_request', 'resolution')),
  content text NOT NULL,
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'internal', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_attachments
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_messages(id) ON DELETE SET NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_events
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('client', 'operator', 'system')),
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_assignments
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_sla_policies
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
  first_response_minutes integer NOT NULL DEFAULT 240,
  resolution_minutes integer NOT NULL DEFAULT 1440,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, priority)
);

-- ══════════════════════════════════════════════
-- TABLE: support_notifications
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- FUNCTION: generate_support_protocol
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_support_protocol()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  today_prefix text;
  next_seq integer;
begin
  today_prefix := 'SUP-' || to_char(now(), 'YYYYMMDD') || '-';

  SELECT COALESCE(
    (SELECT MAX(
      CAST(SUBSTRING(protocol FROM LENGTH(today_prefix) + 1) AS integer)
    )
    FROM public.support_tickets
    WHERE protocol LIKE today_prefix || '%'),
    0
  ) + 1 INTO next_seq;

  NEW.protocol := today_prefix || LPAD(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════

CREATE TRIGGER support_tickets_generate_protocol
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.protocol IS NULL OR NEW.protocol = '')
  EXECUTE FUNCTION public.generate_support_protocol();

CREATE TRIGGER support_tickets_set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- support_tickets
CREATE INDEX IF NOT EXISTS support_tickets_law_firm_id_idx ON public.support_tickets(law_firm_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_law_firm_status_idx ON public.support_tickets(law_firm_id, status);
CREATE INDEX IF NOT EXISTS support_tickets_law_firm_created_at_idx ON public.support_tickets(law_firm_id, created_at DESC);

-- support_messages
CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS support_messages_law_firm_id_idx ON public.support_messages(law_firm_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at DESC);

-- support_attachments
CREATE INDEX IF NOT EXISTS support_attachments_ticket_id_idx ON public.support_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS support_attachments_message_id_idx ON public.support_attachments(message_id);
CREATE INDEX IF NOT EXISTS support_attachments_law_firm_id_idx ON public.support_attachments(law_firm_id);

-- support_events
CREATE INDEX IF NOT EXISTS support_events_ticket_id_idx ON public.support_events(ticket_id);
CREATE INDEX IF NOT EXISTS support_events_law_firm_id_idx ON public.support_events(law_firm_id);
CREATE INDEX IF NOT EXISTS support_events_created_at_idx ON public.support_events(created_at DESC);

-- support_assignments
CREATE INDEX IF NOT EXISTS support_assignments_ticket_id_idx ON public.support_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS support_assignments_operator_id_idx ON public.support_assignments(operator_id);

-- support_notifications
CREATE INDEX IF NOT EXISTS support_notifications_law_firm_id_idx ON public.support_notifications(law_firm_id);
CREATE INDEX IF NOT EXISTS support_notifications_user_id_idx ON public.support_notifications(user_id);
CREATE INDEX IF NOT EXISTS support_notifications_ticket_id_idx ON public.support_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS support_notifications_is_read_idx ON public.support_notifications(is_read);

-- support_sla_policies
CREATE INDEX IF NOT EXISTS support_sla_policies_plan_id_idx ON public.support_sla_policies(plan_id);

-- ══════════════════════════════════════════════
-- SEED: Default support categories (14)
-- ══════════════════════════════════════════════

INSERT INTO public.support_categories (name, slug, description, sort_order) VALUES
  ('Dúvidas Gerais',         'duvidas-gerais',         'Perguntas e dúvidas sobre o uso geral do sistema', 1),
  ('Solicitação de Treinamento', 'solicitacao-treinamento', 'Solicitação de treinamento ou capacitação para a equipe', 2),
  ('Erros e Bugs',           'erros-e-bugs',            'Reporte de erros, bugs ou comportamentos inesperados', 3),
  ('Funcionalidade Indisponível', 'funcionalidade-indisponivel', 'Funcionalidade que não está acessível ou retornando erro', 4),
  ('Solicitação de Nova Funcionalidade', 'solicitacao-nova-funcionalidade', 'Sugestão ou pedido de novas funcionalidades', 5),
  ('Problemas de Acesso',    'problemas-de-acesso',     'Dificuldades de login, permissões ou autenticação', 6),
  ('Performance e Lentidão', 'performance-e-lentidão',  'Problemas de desempenho ou lentidão no sistema', 7),
  ('Integrações',            'integracoes',             'Questões relacionadas a integrações externas (APIs, webhooks, etc.)', 8),
  ('Cobranças e Faturamento','cobrancas-e-faturamento', 'Dúvidas sobre planos, cobranças, faturas e pagamentos', 9),
  ('Configuração do Escritório', 'configuracao-do-escritorio', 'Ajuda com configurações gerais do escritório no sistema', 10),
  ('Dados e Relatórios',     'dados-e-relatorios',      'Problemas ou dúvidas sobre dados, exportações e relatórios', 11),
  ('Migração de Dados',      'migracao-de-dados',       'Auxílio com importação ou migração de dados de outros sistemas', 12),
  ('Sugestão de Melhoria',   'sugestao-de-melhoria',    'Ideias e sugestões para melhorias no sistema', 13),
  ('Outros',                 'outros',                  'Assuntos que não se enquadram nas categorias acima', 14)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════
-- SEED: Default SLA policies (starter/professional/business)
-- ══════════════════════════════════════════════

INSERT INTO public.support_sla_policies (plan_id, priority, first_response_minutes, resolution_minutes) VALUES
  -- Starter
  ('starter',        'baixa',   480,  2880),
  ('starter',        'normal',  240,  1440),
  ('starter',        'alta',    120,   720),
  ('starter',        'critica',  60,   360),
  -- Professional
  ('professional',   'baixa',   360,  2160),
  ('professional',   'normal',  180,  1080),
  ('professional',   'alta',     90,   480),
  ('professional',   'critica',  30,   240),
  -- Business
  ('business',       'baixa',   240,  1440),
  ('business',       'normal',  120,   720),
  ('business',       'alta',     60,   360),
  ('business',       'critica',  15,   120)
ON CONFLICT (plan_id, priority) DO NOTHING;

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.support_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_sla_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- RLS: support_categories
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_categories"
    ON public.support_categories FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "all can view active support_categories"
    ON public.support_categories FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_tickets
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_tickets"
    ON public.support_tickets FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_tickets"
    ON public.support_tickets FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update own tenant support_tickets"
    ON public.support_tickets FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_messages
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_messages"
    ON public.support_messages FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select non-internal support_messages"
    ON public.support_messages FOR SELECT
    USING (
      public.has_law_firm_access(law_firm_id)
      AND (visibility IN ('public', 'system') OR author_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_attachments
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_attachments"
    ON public.support_attachments FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_attachments"
    ON public.support_attachments FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_attachments"
    ON public.support_attachments FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_events"
    ON public.support_events FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_events"
    ON public.support_events FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_assignments
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_assignments"
    ON public.support_assignments FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_assignments"
    ON public.support_assignments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = support_assignments.ticket_id
          AND public.has_law_firm_access(t.law_firm_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_sla_policies
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_sla_policies"
    ON public.support_sla_policies FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "all can view active support_sla_policies"
    ON public.support_sla_policies FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_notifications
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_notifications"
    ON public.support_notifications FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own notifications"
    ON public.support_notifications FOR SELECT
    USING (
      public.has_law_firm_access(law_firm_id)
      AND user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update own notifications"
    ON public.support_notifications FOR UPDATE
    USING (
      public.has_law_firm_access(law_firm_id)
      AND user_id = auth.uid()
    )
    WITH CHECK (
      public.has_law_firm_access(law_firm_id)
      AND user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_notifications"
    ON public.support_notifications FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
