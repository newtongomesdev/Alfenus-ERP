-- ============================================================
-- MIGRATION 0053 - HARDEN PRICING PERMISSIONS
-- ETAPA 5.2.2.6.5
--
-- Defesa em profundidade para o simulador de precificacao.
-- Nao altera dados existentes e nao depende do frontend.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- Autorizacao centralizada
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_current_pricing_member(p_law_firm_id uuid DEFAULT NULL)
RETURNS TABLE(member_id uuid, law_firm_id uuid, member_role public.member_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.law_firm_id, m.role
  FROM public.law_firm_members AS m
  WHERE m.user_id = auth.uid()
    AND m.status = 'ativo'
    AND (p_law_firm_id IS NULL OR m.law_firm_id = p_law_firm_id)
  ORDER BY m.created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_assisted_support_session(p_law_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.support_access_sessions AS s
    JOIN public.law_firm_members AS m ON m.id = s.operator_id
    WHERE s.law_firm_id = p_law_firm_id
      AND m.user_id = auth.uid()
      AND m.status = 'ativo'
      AND s.status IN ('ativa', 'aguardando_inicio')
      AND s.expires_at > now()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_read_pricing(p_law_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_pricing_member(p_law_firm_id) AS m
    WHERE m.member_role IN (
      'proprietario', 'administrador', 'advogado', 'assistente', 'colaborador', 'visualizador'
    )
    AND (
      NOT public.is_active_assisted_support_session(p_law_firm_id)
      OR EXISTS (
        SELECT 1
        FROM public.support_access_sessions AS s
        JOIN public.law_firm_members AS operator_member ON operator_member.id = s.operator_id
        JOIN public.support_access_requests AS r ON r.id = s.access_request_id
        WHERE s.law_firm_id = p_law_firm_id
          AND operator_member.user_id = auth.uid()
          AND s.status IN ('ativa', 'aguardando_inicio')
          AND s.expires_at > now()
          AND EXISTS (
            SELECT 1
            FROM public.support_access_request_scopes AS scope
            WHERE scope.request_id = r.id
              AND scope.module = 'pricing'
              AND scope.approved = true
              AND 'visualizar' = ANY(COALESCE(scope.actions, ARRAY[]::text[]))
          )
      )
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_write_pricing(p_law_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_pricing_member(p_law_firm_id) AS m
    WHERE m.member_role IN ('proprietario', 'administrador', 'advogado')
      AND NOT public.is_active_assisted_support_session(p_law_firm_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_pricing_costs(p_law_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_pricing_member(p_law_firm_id) AS m
    WHERE m.member_role IN ('proprietario', 'administrador', 'advogado')
      AND NOT public.is_active_assisted_support_session(p_law_firm_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_pricing_margin(p_law_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_current_pricing_member(p_law_firm_id) AS m
    WHERE m.member_role IN ('proprietario', 'administrador')
      AND NOT public.is_active_assisted_support_session(p_law_firm_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_pricing_memory(p_law_firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_view_pricing_margin(p_law_firm_id);
$$;

REVOKE EXECUTE ON FUNCTION public.get_current_pricing_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_active_assisted_support_session(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_read_pricing(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_write_pricing(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_pricing_costs(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_pricing_margin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_pricing_memory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_pricing_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_assisted_support_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_pricing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_write_pricing(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_pricing_costs(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_pricing_margin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_pricing_memory(uuid) TO authenticated;

-- ------------------------------------------------------------
-- Policies de linha
-- ------------------------------------------------------------

ALTER TABLE public.pricing_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_scenario_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_scenario_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_scenario_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_idempotency_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_scenarios_select" ON public.pricing_scenarios;
DROP POLICY IF EXISTS "pricing_scenarios_insert" ON public.pricing_scenarios;
DROP POLICY IF EXISTS "pricing_scenarios_update" ON public.pricing_scenarios;
DROP POLICY IF EXISTS "pricing_scenarios_select_hardened" ON public.pricing_scenarios;
DROP POLICY IF EXISTS "pricing_scenarios_insert_hardened" ON public.pricing_scenarios;
DROP POLICY IF EXISTS "pricing_scenarios_update_hardened" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_select_hardened" ON public.pricing_scenarios
  FOR SELECT TO authenticated USING (public.can_read_pricing(law_firm_id));
CREATE POLICY "pricing_scenarios_insert_hardened" ON public.pricing_scenarios
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_pricing(law_firm_id)
    AND created_by = (SELECT member_id FROM public.get_current_pricing_member(law_firm_id))
  );
CREATE POLICY "pricing_scenarios_update_hardened" ON public.pricing_scenarios
  FOR UPDATE TO authenticated
  USING (public.can_write_pricing(law_firm_id))
  WITH CHECK (public.can_write_pricing(law_firm_id));

DROP POLICY IF EXISTS "pricing_versions_select" ON public.pricing_scenario_versions;
DROP POLICY IF EXISTS "pricing_versions_insert" ON public.pricing_scenario_versions;
DROP POLICY IF EXISTS "pricing_versions_select_hardened" ON public.pricing_scenario_versions;
DROP POLICY IF EXISTS "pricing_versions_insert_hardened" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_select_hardened" ON public.pricing_scenario_versions
  FOR SELECT TO authenticated USING (public.can_read_pricing(law_firm_id));
CREATE POLICY "pricing_versions_insert_hardened" ON public.pricing_scenario_versions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_pricing(law_firm_id)
    AND created_by = (SELECT member_id FROM public.get_current_pricing_member(law_firm_id))
  );

DROP POLICY IF EXISTS "pricing_items_select" ON public.pricing_scenario_items;
DROP POLICY IF EXISTS "pricing_items_insert" ON public.pricing_scenario_items;
DROP POLICY IF EXISTS "pricing_items_select_hardened" ON public.pricing_scenario_items;
DROP POLICY IF EXISTS "pricing_items_insert_hardened" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_select_hardened" ON public.pricing_scenario_items
  FOR SELECT TO authenticated USING (public.can_read_pricing(law_firm_id));
CREATE POLICY "pricing_items_insert_hardened" ON public.pricing_scenario_items
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_pricing(law_firm_id));

DROP POLICY IF EXISTS "pricing_events_select" ON public.pricing_scenario_events;
DROP POLICY IF EXISTS "pricing_events_insert" ON public.pricing_scenario_events;
DROP POLICY IF EXISTS "pricing_events_select_hardened" ON public.pricing_scenario_events;
DROP POLICY IF EXISTS "pricing_events_insert_hardened" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_select_hardened" ON public.pricing_scenario_events
  FOR SELECT TO authenticated USING (public.can_read_pricing(law_firm_id));
CREATE POLICY "pricing_events_insert_hardened" ON public.pricing_scenario_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_write_pricing(law_firm_id)
    AND actor_id = (SELECT member_id FROM public.get_current_pricing_member(law_firm_id))
  );

DROP POLICY IF EXISTS "pricing_idempotency_insert" ON public.pricing_idempotency_operations;
DROP POLICY IF EXISTS "pricing_idempotency_select" ON public.pricing_idempotency_operations;
DROP POLICY IF EXISTS "pricing_idempotency_update" ON public.pricing_idempotency_operations;
DROP POLICY IF EXISTS "pricing_idempotency_insert_hardened" ON public.pricing_idempotency_operations;
DROP POLICY IF EXISTS "pricing_idempotency_select_hardened" ON public.pricing_idempotency_operations;
DROP POLICY IF EXISTS "pricing_idempotency_update_hardened" ON public.pricing_idempotency_operations;
CREATE POLICY "pricing_idempotency_select_hardened" ON public.pricing_idempotency_operations
  FOR SELECT TO authenticated USING (public.can_write_pricing(law_firm_id));
CREATE POLICY "pricing_idempotency_insert_hardened" ON public.pricing_idempotency_operations
  FOR INSERT TO authenticated WITH CHECK (public.can_write_pricing(law_firm_id));
CREATE POLICY "pricing_idempotency_update_hardened" ON public.pricing_idempotency_operations
  FOR UPDATE TO authenticated USING (public.can_write_pricing(law_firm_id))
  WITH CHECK (public.can_write_pricing(law_firm_id));

-- ------------------------------------------------------------
-- Triggers: SECURITY DEFINER nao pode contornar a politica de papel
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_pricing_write_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Server-side administrative jobs use the trusted service role.
  -- Authenticated end-user JWTs continue through the tenant/role checks.
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT public.can_write_pricing(COALESCE(NEW.law_firm_id, OLD.law_firm_id)) THEN
    RAISE EXCEPTION 'PRICING_PERMISSION_DENIED' USING ERRCODE = '42501';
  END IF;

  IF TG_TABLE_NAME = 'pricing_scenarios' AND TG_OP = 'UPDATE' THEN
    IF OLD.status = 'archived' AND NEW.active_version_id IS DISTINCT FROM OLD.active_version_id THEN
      RAISE EXCEPTION 'PRICING_SCENARIO_ARCHIVED' USING ERRCODE = '55000';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pricing_scenarios_write_guard ON public.pricing_scenarios;
CREATE TRIGGER pricing_scenarios_write_guard
  BEFORE INSERT OR UPDATE ON public.pricing_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_write_guard();
DROP TRIGGER IF EXISTS pricing_versions_write_guard ON public.pricing_scenario_versions;
CREATE TRIGGER pricing_versions_write_guard
  BEFORE INSERT ON public.pricing_scenario_versions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_write_guard();
DROP TRIGGER IF EXISTS pricing_items_write_guard ON public.pricing_scenario_items;
CREATE TRIGGER pricing_items_write_guard
  BEFORE INSERT ON public.pricing_scenario_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_write_guard();
DROP TRIGGER IF EXISTS pricing_events_write_guard ON public.pricing_scenario_events;
CREATE TRIGGER pricing_events_write_guard
  BEFORE INSERT ON public.pricing_scenario_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_write_guard();
DROP TRIGGER IF EXISTS pricing_idempotency_write_guard ON public.pricing_idempotency_operations;
CREATE TRIGGER pricing_idempotency_write_guard
  BEFORE INSERT OR UPDATE ON public.pricing_idempotency_operations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_write_guard();

-- ------------------------------------------------------------
-- Views seguras para a Data API
-- ------------------------------------------------------------

DROP VIEW IF EXISTS public.pricing_scenario_versions_secure;
CREATE VIEW public.pricing_scenario_versions_secure
WITH (security_barrier = true)
AS
SELECT
  id, law_firm_id, pricing_scenario_id, version_number, scenario_type,
  currency, total_amount_cents, entry_amount_cents, financed_amount_cents,
  installment_count, success_fee_percentage_bps, estimated_success_fee_cents,
  monthly_fee_cents, monthly_fee_count, created_by, created_at
FROM public.pricing_scenario_versions
WHERE public.can_read_pricing(law_firm_id);

DROP VIEW IF EXISTS public.pricing_scenario_versions_internal;
CREATE VIEW public.pricing_scenario_versions_internal
WITH (security_barrier = true)
AS
SELECT
  id, law_firm_id, pricing_scenario_id, version_number, scenario_type,
  parameters,
  CASE WHEN public.can_view_pricing_margin(law_firm_id)
    THEN calculation_result
    ELSE calculation_result - 'margin' - 'marginBps' - 'marginAmount' - 'marginBase'
  END AS calculation_result,
  CASE WHEN public.can_view_pricing_memory(law_firm_id)
    THEN calculation_memory ELSE NULL::jsonb END AS calculation_memory,
  currency, total_amount_cents, entry_amount_cents, financed_amount_cents,
  installment_count, success_fee_percentage_bps, success_fee_base_cents,
  estimated_success_fee_cents, monthly_fee_cents, monthly_fee_count,
  created_by, created_at
FROM public.pricing_scenario_versions
WHERE public.can_view_pricing_costs(law_firm_id);

DROP VIEW IF EXISTS public.pricing_scenario_items_secure;
CREATE VIEW public.pricing_scenario_items_secure
WITH (security_barrier = true)
AS
SELECT id, law_firm_id, scenario_version_id, item_type, description,
       quantity, unit_amount_cents, total_amount_cents, order_index,
       metadata, created_at
FROM public.pricing_scenario_items
WHERE public.can_view_pricing_costs(law_firm_id);

DROP VIEW IF EXISTS public.pricing_scenario_events_secure;
CREATE VIEW public.pricing_scenario_events_secure
WITH (security_barrier = true)
AS
SELECT id, law_firm_id, pricing_scenario_id, version_id, event_type,
       actor_id, created_at,
       CASE WHEN public.can_view_pricing_costs(law_firm_id)
         THEN safe_metadata ELSE '{}'::jsonb END AS safe_metadata
FROM public.pricing_scenario_events
WHERE public.can_read_pricing(law_firm_id);

REVOKE SELECT ON public.pricing_scenario_versions FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.pricing_scenario_items FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON public.pricing_scenario_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.pricing_scenario_versions_secure TO authenticated;
GRANT SELECT ON public.pricing_scenario_versions_internal TO authenticated;
GRANT SELECT ON public.pricing_scenario_items_secure TO authenticated;
GRANT SELECT ON public.pricing_scenario_events_secure TO authenticated;

-- ------------------------------------------------------------
-- RPCs mutaveis: somente autenticados e sujeitos aos guards acima
-- ------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.set_active_pricing_version(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.duplicate_pricing_scenario(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_pricing_scenario_version(uuid, jsonb, jsonb, jsonb, public.pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_pricing_scenario_version_idempotent(uuid, jsonb, jsonb, jsonb, text, text, public.pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean, timestamptz, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_active_pricing_version(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_pricing_scenario(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pricing_scenario_version(uuid, jsonb, jsonb, jsonb, public.pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_pricing_scenario_version_idempotent(uuid, jsonb, jsonb, jsonb, text, text, public.pricing_scenario_type, text, bigint, bigint, bigint, integer, integer, bigint, bigint, bigint, integer, boolean, timestamptz, jsonb) TO authenticated;

COMMIT;
