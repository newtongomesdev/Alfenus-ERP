-- ============================================================
-- MIGRATION 0048 — PRICING SCENARIOS (Cenários de Precificação)
-- ETAPA 5.2.2.2 — Simulador de Honorários
-- ============================================================
-- Cria estrutura completa do simulador de honorários:
-- enums, tabelas, constraints, índices, RLS, funções RPC.
-- ============================================================

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================

-- Status do cenário
CREATE TYPE public.pricing_scenario_status AS ENUM (
  'draft',
  'saved',
  'archived',
  'converted_to_proposal'
);

-- Tipo do cenário
CREATE TYPE public.pricing_scenario_type AS ENUM (
  'conservative',
  'main',
  'expanded',
  'custom'
);

-- Tipo de item de composição
CREATE TYPE public.pricing_item_type AS ENUM (
  'work_hours',
  'direct_expense',
  'indirect_expense',
  'third_party_cost',
  'travel',
  'hearing',
  'activity',
  'fee',
  'tax',
  'adjustment',
  'discount',
  'other'
);

-- Tipo de evento de auditoria
CREATE TYPE public.pricing_event_type AS ENUM (
  'scenario_created',
  'scenario_updated',
  'scenario_duplicated',
  'scenario_archived',
  'scenario_restored',
  'version_created',
  'version_activated',
  'comparison_generated',
  'memory_viewed',
  'memory_printed',
  'memory_exported',
  'conversion_started',
  'conversion_completed',
  'conversion_failed'
);

-- ============================================================
-- TABELA: pricing_scenarios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,

  -- Identificação
  name TEXT NOT NULL,
  description TEXT,

  -- Status
  status public.pricing_scenario_status NOT NULL DEFAULT 'draft',

  -- Referências opcionais
  service_id UUID,
  lead_id UUID,
  client_id UUID,

  -- Versão ativa
  active_version_id UUID,

  -- Conversão (futuro)
  converted_proposal_id UUID,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT pricing_scenarios_name_check
    CHECK (char_length(name) >= 1 AND char_length(name) <= 500),
  CONSTRAINT pricing_scenarios_archived_status_check
    CHECK (
      (archived_at IS NULL AND status != 'archived')
      OR (archived_at IS NOT NULL AND status = 'archived')
    )
);

-- ============================================================
-- TABELA: pricing_scenario_versions (imutável)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenario_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  pricing_scenario_id UUID NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,

  -- Versão
  version_number INTEGER NOT NULL,
  scenario_type public.pricing_scenario_type NOT NULL DEFAULT 'main',

  -- Parâmetros e resultado (JSON)
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_memory JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Valores financeiros (centavos)
  currency TEXT NOT NULL DEFAULT 'BRL',
  total_amount_cents BIGINT NOT NULL DEFAULT 0,
  entry_amount_cents BIGINT NOT NULL DEFAULT 0,
  financed_amount_cents BIGINT NOT NULL DEFAULT 0,
  installment_count INTEGER NOT NULL DEFAULT 0,

  -- Êxito
  success_fee_percentage_bps INTEGER NOT NULL DEFAULT 0,
  success_fee_base_cents BIGINT,
  estimated_success_fee_cents BIGINT,

  -- Mensalidade
  monthly_fee_cents BIGINT,
  monthly_fee_count INTEGER,

  -- Auditoria (somente criação, sem updated_at)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pricing_scenario_versions_unique_number
    UNIQUE (pricing_scenario_id, version_number),
  CONSTRAINT pricing_scenario_versions_version_check
    CHECK (version_number > 0),
  CONSTRAINT pricing_scenario_versions_total_check
    CHECK (total_amount_cents >= 0),
  CONSTRAINT pricing_scenario_versions_entry_check
    CHECK (entry_amount_cents >= 0),
  CONSTRAINT pricing_scenario_versions_financed_check
    CHECK (financed_amount_cents >= 0),
  CONSTRAINT pricing_scenario_versions_entry_total_check
    CHECK (entry_amount_cents <= total_amount_cents),
  CONSTRAINT pricing_scenario_versions_installment_check
    CHECK (installment_count >= 0),
  CONSTRAINT pricing_scenario_versions_bps_check
    CHECK (success_fee_percentage_bps >= 0 AND success_fee_percentage_bps <= 10000),
  CONSTRAINT pricing_scenario_versions_monthly_fee_check
    CHECK (monthly_fee_cents IS NULL OR monthly_fee_cents >= 0),
  CONSTRAINT pricing_scenario_versions_monthly_count_check
    CHECK (monthly_fee_count IS NULL OR monthly_fee_count >= 0)
);

-- ============================================================
-- TABELA: pricing_scenario_items (imutável)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenario_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  scenario_version_id UUID NOT NULL REFERENCES public.pricing_scenario_versions(id) ON DELETE CASCADE,

  -- Identificação
  item_type public.pricing_item_type NOT NULL,
  description TEXT NOT NULL,

  -- Valores
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_amount_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL DEFAULT 0,

  -- Ordenação
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Metadados adicionais
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pricing_scenario_items_quantity_check
    CHECK (quantity >= 0),
  CONSTRAINT pricing_scenario_items_unit_check
    CHECK (unit_amount_cents >= 0),
  CONSTRAINT pricing_scenario_items_total_check
    CHECK (total_amount_cents >= 0),
  CONSTRAINT pricing_scenario_items_order_check
    CHECK (order_index >= 0)
);

-- ============================================================
-- TABELA: pricing_scenario_events (append-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenario_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  pricing_scenario_id UUID NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  version_id UUID,

  -- Evento
  event_type public.pricing_event_type NOT NULL,
  actor_id UUID NOT NULL,

  -- Metadados seguros (sem dados sensíveis)
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at automático em pricing_scenarios
CREATE OR REPLACE FUNCTION public.set_pricing_scenarios_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pricing_scenarios_updated_at ON public.pricing_scenarios;
CREATE TRIGGER trigger_pricing_scenarios_updated_at
  BEFORE UPDATE ON public.pricing_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pricing_scenarios_updated_at();

-- ============================================================
-- FUNÇÃO: Resolver membro atual (reutiliza padrão existente)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid()
    AND m.status = 'ativo'
  LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO: set_active_pricing_version (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_active_pricing_version(
  p_scenario_id UUID,
  p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_scenario RECORD;
  v_version RECORD;
BEGIN
  -- 1. Resolver membro
  SELECT m.id, m.law_firm_id INTO v_member_id, v_law_firm_id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar cenário
  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário não encontrado');
  END IF;

  -- 3. Validar versão
  SELECT * INTO v_version
  FROM public.pricing_scenario_versions
  WHERE id = p_version_id
    AND pricing_scenario_id = p_scenario_id
    AND law_firm_id = v_law_firm_id;

  IF v_version IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Versão não encontrada ou pertence a outro cenário');
  END IF;

  -- 4. Atualizar active_version_id
  UPDATE public.pricing_scenarios
  SET active_version_id = p_version_id
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

  -- 5. Registrar evento
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id, version_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, p_scenario_id, p_version_id,
    'version_activated', v_member_id,
    jsonb_build_object('version_number', v_version.version_number)
  );

  RETURN jsonb_build_object('ok', true, 'version_number', v_version.version_number);
END;
$$;

-- ============================================================
-- FUNÇÃO: create_pricing_scenario_version (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pricing_scenario_version(
  p_scenario_id UUID,
  p_parameters JSONB,
  p_calculation_result JSONB,
  p_calculation_memory JSONB,
  p_scenario_type public.pricing_scenario_type DEFAULT 'main',
  p_currency TEXT DEFAULT 'BRL',
  p_total_amount_cents BIGINT DEFAULT 0,
  p_entry_amount_cents BIGINT DEFAULT 0,
  p_financed_amount_cents BIGINT DEFAULT 0,
  p_installment_count INTEGER DEFAULT 0,
  p_success_fee_percentage_bps INTEGER DEFAULT 0,
  p_success_fee_base_cents BIGINT DEFAULT NULL,
  p_estimated_success_fee_cents BIGINT DEFAULT NULL,
  p_monthly_fee_cents BIGINT DEFAULT NULL,
  p_monthly_fee_count INTEGER DEFAULT NULL,
  p_activate BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_scenario RECORD;
  v_next_version INTEGER;
  v_new_version_id UUID;
BEGIN
  -- 1. Resolver membro
  SELECT m.id, m.law_firm_id INTO v_member_id, v_law_firm_id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar cenário (lock para concorrência)
  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id
  FOR UPDATE;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário não encontrado');
  END IF;

  IF v_scenario.status = 'archived' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não é possível criar versão de cenário arquivado');
  END IF;

  -- 3. Calcular próximo version_number (concorrência segura com FOR UPDATE)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.pricing_scenario_versions
  WHERE pricing_scenario_id = p_scenario_id;

  -- 4. Inserir versão
  INSERT INTO public.pricing_scenario_versions (
    law_firm_id, pricing_scenario_id, created_by,
    version_number, scenario_type,
    parameters, calculation_result, calculation_memory,
    currency, total_amount_cents, entry_amount_cents,
    financed_amount_cents, installment_count,
    success_fee_percentage_bps, success_fee_base_cents,
    estimated_success_fee_cents,
    monthly_fee_cents, monthly_fee_count
  ) VALUES (
    v_law_firm_id, p_scenario_id, v_member_id,
    v_next_version, p_scenario_type,
    p_parameters, p_calculation_result, p_calculation_memory,
    p_currency, p_total_amount_cents, p_entry_amount_cents,
    p_financed_amount_cents, p_installment_count,
    p_success_fee_percentage_bps, p_success_fee_base_cents,
    p_estimated_success_fee_cents,
    p_monthly_fee_cents, p_monthly_fee_count
  ) RETURNING id INTO v_new_version_id;

  -- 5. Registrar evento
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id, version_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, p_scenario_id, v_new_version_id,
    'version_created', v_member_id,
    jsonb_build_object('version_number', v_next_version, 'scenario_type', p_scenario_type)
  );

  -- 6. Ativar se solicitado
  IF p_activate THEN
    UPDATE public.pricing_scenarios
    SET active_version_id = v_new_version_id
    WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

    INSERT INTO public.pricing_scenario_events (
      law_firm_id, pricing_scenario_id, version_id,
      event_type, actor_id, safe_metadata
    ) VALUES (
      v_law_firm_id, p_scenario_id, v_new_version_id,
      'version_activated', v_member_id,
      jsonb_build_object('version_number', v_next_version)
    );
  END IF;

  -- 7. Atualizar status para saved
  UPDATE public.pricing_scenarios
  SET status = 'saved'
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id AND status = 'draft';

  RETURN jsonb_build_object(
    'ok', true,
    'version_id', v_new_version_id,
    'version_number', v_next_version,
    'activated', p_activate
  );
END;
$$;

-- ============================================================
-- FUNÇÃO: duplicate_pricing_scenario (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.duplicate_pricing_scenario(
  p_source_scenario_id UUID,
  p_new_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_source RECORD;
  v_new_scenario_id UUID;
  v_new_name TEXT;
  v_active_version RECORD;
BEGIN
  -- 1. Resolver membro
  SELECT m.id, m.law_firm_id INTO v_member_id, v_law_firm_id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar cenário origem
  SELECT * INTO v_source
  FROM public.pricing_scenarios
  WHERE id = p_source_scenario_id AND law_firm_id = v_law_firm_id;

  IF v_source IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário origem não encontrado');
  END IF;

  -- 3. Definir nome
  v_new_name := COALESCE(p_new_name, v_source.name || ' (Cópia)');

  -- 4. Criar novo cenário
  INSERT INTO public.pricing_scenarios (
    law_firm_id, created_by,
    name, description, status,
    service_id, lead_id, client_id
  ) VALUES (
    v_law_firm_id, v_member_id,
    v_new_name, v_source.description, 'draft',
    v_source.service_id, v_source.lead_id, v_source.client_id
  ) RETURNING id INTO v_new_scenario_id;

  -- 5. Copiar versão ativa (se existir)
  IF v_source.active_version_id IS NOT NULL THEN
    SELECT * INTO v_active_version
    FROM public.pricing_scenario_versions
    WHERE id = v_source.active_version_id;

    IF v_active_version IS NOT NULL THEN
      INSERT INTO public.pricing_scenario_versions (
        law_firm_id, pricing_scenario_id, created_by,
        version_number, scenario_type,
        parameters, calculation_result, calculation_memory,
        currency, total_amount_cents, entry_amount_cents,
        financed_amount_cents, installment_count,
        success_fee_percentage_bps, success_fee_base_cents,
        estimated_success_fee_cents,
        monthly_fee_cents, monthly_fee_count
      ) VALUES (
        v_law_firm_id, v_new_scenario_id, v_member_id,
        1, v_active_version.scenario_type,
        v_active_version.parameters, v_active_version.calculation_result,
        v_active_version.calculation_memory,
        v_active_version.currency, v_active_version.total_amount_cents,
        v_active_version.entry_amount_cents,
        v_active_version.financed_amount_cents, v_active_version.installment_count,
        v_active_version.success_fee_percentage_bps, v_active_version.success_fee_base_cents,
        v_active_version.estimated_success_fee_cents,
        v_active_version.monthly_fee_cents, v_active_version.monthly_fee_count
      );

      -- Copiar itens da versão
      INSERT INTO public.pricing_scenario_items (
        law_firm_id, scenario_version_id,
        item_type, description, quantity,
        unit_amount_cents, total_amount_cents,
        order_index, metadata
      )
      SELECT
        v_law_firm_id, (
          SELECT id FROM public.pricing_scenario_versions
          WHERE pricing_scenario_id = v_new_scenario_id
            AND version_number = 1
            AND law_firm_id = v_law_firm_id
        ),
        item_type, description, quantity,
        unit_amount_cents, total_amount_cents,
        order_index, metadata
      FROM public.pricing_scenario_items
      WHERE scenario_version_id = v_active_version.id;

      -- Ativar versão no novo cenário
      UPDATE public.pricing_scenarios
      SET active_version_id = (
        SELECT id FROM public.pricing_scenario_versions
        WHERE pricing_scenario_id = v_new_scenario_id
          AND version_number = 1
          AND law_firm_id = v_law_firm_id
      )
      WHERE id = v_new_scenario_id;
    END IF;
  END IF;

  -- 6. Registrar evento
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, v_new_scenario_id,
    'scenario_duplicated', v_member_id,
    jsonb_build_object('source_scenario_id', p_source_scenario_id)
  );

  RETURN jsonb_build_object('ok', true, 'scenario_id', v_new_scenario_id, 'name', v_new_name);
END;
$$;

-- ============================================================
-- FUNÇÃO: canUseServiceForPricing (validação de serviço)
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_use_service_for_pricing(
  p_service_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_catalog sc
    WHERE sc.id = p_service_id
      AND (
        -- Biblioteca da plataforma (somente leitura)
        (sc.is_platform_library = true AND sc.law_firm_id IS NULL)
        OR
        -- Serviço privado do próprio tenant
        (sc.law_firm_id = (
          SELECT m.law_firm_id
          FROM public.law_firm_members m
          WHERE m.user_id = auth.uid() AND m.status = 'ativo'
          LIMIT 1
        ))
      )
      AND sc.status != 'arquivado'
  );
$$;

-- ============================================================
-- ÍNDICES
-- ============================================================

-- pricing_scenarios
CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_law_firm
  ON public.pricing_scenarios (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_status
  ON public.pricing_scenarios (law_firm_id, status);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_created_at
  ON public.pricing_scenarios (law_firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_archived_at
  ON public.pricing_scenarios (law_firm_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_service
  ON public.pricing_scenarios (service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_lead
  ON public.pricing_scenarios (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_client
  ON public.pricing_scenarios (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_created_by
  ON public.pricing_scenarios (created_by);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_active_version
  ON public.pricing_scenarios (active_version_id)
  WHERE active_version_id IS NOT NULL;

-- Habilitar extensão para busca por texto (se necessário)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_name_search
  ON public.pricing_scenarios USING gin (name gin_trgm_ops);

-- pricing_scenario_versions
CREATE INDEX IF NOT EXISTS idx_pricing_versions_scenario
  ON public.pricing_scenario_versions (pricing_scenario_id);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_law_firm
  ON public.pricing_scenario_versions (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_scenario_number
  ON public.pricing_scenario_versions (pricing_scenario_id, version_number);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_type
  ON public.pricing_scenario_versions (scenario_type);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_created_at
  ON public.pricing_scenario_versions (created_at DESC);

-- pricing_scenario_items
CREATE INDEX IF NOT EXISTS idx_pricing_items_version
  ON public.pricing_scenario_items (scenario_version_id);

CREATE INDEX IF NOT EXISTS idx_pricing_items_law_firm
  ON public.pricing_scenario_items (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_items_type
  ON public.pricing_scenario_items (item_type);

CREATE INDEX IF NOT EXISTS idx_pricing_items_order
  ON public.pricing_scenario_items (scenario_version_id, order_index);

-- pricing_scenario_events
CREATE INDEX IF NOT EXISTS idx_pricing_events_scenario
  ON public.pricing_scenario_events (pricing_scenario_id);

CREATE INDEX IF NOT EXISTS idx_pricing_events_law_firm
  ON public.pricing_scenario_events (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_events_type
  ON public.pricing_scenario_events (event_type);

CREATE INDEX IF NOT EXISTS idx_pricing_events_created_at
  ON public.pricing_scenario_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_events_actor
  ON public.pricing_scenario_events (actor_id);

-- ============================================================
-- RLS: pricing_scenarios
-- ============================================================

ALTER TABLE public.pricing_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_scenarios_select" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_select" ON public.pricing_scenarios
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_scenarios_insert" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_insert" ON public.pricing_scenarios
  FOR INSERT
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND created_by = public.get_current_member_id()
  );

DROP POLICY IF EXISTS "pricing_scenarios_update" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_update" ON public.pricing_scenarios
  FOR UPDATE
  USING (has_law_firm_access(law_firm_id))
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND law_firm_id = law_firm_id
    AND created_by = created_by
  );

DROP POLICY IF EXISTS "pricing_scenarios_delete" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_delete" ON public.pricing_scenarios
  FOR DELETE
  USING (false); -- Bloquear exclusão física

-- ============================================================
-- RLS: pricing_scenario_versions (imutável)
-- ============================================================

ALTER TABLE public.pricing_scenario_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_versions_select" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_select" ON public.pricing_scenario_versions
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_versions_insert" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_insert" ON public.pricing_scenario_versions
  FOR INSERT
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_versions_update" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_update" ON public.pricing_scenario_versions
  FOR UPDATE
  USING (false); -- Imutável

DROP POLICY IF EXISTS "pricing_versions_delete" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_delete" ON public.pricing_scenario_versions
  FOR DELETE
  USING (false); -- Imutável

-- ============================================================
-- RLS: pricing_scenario_items (imutável)
-- ============================================================

ALTER TABLE public.pricing_scenario_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_items_select" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_select" ON public.pricing_scenario_items
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_items_insert" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_insert" ON public.pricing_scenario_items
  FOR INSERT
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_items_update" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_update" ON public.pricing_scenario_items
  FOR UPDATE
  USING (false); -- Imutável

DROP POLICY IF EXISTS "pricing_items_delete" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_delete" ON public.pricing_scenario_items
  FOR DELETE
  USING (false); -- Imutável

-- ============================================================
-- RLS: pricing_scenario_events (append-only)
-- ============================================================

ALTER TABLE public.pricing_scenario_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_events_select" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_select" ON public.pricing_scenario_events
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_events_insert" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_insert" ON public.pricing_scenario_events
  FOR INSERT
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_events_update" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_update" ON public.pricing_scenario_events
  FOR UPDATE
  USING (false); -- Append-only

DROP POLICY IF EXISTS "pricing_events_delete" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_delete" ON public.pricing_scenario_events
  FOR DELETE
  USING (false); -- Append-only

-- ============================================================
-- TRIGGER DE PROTEÇÃO: Versões imutáveis via trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_version_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Versões de cenário são imutáveis. Crie uma nova versão em vez de modificar a existente.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_version_update ON public.pricing_scenario_versions;
CREATE TRIGGER trigger_prevent_version_update
  BEFORE UPDATE ON public.pricing_scenario_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_version_modification();

DROP TRIGGER IF EXISTS trigger_prevent_version_delete ON public.pricing_scenario_versions;
CREATE TRIGGER trigger_prevent_version_delete
  BEFORE DELETE ON public.pricing_scenario_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_version_modification();

-- ============================================================
-- TRIGGER DE PROTEÇÃO: Itens imutáveis via trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_item_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Itens de versão são imutáveis. Crie uma nova versão em vez de modificar itens existentes.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_item_update ON public.pricing_scenario_items;
CREATE TRIGGER trigger_prevent_item_update
  BEFORE UPDATE ON public.pricing_scenario_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_item_modification();

DROP TRIGGER IF EXISTS trigger_prevent_item_delete ON public.pricing_scenario_items;
CREATE TRIGGER trigger_prevent_item_delete
  BEFORE DELETE ON public.pricing_scenario_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_item_modification();

-- ============================================================
-- TRIGGER DE PROTEÇÃO: Eventos append-only
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_event_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Eventos de auditoria são append-only e não podem ser modificados.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_event_update ON public.pricing_scenario_events;
CREATE TRIGGER trigger_prevent_event_update
  BEFORE UPDATE ON public.pricing_scenario_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_event_modification();

DROP TRIGGER IF EXISTS trigger_prevent_event_delete ON public.pricing_scenario_events;
CREATE TRIGGER trigger_prevent_event_delete
  BEFORE DELETE ON public.pricing_scenario_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_event_modification();

COMMIT;
