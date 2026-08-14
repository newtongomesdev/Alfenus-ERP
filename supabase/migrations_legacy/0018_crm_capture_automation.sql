-- CRM: fontes externas de captura, deduplicacao e regras basicas de automacao.
alter table public.leads add column if not exists external_id text;
alter table public.leads add column if not exists source_metadata jsonb not null default '{}'::jsonb;

create unique index if not exists leads_law_firm_external_id_idx
  on public.leads (law_firm_id, external_id)
  where external_id is not null;

create table if not exists public.crm_capture_sources (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  path_token text not null unique default encode(gen_random_bytes(18), 'hex'),
  secret text,
  default_funnel_stage text not null default 'novo',
  field_map jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  last_received_at timestamptz,
  created_by_member_id uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_automation_rules (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  trigger_event text not null check (trigger_event in ('lead.created', 'lead.stage_changed', 'lead.tag_added')),
  conditions jsonb not null default '[]'::jsonb,
  actions jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  last_run_at timestamptz,
  run_count integer not null default 0,
  created_by_member_id uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_automation_runs (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  rule_id uuid not null references public.crm_automation_rules(id) on delete cascade,
  trigger_event text not null,
  entity_type text not null default 'lead',
  entity_id uuid not null,
  status text not null check (status in ('success', 'partial', 'failed')),
  actions_result jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists crm_capture_sources_law_firm_idx on public.crm_capture_sources(law_firm_id);
create index if not exists crm_automation_rules_event_idx on public.crm_automation_rules(law_firm_id, trigger_event) where is_active;
create index if not exists crm_automation_runs_entity_idx on public.crm_automation_runs(law_firm_id, entity_id, created_at desc);

alter table public.crm_capture_sources enable row level security;
alter table public.crm_automation_rules enable row level security;
alter table public.crm_automation_runs enable row level security;

create policy crm_capture_sources_select on public.crm_capture_sources for select using (public.has_law_firm_access(law_firm_id));
create policy crm_capture_sources_write on public.crm_capture_sources for all using (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));
create policy crm_automation_rules_select on public.crm_automation_rules for select using (public.has_law_firm_access(law_firm_id));
create policy crm_automation_rules_write on public.crm_automation_rules for all using (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));
create policy crm_automation_runs_select on public.crm_automation_runs for select using (public.has_law_firm_access(law_firm_id));
