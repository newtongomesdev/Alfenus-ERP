-- ============================================================
-- MIGRATION 0047 — SERVICE CATALOG (Catálogo de Serviços)
-- SUBETAPA 5.2.1 — BLOCO 5 Modo Solo Pro
-- ============================================================
-- Cria a tabela `service_catalog` com RLS, indices, seed
-- de serviços da plataforma e permissões baseadas no papel.
-- ============================================================

BEGIN;

-- ── ENUM de status do serviço ──────────────────────────────
CREATE TYPE public.service_status AS ENUM (
  'rascunho',
  'ativo',
  'inativo',
  'arquivado'
);

-- ── ENUM de formas de cobrança ─────────────────────────────
CREATE TYPE public.service_charging_model AS ENUM (
  'consulta',
  'fixo',
  'parcelado',
  'mensalidade',
  'por_hora',
  'por_atividade',
  'exito',
  'hibrido',
  'personalizado'
);

-- ── Tabela principal: service_catalog ──────────────────────
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,

  -- Identificação
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  practice_area TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'servico',

  -- Descrições
  short_description TEXT,
  public_description TEXT,
  internal_description TEXT,

  -- Escopo
  scope_included TEXT,
  scope_excluded TEXT,

  -- Duração / Esforço
  estimated_duration INTEGER,
  duration_unit TEXT DEFAULT 'dias',
  estimated_hours INTEGER,

  -- Valores (centavos para monetário)
  reference_value_cents INTEGER,
  min_value_cents INTEGER,
  max_value_cents INTEGER,
  currency TEXT DEFAULT 'BRL',

  -- Cobrança
  charging_model public.service_charging_model DEFAULT 'fixo',
  default_upfront_cents INTEGER,
  default_installments INTEGER,
  success_fee_percentage NUMERIC,

  -- Despesas
  included_expenses TEXT,
  excluded_expenses TEXT,

  -- Documentos / Checklists
  required_documents TEXT,
  suggested_steps TEXT,

  -- Prazos
  estimated_deadline INTEGER,
  deadline_unit TEXT DEFAULT 'dias',

  -- Vinculação a modelos
  proposal_template_id UUID,
  contract_template_id UUID,
  checklist_template_id UUID,

  -- Controle
  status public.service_status DEFAULT 'rascunho',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_platform_library BOOLEAN NOT NULL DEFAULT false,

  -- Auditoria
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT service_catalog_slug_unique
    UNIQUE (law_firm_id, slug),
  CONSTRAINT service_catalog_status_check
    CHECK (status IN ('rascunho', 'ativo', 'inativo', 'arquivado')),
  CONSTRAINT service_catalog_charging_check
    CHECK (charging_model IN (
      'consulta', 'fixo', 'parcelado', 'mensalidade',
      'por_hora', 'por_atividade', 'exito', 'hibrido', 'personalizado'
    )),
  CONSTRAINT service_catalog_duration_unit_check
    CHECK (duration_unit IN ('horas', 'dias', 'semanas', 'meses')),
  CONSTRAINT service_catalogDeadline_unit_check
    CHECK (deadline_unit IN ('horas', 'dias', 'semanas', 'meses')),
  CONSTRAINT service_catalog_cents_non_negative
    CHECK (
      reference_value_cents IS NULL OR reference_value_cents >= 0
    ),
  CONSTRAINT service_catalog_success_fee_check
    CHECK (
      success_fee_percentage IS NULL OR (success_fee_percentage >= 0 AND success_fee_percentage <= 100)
    )
);

-- ── Indices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_catalog_law_firm
  ON public.service_catalog (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_service_catalog_status
  ON public.service_catalog (law_firm_id, status);

CREATE INDEX IF NOT EXISTS idx_service_catalog_practice_area
  ON public.service_catalog (law_firm_id, practice_area);

CREATE INDEX IF NOT EXISTS idx_service_catalog_slug
  ON public.service_catalog (law_firm_id, slug);

CREATE INDEX IF NOT EXISTS idx_service_catalog_platform
  ON public.service_catalog (is_platform_library)
  WHERE is_platform_library = true;

-- ── Trigger: updated_at automático ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_service_catalog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_service_catalog_updated_at ON public.service_catalog;
CREATE TRIGGER trigger_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_service_catalog_updated_at();

-- ── RLS Policies ────────────────────────────────────────────
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- SELECT: acesso ao tenant OU biblioteca da plataforma (law_firm_id IS NULL)
DROP POLICY IF EXISTS "service_catalog_select" ON public.service_catalog;
CREATE POLICY "service_catalog_select" ON public.service_catalog
  FOR SELECT
  USING (
    has_law_firm_access(law_firm_id) OR law_firm_id IS NULL
  );

-- INSERT: só pode inserir se tem acesso ao tenant
DROP POLICY IF EXISTS "service_catalog_insert" ON public.service_catalog;
CREATE POLICY "service_catalog_insert" ON public.service_catalog
  FOR INSERT
  WITH CHECK (
    has_law_firm_access(law_firm_id) OR law_firm_id IS NULL
  );

-- UPDATE: só se tem acesso ao tenant
DROP POLICY IF EXISTS "service_catalog_update" ON public.service_catalog;
CREATE POLICY "service_catalog_update" ON public.service_catalog
  FOR UPDATE
  USING (
    has_law_firm_access(law_firm_id)
  );

-- DELETE: só se tem acesso ao tenant (soft delete via archived_at)
DROP POLICY IF EXISTS "service_catalog_delete" ON public.service_catalog;
CREATE POLICY "service_catalog_delete" ON public.service_catalog
  FOR DELETE
  USING (
    has_law_firm_access(law_firm_id)
  );

-- ── Permissões (adicionar ao sistema de permissões) ──────────────────
-- As permissões são verificadas no front-end pelo sistema can()
-- Elas serão adicionadas no arquivo lib/auth/permissions.ts
-- (services.view, services.create, services.edit, services.archive,
--  services.manage_templates, services.view_pricing, services.edit_pricing)

-- ── RNA: Biblioteca de Serviços da Plataforma (seed) ──────────────────
-- Serviços da plataforma: law_firm_id IS NULL (somente leitura)
-- Dados de exemplo para as 10 áreas jurídicas

INSERT INTO public.service_catalog (
  law_firm_id, name, slug, practice_area, category,
  short_description, public_description, internal_description,
  scope_included, scope_excluded,
  estimated_duration, duration_unit,
  reference_value_cents, min_value_cents, max_value_cents,
  charging_model, default_upfront_cents, default_installments,
  included_expenses, excluded_expenses,
  required_documents, suggested_steps,
  estimated_deadline, deadline_unit,
  status, sort_order, is_platform_library, created_by
)
VALUES
  -- 1. Consulta Inicial
  (NULL, 'Consulta Inicial', 'consulta-inicial', 'civel', 'servico',
   'Análise preliminar de caso jurídico',
   'Primeira consulta para avaliação do caso, orientação inicial e definição de estratégia.',
   'Análise de documentos do cliente, parecer inicial, definição de próximos passos.',
   'Análise de documentos, parecer, orientação',
   'Assistência processual, representação em juízo',
   1, 'horas', NULL, NULL, NULL,
   'consulta', NULL, NULL,
   NULL,
   'Custas de original, viagens, custas de cópia',
   'Documentos pessoais, documento de identidade, CPF, contratos, documentos relativos ao caso',
   '1. Consulta com cliente; 2. Análise de documentos; 3. Parecer escrito',
   7, 'dias', 'rascunho', 1, true, NULL),

  -- 2. Análise Documental
  (NULL, 'Análise Documental', 'analise-documental', 'civel', 'servico',
   'Revisão e análise de documentos jurídicos',
   'Análise detalhada de documentos relevantes para o caso.',
   'Verificação de cláusulas, validade, conformidade, potenciais riscos.',
   'Análise documental, relatório, orientação',
   'Elaboração de documentos, representação processual',
   3, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   NULL, NULL,
   'Documentos do caso, poderes de representação',
   '1. Coleta de documentos; 2. Análise detalhada; 3. Relatório',
   10, 'dias', 'rascunho', 2, true, NULL),

  -- 3. Notificação Extrajudicial
  (NULL, 'Elaboração de Notificação Extrajudicial', 'notificacao-extrajudicial', 'civel', 'servico',
   'Elaboração e envio de notificação extrajudicial',
   'Redação de notificação para resolução amigável.',
   'Redação da notificação, assessoria jurídica, envio por meio seguro.',
   'Redação, envio, orientação',
   'Representação processual, ação judicial',
   2, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custos de envio, certidão de notificação',
   'Custas processuais, honorários periciais',
   'Documentos do caso, dados do notificado',
   '1. Coleta de informações; 2. Elaboração da notificação; 3. Envio via advogado; 4. Registro de recebimento',
   5, 'dias', 'rascunho', 3, true, NULL),

  -- 4. Elaboração de Contrato
  (NULL, 'Elaboração de Contrato', 'elaboracao-contrato', 'civel', 'servico',
   'Criação de contrato personalizado',
   'Elaboração de contrato com cláusulas personalizadas.',
   'Redação de contrato, revisão de cláusulas, adequação ao caso.',
   'Redação, revisão, modelo, assessoria',
   'Registro em cartório, construção',
   5, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas do cartório, tags, cartões de apresentação',
   'Pesquisa de clientele, campanhas pagas',
   'Dados do cliente, dados do contrato, cláusulas específicas',
   '1. Levantamento de informações; 2. Redação do contrato; 3. Revisão com cliente; 4. Assinatura',
   15, 'dias', 'rascunho', 4, true, NULL),

  -- 5. Revisão de Contrato
  (NULL, 'Revisão de Contrato', 'revisao-contrato', 'civel', 'servico',
   'Análise e revisão de contrato existente',
   'Análise de cláusulas, pontos de atenção, recomendações.',
   'Verificação de conformidade, cláusulas abusivas, riscos.',
   'Análise, relatório, orientação',
   'Redação de novo contrato, representação processual',
   3, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   NULL, NULL,
   'Contrato original, PCB, documento de identidade',
   '1. Análise do contrato; 2. Identificação de riscos; 3. Relatório orientativo',
   10, 'dias', 'rascunho', 5, true, NULL),

  -- 6. Divórcio Consensual
  (NULL, 'Divórcio Consensual', 'divorcio-consensual', 'familia', 'servico',
   'Processo de divórcio consensual',
   'Acompanhamento de divórcio consensual.',
   'Redação de documento, assessoria jurídica, registro em cartório.',
   'Assessoria, documento, registro, orientação',
   'Negociação de bens, guarda',
   30, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas cartorárias, chaves da casa',
   'Investigação, análise de patrimônio',
   'RAP, certidão de casamento, documento de identidade',
   '1. Levantamento de bens; 2. Redação do documento; 3. Registro em cartório; 4. Orientação',
   30, 'dias', 'rascunho', 6, true, NULL),

  -- 7. Inventário
  (NULL, 'Inventário', 'inventario', 'familia', 'servico',
   'Processo de inventário judicial ou extrajudicial',
   'Acompanhamento de inventário com atendimento personalizado.',
   'Levantamento de bens, cálculos, documentação, registro.',
   'Assessoria, documentação, registro, orientação',
   'Ação judicial',
   60, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas cartorárias, perícias',
   'Investigação de titularidade',
   'Certidão de óbito, certidão de casamento, documentos de bens',
   '1. Levantamento de bens; 2. Redação de inventário; 3. Registro em cartório; 4. Acompanhamento',
   60, 'dias', 'rascunho', 7, true, NULL),

  -- 8. Reclamação Trabalhista
  (NULL, 'Reclamação Trabalhista', 'reclamacao-trabalhista', 'trabalhista', 'servico',
   'Elaboração e protocolo de reclamação trabalhista',
   'Acompanhamento de reclamação trabalhista com foco em justiça.',
   'Elaboração da petição, protocolo, audiência, recurso.',
   'Elaboração, protocolo, audiência, recurso',
   'Negociação extrajudicial, conciliação',
   90, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas processuais, custas de perito',
   'Custas de viagem, demais despesas extra',
   'RAP, documento de identidade, carteira de trabalho, contratos',
   '1. Levantamento de informações; 2. Elaboração da reclamação; 3. Protocolo; 4. Audiência; 5. Recurso',
   90, 'dias', 'rascunho', 8, true, NULL),

  -- 9. Defesa Trabalhista
  (NULL, 'Defesa Trabalhista', 'defesa-trabalhista', 'trabalhista', 'servico',
   'Elaboração de defesa em reclamação trabalhista',
   'Acompanhamento de defesa trabalhista.',
   'Elaboração de defesa, audiência, recurso, recurso.',
   'Elaboração, audiência, recurso',
   'Ação trabalhista',
   90, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas processuais, perícias',
   'Custas de viagem, custas adicionais',
   'Documentos de identidade, RAP, documentos do caso',
   '1. Análise da reclamação; 2. Elaboração da defesa; 3. Audiência; 4. Recurso',
   90, 'dias', 'rascunho', 9, true, NULL),

  -- 10. Requerimento Previdenciário
  (NULL, 'Requerimento Previdenciário', 'requerimento-previdenciario', 'previdenciario', 'servico',
   'Elaboração e protocolo de requerimento previdenciário',
   'Acompanhamento de requerimento previdenciário.',
   'Elaboração, protocolo, recurso, follow-up.',
   'Elaboração, protocolo, recurso, rapp',
   'Ação judicial',
   30, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas cartorárias, custas de perito',
   'Investigação complementar',
   'RAP, documento de identidade, CPF, documentos médicos',
   '1. Levantamento de informações; 2. Elaboração do requerimento; 3. Protocolo; 4. Recurso',
   30, 'dias', 'rascunho', 10, true, NULL),

  -- 11. Recurso Administrativo
  (NULL, 'Recurso Administrativo', 'recurso-administrativo', 'administrativo', 'servico',
   'Elaboração de recurso administrativo',
   'Análise e protocolo de recurso administrativo.',
   'Verificar fundamentação, elaboração de recurso, protocolo, acompanhamento.',
   'Elaboração, protocolo, acompanhamento',
   'Ação judicial',
   30, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas de protocolo, custas de certidão',
   'Investigação complementar',
   'Documento de identidade, protocolo anterior, documentos do caso',
   '1. Análise do ato; 2. Elaboração do recurso; 3. Protocolo; 4. Acompanhamento',
   30, 'dias', 'rascunho', 11, true, NULL),

  -- 12. Ação de Consumidor
  (NULL, 'Ação de Consumidor', 'acao-consumidor', 'consumidor', 'servico',
   'Elaboração e protocolo de ação de consumidor',
   'Acompanhamento de ação de consumidor.',
   'Elaboração da petição, protocolo, audiência, recurso.',
   'Elaboração, protocolo, audiência, recurso',
   'Ação trabalhista',
   90, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas processuais, perícias',
   'Investigação, custas intermediárias',
   'Documentos de identidade, CPF, notificações, contrato',
   '1. Levantamento de informações; 2. Elaboração da petição; 3. Protocolo; 4. Audiência; 5. Recurso',
   90, 'dias', 'rascunho', 12, true, NULL),

  -- 13. Acompanhamento Processual
  (NULL, 'Acompanhamento Processual', 'acompanhamento-processual', 'civel', 'servico',
   'Monitoramento e acompanhamento de processo judicial',
   'Acompanhamento de processo judicial em andamento.',
   'Verificar andamento, prazos, movimentações, jurisprudência.',
   'Monitoramento, relatório, alertas',
   'Recurso, ação, consulta, construção',
   NULL, NULL, NULL, NULL, NULL,
   'mensalidade', NULL, NULL,
   NULL, NULL,
   'Nº do processo, documento de identidade',
   '1. Consulta ao processo; 2. Relatório; 3. Alertas de praze',
   NULL, NULL, 'rascunho', 13, true, NULL),

  -- 14. Assessoria Mensal
  (NULL, 'Assessoria Mensal', 'assessoria-mensal', 'empresarial', 'servico',
   'Assessoria jurídica contínua para empresas',
   'Acompanhamento emprestado de assessoria mensal.',
   'Consultoria jurídica contínua, revisão de contratos, orientação.',
   'Consultoria, revisão, orientação, reunião',
   'Ação judicial, contrato',
   NULL, NULL, NULL, NULL, NULL,
   'mensalidade', NULL, NULL,
   NULL, NULL,
   'Documentos da empresa, contrato de assessoria',
   '1. Reunião mensal; 2. Revisão de contratos; 3. Orientação; 4. Relatório',
   NULL, NULL, 'rascunho', 14, true, NULL)
ON CONFLICT DO NOTHING;

COMMIT;