-- Risco e valores processuais: pedidos, avaliacao de risco, provisionamento, garantias, depositos, bloqueios e levantamentos.

-- ──────────────────────────────────────────────
-- 1. process_claims — Pedidos do Processo
-- ──────────────────────────────────────────────

create table if not exists public.process_claims (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,

  description text not null,

  category text not null default 'indenizacao'
    check (category in ('indenizacao','reparacao','restituicao','honorarios','multa','honorarios_sucumbenciais','custas','outros')),

  original_value numeric(15,2),
  updated_value numeric(15,2),
  base_date date,
  index_name text,

  status text not null default 'ativo'
    check (status in ('ativo','deferido','indeferido','parcial','pendente','suspenso')),

  result text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. risk_assessments — Avaliacao de Risco
-- ──────────────────────────────────────────────

create table if not exists public.risk_assessments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,
  claim_id uuid references public.process_claims(id) on delete set null,

  classification text not null default 'possivel'
    check (classification in ('remoto','possivel','provavel')),

  probability numeric(5,2),
  estimated_value numeric(15,2),

  scenario text not null default 'esperado'
    check (scenario in ('otimista','esperado','pessimista')),

  justification text,

  responsible_member_id uuid,
  base_date date,

  approved_by uuid,
  approved_at timestamptz,

  version integer not null default 1,
  previous_version_id uuid references public.risk_assessments(id) on delete set null,

  status text not null default 'rascunho'
    check (status in ('rascunho','pendente_aprovacao','aprovado','rejeitado','substituido')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. provisions — Provisionamento
-- ──────────────────────────────────────────────

create table if not exists public.provisions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,
  claim_id uuid references public.process_claims(id) on delete set null,
  risk_assessment_id uuid references public.risk_assessments(id) on delete set null,

  value numeric(15,2) not null,
  competence text,
  base_date date,

  provision_type text not null default 'provisao'
    check (provision_type in ('provisao','contingencia','garantia','reserva')),

  justification text,

  responsible_member_id uuid,
  approved_by uuid,
  approved_at timestamptz,

  status text not null default 'rascunho'
    check (status in ('rascunho','pendente_aprovacao','aprovado','rejeitado','revertido')),

  reversal_date date,
  reversal_reason text,

  history jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. judicial_guarantees — Garantias Judiciais
-- ──────────────────────────────────────────────

create table if not exists public.judicial_guarantees (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,

  guarantee_type text not null
    check (guarantee_type in ('deposito_judicial','seguro_garantia','carta_fianca','bloqueio','penhor','caucao')),

  value numeric(15,2) not null,
  asset_description text,
  bank text,
  account_number text,
  validity_date date,

  document_id uuid,

  status text not null default 'ativa'
    check (status in ('ativa','liberada','bloqueada','vencida','cancelada')),

  release_date date,
  release_document text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. judicial_deposits — Depositos Judiciais
-- ──────────────────────────────────────────────

create table if not exists public.judicial_deposits (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,

  deposit_type text not null default 'deposito_judicial'
    check (deposit_type in ('deposito_judicial','caucao','deposito_em_garantia')),

  value numeric(15,2) not null,

  bank text,
  agency text,
  account_number text,

  deposit_date date,
  release_date date,

  beneficiary text,
  institution text,
  document_number text,

  repasse numeric(15,2),
  retention numeric(15,2),

  status text not null default 'depositado'
    check (status in ('depositado','liberado','penhorado','bloqueado','cancelado')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 6. seizures — Bloqueios/Penhoras
-- ──────────────────────────────────────────────

create table if not exists public.seizures (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,

  seizure_type text not null
    check (seizure_type in ('bloqueio','penhora','indisponibilidade','constatacao')),

  asset_type text not null
    check (asset_type in ('imovel','veiculo','conta_bancaria','acoes','salario','outros')),

  asset_description text,
  asset_value numeric(15,2),

  entity text,
  document_number text,
  order_date date,

  status text not null default 'ativa'
    check (status in ('ativa','levantada','substituida','cancelada')),

  release_date date,
  release_reason text,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 7. court_releases — Alvaras e Levantamentos
-- ──────────────────────────────────────────────

create table if not exists public.court_releases (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  legal_case_id uuid references public.legal_cases(id) on delete set null,
  seizure_id uuid references public.seizures(id) on delete set null,

  released_value numeric(15,2) not null,
  beneficiary text,
  release_date date,
  institution text,
  document_number text,

  repasse numeric(15,2),
  retention numeric(15,2),

  status text not null default 'pendente'
    check (status in ('pendente','processado','pago','cancelado')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 8. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger process_claims_set_updated_at
  before update on public.process_claims
  for each row execute function public.set_updated_at();

create trigger risk_assessments_set_updated_at
  before update on public.risk_assessments
  for each row execute function public.set_updated_at();

create trigger provisions_set_updated_at
  before update on public.provisions
  for each row execute function public.set_updated_at();

create trigger judicial_guarantees_set_updated_at
  before update on public.judicial_guarantees
  for each row execute function public.set_updated_at();

create trigger judicial_deposits_set_updated_at
  before update on public.judicial_deposits
  for each row execute function public.set_updated_at();

create trigger seizures_set_updated_at
  before update on public.seizures
  for each row execute function public.set_updated_at();

create trigger court_releases_set_updated_at
  before update on public.court_releases
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 9. Indexes
-- ──────────────────────────────────────────────

-- process_claims
create index if not exists process_claims_law_firm_idx
  on public.process_claims(law_firm_id);

create index if not exists process_claims_law_firm_status_idx
  on public.process_claims(law_firm_id, status);

create index if not exists process_claims_case_idx
  on public.process_claims(legal_case_id)
  where legal_case_id is not null;

create index if not exists process_claims_client_idx
  on public.process_claims(client_id)
  where client_id is not null;

create index if not exists process_claims_category_idx
  on public.process_claims(category);

-- risk_assessments
create index if not exists risk_assessments_law_firm_idx
  on public.risk_assessments(law_firm_id);

create index if not exists risk_assessments_law_firm_status_idx
  on public.risk_assessments(law_firm_id, status);

create index if not exists risk_assessments_case_idx
  on public.risk_assessments(legal_case_id)
  where legal_case_id is not null;

create index if not exists risk_assessments_claim_idx
  on public.risk_assessments(claim_id)
  where claim_id is not null;

create index if not exists risk_assessments_classification_idx
  on public.risk_assessments(classification);

create index if not exists risk_assessments_scenario_idx
  on public.risk_assessments(scenario);

-- provisions
create index if not exists provisions_law_firm_idx
  on public.provisions(law_firm_id);

create index if not exists provisions_law_firm_status_idx
  on public.provisions(law_firm_id, status);

create index if not exists provisions_case_idx
  on public.provisions(legal_case_id)
  where legal_case_id is not null;

create index if not exists provisions_claim_idx
  on public.provisions(claim_id)
  where claim_id is not null;

create index if not exists provisions_risk_assessment_idx
  on public.provisions(risk_assessment_id)
  where risk_assessment_id is not null;

create index if not exists provisions_type_idx
  on public.provisions(provision_type);

-- judicial_guarantees
create index if not exists judicial_guarantees_law_firm_idx
  on public.judicial_guarantees(law_firm_id);

create index if not exists judicial_guarantees_law_firm_status_idx
  on public.judicial_guarantees(law_firm_id, status);

create index if not exists judicial_guarantees_case_idx
  on public.judicial_guarantees(legal_case_id)
  where legal_case_id is not null;

create index if not exists judicial_guarantees_type_idx
  on public.judicial_guarantees(guarantee_type);

-- judicial_deposits
create index if not exists judicial_deposits_law_firm_idx
  on public.judicial_deposits(law_firm_id);

create index if not exists judicial_deposits_law_firm_status_idx
  on public.judicial_deposits(law_firm_id, status);

create index if not exists judicial_deposits_case_idx
  on public.judicial_deposits(legal_case_id)
  where legal_case_id is not null;

create index if not exists judicial_deposits_type_idx
  on public.judicial_deposits(deposit_type);

-- seizures
create index if not exists seizures_law_firm_idx
  on public.seizures(law_firm_id);

create index if not exists seizures_law_firm_status_idx
  on public.seizures(law_firm_id, status);

create index if not exists seizures_case_idx
  on public.seizures(legal_case_id)
  where legal_case_id is not null;

create index if not exists seizures_type_idx
  on public.seizures(seizure_type);

create index if not exists seizures_asset_type_idx
  on public.seizures(asset_type);

-- court_releases
create index if not exists court_releases_law_firm_idx
  on public.court_releases(law_firm_id);

create index if not exists court_releases_law_firm_status_idx
  on public.court_releases(law_firm_id, status);

create index if not exists court_releases_case_idx
  on public.court_releases(legal_case_id)
  where legal_case_id is not null;

create index if not exists court_releases_seizure_idx
  on public.court_releases(seizure_id)
  where seizure_id is not null;

-- ──────────────────────────────────────────────
-- 10. Row Level Security
-- ──────────────────────────────────────────────

alter table public.process_claims enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.provisions enable row level security;
alter table public.judicial_guarantees enable row level security;
alter table public.judicial_deposits enable row level security;
alter table public.seizures enable row level security;
alter table public.court_releases enable row level security;

create policy process_claims_select on public.process_claims
  for select using (public.has_law_firm_access(law_firm_id));

create policy process_claims_insert on public.process_claims
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy process_claims_update on public.process_claims
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy process_claims_delete on public.process_claims
  for delete using (public.has_law_firm_access(law_firm_id));

create policy risk_assessments_select on public.risk_assessments
  for select using (public.has_law_firm_access(law_firm_id));

create policy risk_assessments_insert on public.risk_assessments
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy risk_assessments_update on public.risk_assessments
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy risk_assessments_delete on public.risk_assessments
  for delete using (public.has_law_firm_access(law_firm_id));

create policy provisions_select on public.provisions
  for select using (public.has_law_firm_access(law_firm_id));

create policy provisions_insert on public.provisions
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy provisions_update on public.provisions
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy provisions_delete on public.provisions
  for delete using (public.has_law_firm_access(law_firm_id));

create policy judicial_guarantees_select on public.judicial_guarantees
  for select using (public.has_law_firm_access(law_firm_id));

create policy judicial_guarantees_insert on public.judicial_guarantees
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy judicial_guarantees_update on public.judicial_guarantees
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy judicial_guarantees_delete on public.judicial_guarantees
  for delete using (public.has_law_firm_access(law_firm_id));

create policy judicial_deposits_select on public.judicial_deposits
  for select using (public.has_law_firm_access(law_firm_id));

create policy judicial_deposits_insert on public.judicial_deposits
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy judicial_deposits_update on public.judicial_deposits
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy judicial_deposits_delete on public.judicial_deposits
  for delete using (public.has_law_firm_access(law_firm_id));

create policy seizures_select on public.seizures
  for select using (public.has_law_firm_access(law_firm_id));

create policy seizures_insert on public.seizures
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy seizures_update on public.seizures
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy seizures_delete on public.seizures
  for delete using (public.has_law_firm_access(law_firm_id));

create policy court_releases_select on public.court_releases
  for select using (public.has_law_firm_access(law_firm_id));

create policy court_releases_insert on public.court_releases
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy court_releases_update on public.court_releases
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy court_releases_delete on public.court_releases
  for delete using (public.has_law_firm_access(law_firm_id));
