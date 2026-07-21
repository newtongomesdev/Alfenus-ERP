-- LGPD e Governança de Dados: consentes, solicitações de titulares, políticas de retenção e classificações.

-- ──────────────────────────────────────────────
-- 1. lgpd_consents — Consentimentos
-- ──────────────────────────────────────────────

create table if not exists public.lgpd_consents (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  data_subject_id uuid references public.clients(id) on delete set null,

  purpose text not null,
  consent_text text not null,
  consent_version text not null default '1.0',
  granted boolean not null,

  origin text,
  ip_address text,

  revoked boolean default false,
  revoked_at timestamptz,
  revoked_reason text,

  expires_at timestamptz,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. lgpd_data_subject_requests — Solicitações dos Titulares
-- ──────────────────────────────────────────────

create table if not exists public.lgpd_data_subject_requests (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  data_subject_id uuid references public.clients(id) on delete set null,

  request_type text not null
    check (request_type in ('confirmacao','acesso','correcao','anonimizacao','portabilidade','eliminacao','revogacao','informacao_compartilhamento')),

  description text,

  status text not null default 'recebida'
    check (status in ('recebida','identificacao','em_analise','aprovada','parcialmente_aprovada','recusada','concluida')),

  priority text default 'normal',
  responsible_member_id uuid,

  received_at timestamptz default now(),
  identified_at timestamptz,
  analysis_started_at timestamptz,
  decided_at timestamptz,
  completed_at timestamptz,

  decision_notes text,
  rejection_reason text,

  identity_verified boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. lgpd_retention_policies — Políticas de Retenção
-- ──────────────────────────────────────────────

create table if not exists public.lgpd_retention_policies (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  policy_name text not null,
  description text,

  target_module text not null
    check (target_module in ('clientes','processos','documentos','contratos','financeiro','comunicacoes','todos')),

  document_type text,
  retention_days integer not null,

  legal_basis text,

  auto_delete boolean default false,
  requires_review boolean default true,
  is_active boolean default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. lgpd_data_classifications — Classificações de Dados
-- ──────────────────────────────────────────────

create table if not exists public.lgpd_data_classifications (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  entity_type text not null,
  entity_id uuid not null,

  classification text not null
    check (classification in ('publico','interno','confidencial','altamente_confidencial','dado_pessoal','dado_sensivel','financeiro','juridico')),

  classified_by uuid,
  classified_at timestamptz default now(),

  notes text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger lgpd_data_subject_requests_set_updated_at
  before update on public.lgpd_data_subject_requests
  for each row execute function public.set_updated_at();

create trigger lgpd_retention_policies_set_updated_at
  before update on public.lgpd_retention_policies
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 6. Indexes
-- ──────────────────────────────────────────────

-- lgpd_consents
create index if not exists lgpd_consents_law_firm_idx
  on public.lgpd_consents(law_firm_id);

create index if not exists lgpd_consents_data_subject_idx
  on public.lgpd_consents(data_subject_id)
  where data_subject_id is not null;

create index if not exists lgpd_consents_law_firm_granted_idx
  on public.lgpd_consents(law_firm_id, granted);

-- lgpd_data_subject_requests
create index if not exists lgpd_dsr_law_firm_idx
  on public.lgpd_data_subject_requests(law_firm_id);

create index if not exists lgpd_dsr_data_subject_idx
  on public.lgpd_data_subject_requests(data_subject_id)
  where data_subject_id is not null;

create index if not exists lgpd_dsr_law_firm_status_idx
  on public.lgpd_data_subject_requests(law_firm_id, status);

create index if not exists lgpd_dsr_request_type_idx
  on public.lgpd_data_subject_requests(request_type);

-- lgpd_retention_policies
create index if not exists lgpd_retention_policies_law_firm_idx
  on public.lgpd_retention_policies(law_firm_id);

create index if not exists lgpd_retention_policies_law_firm_active_idx
  on public.lgpd_retention_policies(law_firm_id, is_active);

-- lgpd_data_classifications
create index if not exists lgpd_classifications_law_firm_idx
  on public.lgpd_data_classifications(law_firm_id);

create index if not exists lgpd_classifications_entity_idx
  on public.lgpd_data_classifications(entity_type, entity_id);

-- ──────────────────────────────────────────────
-- 7. Row Level Security
-- ──────────────────────────────────────────────

alter table public.lgpd_consents enable row level security;
alter table public.lgpd_data_subject_requests enable row level security;
alter table public.lgpd_retention_policies enable row level security;
alter table public.lgpd_data_classifications enable row level security;

create policy lgpd_consents_select on public.lgpd_consents
  for select using (public.has_law_firm_access(law_firm_id));

create policy lgpd_consents_insert on public.lgpd_consents
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_consents_update on public.lgpd_consents
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_consents_delete on public.lgpd_consents
  for delete using (public.has_law_firm_access(law_firm_id));

create policy lgpd_dsr_select on public.lgpd_data_subject_requests
  for select using (public.has_law_firm_access(law_firm_id));

create policy lgpd_dsr_insert on public.lgpd_data_subject_requests
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_dsr_update on public.lgpd_data_subject_requests
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_dsr_delete on public.lgpd_data_subject_requests
  for delete using (public.has_law_firm_access(law_firm_id));

create policy lgpd_retention_policies_select on public.lgpd_retention_policies
  for select using (public.has_law_firm_access(law_firm_id));

create policy lgpd_retention_policies_insert on public.lgpd_retention_policies
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_retention_policies_update on public.lgpd_retention_policies
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_retention_policies_delete on public.lgpd_retention_policies
  for delete using (public.has_law_firm_access(law_firm_id));

create policy lgpd_classifications_select on public.lgpd_data_classifications
  for select using (public.has_law_firm_access(law_firm_id));

create policy lgpd_classifications_insert on public.lgpd_data_classifications
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_classifications_update on public.lgpd_data_classifications
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy lgpd_classifications_delete on public.lgpd_data_classifications
  for delete using (public.has_law_firm_access(law_firm_id));
