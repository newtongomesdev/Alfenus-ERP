-- Admin SaaS advanced: feature flags, plan limits, announcements, usage metrics, assisted access logs

-- ──────────────────────────────────────────────
-- 1. feature_flags — Global and per-tenant feature flags
-- ──────────────────────────────────────────────

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text,
  enabled_by_default boolean not null default false,
  is_global boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.feature_flags enable row level security;
create policy feature_flags_select on public.feature_flags
  for select using (public.is_superadmin());
create policy feature_flags_write on public.feature_flags
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ──────────────────────────────────────────────
-- 2. feature_flag_overrides — Per-tenant overrides for feature flags
-- ──────────────────────────────────────────────

create table if not exists public.feature_flag_overrides (
  id uuid primary key default gen_random_uuid(),
  flag_id uuid not null references public.feature_flags(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  enabled boolean not null,
  created_at timestamptz not null default now(),
  unique(flag_id, law_firm_id)
);

alter table public.feature_flag_overrides enable row level security;
create policy feature_flag_overrides_select on public.feature_flag_overrides
  for select using (public.is_superadmin());
create policy feature_flag_overrides_write on public.feature_flag_overrides
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ──────────────────────────────────────────────
-- 3. plan_limits — Limits per plan (replaces the JSON approach)
-- ──────────────────────────────────────────────

create table if not exists public.plan_limits (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  limit_key text not null,
  limit_value integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(plan_id, limit_key)
);

alter table public.plan_limits enable row level security;
create policy plan_limits_select on public.plan_limits
  for select using (public.is_superadmin());
create policy plan_limits_write on public.plan_limits
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- Default plan limits
insert into public.plan_limits (plan_id, limit_key, limit_value) values
  ('starter',       'max_members',                5),
  ('starter',       'max_clients',                50),
  ('starter',       'max_documents_storage_mb',   500),
  ('starter',       'max_contracts',              100),
  ('professional',  'max_members',                15),
  ('professional',  'max_clients',                500),
  ('professional',  'max_documents_storage_mb',   5000),
  ('professional',  'max_contracts',              -1),
  ('business',      'max_members',                -1),
  ('business',      'max_clients',                -1),
  ('business',      'max_documents_storage_mb',   -1),
  ('business',      'max_contracts',              -1)
on conflict (plan_id, limit_key) do update
  set limit_value = excluded.limit_value, updated_at = now();

-- ──────────────────────────────────────────────
-- 4. system_announcements — Platform-wide announcements
-- ──────────────────────────────────────────────

create table if not exists public.system_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  is_active boolean not null default true,
  show_from timestamptz not null default now(),
  show_until timestamptz,
  target_plans text[] default '{}',
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_announcements enable row level security;
create policy system_announcements_select on public.system_announcements
  for select using (public.is_superadmin());
create policy system_announcements_write on public.system_announcements
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ──────────────────────────────────────────────
-- 5. platform_usage_metrics — Aggregated usage per tenant per month
-- ──────────────────────────────────────────────

create table if not exists public.platform_usage_metrics (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  period_month text not null,
  clients_count integer not null default 0,
  cases_count integer not null default 0,
  contracts_count integer not null default 0,
  documents_count integer not null default 0,
  storage_bytes bigint not null default 0,
  api_calls integer not null default 0,
  active_members integer not null default 0,
  ai_tokens_used integer not null default 0,
  created_at timestamptz not null default now(),
  unique(law_firm_id, period_month)
);

create index if not exists platform_usage_metrics_law_firm_idx on public.platform_usage_metrics(law_firm_id, period_month desc);

alter table public.platform_usage_metrics enable row level security;
create policy platform_usage_metrics_select on public.platform_usage_metrics
  for select using (public.is_superadmin());
create policy platform_usage_metrics_write on public.platform_usage_metrics
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ──────────────────────────────────────────────
-- 6. assisted_access_logs — Logs for superadmin impersonation/assisted access
-- ──────────────────────────────────────────────

create table if not exists public.assisted_access_logs (
  id uuid primary key default gen_random_uuid(),
  superadmin_user_id text not null,
  superadmin_email text not null,
  target_law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  target_law_firm_name text,
  session_started_at timestamptz not null default now(),
  session_ended_at timestamptz,
  ip_address text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists assisted_access_logs_law_firm_idx on public.assisted_access_logs(target_law_firm_id, session_started_at desc);

alter table public.assisted_access_logs enable row level security;
create policy assisted_access_logs_select on public.assisted_access_logs
  for select using (public.is_superadmin());
create policy assisted_access_logs_write on public.assisted_access_logs
  for all using (public.is_superadmin()) with check (public.is_superadmin());

-- ──────────────────────────────────────────────
-- Triggers: set_updated_at
-- ──────────────────────────────────────────────

create trigger feature_flags_set_updated_at before update on public.feature_flags for each row execute function public.set_updated_at();
create trigger plan_limits_set_updated_at before update on public.plan_limits for each row execute function public.set_updated_at();
create trigger system_announcements_set_updated_at before update on public.system_announcements for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- Default feature flags
-- ──────────────────────────────────────────────

insert into public.feature_flags (key, name, description, enabled_by_default) values
  ('controladoria',       'Controladoria Juridica',         'Painel de controladoria para gestao juridica',                   true),
  ('clm',                 'Gestao de Contratos CLM',         'Gestao de contratos e lifecycle management',                     false),
  ('risk_provisioning',   'Risco e Provisionamento',         'Analise de risco e provisao para contingencias',                 false),
  ('client_funds',        'Valores de Terceiros (Caixa)',     'Gestao de valores de terceiros e fundos de clientes',            false),
  ('legal_requests',      'Solicitacoes Juridicas com SLA',   'Sistema de solicitacoes juridicas com controle de SLA',          false),
  ('public_forms',        'Formularios Publicos e Agendamento','Formularios publicos para captura de leads e agendamento',      false),
  ('messages',            'Comunicacao Juridica Centralizada','Central de comunicacao interna e com clientes',                  false),
  ('pdf_tools',           'Ferramentas PDF Locais',           'Ferramentas de manipulacao e geracao de PDF localmente',         false),
  ('pwa',                 'PWA e Experiencia Movel',          'Progressive Web App e experiencia mobile otimizada',            false),
  ('ticketing',           'Suporte e Chamados',               'Sistema de suporte e abertura de chamados',                     false),
  ('enterprise_security', 'Seguranca Empresarial Avancada',   'Recursos avancados de seguranca e conformidade',                false),
  ('lgpd_advanced',       'LGPD e Governanca Avancada',       'Ferramentas avancadas de conformidade LGPD e governanca',       false),
  ('backup_continuity',   'Backup e Continuidade',            'Backup automatizado e plano de continuidade de negocios',       false)
on conflict (key) do update
  set name = excluded.name, description = excluded.description, enabled_by_default = excluded.enabled_by_default, updated_at = now();
