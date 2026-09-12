-- ============================================================
-- VALIDAÇÃO DA MIGRATION 0047 — SERVICE CATALOG
-- Cole este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Verificar se a tabela existe e tem RLS habilitado
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'service_catalog'
  AND schemaname = 'public';

-- 2. Verificar as 4 políticas RLS criadas
SELECT
  policyname,
  cmd AS operacao,
  qual AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE tablename = 'service_catalog'
  AND schemaname = 'public'
ORDER BY policyname;

-- 3. Contar serviços da plataforma inseridos (seed = 14)
SELECT
  COUNT(*) AS total_platform_services,
  COUNT(DISTINCT practice_area) AS distinct_practice_areas
FROM service_catalog
WHERE is_platform_library = true
  AND law_firm_id IS NULL;

-- 4. Listar todos os serviços da plataforma
SELECT
  name,
  slug,
  practice_area,
  charging_model,
  status,
  is_platform_library,
  law_firm_id
FROM service_catalog
WHERE is_platform_library = true
ORDER BY sort_order;

-- 5. Verificar índices criados
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'service_catalog'
  AND schemaname = 'public'
ORDER BY indexname;

-- 6. Verificar o trigger de updated_at
SELECT
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'service_catalog'
  AND event_object_schema = 'public';

-- 7. Verificar os ENUMs criados
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('service_status', 'service_charging_model')
ORDER BY t.typname, e.enumsortorder;

-- 8. Verificar constraints CHECK
SELECT
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'service_catalog'::regclass
  AND contype = 'c'
ORDER BY conname;
