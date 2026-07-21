-- Solicitacoes e SLA: tipos de solicitacao, solicitacoes, etapas, aprovacoes, eventos de SLA e mensagens.

-- ──────────────────────────────────────────────
-- 1. legal_request_types — Tipos de Solicitacao
-- ──────────────────────────────────────────────

create table if not exists public.legal_request_types (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  description text,
  default_priority text not null default 'normal',
  default_sla_hours integer,
  requires_approval boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. legal_requests — Solicitacoes
-- ──────────────────────────────────────────────

create table if not exists public.legal_requests (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  request_type_id uuid references public.legal_request_types(id) on delete set null,
  requester_member_id uuid not null,
  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  title text not null,
  description text,
  category text,

  priority text not null default 'normal'
    check (priority in ('baixa','normal','alta','urgente')),

  responsible_member_id uuid,
  participants jsonb not null default '[]'::jsonb,

  status text not null default 'aberta'
    check (status in ('aberta','triagem','aguardando_informacoes','em_andamento','aguardando_aprovacao','concluida','cancelada','vencida')),

  sla_deadline timestamptz,

  estimated_cost numeric(12,2),
  estimated_hours numeric(8,2),
  actual_hours numeric(8,2),

  satisfaction_rating integer,
  satisfaction_comment text,

  opened_at timestamptz not null default now(),
  first_response_at timestamptz,
  concluded_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. legal_request_stages — Etapas da Solicitacao
-- ──────────────────────────────────────────────

create table if not exists public.legal_request_stages (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  request_id uuid not null references public.legal_requests(id) on delete cascade,

  stage_name text not null,
  stage_order integer not null default 0,

  status text not null default 'pendente'
    check (status in ('pendente','em_andamento','concluida')),

  assigned_to uuid,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. legal_request_approvals — Aprovacoes da Solicitacao
-- ──────────────────────────────────────────────

create table if not exists public.legal_request_approvals (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  request_id uuid not null references public.legal_requests(id) on delete cascade,
  approver_member_id uuid not null,

  status text not null default 'pendente'
    check (status in ('pendente','aprovado','rejeitado')),

  decision_at timestamptz,
  comments text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. legal_request_sla_events — Eventos de SLA
-- ──────────────────────────────────────────────

create table if not exists public.legal_request_sla_events (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  request_id uuid not null references public.legal_requests(id) on delete cascade,

  event_type text not null
    check (event_type in ('primeira_resposta','solucao','pausa','reabertura','escalonamento','vencimento')),

  scheduled_at timestamptz,
  actual_at timestamptz,
  is_met boolean,
  justification text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 6. legal_request_messages — Mensagens da Solicitacao
-- ──────────────────────────────────────────────

create table if not exists public.legal_request_messages (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  request_id uuid not null references public.legal_requests(id) on delete cascade,
  sender_member_id uuid not null,

  message text not null,
  is_internal boolean not null default false,
  attachment_url text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 7. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger legal_request_types_set_updated_at
  before update on public.legal_request_types
  for each row execute function public.set_updated_at();

create trigger legal_requests_set_updated_at
  before update on public.legal_requests
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 8. Indexes
-- ──────────────────────────────────────────────

-- legal_request_types
create index if not exists legal_request_types_law_firm_idx
  on public.legal_request_types(law_firm_id);

-- legal_requests
create index if not exists legal_requests_law_firm_idx
  on public.legal_requests(law_firm_id);

create index if not exists legal_requests_law_firm_status_idx
  on public.legal_requests(law_firm_id, status);

create index if not exists legal_requests_law_firm_priority_idx
  on public.legal_requests(law_firm_id, priority);

create index if not exists legal_requests_request_type_idx
  on public.legal_requests(request_type_id)
  where request_type_id is not null;

create index if not exists legal_requests_requester_member_idx
  on public.legal_requests(requester_member_id);

create index if not exists legal_requests_responsible_member_idx
  on public.legal_requests(responsible_member_id)
  where responsible_member_id is not null;

create index if not exists legal_requests_client_idx
  on public.legal_requests(client_id)
  where client_id is not null;

create index if not exists legal_requests_case_idx
  on public.legal_requests(legal_case_id)
  where legal_case_id is not null;

create index if not exists legal_requests_sla_deadline_idx
  on public.legal_requests(sla_deadline)
  where sla_deadline is not null;

create index if not exists legal_requests_opened_at_idx
  on public.legal_requests(opened_at);

-- legal_request_stages
create index if not exists legal_request_stages_law_firm_idx
  on public.legal_request_stages(law_firm_id);

create index if not exists legal_request_stages_request_idx
  on public.legal_request_stages(request_id);

-- legal_request_approvals
create index if not exists legal_request_approvals_law_firm_idx
  on public.legal_request_approvals(law_firm_id);

create index if not exists legal_request_approvals_request_idx
  on public.legal_request_approvals(request_id);

create index if not exists legal_request_approvals_status_idx
  on public.legal_request_approvals(request_id, status);

-- legal_request_sla_events
create index if not exists legal_request_sla_events_law_firm_idx
  on public.legal_request_sla_events(law_firm_id);

create index if not exists legal_request_sla_events_request_idx
  on public.legal_request_sla_events(request_id);

create index if not exists legal_request_sla_events_event_type_idx
  on public.legal_request_sla_events(event_type);

-- legal_request_messages
create index if not exists legal_request_messages_law_firm_idx
  on public.legal_request_messages(law_firm_id);

create index if not exists legal_request_messages_request_idx
  on public.legal_request_messages(request_id);

create index if not exists legal_request_messages_created_at_idx
  on public.legal_request_messages(request_id, created_at);

-- ──────────────────────────────────────────────
-- 9. Row Level Security
-- ──────────────────────────────────────────────

alter table public.legal_request_types enable row level security;
alter table public.legal_requests enable row level security;
alter table public.legal_request_stages enable row level security;
alter table public.legal_request_approvals enable row level security;
alter table public.legal_request_sla_events enable row level security;
alter table public.legal_request_messages enable row level security;

create policy legal_request_types_select on public.legal_request_types
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_request_types_insert on public.legal_request_types
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_types_update on public.legal_request_types
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_types_delete on public.legal_request_types
  for delete using (public.has_law_firm_access(law_firm_id));

create policy legal_requests_select on public.legal_requests
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_requests_insert on public.legal_requests
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_requests_update on public.legal_requests
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_requests_delete on public.legal_requests
  for delete using (public.has_law_firm_access(law_firm_id));

create policy legal_request_stages_select on public.legal_request_stages
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_request_stages_insert on public.legal_request_stages
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_stages_update on public.legal_request_stages
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_stages_delete on public.legal_request_stages
  for delete using (public.has_law_firm_access(law_firm_id));

create policy legal_request_approvals_select on public.legal_request_approvals
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_request_approvals_insert on public.legal_request_approvals
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_approvals_update on public.legal_request_approvals
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_approvals_delete on public.legal_request_approvals
  for delete using (public.has_law_firm_access(law_firm_id));

create policy legal_request_sla_events_select on public.legal_request_sla_events
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_request_sla_events_insert on public.legal_request_sla_events
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_sla_events_update on public.legal_request_sla_events
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_sla_events_delete on public.legal_request_sla_events
  for delete using (public.has_law_firm_access(law_firm_id));

create policy legal_request_messages_select on public.legal_request_messages
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_request_messages_insert on public.legal_request_messages
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_messages_update on public.legal_request_messages
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_request_messages_delete on public.legal_request_messages
  for delete using (public.has_law_firm_access(law_firm_id));
