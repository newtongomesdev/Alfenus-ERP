-- =============================================================================
-- Migration 0012: Global Search Function (PostgreSQL Full-Text Search)
-- =============================================================================
-- Creates a PL/pgSQL function that performs full-text search across all major
-- entities using tsvector columns and websearch_to_tsquery for natural-language
-- queries in Portuguese. Falls back to ILIKE for entities without search_vector
-- (e.g. deadlines).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.global_search(
  p_query text,
  p_law_firm_id uuid
)
RETURNS TABLE (
  id uuid,
  title text,
  subtitle text,
  entity_type text,
  result_rank real
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH search_results AS (
    -- ── Clients (full-text via search_vector) ─────────────────────────────
    SELECT
      c.id,
      c.name AS title,
      COALESCE(NULLIF(c.email, '') || ' · ' || NULLIF(c.document, ''), 'Cliente')::text AS subtitle,
      'cliente'::text AS etype,
      ts_rank(c.search_vector, websearch_to_tsquery('portuguese', p_query)) AS srank
    FROM public.clients c
    WHERE c.search_vector @@ websearch_to_tsquery('portuguese', p_query)
      AND c.law_firm_id = p_law_firm_id

    UNION ALL

    -- ── Legal Cases (full-text via search_vector) ─────────────────────────
    SELECT
      lc.id,
      lc.title,
      COALESCE(NULLIF(lc.case_number, '') || ' · ' || NULLIF(lc.action_type, ''), 'Processo')::text AS subtitle,
      'processo'::text AS etype,
      ts_rank(lc.search_vector, websearch_to_tsquery('portuguese', p_query)) AS srank
    FROM public.legal_cases lc
    WHERE lc.search_vector @@ websearch_to_tsquery('portuguese', p_query)
      AND lc.law_firm_id = p_law_firm_id

    UNION ALL

    -- ── Tasks (full-text via search_vector) ───────────────────────────────
    SELECT
      t.id,
      t.title,
      COALESCE(LEFT(t.description, 80), 'Tarefa')::text AS subtitle,
      'tarefa'::text AS etype,
      ts_rank(t.search_vector, websearch_to_tsquery('portuguese', p_query)) AS srank
    FROM public.tasks t
    WHERE t.search_vector @@ websearch_to_tsquery('portuguese', p_query)
      AND t.law_firm_id = p_law_firm_id

    UNION ALL

    -- ── Contracts (full-text via search_vector) ───────────────────────────
    SELECT
      ct.id,
      LEFT(ct.service_description, 60) AS title,
      'Contrato de honorários'::text AS subtitle,
      'contrato'::text AS etype,
      ts_rank(ct.search_vector, websearch_to_tsquery('portuguese', p_query)) AS srank
    FROM public.contracts ct
    WHERE ct.search_vector @@ websearch_to_tsquery('portuguese', p_query)
      AND ct.law_firm_id = p_law_firm_id

    UNION ALL

    -- ── Leads (full-text via search_vector) ───────────────────────────────
    SELECT
      l.id,
      l.name AS title,
      COALESCE(l.interest, 'Lead')::text AS subtitle,
      'lead'::text AS etype,
      ts_rank(l.search_vector, websearch_to_tsquery('portuguese', p_query)) AS srank
    FROM public.leads l
    WHERE l.search_vector @@ websearch_to_tsquery('portuguese', p_query)
      AND l.law_firm_id = p_law_firm_id

    UNION ALL

    -- ── Deadlines (ILIKE fallback – no search_vector) ─────────────────────
    SELECT
      d.id,
      d.title,
      (d.type || ' · Vence em ' || TO_CHAR(d.due_date, 'DD/MM/YYYY'))::text AS subtitle,
      'prazo'::text AS etype,
      0.5::real AS srank
    FROM public.deadlines d
    WHERE d.law_firm_id = p_law_firm_id
      AND (
        d.title ILIKE '%' || p_query || '%'
        OR d.type ILIKE '%' || p_query || '%'
      )
  ),
  ranked AS (
    SELECT
      sr.id,
      sr.title,
      sr.subtitle,
      sr.etype,
      sr.srank,
      ROW_NUMBER() OVER (PARTITION BY sr.etype ORDER BY sr.srank DESC) AS rn
    FROM search_results sr
  )
  SELECT
    r.id,
    r.title,
    r.subtitle,
    r.etype,
    r.srank
  FROM ranked r
  WHERE r.rn <= 5
  ORDER BY r.etype, r.srank DESC;
END;
$$;
