-- CLM (Contract Lifecycle Management): gestao completa do ciclo de vida contratorial.

-- ──────────────────────────────────────────────
-- 1. contract_requests — Solicitacoes de contrato
-- ──────────────────────────────────────────────

create table if not exists public.contract_requests (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  requester_member_id uuid not null,
  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  title text not null,
  description text,

  category text not null default 'juridico'
    check (category in ('juridico','administrativo','empresarial','trabalhista','financeiro')),

  contract_type text,

  priority text not null default 'normal'
    check (priority in ('baixa','normal','alta','urgente')),

  necessary_date date,
  responsible_member_id uuid,

  status text not null default 'solicitacao'
    check (status in (
      'solicitacao','triagem','minuta','revisao','negociacao',
      'aprovacao','assinatura_pendente','ativo','renovacao',
      'encerramento','rescindido','arquivado'
    )),

  sla_deadline timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. contract_templates — Modelos de contrato
-- ──────────────────────────────────────────────

create table if not exists public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  description text,
  category text,
  content text,

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. contract_clauses — Clausulas contratuais
-- ──────────────────────────────────────────────

create table if not exists public.contract_clauses (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  template_id uuid references public.contract_templates(id) on delete set null,

  title text not null,
  category text,
  content text not null,

  version integer not null default 1,

  risk_level text not null default 'baixo'
    check (risk_level in ('baixo','medio','alto','critico')),

  is_mandatory boolean not null default false,
  is_approved boolean not null default false,

  approved_by uuid,
  responsible_member_id uuid,

  notes text,

  status text not null default 'ativa'
    check (status in ('ativa','em_revisao','aprovada','rejeitada','descontinuada')),

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. contract_versions — Versionamento de contratos
-- ──────────────────────────────────────────────

create table if not exists public.contract_versions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  contract_request_id uuid not null references public.contract_requests(id) on delete cascade,

  version_number integer not null default 1,
  content text,
  author_member_id uuid,
  change_description text,
  is_current boolean not null default true,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. contract_approvals — Aprovacoes de contrato
-- ──────────────────────────────────────────────

create table if not exists public.contract_approvals (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  contract_request_id uuid not null references public.contract_requests(id) on delete cascade,
  version_id uuid references public.contract_versions(id) on delete set null,

  approver_member_id uuid not null,

  status text not null default 'pendente'
    check (status in ('pendente','aprovado','rejeitado')),

  decision_at timestamptz,
  comments text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 6. contract_obligations — Obrigatories contratuais
-- ──────────────────────────────────────────────

create table if not exists public.contract_obligations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  contract_request_id uuid not null references public.contract_requests(id) on delete cascade,

  description text not null,
  responsible_party text,
  internal_responsible_member_id uuid,

  periodicity text
    check (periodicity in ('unica','mensal','trimestral','semestral','anual')),

  due_date date,
  evidence_description text,

  status text not null default 'pendente'
    check (status in ('pendente','em_andamento','concluida','atrasada','isenta')),

  alert_days_before integer not null default 30,
  completed_at timestamptz,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 7. contract_amendments — Aditivos e alteracoes contratuais
-- ──────────────────────────────────────────────

create table if not exists public.contract_amendments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  contract_request_id uuid not null references public.contract_requests(id) on delete cascade,

  amendment_type text not null
    check (amendment_type in ('aditivo','anexo_endereco','retificacao')),

  description text not null,
  new_value numeric(15,2),
  new_vigence_start date,
  new_vigence_end date,

  status text not null default 'rascunho'
    check (status in ('rascunho','pendente_aprovacao','aprovado','rejeitado')),

  approved_by uuid,
  approved_at timestamptz,
  attachment_url text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 8. contract_counterparties — Contrapartes contratuais
-- ──────────────────────────────────────────────

create table if not exists public.contract_counterparties (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  contract_request_id uuid not null references public.contract_requests(id) on delete cascade,

  party_name text not null,
  party_type text not null default 'pj'
    check (party_type in ('pf','pj')),

  document_number text,
  contact_name text,
  contact_email text,
  contact_phone text,

  role text
    check (role in ('contratante','contratado','fiador','avalista','outro')),

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 9. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger contract_requests_set_updated_at
  before update on public.contract_requests
  for each row execute function public.set_updated_at();

create trigger contract_templates_set_updated_at
  before update on public.contract_templates
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 10. Indexes
-- ──────────────────────────────────────────────

-- contract_requests
create index if not exists contract_requests_law_firm_idx
  on public.contract_requests(law_firm_id);

create index if not exists contract_requests_law_firm_status_idx
  on public.contract_requests(law_firm_id, status);

create index if not exists contract_requests_law_firm_category_idx
  on public.contract_requests(law_firm_id, category);

create index if not exists contract_requests_law_firm_priority_idx
  on public.contract_requests(law_firm_id, priority);

create index if not exists contract_requests_requester_member_idx
  on public.contract_requests(requester_member_id);

create index if not exists contract_requests_responsible_member_idx
  on public.contract_requests(responsible_member_id)
  where responsible_member_id is not null;

create index if not exists contract_requests_client_idx
  on public.contract_requests(client_id)
  where client_id is not null;

create index if not exists contract_requests_legal_case_idx
  on public.contract_requests(legal_case_id)
  where legal_case_id is not null;

-- contract_templates
create index if not exists contract_templates_law_firm_idx
  on public.contract_templates(law_firm_id);

create index if not exists contract_templates_law_firm_active_idx
  on public.contract_templates(law_firm_id, is_active);

-- contract_clauses
create index if not exists contract_clauses_law_firm_idx
  on public.contract_clauses(law_firm_id);

create index if not exists contract_clauses_template_idx
  on public.contract_clauses(template_id)
  where template_id is not null;

create index if not exists contract_clauses_law_firm_status_idx
  on public.contract_clauses(law_firm_id, status);

-- contract_versions
create index if not exists contract_versions_law_firm_idx
  on public.contract_versions(law_firm_id);

create index if not exists contract_versions_request_idx
  on public.contract_versions(contract_request_id);

create index if not exists contract_versions_request_current_idx
  on public.contract_versions(contract_request_id, is_current)
  where is_current = true;

-- contract_approvals
create index if not exists contract_approvals_law_firm_idx
  on public.contract_approvals(law_firm_id);

create index if not exists contract_approvals_request_idx
  on public.contract_approvals(contract_request_id);

create index if not exists contract_approvals_request_status_idx
  on public.contract_approvals(contract_request_id, status);

-- contract_obligations
create index if not exists contract_obligations_law_firm_idx
  on public.contract_obligations(law_firm_id);

create index if not exists contract_obligations_request_idx
  on public.contract_obligations(contract_request_id);

create index if not exists contract_obligations_law_firm_status_idx
  on public.contract_obligations(law_firm_id, status);

create index if not exists contract_obligations_due_date_idx
  on public.contract_obligations(due_date)
  where due_date is not null;

-- contract_amendments
create index if not exists contract_amendments_law_firm_idx
  on public.contract_amendments(law_firm_id);

create index if not exists contract_amendments_request_idx
  on public.contract_amendments(contract_request_id);

create index if not exists contract_amendments_law_firm_status_idx
  on public.contract_amendments(law_firm_id, status);

-- contract_counterparties
create index if not exists contract_counterparties_law_firm_idx
  on public.contract_counterparties(law_firm_id);

create index if not exists contract_counterparties_request_idx
  on public.contract_counterparties(contract_request_id);

-- ──────────────────────────────────────────────
-- 11. Row Level Security
-- ──────────────────────────────────────────────

alter table public.contract_requests enable row level security;
alter table public.contract_templates enable row level security;
alter table public.contract_clauses enable row level security;
alter table public.contract_versions enable row level security;
alter table public.contract_approvals enable row level security;
alter table public.contract_obligations enable row level security;
alter table public.contract_amendments enable row level security;
alter table public.contract_counterparties enable row level security;

create policy contract_requests_select on public.contract_requests
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_requests_insert on public.contract_requests
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_requests_update on public.contract_requests
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_requests_delete on public.contract_requests
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_templates_select on public.contract_templates
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_templates_insert on public.contract_templates
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_templates_update on public.contract_templates
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_templates_delete on public.contract_templates
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_clauses_select on public.contract_clauses
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_clauses_insert on public.contract_clauses
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_clauses_update on public.contract_clauses
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_clauses_delete on public.contract_clauses
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_versions_select on public.contract_versions
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_versions_insert on public.contract_versions
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_versions_update on public.contract_versions
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_versions_delete on public.contract_versions
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_approvals_select on public.contract_approvals
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_approvals_insert on public.contract_approvals
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_approvals_update on public.contract_approvals
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_approvals_delete on public.contract_approvals
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_obligations_select on public.contract_obligations
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_obligations_insert on public.contract_obligations
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_obligations_update on public.contract_obligations
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_obligations_delete on public.contract_obligations
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_amendments_select on public.contract_amendments
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_amendments_insert on public.contract_amendments
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_amendments_update on public.contract_amendments
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_amendments_delete on public.contract_amendments
  for delete using (public.has_law_firm_access(law_firm_id));

create policy contract_counterparties_select on public.contract_counterparties
  for select using (public.has_law_firm_access(law_firm_id));

create policy contract_counterparties_insert on public.contract_counterparties
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy contract_counterparties_update on public.contract_counterparties
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy contract_counterparties_delete on public.contract_counterparties
  for delete using (public.has_law_firm_access(law_firm_id));
