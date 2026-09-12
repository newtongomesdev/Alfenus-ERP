-- ============================================================
-- MIGRATION 0049 — PRICING IDEMPOTENCY (Idempotência do Simulador)
-- ETAPA 5.2.2.2 — Simulador de Honorários
-- ============================================================
-- Adiciona tabela de operações idempotentes para o simulador
-- de honorários, evitando duplicação de criação de versões.
-- Inclui RPC create_pricing_scenario_version_idempotent e
-- função de limpeza de operações expiradas.
-- ============================================================

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================

-- Status da operação idempotente
CREATE TYPE public.pricing_idempotency_status AS ENUM (
  'processing',
  'completed',
  'failed'
);

-- ============================================================
-- TABELA: pricing_idempotency_operations
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_idempotency_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  pricing_scenario_id UUID NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,

  -- Identificação da operação
  operation_type TEXT NOT NULL
    CHECK (char_length(operation_type) >= 1 AND char_length(operation_type) <= 100),
  idempotency_key TEXT NOT NULL
    CHECK (char_length(idempotency_key) >= 1 AND char_length(idempotency_key) <= 256),
  input_hash TEXT NOT NULL
    CHECK (char_length(input_hash) >= 1),

  -- Estado
  status public.pricing_idempotency_status NOT NULL DEFAULT 'processing',
  result_version_id UUID REFERENCES public.pricing_scenario_versions(id) ON DELETE SET NULL,
  safe_error_code TEXT
    CHECK (char_length(safe_error_code) <= 256),

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- ============================================================
-- ÍNDICES
-- ============================================================

-- Unicidade por combinação de tenant + ator + cenário + tipo + chave
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_operations_unique
  ON public.pricing_idempotency_operations
  (law_firm_id, actor_id, pricing_scenario_id, operation_type, idempotency_key);

-- Consultas frequentes
CREATE INDEX IF NOT EXISTS idx_idempotency_law_firm
  ON public.pricing_idempotency_operations (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_idempotency_scenario
  ON public.pricing_idempotency_operations (pricing_scenario_id);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires
  ON public.pricing_idempotency_operations (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_status
  ON public.pricing_idempotency_operations (status);

CREATE INDEX IF NOT EXISTS idx_idempotency_version_id
  ON public.pricing_idempotency_operations (result_version_id);

-- ============================================================
-- RLS: pricing_idempotency_operations
-- ============================================================

ALTER TABLE public.pricing_idempotency_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_idempotency_select" ON public.pricing_idempotency_operations;
CREATE POLICY "pricing_idempotency_select" ON public.pricing_idempotency_operations
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_idempotency_insert" ON public.pricing_idempotency_operations;
CREATE POLICY "pricing_idempotency_insert" ON public.pricing_idempotency_operations
  FOR INSERT
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND actor_id = public.get_current_member_id()
  );

DROP POLICY IF EXISTS "pricing_idempotency_update" ON public.pricing_idempotency_operations;
CREATE POLICY "pricing_idempotency_update" ON public.pricing_idempotency_operations
  FOR UPDATE
  USING (has_law_firm_access(law_firm_id))
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_idempotency_delete" ON public.pricing_idempotency_operations;
CREATE POLICY "pricing_idempotency_delete" ON public.pricing_idempotency_operations
  FOR DELETE
  USING (false); -- Bloquear exclusão manual

-- ============================================================
-- FUNÇÃO: create_pricing_scenario_version_idempotent (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pricing_scenario_version_idempotent(
  p_scenario_id UUID,
  p_parameters JSONB,
  p_calculation_result JSONB,
  p_calculation_memory JSONB,
  p_idempotency_key TEXT,
  p_input_hash TEXT,
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
  p_activate BOOLEAN DEFAULT false,
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_member_role public.member_role;
  v_scenario RECORD;
  v_next_version INTEGER;
  v_new_version_id UUID;
  v_existing RECORD;
BEGIN
  -- 1. Resolver membro atual
  SELECT m.id, m.law_firm_id, m.role
  INTO v_member_id, v_law_firm_id, v_member_role
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar permissão por role
  IF v_member_role NOT IN ('proprietario', 'administrador', 'advogado') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Sem permissão para criar versão de cenário'
    );
  END IF;

  -- 3. Validar que o cenário pertence ao tenant
  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id
  FOR UPDATE;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário não encontrado');
  END IF;

  -- 4. Validar que cenário não está arquivado
  IF v_scenario.status = 'archived' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Não é possível criar versão de cenário arquivado'
    );
  END IF;

  -- 5. Validar optimistic locking
  IF p_expected_updated_at IS NOT NULL THEN
    IF v_scenario.updated_at != p_expected_updated_at THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Conflito de concorrência. Recarregue o cenário e tente novamente.'
      );
    END IF;
  END IF;

  -- 6. Verificar idempotência: buscar operação existente
  SELECT * INTO v_existing
  FROM public.pricing_idempotency_operations
  WHERE law_firm_id = v_law_firm_id
    AND actor_id = v_member_id
    AND pricing_scenario_id = p_scenario_id
    AND operation_type = 'create_version'
    AND idempotency_key = p_idempotency_key;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'completed' THEN
      -- Operação já concluída: retornar versão existente
      RETURN jsonb_build_object(
        'ok', true,
        'version_id', v_existing.result_version_id,
        'idempotent', true,
        'message', 'Operação já processada anteriormente'
      );
    ELSIF v_existing.status = 'processing' THEN
      -- Operação em andamento: rejeitar duplicata
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Operação em processamento. Aguarde a conclusão.'
      );
    ELSIF v_existing.status = 'failed' THEN
      -- Operação falhou: permitir retry — remover registro antigo
      DELETE FROM public.pricing_idempotency_operations
      WHERE id = v_existing.id;
    END IF;
  END IF;

  -- 7. Registrar operação idempotente como 'processing'
  INSERT INTO public.pricing_idempotency_operations (
    law_firm_id, actor_id, pricing_scenario_id,
    operation_type, idempotency_key, input_hash, status
  ) VALUES (
    v_law_firm_id, v_member_id, p_scenario_id,
    'create_version', p_idempotency_key, p_input_hash, 'processing'
  );

  -- 8. Calcular próximo version_number (com lock)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.pricing_scenario_versions
  WHERE pricing_scenario_id = p_scenario_id;

  -- 9. Criar versão
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

  -- 10. Registrar evento de criação
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id, version_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, p_scenario_id, v_new_version_id,
    'version_created', v_member_id,
    jsonb_build_object(
      'version_number', v_next_version,
      'scenario_type', p_scenario_type,
      'idempotency_key', p_idempotency_key
    )
  );

  -- 11. Ativar se solicitado
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

  -- 12. Atualizar status do cenário para saved
  UPDATE public.pricing_scenarios
  SET status = 'saved'
  WHERE id = p_scenario_id
    AND law_firm_id = v_law_firm_id
    AND status = 'draft';

  -- 13. Marcar operação idempotente como concluída
  UPDATE public.pricing_idempotency_operations
  SET status = 'completed',
      result_version_id = v_new_version_id,
      completed_at = now()
  WHERE law_firm_id = v_law_firm_id
    AND actor_id = v_member_id
    AND pricing_scenario_id = p_scenario_id
    AND operation_type = 'create_version'
    AND idempotency_key = p_idempotency_key
    AND status = 'processing';

  RETURN jsonb_build_object(
    'ok', true,
    'version_id', v_new_version_id,
    'version_number', v_next_version,
    'activated', p_activate,
    'idempotent', false
  );

EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, marcar operação como falha
  UPDATE public.pricing_idempotency_operations
  SET status = 'failed',
      safe_error_code = SQLSTATE,
      completed_at = now()
  WHERE law_firm_id = v_law_firm_id
    AND actor_id = v_member_id
    AND pricing_scenario_id = p_scenario_id
    AND operation_type = 'create_version'
    AND idempotency_key = p_idempotency_key
    AND status = 'processing';

  RETURN jsonb_build_object(
    'ok', false,
    'error', 'Erro interno ao criar versão',
    'safe_error_code', SQLSTATE
  );
END;
$$;

-- ============================================================
-- FUNÇÃO: cleanup_expired_idempotency_operations
-- ============================================================
-- Remove operações idempotentes expiradas (> 24h + 1h de margem).
-- Executar periodicamente via pg_cron ou semelhante.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_operations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.pricing_idempotency_operations
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;

COMMIT;
