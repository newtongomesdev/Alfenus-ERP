-- Alfenus canonical baseline. Generated from the ordered legacy migration chain.

-- This is the only migration discovered by Supabase CLI after legacy files are archived.


-- >>> canonical source: 0001_foundation.sql
create extension if not exists pgcrypto;

create type public.member_role as enum (
  'proprietario',
  'administrador',
  'advogado',
  'assistente',
  'financeiro',
  'colaborador',
  'visualizador'
);

create type public.record_status as enum ('ativo', 'inativo', 'arquivado');
create type public.lead_status as enum ('novo', 'em_atendimento', 'qualificado', 'convertido', 'perdido');
create type public.client_status as enum ('lead', 'ativo', 'inativo', 'inadimplente', 'arquivado');
create type public.case_status as enum ('em_analise', 'documentacao_pendente', 'ajuizamento', 'em_andamento', 'aguardando_decisao', 'audiencia_marcada', 'suspenso', 'encerrado', 'arquivado');
create type public.priority_level as enum ('baixa', 'normal', 'alta', 'urgente');
create type public.contract_status as enum ('rascunho', 'aguardando_assinatura', 'ativo', 'quitado', 'inadimplente', 'cancelado');
create type public.installment_status as enum ('pendente', 'vencendo', 'atrasada', 'paga', 'parcialmente_paga', 'cancelada');
create type public.deadline_status as enum ('pendente', 'em_andamento', 'concluido', 'vencido', 'cancelado');

create table public.law_firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  document text,
  email text,
  phone text,
  address jsonb not null default '{}'::jsonb,
  plan text not null default 'starter',
  status public.record_status not null default 'ativo',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.law_firm_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  avatar_url text,
  position text,
  role public.member_role not null default 'visualizador',
  status public.record_status not null default 'ativo',
  last_access_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, law_firm_id)
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  person_type text not null default 'fisica',
  document text,
  birth_date date,
  profession text,
  marital_status text,
  whatsapp text,
  phone text,
  email text,
  address jsonb not null default '{}'::jsonb,
  source text,
  interest_area text,
  responsible_member_id uuid references public.law_firm_members(id),
  status public.client_status not null default 'ativo',
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp text,
  email text,
  source text,
  interest text,
  funnel_stage text not null default 'novo',
  responsible_member_id uuid references public.law_firm_members(id),
  probability integer not null default 0 check (probability between 0 and 100),
  estimated_value_cents bigint not null default 0 check (estimated_value_cents >= 0),
  notes text,
  next_contact_at timestamptz,
  status public.lead_status not null default 'novo',
  converted_client_id uuid references public.clients(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid references public.clients(id),
  title text not null,
  case_kind text not null default 'judicial',
  action_type text,
  case_number text,
  court text,
  court_division text,
  district text,
  state text,
  started_at date,
  main_responsible_id uuid references public.law_firm_members(id),
  status public.case_status not null default 'em_analise',
  priority public.priority_level not null default 'normal',
  opposing_party text,
  opposing_lawyer text,
  strategic_notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint legal_cases_extrajudicial_number check (case_kind = 'extrajudicial' or case_number is not null)
);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  service_description text not null,
  total_amount_cents bigint not null check (total_amount_cents >= 0),
  upfront_amount_cents bigint not null default 0 check (upfront_amount_cents >= 0),
  balance_cents bigint not null check (balance_cents >= 0),
  has_installments boolean not null default false,
  installments_count integer not null default 1 check (installments_count >= 1),
  first_due_date date,
  frequency text,
  default_due_day integer check (default_due_day between 1 and 31),
  payment_method text,
  fine_cents bigint not null default 0,
  interest_basis_points integer not null default 0,
  discount_cents bigint not null default 0,
  success_fee text,
  responsible_member_id uuid references public.law_firm_members(id),
  status public.contract_status not null default 'rascunho',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_balance_matches check (balance_cents = total_amount_cents - upfront_amount_cents)
);

create table public.installments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  number integer not null check (number >= 1),
  original_amount_cents bigint not null check (original_amount_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  fine_cents bigint not null default 0 check (fine_cents >= 0),
  interest_cents bigint not null default 0 check (interest_cents >= 0),
  final_amount_cents bigint not null check (final_amount_cents >= 0),
  due_date date not null,
  paid_at timestamptz,
  paid_amount_cents bigint not null default 0 check (paid_amount_cents >= 0),
  payment_method text,
  status public.installment_status not null default 'pendente',
  receipt_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, number)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid not null references public.clients(id),
  contract_id uuid not null references public.contracts(id),
  installment_id uuid references public.installments(id),
  amount_cents bigint not null check (amount_cents > 0),
  payment_method text not null,
  paid_at timestamptz not null,
  discount_cents bigint not null default 0,
  fine_cents bigint not null default 0,
  interest_cents bigint not null default 0,
  receipt_path text,
  notes text,
  registered_by uuid references public.law_firm_members(id),
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  description text not null,
  category text,
  client_id uuid references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  supplier text,
  amount_cents bigint not null check (amount_cents >= 0),
  due_date date,
  paid_at timestamptz,
  status text not null default 'pendente',
  receipt_path text,
  responsible_member_id uuid references public.law_firm_members(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deadlines (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  title text not null,
  type text not null,
  client_id uuid references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  responsible_member_id uuid references public.law_firm_members(id),
  participant_ids uuid[] not null default '{}',
  due_date date not null,
  due_time time,
  priority public.priority_level not null default 'normal',
  status public.deadline_status not null default 'pendente',
  description text,
  checklist jsonb not null default '[]'::jsonb,
  reminders jsonb not null default '[]'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  title text not null,
  description text,
  client_id uuid references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  responsible_member_id uuid references public.law_firm_members(id),
  participant_ids uuid[] not null default '{}',
  priority public.priority_level not null default 'normal',
  status text not null default 'pendente',
  due_at timestamptz,
  checklist jsonb not null default '[]'::jsonb,
  comments jsonb not null default '[]'::jsonb,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  title text not null,
  type text not null default 'reuniao',
  starts_at timestamptz not null,
  ends_at timestamptz,
  client_id uuid references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  responsible_member_id uuid references public.law_firm_members(id),
  status text not null default 'agendado',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  mime_type text,
  size_bytes bigint not null default 0,
  storage_path text not null,
  entity_type text not null,
  entity_id uuid,
  uploaded_by uuid references public.law_firm_members(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  member_id uuid references public.law_firm_members(id),
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  actor_id uuid references public.law_firm_members(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.has_law_firm_access(target_law_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.law_firm_members m
    where m.law_firm_id = target_law_firm_id
      and m.user_id = auth.uid()
      and m.status = 'ativo'
  );
$$;

create or replace function public.has_law_firm_role(target_law_firm_id uuid, allowed_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.law_firm_members m
    where m.law_firm_id = target_law_firm_id
      and m.user_id = auth.uid()
      and m.status = 'ativo'
      and m.role = any(allowed_roles)
  );
$$;

create or replace function public.create_law_firm_with_owner(
  firm_name text,
  firm_slug text,
  firm_document text default null,
  firm_email text default null,
  firm_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_law_firm_id uuid;
  current_user_id uuid;
  current_user_email text;
  current_user_name text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select email, coalesce(raw_user_meta_data->>'name', email)
    into current_user_email, current_user_name
  from auth.users
  where id = current_user_id;

  insert into public.law_firms (name, slug, document, email, phone)
  values (firm_name, firm_slug, nullif(firm_document, ''), nullif(firm_email, ''), nullif(firm_phone, ''))
  returning id into new_law_firm_id;

  insert into public.law_firm_members (user_id, law_firm_id, name, email, role, status)
  values (current_user_id, new_law_firm_id, current_user_name, current_user_email, 'proprietario', 'ativo');

  insert into public.audit_logs (law_firm_id, actor_id, action, entity_type, entity_id, metadata)
  select new_law_firm_id, m.id, 'criou_escritorio', 'law_firm', new_law_firm_id, jsonb_build_object('slug', firm_slug)
  from public.law_firm_members m
  where m.user_id = current_user_id and m.law_firm_id = new_law_firm_id
  limit 1;

  return new_law_firm_id;
end;
$$;

grant execute on function public.create_law_firm_with_owner(text, text, text, text, text) to authenticated;

create or replace function public.convert_lead_to_client(target_lead_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lead_row public.leads%rowtype;
  new_client_id uuid;
begin
  select *
    into lead_row
  from public.leads
  where id = target_lead_id
  for update;

  if not found then
    raise exception 'Lead não encontrado.';
  end if;

  if not public.has_law_firm_access(lead_row.law_firm_id) then
    raise exception 'Acesso negado.';
  end if;

  if lead_row.converted_client_id is not null then
    return lead_row.converted_client_id;
  end if;

  insert into public.clients (
    law_firm_id,
    name,
    person_type,
    whatsapp,
    phone,
    email,
    source,
    interest_area,
    responsible_member_id,
    status,
    notes,
    tags
  )
  values (
    lead_row.law_firm_id,
    lead_row.name,
    'fisica',
    lead_row.whatsapp,
    lead_row.phone,
    lead_row.email,
    lead_row.source,
    lead_row.interest,
    lead_row.responsible_member_id,
    'ativo',
    lead_row.notes,
    array['convertido-de-lead']
  )
  returning id into new_client_id;

  update public.leads
  set status = 'convertido',
      converted_client_id = new_client_id,
      updated_at = now()
  where id = target_lead_id;

  insert into public.audit_logs (law_firm_id, actor_id, action, entity_type, entity_id, metadata)
  select lead_row.law_firm_id, m.id, 'converteu_lead_em_cliente', 'lead', target_lead_id, jsonb_build_object('client_id', new_client_id)
  from public.law_firm_members m
  where m.user_id = auth.uid()
    and m.law_firm_id = lead_row.law_firm_id
    and m.status = 'ativo'
  limit 1;

  return new_client_id;
end;
$$;

grant execute on function public.convert_lead_to_client(uuid) to authenticated;

create trigger law_firms_set_updated_at before update on public.law_firms for each row execute function public.set_updated_at();
create trigger law_firm_members_set_updated_at before update on public.law_firm_members for each row execute function public.set_updated_at();
create trigger clients_set_updated_at before update on public.clients for each row execute function public.set_updated_at();
create trigger leads_set_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger legal_cases_set_updated_at before update on public.legal_cases for each row execute function public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute function public.set_updated_at();
create trigger installments_set_updated_at before update on public.installments for each row execute function public.set_updated_at();
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger deadlines_set_updated_at before update on public.deadlines for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger appointments_set_updated_at before update on public.appointments for each row execute function public.set_updated_at();

create index law_firm_members_user_id_idx on public.law_firm_members(user_id);
create index clients_law_firm_status_idx on public.clients(law_firm_id, status);
create index leads_law_firm_status_idx on public.leads(law_firm_id, status);
create index legal_cases_law_firm_status_idx on public.legal_cases(law_firm_id, status);
create index deadlines_law_firm_due_date_idx on public.deadlines(law_firm_id, due_date);
create index installments_law_firm_due_date_idx on public.installments(law_firm_id, due_date, status);
create index payments_law_firm_paid_at_idx on public.payments(law_firm_id, paid_at);
create index audit_logs_law_firm_created_at_idx on public.audit_logs(law_firm_id, created_at desc);

alter table public.law_firms enable row level security;
alter table public.law_firm_members enable row level security;
alter table public.clients enable row level security;
alter table public.leads enable row level security;
alter table public.legal_cases enable row level security;
alter table public.contracts enable row level security;
alter table public.installments enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.deadlines enable row level security;
alter table public.tasks enable row level security;
alter table public.appointments enable row level security;
alter table public.documents enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "members can view their law firms" on public.law_firms for select using (public.has_law_firm_access(id));
create policy "owners and admins can update law firms" on public.law_firms for update using (public.has_law_firm_role(id, array['proprietario','administrador']::public.member_role[]));

create policy "members can view members in same law firm" on public.law_firm_members for select using (public.has_law_firm_access(law_firm_id));
create policy "admins can manage members" on public.law_firm_members for all using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador']::public.member_role[]));

create policy "tenant select clients" on public.clients for select using (public.has_law_firm_access(law_firm_id));
create policy "tenant write clients" on public.clients for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));

create policy "tenant select leads" on public.leads for select using (public.has_law_firm_access(law_firm_id));
create policy "tenant write leads" on public.leads for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));

create policy "tenant select legal cases" on public.legal_cases for select using (public.has_law_firm_access(law_firm_id));
create policy "tenant write legal cases" on public.legal_cases for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));

create policy "tenant select contracts" on public.contracts for select using (public.has_law_firm_access(law_firm_id));
create policy "financial roles write contracts" on public.contracts for all using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[]));

create policy "tenant select installments" on public.installments for select using (public.has_law_firm_access(law_firm_id));
create policy "financial roles write installments" on public.installments for all using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[]));

create policy "tenant select payments" on public.payments for select using (public.has_law_firm_access(law_firm_id));
create policy "financial roles write payments" on public.payments for all using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[]));

create policy "tenant access expenses" on public.expenses for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access deadlines" on public.deadlines for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access tasks" on public.tasks for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access appointments" on public.appointments for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access documents" on public.documents for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access notifications" on public.notifications for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant select audit logs" on public.audit_logs for select using (public.has_law_firm_access(law_firm_id));
create policy "tenant insert audit logs" on public.audit_logs for insert with check (public.has_law_firm_access(law_firm_id));

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "tenant document uploads" on storage.objects for insert with check (
  bucket_id = 'documents'
  and public.has_law_firm_access(((storage.foldername(name))[1])::uuid)
);

create policy "tenant document reads" on storage.objects for select using (
  bucket_id = 'documents'
  and public.has_law_firm_access(((storage.foldername(name))[1])::uuid)
);

create policy "tenant document updates" on storage.objects for update using (
  bucket_id = 'documents'
  and public.has_law_firm_access(((storage.foldername(name))[1])::uuid)
) with check (
  bucket_id = 'documents'
  and public.has_law_firm_access(((storage.foldername(name))[1])::uuid)
);
-- <<< canonical source: 0001_foundation.sql


-- >>> canonical source: 0002_operational_completeness.sql
create table public.legal_case_parties (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  legal_case_id uuid not null references public.legal_cases(id) on delete cascade,
  name text not null,
  party_role text not null,
  document text,
  contact text,
  created_at timestamptz not null default now()
);

create table public.legal_case_collaborators (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  legal_case_id uuid not null references public.legal_cases(id) on delete cascade,
  member_id uuid not null references public.law_firm_members(id) on delete cascade,
  collaborator_role text,
  created_at timestamptz not null default now(),
  unique (legal_case_id, member_id)
);

create table public.legal_case_movements (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  legal_case_id uuid not null references public.legal_cases(id) on delete cascade,
  title text not null,
  description text,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.law_firm_members(id),
  created_at timestamptz not null default now()
);

create table public.team_invitations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  email text not null,
  role public.member_role not null default 'colaborador',
  token text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'cancelado', 'expirado')),
  invited_by uuid references public.law_firm_members(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index legal_case_parties_case_idx on public.legal_case_parties(law_firm_id, legal_case_id);
create index legal_case_collaborators_case_idx on public.legal_case_collaborators(law_firm_id, legal_case_id);
create index legal_case_movements_case_idx on public.legal_case_movements(law_firm_id, legal_case_id, occurred_at desc);
create index team_invitations_tenant_idx on public.team_invitations(law_firm_id, status, created_at desc);

alter table public.legal_case_parties enable row level security;
alter table public.legal_case_collaborators enable row level security;
alter table public.legal_case_movements enable row level security;
alter table public.team_invitations enable row level security;

create policy "tenant access case parties" on public.legal_case_parties for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access case collaborators" on public.legal_case_collaborators for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "tenant access case movements" on public.legal_case_movements for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
create policy "admins manage invitations" on public.team_invitations for all using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador']::public.member_role[]));
-- <<< canonical source: 0002_operational_completeness.sql


-- >>> canonical source: 0003_financial_reversals.sql
alter table public.payments add column if not exists reversed_at timestamptz;
alter table public.payments add column if not exists reversal_reason text;
create index if not exists payments_law_firm_reversed_idx on public.payments(law_firm_id, reversed_at);
-- <<< canonical source: 0003_financial_reversals.sql


-- >>> canonical source: 0004_storage_delete_policy.sql
-- Adicionar DELETE policy para o bucket de documentos
-- Permite que membros do tenant deletem seus próprios documentos
CREATE POLICY "Tenant document deletes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT law_firm_id::text
      FROM public.law_firm_members
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );
-- <<< canonical source: 0004_storage_delete_policy.sql


-- >>> canonical source: 0005_invitation_rls_fix.sql
-- Migration 0005: Fix RLS policies for invitation acceptance flow.
-- PROBLEM: When a user accepts an invitation, they are NOT yet a member of the tenant,
-- so existing RLS policies block the inserts. BUT the original policy 0005 allowed any
-- authenticated user to self-insert into ANY tenant. This is now fixed.

-- 1. Allow authenticated users to insert themselves as law_firm_members ONLY IF
--    there is a pending invitation for their email in that tenant.
--    This prevents arbitrary users from joining any tenant.
DROP POLICY IF EXISTS "authenticated users can self-insert as member" ON public.law_firm_members;

CREATE POLICY "invited users can self-insert as member"
  ON public.law_firm_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.team_invitations ti
      WHERE ti.law_firm_id = law_firm_members.law_firm_id
        AND ti.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND ti.status = 'pendente'
        AND ti.expires_at > now()
    )
  );

-- 2. Allow authenticated users to read invitations addressed to their email.
DROP POLICY IF EXISTS "users can view own invitations" ON public.team_invitations;

CREATE POLICY "users can view own invitations"
  ON public.team_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 3. Allow authenticated users to accept (update) invitations addressed to their email.
--    Restricts: only pending invitations, only to 'aceito' status.
DROP POLICY IF EXISTS "users can accept own invitation" ON public.team_invitations;

CREATE POLICY "users can accept own invitation"
  ON public.team_invitations
  FOR UPDATE
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pendente'
  )
  WITH CHECK (
    status = 'aceito'
  );

-- 4. Tighten RLS policies for write operations on expenses, deadlines, tasks,
--    appointments, documents, and notifications.
--    Only owners, administrators, and role-appropriate members can write.

-- Expenses: owners, admins, financial, and assigned members can manage
DROP POLICY IF EXISTS "tenant access expenses" ON public.expenses;
DROP POLICY IF EXISTS "tenant expense management" ON public.expenses;
CREATE POLICY "tenant expense management"
  ON public.expenses
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'financeiro']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = expenses.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'financeiro']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = expenses.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );

-- Deadlines: owners, admins, lawyers, and assigned members can manage
DROP POLICY IF EXISTS "tenant access deadlines" ON public.deadlines;
DROP POLICY IF EXISTS "tenant deadline management" ON public.deadlines;
CREATE POLICY "tenant deadline management"
  ON public.deadlines
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR (participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )])
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = deadlines.law_firm_id AND status = 'ativo'
        LIMIT 1
      )]
    )
  );

-- Tasks: owners, admins, lawyers, assistants, and assigned members can manage
DROP POLICY IF EXISTS "tenant access tasks" ON public.tasks;
DROP POLICY IF EXISTS "tenant task management" ON public.tasks;
CREATE POLICY "tenant task management"
  ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente', 'colaborador']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR (participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )])
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente', 'colaborador']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
      OR participant_ids @> ARRAY[(
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = tasks.law_firm_id AND status = 'ativo'
        LIMIT 1
      )]
    )
  );

-- Appointments: owners, admins, lawyers, and assigned members can manage
DROP POLICY IF EXISTS "tenant access appointments" ON public.appointments;
DROP POLICY IF EXISTS "tenant appointment management" ON public.appointments;
CREATE POLICY "tenant appointment management"
  ON public.appointments
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = appointments.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador', 'advogado', 'assistente']::public.member_role[])
      OR responsible_member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = appointments.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );

-- Documents: owners, admins can manage all; others can manage their own uploads
DROP POLICY IF EXISTS "tenant access documents" ON public.documents;
DROP POLICY IF EXISTS "tenant document management" ON public.documents;
CREATE POLICY "tenant document management"
  ON public.documents
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR uploaded_by = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = documents.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR uploaded_by = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = documents.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );

-- Notifications: members can read their own notifications, owners/admins can manage all
DROP POLICY IF EXISTS "tenant access notifications" ON public.notifications;
DROP POLICY IF EXISTS "tenant notification management" ON public.notifications;
CREATE POLICY "tenant notification management"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = notifications.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  )
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND (
      has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
      OR member_id = (
        SELECT id FROM public.law_firm_members
        WHERE user_id = auth.uid() AND law_firm_id = notifications.law_firm_id AND status = 'ativo'
        LIMIT 1
      )
    )
  );
-- <<< canonical source: 0005_invitation_rls_fix.sql


-- >>> canonical source: 0006_payment_rpc.sql
-- Transactional payment registration via RPC
-- Ensures payment, installment update, and contract balance recalculation
-- happen atomically in a single database transaction.
-- SECURITY: Uses search_path='', verifies tenant membership and role.

CREATE OR REPLACE FUNCTION public.register_payment(
  p_law_firm_id uuid,
  p_installment_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_paid_at timestamptz,
  p_discount_cents bigint DEFAULT 0,
  p_fine_cents bigint DEFAULT 0,
  p_interest_cents bigint DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_registered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id uuid;
  v_contract_id uuid;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
  v_remaining bigint;
BEGIN
  -- 1. Get the authenticated user's ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verify caller belongs to this tenant and has financial role
  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode registrar pagamentos', v_member.role;
  END IF;

  -- 3. Validate registered_by matches caller (or is NULL)
  IF p_registered_by IS NOT NULL AND p_registered_by != v_caller_id THEN
    RAISE EXCEPTION 'registered_by deve corresponder ao usuário autenticado';
  END IF;

  -- Lock the installment row to prevent concurrent modifications
  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = p_installment_id AND law_firm_id = p_law_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  -- Idempotency: check for duplicate payment on same installment + amount + date
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE installment_id = p_installment_id
      AND amount_cents = p_amount_cents
      AND paid_at::date = p_paid_at::date
      AND reversed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pagamento duplicado detectado';
  END IF;

  -- Calculate remaining balance and reject overpayment
  v_remaining := v_installment.final_amount_cents - v_installment.paid_amount_cents;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF p_amount_cents > v_remaining THEN
    RAISE EXCEPTION 'Valor excede o saldo da parcela (R$ %)', (v_remaining / 100.0)::text;
  END IF;

  -- Calculate new paid amount
  v_new_paid := v_installment.paid_amount_cents + p_amount_cents;
  v_contract_id := v_installment.contract_id;

  -- Determine new status
  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  -- Update installment
  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      paid_at = p_paid_at,
      payment_method = p_payment_method,
      status = v_new_status::installment_status,
      discount_cents = installments.discount_cents + p_discount_cents,
      fine_cents = installments.fine_cents + p_fine_cents,
      interest_cents = installments.interest_cents + p_interest_cents,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_installment_id;

  -- Insert payment record
  INSERT INTO public.payments (
    law_firm_id, installment_id, client_id, contract_id,
    amount_cents, payment_method, paid_at,
    discount_cents, fine_cents, interest_cents,
    notes, registered_by
  ) VALUES (
    p_law_firm_id, p_installment_id, v_installment.client_id, v_contract_id,
    p_amount_cents, p_payment_method, p_paid_at,
    p_discount_cents, p_fine_cents, p_interest_cents,
    p_notes, p_registered_by
  ) RETURNING id INTO v_payment_id;

  -- Recalculate contract balance
  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

-- Reverse a payment and recalculate installment + contract balance atomically
CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_law_firm_id uuid,
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
BEGIN
  -- 1. Get the authenticated user's ID
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Verify caller belongs to this tenant and has financial role
  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode estornar pagamentos', v_member.role;
  END IF;

  -- Lock and get payment
  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND law_firm_id = p_law_firm_id AND reversed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou já estornado';
  END IF;

  -- Mark payment as reversed
  UPDATE public.payments
  SET reversed_at = now(),
      reversal_reason = p_reason
  WHERE id = p_payment_id;

  -- Lock installment
  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = v_payment.installment_id
  FOR UPDATE;

  -- Recalculate installment
  v_new_paid := GREATEST(v_installment.paid_amount_cents - v_payment.amount_cents, 0);

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      status = v_new_status::installment_status,
      updated_at = now()
  WHERE id = v_payment.installment_id;

  -- Recalculate contract balance
  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_payment.contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_payment.contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment(uuid, uuid, bigint, text, timestamptz, bigint, bigint, bigint, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_payment(uuid, uuid, text) TO authenticated;
-- <<< canonical source: 0006_payment_rpc.sql


-- >>> canonical source: 0007_lgpd_privacy.sql
-- Technical LGPD controls: consent evidence and data-subject requests.
create table public.privacy_consents (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid references public.law_firms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  subject_email text,
  purpose text not null,
  legal_basis text not null,
  policy_version text not null,
  status text not null default 'ativo' check (status in ('ativo', 'revogado')),
  source text not null default 'sistema',
  consented_at timestamptz not null default now(),
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  request_type text not null check (request_type in ('informacao', 'acesso', 'correcao', 'portabilidade', 'anonimizacao', 'eliminacao', 'revogacao')),
  details text,
  status text not null default 'recebida' check (status in ('recebida', 'em_analise', 'atendida', 'negada', 'cancelada')),
  due_at timestamptz not null default (now() + interval '15 days'),
  resolution_notes text,
  handled_by uuid references public.law_firm_members(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index privacy_consents_tenant_subject_idx on public.privacy_consents(law_firm_id, subject_email);
create index privacy_requests_tenant_status_idx on public.privacy_requests(law_firm_id, status, due_at);

alter table public.privacy_consents enable row level security;
alter table public.privacy_requests enable row level security;

create policy "tenant privacy consent access" on public.privacy_consents
  for all using (law_firm_id is not null and public.has_law_firm_access(law_firm_id))
  with check (law_firm_id is not null and public.has_law_firm_access(law_firm_id));

create policy "tenant privacy requests access" on public.privacy_requests
  for all using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

-- Public requests resolve a tenant by slug without exposing the tenant row.
create or replace function public.find_law_firm_id_by_slug(target_slug text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.law_firms where slug = lower(trim(target_slug)) and status = 'ativo' limit 1;
$$;

grant execute on function public.find_law_firm_id_by_slug(text) to anon, authenticated;

create or replace function public.is_active_law_firm(target_law_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.law_firms
    where id = target_law_firm_id and status = 'ativo'
  );
$$;

grant execute on function public.is_active_law_firm(uuid) to anon, authenticated;

create policy "public can submit privacy requests" on public.privacy_requests
  for insert to anon, authenticated
  with check (public.is_active_law_firm(privacy_requests.law_firm_id));
-- <<< canonical source: 0007_lgpd_privacy.sql


-- >>> canonical source: 0007_admin_panel.sql
-- Admin panel: superadmin function + RLS policies

-- Function to check if current user is a superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    (auth.jwt()->'app_metadata'->>'role') = 'superadmin',
    false
  )
$$;

-- RLS policies for superadmin cross-tenant access
-- These are a safety net in case someone accidentally uses the anon client

-- Superadmins can view all tenants
ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can view all tenants"
  ON public.law_firms FOR SELECT
  USING (public.is_superadmin());

CREATE POLICY "Superadmins can update tenants"
  ON public.law_firms FOR UPDATE
  USING (public.is_superadmin());

-- Superadmins can view all members
ALTER TABLE public.law_firm_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can view all members"
  ON public.law_firm_members FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Superadmins can view all audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all clients (for tenant metrics)
CREATE POLICY "Superadmins can view all clients"
  ON public.clients FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all contracts (for tenant metrics)
CREATE POLICY "Superadmins can view all contracts"
  ON public.contracts FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all installments
CREATE POLICY "Superadmins can view all installments"
  ON public.installments FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all payments
CREATE POLICY "Superadmins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all legal_cases
CREATE POLICY "Superadmins can view all legal_cases"
  ON public.legal_cases FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all documents
CREATE POLICY "Superadmins can view all documents"
  ON public.documents FOR SELECT
  USING (public.is_superadmin());

-- Superadmins can view all leads
CREATE POLICY "Superadmins can view all leads"
  ON public.leads FOR SELECT
  USING (public.is_superadmin());
-- <<< canonical source: 0007_admin_panel.sql


-- >>> canonical source: 0008_self_account_deletion.sql
-- Self-service account deletion. Shared office records are retained and only
-- references that identify the departing member are removed.
create or replace function public.delete_my_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  member_ids uuid[];
  document_paths text[];
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into member_ids
  from public.law_firm_members
  where user_id = current_user_id;

  if cardinality(member_ids) = 0 then
    return jsonb_build_object('storage_paths', '[]'::jsonb);
  end if;

  select coalesce(array_agg(storage_path), '{}'::text[])
    into document_paths
  from public.documents
  where uploaded_by = any(member_ids);

  delete from public.legal_case_collaborators where member_id = any(member_ids);
  delete from public.notifications where member_id = any(member_ids);
  delete from public.documents where uploaded_by = any(member_ids);

  update public.clients set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.leads set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.legal_cases set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.contracts set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.expenses set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.deadlines set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.tasks set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.appointments set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.payments set registered_by = null where registered_by = any(member_ids);
  update public.legal_case_movements set created_by = null where created_by = any(member_ids);
  update public.privacy_requests set handled_by = null where handled_by = any(member_ids);
  update public.team_invitations set invited_by = null where invited_by = any(member_ids);
  update public.audit_logs set actor_id = null where actor_id = any(member_ids);

  update public.deadlines
    set participant_ids = array( select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids) )
    where participant_ids && member_ids;
  update public.tasks
    set participant_ids = array( select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids) )
    where participant_ids && member_ids;

  delete from public.privacy_consents where user_id = current_user_id;
  delete from public.law_firm_members where user_id = current_user_id;

  return jsonb_build_object('storage_paths', to_jsonb(coalesce(document_paths, '{}'::text[])));
end;
$$;

revoke all on function public.delete_my_account_data() from public;
grant execute on function public.delete_my_account_data() to authenticated;
-- <<< canonical source: 0008_self_account_deletion.sql


-- >>> canonical source: 0009_stripe_billing.sql
alter table public.law_firms
  add column if not exists stripe_customer_id text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_current_period_end timestamptz,
  add column if not exists stripe_billing_status text not null default 'inactive',
  add column if not exists stripe_last_payment_at timestamptz,
  add column if not exists stripe_updated_at timestamptz;

create index if not exists law_firms_stripe_customer_idx on public.law_firms(stripe_customer_id);
create index if not exists law_firms_stripe_subscription_idx on public.law_firms(stripe_subscription_id);
-- <<< canonical source: 0009_stripe_billing.sql


-- >>> canonical source: 0010_portal_workflows_time_tracking.sql
-- 0010_portal_workflows_time_tracking.sql
-- Portal do cliente, templates de workflow, controle de horas,
-- exportacao de calendario e conflict check basico.

create table if not exists public.client_portal_invites (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token text not null unique,
  email text,
  status text not null default 'ativo' check (status in ('ativo', 'revogado', 'expirado')),
  expires_at timestamptz,
  last_access_at timestamptz,
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  description text,
  practice_area text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_template_items (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  item_type text not null check (item_type in ('task', 'deadline')),
  title text not null,
  description text,
  offset_days integer not null default 0,
  priority text not null default 'normal',
  responsible_role text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  member_id uuid not null references public.law_firm_members(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  description text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer not null check (duration_minutes > 0),
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),
  billable boolean not null default true,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovado', 'faturado', 'cancelado')),
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_portal_invites_law_firm_client_idx on public.client_portal_invites(law_firm_id, client_id);
create index if not exists workflow_templates_law_firm_status_idx on public.workflow_templates(law_firm_id, status);
create index if not exists workflow_template_items_template_idx on public.workflow_template_items(template_id, sort_order);
create index if not exists time_entries_law_firm_started_idx on public.time_entries(law_firm_id, started_at desc);
create index if not exists time_entries_case_idx on public.time_entries(law_firm_id, legal_case_id);

drop trigger if exists workflow_templates_set_updated_at on public.workflow_templates;
create trigger workflow_templates_set_updated_at before update on public.workflow_templates for each row execute function public.set_updated_at();

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at before update on public.time_entries for each row execute function public.set_updated_at();

alter table public.client_portal_invites enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_template_items enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "tenant access client portal invites" on public.client_portal_invites;
create policy "tenant access client portal invites"
  on public.client_portal_invites
  for all
  using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]));

drop policy if exists "tenant access workflow templates" on public.workflow_templates;
create policy "tenant access workflow templates"
  on public.workflow_templates
  for all
  using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]));

drop policy if exists "tenant access workflow template items" on public.workflow_template_items;
create policy "tenant access workflow template items"
  on public.workflow_template_items
  for all
  using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]));

drop policy if exists "tenant access time entries" on public.time_entries;
create policy "tenant access time entries"
  on public.time_entries
  for all
  using (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])
    or member_id in (select id from public.law_firm_members where user_id = auth.uid() and law_firm_id = time_entries.law_firm_id and status = 'ativo')
  )
  with check (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])
    or member_id in (select id from public.law_firm_members where user_id = auth.uid() and law_firm_id = time_entries.law_firm_id and status = 'ativo')
  );

insert into public.workflow_templates (law_firm_id, name, description, practice_area, created_by)
select lf.id, 'Processo judicial padrao', 'Cria tarefas e prazos iniciais para um novo processo judicial.', 'contencioso', lfm.id
from public.law_firms lf
join public.law_firm_members lfm on lfm.law_firm_id = lf.id and lfm.role = 'proprietario'
where not exists (
  select 1 from public.workflow_templates wt where wt.law_firm_id = lf.id and wt.name = 'Processo judicial padrao'
);

insert into public.workflow_template_items (law_firm_id, template_id, item_type, title, description, offset_days, priority, sort_order)
select wt.law_firm_id, wt.id, seed.item_type, seed.title, seed.description, seed.offset_days, seed.priority, seed.sort_order
from public.workflow_templates wt
cross join (values
  ('task', 'Conferir documentos iniciais', 'Validar procuração, documentos pessoais e provas enviadas pelo cliente.', 0, 'alta', 10),
  ('task', 'Definir tese e estratégia', 'Registrar tese principal, riscos e próximos passos do caso.', 2, 'alta', 20),
  ('deadline', 'Prazo interno de revisão inicial', 'Revisão do responsável antes de qualquer protocolo.', 5, 'normal', 30),
  ('task', 'Preparar minuta da peça', 'Criar primeira minuta da petição ou manifestação.', 7, 'normal', 40)
) as seed(item_type, title, description, offset_days, priority, sort_order)
where wt.name = 'Processo judicial padrao'
  and not exists (
    select 1 from public.workflow_template_items wti
    where wti.template_id = wt.id and wti.title = seed.title
  );

create or replace function public.delete_my_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  member_ids uuid[];
  document_paths text[];
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into member_ids
  from public.law_firm_members
  where user_id = current_user_id;

  if cardinality(member_ids) = 0 then
    return jsonb_build_object('storage_paths', '[]'::jsonb);
  end if;

  select coalesce(array_agg(storage_path), '{}'::text[])
    into document_paths
  from public.documents
  where uploaded_by = any(member_ids);

  delete from public.time_entries where member_id = any(member_ids);
  delete from public.legal_case_collaborators where member_id = any(member_ids);
  delete from public.notifications where member_id = any(member_ids);
  delete from public.documents where uploaded_by = any(member_ids);

  update public.clients set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.leads set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.legal_cases set main_responsible_id = null where main_responsible_id = any(member_ids);
  update public.contracts set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.expenses set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.deadlines set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.tasks set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.appointments set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.payments set registered_by = null where registered_by = any(member_ids);
  update public.legal_case_movements set created_by = null where created_by = any(member_ids);
  update public.privacy_requests set handled_by = null where handled_by = any(member_ids);
  update public.team_invitations set invited_by = null where invited_by = any(member_ids);
  update public.client_portal_invites set created_by = null where created_by = any(member_ids);
  update public.workflow_templates set created_by = null where created_by = any(member_ids);
  update public.time_entries set created_by = null where created_by = any(member_ids);
  update public.audit_logs set actor_id = null where actor_id = any(member_ids);

  update public.deadlines
    set participant_ids = array(select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids))
    where participant_ids && member_ids;
  update public.tasks
    set participant_ids = array(select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids))
    where participant_ids && member_ids;

  delete from public.privacy_consents where user_id = current_user_id;
  delete from public.law_firm_members where user_id = current_user_id;

  return jsonb_build_object('storage_paths', to_jsonb(coalesce(document_paths, '{}'::text[])));
end;
$$;

revoke all on function public.delete_my_account_data() from public;
grant execute on function public.delete_my_account_data() to authenticated;
-- <<< canonical source: 0010_portal_workflows_time_tracking.sql


-- >>> canonical source: 0011_timeline_comments_notifications.sql
-- =============================================================================
-- Migration 0011: Activity Timeline, Comments, Notifications & Full-Text Search
-- =============================================================================
-- Adds:
--   1. Activity Timeline (activity_events table)
--   2. Comments System (comments + comment_mentions)
--   3. Notification Preferences + Enhanced Notifications
--   4. Full-Text Search Enhancement (tsvector + GIN indexes)
-- =============================================================================

-- =============================================================================
-- 1. Activity Timeline
-- =============================================================================

CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
  actor_name text,
  event_type text NOT NULL,  -- 'created', 'updated', 'status_changed', 'comment', 'document', 'payment', 'deadline', 'task', 'workflow', 'mention', 'import', 'bulk_action'
  entity_type text NOT NULL, -- 'client', 'lead', 'legal_case', 'contract', 'installment', 'payment', 'task', 'deadline', 'document', 'expense', 'time_entry', 'workflow', 'comment'
  entity_id uuid NOT NULL,
  entity_title text,         -- denormalized title for display
  description text,          -- human-readable description
  metadata jsonb DEFAULT '{}', -- extra data (old_value, new_value, etc)
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_events_law_firm ON public.activity_events(law_firm_id, created_at DESC);
CREATE INDEX idx_activity_events_entity ON public.activity_events(entity_type, entity_id);
CREATE INDEX idx_activity_events_type ON public.activity_events(law_firm_id, event_type);

-- RLS
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view own firm events" ON public.activity_events FOR SELECT USING (public.has_law_firm_access(law_firm_id));
CREATE POLICY "System can insert events" ON public.activity_events FOR INSERT WITH CHECK (public.has_law_firm_access(law_firm_id));

-- =============================================================================
-- 2. Comments System
-- =============================================================================

CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
  author_name text,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE, -- threading
  content text NOT NULL,
  is_private boolean DEFAULT false, -- internal only, not visible in client portal
  is_deleted boolean DEFAULT false, -- soft delete
  edited_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id, created_at);
CREATE INDEX idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_law_firm ON public.comments(law_firm_id, created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view comments on own firm" ON public.comments FOR SELECT USING (public.has_law_firm_access(law_firm_id));
CREATE POLICY "Members can insert comments" ON public.comments FOR INSERT WITH CHECK (public.has_law_firm_access(law_firm_id));
CREATE POLICY "Authors can update own comments" ON public.comments FOR UPDATE USING (author_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid() AND law_firm_id = comments.law_firm_id AND status = 'ativo'));
CREATE POLICY "Authors can soft-delete own comments" ON public.comments FOR UPDATE USING (author_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid() AND law_firm_id = comments.law_firm_id AND status = 'ativo'));

-- Comment mentions (who was @mentioned)
CREATE TABLE public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.law_firm_members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, member_id)
);

CREATE INDEX idx_comment_mentions_member ON public.comment_mentions(member_id);

-- RLS
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view mentions in own firm" ON public.comment_mentions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_mentions.comment_id AND public.has_law_firm_access(c.law_firm_id))
);
CREATE POLICY "System can manage mentions" ON public.comment_mentions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.comments c WHERE c.id = comment_mentions.comment_id AND public.has_law_firm_access(c.law_firm_id))
);

-- =============================================================================
-- 3. Notification Preferences + Enhanced Notifications
-- =============================================================================

-- Notification preferences per member
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.law_firm_members(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'deadline_reminder', 'deadline_overdue', 'task_assigned', 'task_overdue', 'payment_received', 'payment_overdue', 'document_received', 'mention', 'workflow_update', 'client_portal_access'
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(law_firm_id, member_id, notification_type)
);

CREATE TRIGGER notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can manage own preferences" ON public.notification_preferences FOR ALL USING (
  member_id = (SELECT id FROM public.law_firm_members WHERE user_id = auth.uid() AND law_firm_id = notification_preferences.law_firm_id AND status = 'ativo')
);

-- Add archived_at to notifications for archive feature
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- =============================================================================
-- 4. Full-Text Search Enhancement
-- =============================================================================

-- Add tsvector columns for full-text search
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.legal_cases ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update client search vector
CREATE OR REPLACE FUNCTION public.update_clients_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.document, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.whatsapp, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_search_vector_trigger BEFORE INSERT OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_clients_search_vector();

-- Function to update leads search vector
CREATE OR REPLACE FUNCTION public.update_leads_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.email, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.phone, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.interest, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_search_vector_trigger BEFORE INSERT OR UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_leads_search_vector();

-- Function to update legal_cases search vector
CREATE OR REPLACE FUNCTION public.update_legal_cases_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.case_number, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.action_type, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.court, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.opposing_party, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.opposing_lawyer, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.strategic_notes, '')), 'D') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_cases_search_vector_trigger BEFORE INSERT OR UPDATE ON public.legal_cases FOR EACH ROW EXECUTE FUNCTION public.update_legal_cases_search_vector();

-- Function to update contracts search vector
CREATE OR REPLACE FUNCTION public.update_contracts_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.service_description, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contracts_search_vector_trigger BEFORE INSERT OR UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_contracts_search_vector();

-- Function to update tasks search vector
CREATE OR REPLACE FUNCTION public.update_tasks_search_vector()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_tasks_search_vector();

-- GIN indexes for full-text search
CREATE INDEX idx_clients_search ON public.clients USING GIN(search_vector);
CREATE INDEX idx_leads_search ON public.leads USING GIN(search_vector);
CREATE INDEX idx_legal_cases_search ON public.legal_cases USING GIN(search_vector);
CREATE INDEX idx_contracts_search ON public.contracts USING GIN(search_vector);
CREATE INDEX idx_tasks_search ON public.tasks USING GIN(search_vector);
-- <<< canonical source: 0011_timeline_comments_notifications.sql


-- >>> canonical source: 0012_global_search_function.sql
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
-- <<< canonical source: 0012_global_search_function.sql


-- >>> canonical source: 0013_checklists_and_pipeline.sql
-- Adiciona coluna checklist nos processos (consistente com tasks/deadlines)
alter table public.legal_cases
  add column if not exists checklist jsonb not null default '[]'::jsonb;

-- Tabela de templates de checklist para processos
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'geral',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS na tabela de templates
alter table public.checklist_templates enable row level security;

create policy "checklist_templates_tenant_access"
  on public.checklist_templates
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

-- Índice para busca rápida por tenant
create index if not exists idx_checklist_templates_law_firm
  on public.checklist_templates(law_firm_id);

-- Adiciona coluna tags nos templates de workflow se não existir
-- (já existe, não precisa)
-- <<< canonical source: 0013_checklists_and_pipeline.sql


-- >>> canonical source: 0014_document_requests.sql
-- Tabela de solicitações de documentos
create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  requested_by uuid not null references public.law_firm_members(id),
  title text not null,
  description text,
  document_type text not null default 'outro',
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  due_date date,
  completed_at timestamptz,
  document_id uuid references public.documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.document_requests enable row level security;

create policy "document_requests_tenant_access"
  on public.document_requests
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

-- Índices
create index if not exists idx_document_requests_law_firm
  on public.document_requests(law_firm_id);
create index if not exists idx_document_requests_status
  on public.document_requests(status);
create index if not exists idx_document_requests_client
  on public.document_requests(client_id);
-- <<< canonical source: 0014_document_requests.sql


-- >>> canonical source: 0015_correspondents_and_powers.sql
-- Tabela de correspondentes (advogados externos)
create table if not exists public.correspondents (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  oab text,
  email text,
  phone text,
  city text,
  state text,
  specialty text,
  notes text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.correspondents enable row level security;

create policy "correspondents_tenant_access"
  on public.correspondents
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

create index if not exists idx_correspondents_law_firm
  on public.correspondents(law_firm_id);

-- Tabela de procurações
create table if not exists public.powers_of_attorney (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  legal_case_id uuid references public.legal_cases(id),
  client_id uuid references public.clients(id),
  grantor_name text not null,
  grantor_document text,
  attorney_name text not null,
  attorney_document text,
  attorney_oab text,
  powers text[] not null default '{}',
  granted_at date not null default CURRENT_DATE,
  expires_at date,
  revoked_at date,
  status text not null default 'ativa' check (status in ('ativa', 'expirada', 'revogada')),
  document_id uuid references public.documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.powers_of_attorney enable row level security;

create policy "powers_of_attorney_tenant_access"
  on public.powers_of_attorney
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

create index if not exists idx_powers_of_attorney_law_firm
  on public.powers_of_attorney(law_firm_id);
create index if not exists idx_powers_of_attorney_case
  on public.powers_of_attorney(legal_case_id);
-- <<< canonical source: 0015_correspondents_and_powers.sql


-- >>> canonical source: 0016_custom_fields_and_export.sql
-- Definição de campos personalizados
create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  entity_type text not null check (entity_type in ('client', 'lead', 'legal_case')),
  label text not null,
  field_type text not null default 'text' check (field_type in ('text', 'number', 'date', 'select', 'boolean')),
  options jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Valores dos campos personalizados
create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  custom_field_id uuid not null references public.custom_fields(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(law_firm_id, custom_field_id, entity_id)
);

-- RLS
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;

create policy "custom_fields_tenant_access"
  on public.custom_fields
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

create policy "custom_field_values_tenant_access"
  on public.custom_field_values
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

create index if not exists idx_custom_fields_entity
  on public.custom_fields(law_firm_id, entity_type);
create index if not exists idx_custom_field_values_entity
  on public.custom_field_values(law_firm_id, entity_type, entity_id);
-- <<< canonical source: 0016_custom_fields_and_export.sql


-- >>> canonical source: 0017_law_firm_branding.sql
-- Branding do escritório: arquivo privado, isolado pelo primeiro segmento do caminho.
ALTER TABLE public.law_firms
  ADD COLUMN IF NOT EXISTS logo_path text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tenant branding uploads" ON storage.objects;
CREATE POLICY "tenant branding uploads" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  );

DROP POLICY IF EXISTS "tenant branding reads" ON storage.objects;
CREATE POLICY "tenant branding reads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'branding'
    AND public.has_law_firm_access(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "tenant branding updates" ON storage.objects;
CREATE POLICY "tenant branding updates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  ) WITH CHECK (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  );

DROP POLICY IF EXISTS "tenant branding deletes" ON storage.objects;
CREATE POLICY "tenant branding deletes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'branding'
    AND public.has_law_firm_role(
      ((storage.foldername(name))[1])::uuid,
      ARRAY['proprietario','administrador']::public.member_role[]
    )
  );
-- <<< canonical source: 0017_law_firm_branding.sql


-- >>> canonical source: 0018_crm_capture_automation.sql
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
-- <<< canonical source: 0018_crm_capture_automation.sql


-- >>> canonical source: 0019_document_templates.sql
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'geral',
  content text not null,
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists document_templates_law_firm_idx on public.document_templates(law_firm_id, category) where archived_at is null;
create trigger document_templates_set_updated_at before update on public.document_templates for each row execute function public.set_updated_at();
alter table public.document_templates enable row level security;
create policy document_templates_select on public.document_templates for select using (public.has_law_firm_access(law_firm_id));
create policy document_templates_write on public.document_templates for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
-- <<< canonical source: 0019_document_templates.sql


-- >>> canonical source: 0020_ai_rag_openrouter.sql
create extension if not exists vector with schema extensions;

create table if not exists public.ai_platform_settings (
  id text primary key default 'default',
  active_model text not null default 'openai/gpt-4o-mini',
  embedding_model text not null default 'openai/text-embedding-3-small',
  enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.ai_platform_settings (id) values ('default') on conflict (id) do nothing;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid references public.law_firms(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  operation text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(18, 10) not null default 0,
  generation_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_document_chunks (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  legal_case_id uuid references public.legal_cases(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_document_chunks_tenant_idx on public.ai_document_chunks(law_firm_id);
create index if not exists ai_document_chunks_embedding_idx on public.ai_document_chunks using hnsw (embedding vector_cosine_ops);

create or replace function public.match_ai_document_chunks(
  query_law_firm_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 8
)
returns table (id uuid, content text, metadata jsonb, similarity double precision)
language sql stable security invoker set search_path = public, extensions
as $$
  select c.id, c.content, c.metadata, 1 - (c.embedding <=> query_embedding) as similarity
  from public.ai_document_chunks c
  where c.law_firm_id = query_law_firm_id and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.ai_platform_settings enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_document_chunks enable row level security;
create policy ai_settings_admin on public.ai_platform_settings for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy ai_usage_tenant_select on public.ai_usage_logs for select using (law_firm_id is null or public.has_law_firm_access(law_firm_id) or public.is_superadmin());
create policy ai_chunks_tenant_select on public.ai_document_chunks for select using (public.has_law_firm_access(law_firm_id));
create policy ai_chunks_tenant_write on public.ai_document_chunks for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
-- <<< canonical source: 0020_ai_rag_openrouter.sql


-- >>> canonical source: 0021_plan_settings_and_admin_controls.sql
create table if not exists public.plan_settings (
  id text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.plan_settings (id, name, description, price_cents, features)
values
  ('starter', 'Starter', 'Para escritórios que querem organizar a operação desde o primeiro dia.', 0, '["Clientes e leads", "Processos e prazos", "Agenda e tarefas", "Documentos seguros"]'::jsonb),
  ('professional', 'Professional', 'Para equipes que precisam conectar operação, financeiro e produtividade.', 0, '["Tudo do Starter", "Contratos e recebimentos", "Relatórios gerenciais", "Gestão de equipe e permissões"]'::jsonb),
  ('business', 'Business', 'Para operações jurídicas maiores, com mais controle e escala.', 0, '["Tudo do Professional", "Múltiplos escritórios", "Governança e auditoria", "Atendimento prioritário"]'::jsonb)
on conflict (id) do nothing;

alter table public.plan_settings enable row level security;

drop policy if exists "public can view active plan settings" on public.plan_settings;
create policy "public can view active plan settings" on public.plan_settings
  for select using (active = true);
-- <<< canonical source: 0021_plan_settings_and_admin_controls.sql


-- >>> canonical source: 0022_admin_saas_advanced.sql
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
-- <<< canonical source: 0022_admin_saas_advanced.sql


-- >>> canonical source: 0023_security_mfa_sessions.sql
-- Security: MFA, sessoes ativas, politicas de seguranca e allowlist de IP.

-- ──────────────────────────────────────────────
-- 1. mfa_enrollments — Registros de MFA por usuario por escritorio
-- ──────────────────────────────────────────────

create table if not exists public.mfa_enrollments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  user_id uuid not null,
  member_id uuid not null references public.law_firm_members(id) on delete cascade,
  factor_type text not null default 'totp' check (factor_type in ('totp', 'sms')),
  secret text,
  phone text,
  verified boolean not null default false,
  enabled boolean not null default false,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. active_sessions — Sessoes ativas por usuario
-- ──────────────────────────────────────────────

create table if not exists public.active_sessions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  user_id uuid not null,
  member_id uuid not null references public.law_firm_members(id) on delete cascade,
  session_token text not null,
  ip_address text,
  user_agent text,
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. security_policies — Politicas de seguranca por escritorio
-- ──────────────────────────────────────────────

create table if not exists public.security_policies (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade unique,
  mfa_required boolean not null default false,
  mfa_min_role text not null default 'advogado',
  session_timeout_minutes integer not null default 480,
  password_min_length integer not null default 8,
  password_require_uppercase boolean not null default true,
  password_require_number boolean not null default true,
  password_require_symbol boolean not null default false,
  password_expiry_days integer not null default 0,
  ip_restriction_enabled boolean not null default false,
  force_logout_all boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. ip_allowlists — Allowlist de IP por escritorio
-- ──────────────────────────────────────────────

create table if not exists public.ip_allowlists (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  ip_address text not null,
  cidr_range text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────

create index if not exists mfa_enrollments_law_firm_idx on public.mfa_enrollments(law_firm_id, user_id);
create index if not exists active_sessions_law_firm_idx on public.active_sessions(law_firm_id, user_id);
create index if not exists active_sessions_token_idx on public.active_sessions(session_token);
create index if not exists ip_allowlists_law_firm_idx on public.ip_allowlists(law_firm_id) where is_active;

-- ──────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────

alter table public.mfa_enrollments enable row level security;
alter table public.active_sessions enable row level security;
alter table public.security_policies enable row level security;
alter table public.ip_allowlists enable row level security;

-- ──────────────────────────────────────────────
-- Policies: mfa_enrollments
-- ──────────────────────────────────────────────

create policy mfa_enrollments_select on public.mfa_enrollments
  for select using (
    public.has_law_firm_access(law_firm_id)
    or user_id = auth.uid()
  );

create policy mfa_enrollments_insert on public.mfa_enrollments
  for insert with check (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  );

create policy mfa_enrollments_update on public.mfa_enrollments
  for update using (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  ) with check (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  );

create policy mfa_enrollments_delete on public.mfa_enrollments
  for delete using (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  );

-- ──────────────────────────────────────────────
-- Policies: active_sessions
-- ──────────────────────────────────────────────

create policy active_sessions_select on public.active_sessions
  for select using (
    public.has_law_firm_access(law_firm_id)
    or user_id = auth.uid()
  );

create policy active_sessions_insert on public.active_sessions
  for insert with check (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  );

create policy active_sessions_update on public.active_sessions
  for update using (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  ) with check (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  );

create policy active_sessions_delete on public.active_sessions
  for delete using (
    public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[])
    or user_id = auth.uid()
  );

-- ──────────────────────────────────────────────
-- Policies: security_policies
-- ──────────────────────────────────────────────

create policy security_policies_select on public.security_policies
  for select using (public.has_law_firm_access(law_firm_id));

create policy security_policies_insert on public.security_policies
  for insert with check (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));

create policy security_policies_update on public.security_policies
  for update using (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));

create policy security_policies_delete on public.security_policies
  for delete using (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));

-- ──────────────────────────────────────────────
-- Policies: ip_allowlists
-- ──────────────────────────────────────────────

create policy ip_allowlists_select on public.ip_allowlists
  for select using (public.has_law_firm_access(law_firm_id));

create policy ip_allowlists_insert on public.ip_allowlists
  for insert with check (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));

create policy ip_allowlists_update on public.ip_allowlists
  for update using (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));

create policy ip_allowlists_delete on public.ip_allowlists
  for delete using (public.has_law_firm_role(law_firm_id, ARRAY['proprietario', 'administrador']::public.member_role[]));

-- ──────────────────────────────────────────────
-- Triggers: set_updated_at
-- ──────────────────────────────────────────────

create trigger mfa_enrollments_set_updated_at before update on public.mfa_enrollments for each row execute function public.set_updated_at();
create trigger security_policies_set_updated_at before update on public.security_policies for each row execute function public.set_updated_at();
-- <<< canonical source: 0023_security_mfa_sessions.sql


-- >>> canonical source: 0024_legal_publications.sql
-- Publicacoes judiciais: diarios oficiais, intimacoes, sentencas e demais publicacoes vinculadas a processos e clientes.

-- ──────────────────────────────────────────────
-- 1. legal_publications — Publicacoes judiciais
-- ──────────────────────────────────────────────

create table if not exists public.legal_publications (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  -- Vinculacao (opcional)
  legal_case_id uuid references public.legal_cases(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,

  -- Dados da publicacao
  tribunal text not null default '',
  diario text,
  case_number text,
  disponibilized_at date,
  published_at date,
  content text,
  summary text,

  -- Classificacao
  publication_type text not null default 'despacho'
    check (publication_type in ('intimacao','despacho','decisao','sentenca','acordao','citacao','publicacao_administrativa','outro')),
  origin text not null default 'manual'
    check (origin in ('manual','csv','importacao','webhook','sistema')),

  -- Fluxo
  status text not null default 'recebida'
    check (status in ('recebida','aguardando_triagem','em_analise','aguardando_distribuicao','aguardando_calculo','aguardando_revisao','tratada','ignorada','duplicada','arquivada')),
  priority text not null default 'normal'
    check (priority in ('baixa','normal','alta','urgente')),

  -- Atribuicao
  triage_member_id uuid references public.law_firm_members(id) on delete set null,
  responsible_member_id uuid references public.law_firm_members(id) on delete set null,

  -- Prazos
  suggested_deadline date,
  confirmed_deadline date,

  -- Tratamento
  treated_at timestamptz,
  treated_by text,
  treated_by_member_id uuid references public.law_firm_members(id) on delete set null,
  ignore_reason text,

  -- Revisao
  reviewed_at timestamptz,
  reviewed_by text,
  reviewed_by_member_id uuid references public.law_firm_members(id) on delete set null,
  review_notes text,

  -- Metadados
  observations text,
  is_read boolean not null default false,
  read_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. search_vector — Coluna para busca full-text
-- ──────────────────────────────────────────────

alter table public.legal_publications add column if not exists search_vector tsvector;

-- ──────────────────────────────────────────────
-- 3. Funcao de atualizacao do search_vector
-- ──────────────────────────────────────────────

create or replace function public.update_legal_publications_search_vector()
returns trigger
language plpgsql
as $function$
begin
  new.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(new.tribunal, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.case_number, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.content, '')), 'C');
  return new;
end;
$function$;

-- ──────────────────────────────────────────────
-- 4. Triggers
-- ──────────────────────────────────────────────

create trigger legal_publications_set_updated_at
  before update on public.legal_publications
  for each row execute function public.set_updated_at();

create trigger update_legal_publications_search_vector
  before insert or update on public.legal_publications
  for each row execute function public.update_legal_publications_search_vector();

-- ──────────────────────────────────────────────
-- 5. Indexes
-- ──────────────────────────────────────────────

create index if not exists legal_publications_law_firm_status_idx
  on public.legal_publications(law_firm_id, status);

create index if not exists legal_publications_law_firm_responsible_idx
  on public.legal_publications(law_firm_id, responsible_member_id);

create index if not exists legal_publications_case_idx
  on public.legal_publications(legal_case_id)
  where legal_case_id is not null;

create index if not exists legal_publications_client_idx
  on public.legal_publications(client_id)
  where client_id is not null;

create index if not exists legal_publications_disponibilized_idx
  on public.legal_publications(disponibilized_at)
  where disponibilized_at is not null;

create index if not exists legal_publications_search_idx
  on public.legal_publications using gin (search_vector);

-- ──────────────────────────────────────────────
-- 6. Row Level Security
-- ──────────────────────────────────────────────

alter table public.legal_publications enable row level security;

create policy legal_publications_select on public.legal_publications
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_publications_insert on public.legal_publications
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_publications_update on public.legal_publications
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_publications_delete on public.legal_publications
  for delete using (public.has_law_firm_access(law_firm_id));
-- <<< canonical source: 0024_legal_publications.sql


-- >>> canonical source: 0025_deadline_calculations.sql
-- Calculo de prazos processuais: calendarios legais, eventos e calculo automatico de prazos com suspensao e interrupcao.

-- ──────────────────────────────────────────────
-- 1. legal_calendars — Calendarios judiciais/legais
-- ──────────────────────────────────────────────

create table if not exists public.legal_calendars (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  country text not null default 'BR',
  state text,
  city text,
  tribunal text,
  judicial_unit text,

  calendar_type text not null default 'nacional'
    check (calendar_type in ('nacional','estadual','municipal','tribunal','judicial_unit')),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. calendar_events — Feriados, recessos, suspensao e indisponibilidade
-- ──────────────────────────────────────────────

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.legal_calendars(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  event_name text not null,
  event_type text not null
    check (event_type in ('feriado','recesso','suspensao','indisponibilidade','sem_expediente')),

  start_date date not null,
  end_date date not null,

  is_recurring boolean not null default false,
  recurrence_rule text,
  description text,

  created_at timestamptz not null default now(),

  constraint calendar_events_calendar_type_start_unique
    unique (calendar_id, event_type, start_date)
);

-- ──────────────────────────────────────────────
-- 3. deadline_calculations — Calculo de prazos
-- ──────────────────────────────────────────────

create table if not exists public.deadline_calculations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  -- Vinculacao
  deadline_id uuid references public.deadlines(id) on delete set null,
  publication_id uuid references public.legal_publications(id) on delete set null,

  -- Dados processuais
  tribunal text not null,
  jurisdition text,
  procedure_type text,
  rule_description text,

  -- Datas de referencia
  disponibilized_at timestamptz,
  published_at timestamptz,
  knowledge_at timestamptz,

  -- Parametros de calculo
  start_date date not null,
  quantity integer not null,
  unit text not null default 'dias'
    check (unit in ('dias','horas','meses','anos')),
  business_days boolean not null default true,
  include_start_date boolean not null default false,
  include_end_date boolean not null default true,

  -- Resultado
  calculated_date date,
  adjusted_date date,
  adjustment_reason text,

  -- Calendario utilizado
  calendar_id uuid references public.legal_calendars(id) on delete set null,
  holidays_considered jsonb not null default '[]'::jsonb,
  suspensions_considered jsonb not null default '[]'::jsonb,

  -- Fluxo de aprovacao
  calculated_by uuid,
  calculated_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,

  -- Status e versionamento
  status text not null default 'rascunho'
    check (status in ('rascunho','calculado','aguardando_revisao','revisado','confirmado','substituido','cancelado')),
  version integer not null default 1,
  previous_version_id uuid references public.deadline_calculations(id) on delete set null,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger legal_calendars_set_updated_at
  before update on public.legal_calendars
  for each row execute function public.set_updated_at();

create trigger deadline_calculations_set_updated_at
  before update on public.deadline_calculations
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 5. Indexes
-- ──────────────────────────────────────────────

-- legal_calendars
create index if not exists legal_calendars_law_firm_idx
  on public.legal_calendars(law_firm_id);

create index if not exists legal_calendars_tribunal_idx
  on public.legal_calendars(tribunal)
  where tribunal is not null;

-- calendar_events
create index if not exists calendar_events_calendar_id_idx
  on public.calendar_events(calendar_id);

create index if not exists calendar_events_law_firm_idx
  on public.calendar_events(law_firm_id);

create index if not exists calendar_events_dates_idx
  on public.calendar_events(start_date, end_date);

-- deadline_calculations
create index if not exists deadline_calculations_law_firm_idx
  on public.deadline_calculations(law_firm_id);

create index if not exists deadline_calculations_status_idx
  on public.deadline_calculations(law_firm_id, status);

create index if not exists deadline_calculations_deadline_idx
  on public.deadline_calculations(deadline_id)
  where deadline_id is not null;

create index if not exists deadline_calculations_calculated_date_idx
  on public.deadline_calculations(calculated_date)
  where calculated_date is not null;

create index if not exists deadline_calculations_tribunal_idx
  on public.deadline_calculations(tribunal);

create index if not exists deadline_calculations_version_idx
  on public.deadline_calculations(deadline_id, version)
  where deadline_id is not null;

-- ──────────────────────────────────────────────
-- 6. Row Level Security
-- ──────────────────────────────────────────────

alter table public.legal_calendars enable row level security;
alter table public.calendar_events enable row level security;
alter table public.deadline_calculations enable row level security;
-- <<< canonical source: 0025_deadline_calculations.sql


-- >>> canonical source: 0026_risk_values.sql
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
-- <<< canonical source: 0026_risk_values.sql


-- >>> canonical source: 0027_client_funds.sql
-- Valores de Clientes: contas, transacoes, alocacoes, reconciliacoes e extratos de fundos de clientes.

-- ──────────────────────────────────────────────
-- 1. client_funds_accounts — Contas de Fundos de Clientes
-- ──────────────────────────────────────────────

create table if not exists public.client_funds_accounts (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  client_id uuid not null references public.clients(id) on delete cascade,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  account_name text not null,
  balance numeric(15,2) not null default 0,
  currency text not null default 'BRL',

  status text not null default 'ativa'
    check (status in ('ativa','bloqueada','encerrada')),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. client_funds_transactions — Transacoes de Fundos
-- ──────────────────────────────────────────────

create table if not exists public.client_funds_transactions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  account_id uuid not null references public.client_funds_accounts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  transaction_type text not null
    check (transaction_type in ('entrada','retencao','repasse','devolucao','ajuste','estorno')),

  amount numeric(15,2) not null,
  description text not null,

  origin text,
  beneficiary text,

  receipt_number text,
  receipt_url text,

  authorized_by_member_id uuid,
  approval_required boolean not null default false,
  approved boolean not null default false,
  approved_by uuid,
  approved_at timestamptz,

  created_by uuid not null,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. client_funds_allocations — Alocacoes de Fundos
-- ──────────────────────────────────────────────

create table if not exists public.client_funds_allocations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  account_id uuid not null references public.client_funds_accounts(id) on delete cascade,
  transaction_id uuid references public.client_funds_transactions(id) on delete set null,

  allocation_type text not null
    check (allocation_type in ('honorarios','despesas','custas','outros')),

  amount numeric(15,2) not null,
  description text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. client_funds_reconciliations — Reconciliacoes
-- ──────────────────────────────────────────────

create table if not exists public.client_funds_reconciliations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  account_id uuid not null references public.client_funds_accounts(id) on delete cascade,

  reconciled_by uuid not null,
  reconciled_at timestamptz not null default now(),

  opening_balance numeric(15,2) not null,
  closing_balance numeric(15,2) not null,
  total_entries numeric(15,2) not null default 0,
  total_exits numeric(15,2) not null default 0,
  transaction_count integer not null default 0,

  notes text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. client_funds_statements — Extratos de Fundos
-- ──────────────────────────────────────────────

create table if not exists public.client_funds_statements (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  account_id uuid not null references public.client_funds_accounts(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  period_start date not null,
  period_end date not null,

  opening_balance numeric(15,2) not null,
  closing_balance numeric(15,2) not null,
  total_entries numeric(15,2) not null default 0,
  total_exits numeric(15,2) not null default 0,
  total_withheld numeric(15,2) not null default 0,
  total_repasse numeric(15,2) not null default 0,

  statement_data jsonb not null default '[]'::jsonb,

  generated_by uuid,
  generated_at timestamptz not null default now(),

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 6. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger client_funds_accounts_set_updated_at
  before update on public.client_funds_accounts
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 7. Indexes
-- ──────────────────────────────────────────────

-- client_funds_accounts
create index if not exists client_funds_accounts_law_firm_idx
  on public.client_funds_accounts(law_firm_id);

create index if not exists client_funds_accounts_law_firm_status_idx
  on public.client_funds_accounts(law_firm_id, status);

create index if not exists client_funds_accounts_client_idx
  on public.client_funds_accounts(client_id);

create index if not exists client_funds_accounts_case_idx
  on public.client_funds_accounts(legal_case_id)
  where legal_case_id is not null;

-- client_funds_transactions
create index if not exists client_funds_transactions_law_firm_idx
  on public.client_funds_transactions(law_firm_id);

create index if not exists client_funds_transactions_account_idx
  on public.client_funds_transactions(account_id);

create index if not exists client_funds_transactions_client_idx
  on public.client_funds_transactions(client_id);

create index if not exists client_funds_transactions_case_idx
  on public.client_funds_transactions(legal_case_id)
  where legal_case_id is not null;

create index if not exists client_funds_transactions_type_idx
  on public.client_funds_transactions(transaction_type);

create index if not exists client_funds_transactions_created_at_idx
  on public.client_funds_transactions(created_at);

-- client_funds_allocations
create index if not exists client_funds_allocations_law_firm_idx
  on public.client_funds_allocations(law_firm_id);

create index if not exists client_funds_allocations_account_idx
  on public.client_funds_allocations(account_id);

create index if not exists client_funds_allocations_transaction_idx
  on public.client_funds_allocations(transaction_id)
  where transaction_id is not null;

-- client_funds_reconciliations
create index if not exists client_funds_reconciliations_law_firm_idx
  on public.client_funds_reconciliations(law_firm_id);

create index if not exists client_funds_reconciliations_account_idx
  on public.client_funds_reconciliations(account_id);

create index if not exists client_funds_reconciliations_created_at_idx
  on public.client_funds_reconciliations(created_at);

-- client_funds_statements
create index if not exists client_funds_statements_law_firm_idx
  on public.client_funds_statements(law_firm_id);

create index if not exists client_funds_statements_account_idx
  on public.client_funds_statements(account_id);

create index if not exists client_funds_statements_client_idx
  on public.client_funds_statements(client_id);

create index if not exists client_funds_statements_case_idx
  on public.client_funds_statements(legal_case_id)
  where legal_case_id is not null;

-- ──────────────────────────────────────────────
-- 8. Row Level Security
-- ──────────────────────────────────────────────

alter table public.client_funds_accounts enable row level security;
alter table public.client_funds_transactions enable row level security;
alter table public.client_funds_allocations enable row level security;
alter table public.client_funds_reconciliations enable row level security;
alter table public.client_funds_statements enable row level security;

create policy client_funds_accounts_select on public.client_funds_accounts
  for select using (public.has_law_firm_access(law_firm_id));

create policy client_funds_accounts_insert on public.client_funds_accounts
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_accounts_update on public.client_funds_accounts
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_accounts_delete on public.client_funds_accounts
  for delete using (public.has_law_firm_access(law_firm_id));

create policy client_funds_transactions_select on public.client_funds_transactions
  for select using (public.has_law_firm_access(law_firm_id));

create policy client_funds_transactions_insert on public.client_funds_transactions
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_transactions_update on public.client_funds_transactions
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_transactions_delete on public.client_funds_transactions
  for delete using (public.has_law_firm_access(law_firm_id));

create policy client_funds_allocations_select on public.client_funds_allocations
  for select using (public.has_law_firm_access(law_firm_id));

create policy client_funds_allocations_insert on public.client_funds_allocations
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_allocations_update on public.client_funds_allocations
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_allocations_delete on public.client_funds_allocations
  for delete using (public.has_law_firm_access(law_firm_id));

create policy client_funds_reconciliations_select on public.client_funds_reconciliations
  for select using (public.has_law_firm_access(law_firm_id));

create policy client_funds_reconciliations_insert on public.client_funds_reconciliations
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_reconciliations_update on public.client_funds_reconciliations
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_reconciliations_delete on public.client_funds_reconciliations
  for delete using (public.has_law_firm_access(law_firm_id));

create policy client_funds_statements_select on public.client_funds_statements
  for select using (public.has_law_firm_access(law_firm_id));

create policy client_funds_statements_insert on public.client_funds_statements
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_statements_update on public.client_funds_statements
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy client_funds_statements_delete on public.client_funds_statements
  for delete using (public.has_law_firm_access(law_firm_id));
-- <<< canonical source: 0027_client_funds.sql


-- >>> canonical source: 0028_legal_requests_sla.sql
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
-- <<< canonical source: 0028_legal_requests_sla.sql


-- >>> canonical source: 0029_clm_contracts.sql
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
-- <<< canonical source: 0029_clm_contracts.sql


-- >>> canonical source: 0030_forms_scheduling.sql
-- Formularios e Agendamento: construtor de formularios, campos, submissoes,
-- profissionais, servicos, slots de disponibilidade e agendamentos.

-- ──────────────────────────────────────────────
-- 1. form_builders — Construtor de Formularios
-- ──────────────────────────────────────────────

create table if not exists public.form_builders (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  slug text not null,
  description text,

  form_type text not null default 'contato'
    check (form_type in (
      'contato','pre_atendimento','consulta_trabalhista','consulta_previdenciaria',
      'familia','inventario','criminal','empresarial','solicitacao_juridica',
      'cadastro_cliente','envio_documentos'
    )),

  is_active boolean not null default true,
  public_link text,
  confirmation_message text,
  max_submissions integer,
  legal_area text,
  default_responsible_member_id uuid,
  tags jsonb not null default '[]'::jsonb,
  lgpd_consent_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (law_firm_id, slug)
);

-- ──────────────────────────────────────────────
-- 2. form_fields — Campos do Formulario
-- ──────────────────────────────────────────────

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_builder_id uuid not null references public.form_builders(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  field_type text not null
    check (field_type in (
      'text','email','phone','number','textarea','select',
      'checkbox','radio','date','file','heading','paragraph'
    )),

  label text not null,
  placeholder text,
  required boolean not null default false,
  options jsonb,
  validation_rules jsonb,
  sort_order integer not null default 0,
  page_number integer not null default 1,
  conditional_logic jsonb,
  help_text text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. form_submissions — Submissoes do Formulario
-- ──────────────────────────────────────────────

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  form_builder_id uuid not null references public.form_builders(id) on delete cascade,

  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,

  submission_data jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  source text,
  campaign text,

  lgpd_consent boolean not null default false,
  lgpd_consent_text text,

  status text not null default 'recebido'
    check (status in ('recebido','processado','convertido','descartado')),

  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. scheduling_professionals — Profissionais de Agenda
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_professionals (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  member_id uuid not null,

  display_name text not null,
  specialty text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. scheduling_services — Servicos de Agenda
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_services (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  description text,
  duration_minutes integer not null default 60,

  modality text not null default 'presencial'
    check (modality in ('presencial','online','hibrido')),

  requires_approval boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 6. scheduling_slots — Slots de Disponibilidade
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_slots (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  professional_id uuid not null references public.scheduling_professionals(id) on delete cascade,

  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 7. scheduling_bookings — Agendamentos
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_bookings (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  professional_id uuid not null references public.scheduling_professionals(id),
  service_id uuid not null references public.scheduling_services(id),

  client_name text not null,
  client_email text,
  client_phone text,
  client_id uuid references public.clients(id) on delete set null,

  booking_date date not null,
  start_time time not null,
  end_time time not null,

  modality text not null default 'presencial'
    check (modality in ('presencial','online','hibrido')),

  address text,
  meeting_link text,

  status text not null default 'confirmado'
    check (status in ('confirmado','cancelado','remarcado','concluido','nao_compareceu')),

  cancellation_token text,
  lgpd_consent boolean not null default false,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 8. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger form_builders_set_updated_at
  before update on public.form_builders
  for each row execute function public.set_updated_at();

create trigger scheduling_professionals_set_updated_at
  before update on public.scheduling_professionals
  for each row execute function public.set_updated_at();

create trigger scheduling_services_set_updated_at
  before update on public.scheduling_services
  for each row execute function public.set_updated_at();

create trigger scheduling_bookings_set_updated_at
  before update on public.scheduling_bookings
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 9. Indexes
-- ──────────────────────────────────────────────

-- form_builders
create index if not exists form_builders_law_firm_idx
  on public.form_builders(law_firm_id);

create index if not exists form_builders_slug_idx
  on public.form_builders(law_firm_id, slug);

-- form_fields
create index if not exists form_fields_law_firm_idx
  on public.form_fields(law_firm_id);

create index if not exists form_fields_form_builder_idx
  on public.form_fields(form_builder_id);

-- form_submissions
create index if not exists form_submissions_law_firm_idx
  on public.form_submissions(law_firm_id);

create index if not exists form_submissions_form_builder_idx
  on public.form_submissions(form_builder_id);

create index if not exists form_submissions_status_idx
  on public.form_submissions(form_builder_id, status);

create index if not exists form_submissions_lead_idx
  on public.form_submissions(lead_id)
  where lead_id is not null;

create index if not exists form_submissions_client_idx
  on public.form_submissions(client_id)
  where client_id is not null;

-- scheduling_professionals
create index if not exists scheduling_professionals_law_firm_idx
  on public.scheduling_professionals(law_firm_id);

-- scheduling_services
create index if not exists scheduling_services_law_firm_idx
  on public.scheduling_services(law_firm_id);

-- scheduling_slots
create index if not exists scheduling_slots_law_firm_idx
  on public.scheduling_slots(law_firm_id);

create index if not exists scheduling_slots_professional_idx
  on public.scheduling_slots(professional_id);

-- scheduling_bookings
create index if not exists scheduling_bookings_law_firm_idx
  on public.scheduling_bookings(law_firm_id);

create index if not exists scheduling_bookings_professional_idx
  on public.scheduling_bookings(professional_id);

create index if not exists scheduling_bookings_date_idx
  on public.scheduling_bookings(booking_date);

create index if not exists scheduling_bookings_professional_date_idx
  on public.scheduling_bookings(professional_id, booking_date);

create index if not exists scheduling_bookings_status_idx
  on public.scheduling_bookings(law_firm_id, status);

create index if not exists scheduling_bookings_client_idx
  on public.scheduling_bookings(client_id)
  where client_id is not null;

-- ──────────────────────────────────────────────
-- 10. Row Level Security
-- ──────────────────────────────────────────────

alter table public.form_builders enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;
alter table public.scheduling_professionals enable row level security;
alter table public.scheduling_services enable row level security;
alter table public.scheduling_slots enable row level security;
alter table public.scheduling_bookings enable row level security;

-- form_builders
create policy form_builders_select on public.form_builders
  for select using (public.has_law_firm_access(law_firm_id));

create policy form_builders_insert on public.form_builders
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy form_builders_update on public.form_builders
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy form_builders_delete on public.form_builders
  for delete using (public.has_law_firm_access(law_firm_id));

-- form_fields
create policy form_fields_select on public.form_fields
  for select using (public.has_law_firm_access(law_firm_id));

create policy form_fields_insert on public.form_fields
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy form_fields_update on public.form_fields
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy form_fields_delete on public.form_fields
  for delete using (public.has_law_firm_access(law_firm_id));

-- form_submissions
create policy form_submissions_select on public.form_submissions
  for select using (public.has_law_firm_access(law_firm_id));

create policy form_submissions_insert on public.form_submissions
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy form_submissions_update on public.form_submissions
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy form_submissions_delete on public.form_submissions
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_professionals
create policy scheduling_professionals_select on public.scheduling_professionals
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_professionals_insert on public.scheduling_professionals
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_professionals_update on public.scheduling_professionals
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_professionals_delete on public.scheduling_professionals
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_services
create policy scheduling_services_select on public.scheduling_services
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_services_insert on public.scheduling_services
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_services_update on public.scheduling_services
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_services_delete on public.scheduling_services
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_slots
create policy scheduling_slots_select on public.scheduling_slots
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_slots_insert on public.scheduling_slots
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_slots_update on public.scheduling_slots
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_slots_delete on public.scheduling_slots
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_bookings
create policy scheduling_bookings_select on public.scheduling_bookings
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_bookings_insert on public.scheduling_bookings
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_bookings_update on public.scheduling_bookings
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_bookings_delete on public.scheduling_bookings
  for delete using (public.has_law_firm_access(law_firm_id));
-- <<< canonical source: 0030_forms_scheduling.sql


-- >>> canonical source: 0031_communication_pdf.sql
-- Comunicação e PDF: mensagens internas, threads e anexos.

-- ──────────────────────────────────────────────
-- 1. communications — Comunicações
-- ──────────────────────────────────────────────

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  sender_member_id uuid not null,

  subject text not null,
  content text not null,

  communication_type text not null default 'mensagem_interna'
    check (communication_type in (
      'mensagem_interna','mensagem_cliente','comunicado','reuniao',
      'ligacao','carta','correspondencia','anotacao','atualizacao_processo'
    )),

  visibility text not null default 'equipe'
    check (visibility in ('privada','equipe','cliente','participantes')),

  channel text default 'interno'
    check (channel in ('interno','portal','email','whatsapp')),

  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,
  contract_request_id uuid references public.contract_requests(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,

  thread_id uuid references public.communications(id) on delete set null,
  parent_id uuid references public.communications(id) on delete set null,

  is_pinned boolean default false,
  read_by jsonb default '[]'::jsonb,

  status text not null default 'enviada'
    check (status in ('rascunho','enviada','lida','arquivada')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. communication_threads — Threads
-- ──────────────────────────────────────────────

create table if not exists public.communication_threads (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  title text not null,
  subject text,

  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  created_by uuid not null,
  last_message_at timestamptz,
  message_count integer default 0,
  is_archived boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. communication_attachments — Anexos
-- ──────────────────────────────────────────────

create table if not exists public.communication_attachments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  communication_id uuid not null references public.communications(id) on delete cascade,

  file_name text not null,
  file_size integer,
  mime_type text,
  storage_path text not null,
  uploaded_by uuid not null,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger communications_set_updated_at
  before update on public.communications
  for each row execute function public.set_updated_at();

create trigger communication_threads_set_updated_at
  before update on public.communication_threads
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 5. Indexes
-- ──────────────────────────────────────────────

-- communications
create index if not exists communications_law_firm_idx
  on public.communications(law_firm_id);

create index if not exists communications_thread_idx
  on public.communications(thread_id)
  where thread_id is not null;

create index if not exists communications_parent_idx
  on public.communications(parent_id)
  where parent_id is not null;

create index if not exists communications_type_idx
  on public.communications(communication_type);

create index if not exists communications_client_idx
  on public.communications(client_id)
  where client_id is not null;

create index if not exists communications_created_at_idx
  on public.communications(created_at);

create index if not exists communications_law_firm_status_idx
  on public.communications(law_firm_id, status);

-- communication_threads
create index if not exists communication_threads_law_firm_idx
  on public.communication_threads(law_firm_id);

create index if not exists communication_threads_client_idx
  on public.communication_threads(client_id)
  where client_id is not null;

create index if not exists communication_threads_created_at_idx
  on public.communication_threads(created_at);

-- communication_attachments
create index if not exists communication_attachments_law_firm_idx
  on public.communication_attachments(law_firm_id);

create index if not exists communication_attachments_communication_idx
  on public.communication_attachments(communication_id);

-- ──────────────────────────────────────────────
-- 6. Row Level Security
-- ──────────────────────────────────────────────

alter table public.communications enable row level security;
alter table public.communication_threads enable row level security;
alter table public.communication_attachments enable row level security;

-- communications
create policy communications_select on public.communications
  for select using (public.has_law_firm_access(law_firm_id));

create policy communications_insert on public.communications
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy communications_update on public.communications
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy communications_delete on public.communications
  for delete using (public.has_law_firm_access(law_firm_id));

-- communication_threads
create policy communication_threads_select on public.communication_threads
  for select using (public.has_law_firm_access(law_firm_id));

create policy communication_threads_insert on public.communication_threads
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy communication_threads_update on public.communication_threads
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy communication_threads_delete on public.communication_threads
  for delete using (public.has_law_firm_access(law_firm_id));

-- communication_attachments
create policy communication_attachments_select on public.communication_attachments
  for select using (public.has_law_firm_access(law_firm_id));

create policy communication_attachments_insert on public.communication_attachments
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy communication_attachments_update on public.communication_attachments
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy communication_attachments_delete on public.communication_attachments
  for delete using (public.has_law_firm_access(law_firm_id));
-- <<< canonical source: 0031_communication_pdf.sql


-- >>> canonical source: 0032_lgpd_governance.sql
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
-- <<< canonical source: 0032_lgpd_governance.sql


-- >>> canonical source: 0033_fix_missing_types.sql
-- Safe migration: create missing types, tables, and functions
-- Uses IF NOT EXISTS / EXCEPTION blocks to avoid errors on existing objects

-- ══════════════════════════════════════════════
-- ENUMS
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.member_role AS ENUM ('proprietario','administrador','advogado','assistente','financeiro','colaborador','visualizador');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.record_status AS ENUM ('ativo','inativo','arquivado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.lead_status AS ENUM ('novo','em_atendimento','qualificado','convertido','perdido');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.client_status AS ENUM ('lead','ativo','inativo','inadimplente','arquivado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.case_status AS ENUM ('em_analise','documentacao_pendente','ajuizamento','em_andamento','aguardando_decisao','audiencia_marcada','suspenso','encerrado','arquivado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.priority_level AS ENUM ('baixa','normal','alta','urgente');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('rascunho','aguardando_assinatura','ativo','quitado','inadimplente','cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.installment_status AS ENUM ('pendente','vencendo','atrasada','paga','parcialmente_paga','cancelada');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.deadline_status AS ENUM ('pendente','em_andamento','concluido','vencido','cancelado');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- TABLES (core - from 0001)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.law_firms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  document text,
  email text,
  phone text,
  address jsonb NOT NULL DEFAULT '{}'::jsonb,
  plan text NOT NULL DEFAULT 'starter',
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.law_firm_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'assistente',
  name text NOT NULL,
  email text NOT NULL,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (law_firm_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  document text,
  status public.client_status NOT NULL DEFAULT 'lead',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  title text NOT NULL,
  description text,
  status public.case_status NOT NULL DEFAULT 'em_analise',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  court text,
  case_number text,
  opposing_party text,
  opposing_lawyer text,
  value_cents bigint DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  legal_case_id uuid REFERENCES public.legal_cases(id),
  service_description text NOT NULL,
  total_amount_cents bigint NOT NULL DEFAULT 0,
  upfront_amount_cents bigint NOT NULL DEFAULT 0,
  balance_cents bigint NOT NULL DEFAULT 0,
  has_installments boolean NOT NULL DEFAULT false,
  installments_count integer NOT NULL DEFAULT 1,
  first_due_date date,
  frequency text DEFAULT 'unica',
  payment_method text,
  responsible_member_id uuid REFERENCES public.law_firm_members(id),
  status public.contract_status NOT NULL DEFAULT 'rascunho',
  success_fee boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  number integer NOT NULL CHECK (number >= 1),
  original_amount_cents bigint NOT NULL CHECK (original_amount_cents >= 0),
  discount_cents bigint NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  fine_cents bigint NOT NULL DEFAULT 0 CHECK (fine_cents >= 0),
  interest_cents bigint NOT NULL DEFAULT 0 CHECK (interest_cents >= 0),
  final_amount_cents bigint NOT NULL CHECK (final_amount_cents >= 0),
  due_date date NOT NULL,
  paid_at timestamptz,
  paid_amount_cents bigint NOT NULL DEFAULT 0 CHECK (paid_amount_cents >= 0),
  payment_method text,
  status public.installment_status NOT NULL DEFAULT 'pendente',
  receipt_path text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id, number)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  installment_id uuid REFERENCES public.installments(id),
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  payment_method text NOT NULL,
  paid_at timestamptz NOT NULL,
  discount_cents bigint NOT NULL DEFAULT 0,
  fine_cents bigint NOT NULL DEFAULT 0,
  interest_cents bigint NOT NULL DEFAULT 0,
  receipt_path text,
  notes text,
  registered_by uuid REFERENCES public.law_firm_members(id),
  reversed_at timestamptz,
  reversal_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLES (Fase 2 - from 0022-0032)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  enabled_by_default boolean NOT NULL DEFAULT false,
  is_global boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feature_flag_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id uuid NOT NULL REFERENCES public.feature_flags(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_id, law_firm_id)
);

CREATE TABLE IF NOT EXISTS public.deadline_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  deadline_id uuid,
  publication_id uuid,
  tribunal text NOT NULL,
  jurisdition text,
  procedure_type text,
  rule_description text,
  disponibilized_at date,
  published_at date,
  knowledge_at date,
  start_date date NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'dias',
  business_days boolean NOT NULL DEFAULT true,
  include_start_date boolean NOT NULL DEFAULT false,
  include_end_date boolean NOT NULL DEFAULT false,
  calculated_date date,
  adjusted_date date,
  adjustment_reason text,
  calendar_id uuid,
  holidays_considered text[] DEFAULT '{}',
  suspensions_considered text[] DEFAULT '{}',
  calculated_by uuid,
  calculated_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  status text NOT NULL DEFAULT 'rascunho',
  version integer NOT NULL DEFAULT 1,
  previous_version_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  calendar_name text NOT NULL,
  jurisdiction text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES public.legal_calendars(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  event_type text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.process_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  legal_case_id uuid,
  client_id uuid,
  description text NOT NULL,
  category text NOT NULL,
  original_value bigint,
  updated_value bigint,
  base_date date,
  status text NOT NULL DEFAULT 'aberto',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  legal_case_id uuid,
  classification text NOT NULL,
  score integer,
  factors jsonb DEFAULT '[]',
  notes text,
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.provisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  legal_case_id uuid,
  provision_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judicial_guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  guarantee_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  entity text,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.judicial_deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  deposit_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  entity text,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seizures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  seizure_type text NOT NULL,
  target text,
  value_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.court_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  claim_id uuid REFERENCES public.process_claims(id),
  release_type text NOT NULL,
  amount_cents bigint NOT NULL DEFAULT 0,
  released_at timestamptz,
  status text NOT NULL DEFAULT 'pendente',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  balance_cents bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  transaction_type text NOT NULL,
  amount_cents bigint NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  legal_case_id uuid,
  amount_cents bigint NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  reconciled_by uuid,
  balance_before_cents bigint NOT NULL,
  balance_after_cents bigint NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_funds_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.client_funds_accounts(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  opening_balance_cents bigint NOT NULL DEFAULT 0,
  closing_balance_cents bigint NOT NULL DEFAULT 0,
  generated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  type_name text NOT NULL,
  description text,
  sla_hours integer,
  requires_approval boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_type_id uuid REFERENCES public.legal_request_types(id),
  title text NOT NULL,
  description text,
  client_id uuid REFERENCES public.clients(id),
  legal_case_id uuid,
  requester_member_id uuid,
  assigned_member_id uuid,
  status text NOT NULL DEFAULT 'aberto',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  sla_deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  assigned_member_id uuid,
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  approver_member_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_sla_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.legal_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.legal_requests(id) ON DELETE CASCADE,
  sender_member_id uuid,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  requester_member_id uuid NOT NULL,
  client_id uuid REFERENCES public.clients(id),
  legal_case_id uuid,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'outro',
  status text NOT NULL DEFAULT 'rascunho',
  priority public.priority_level NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  category text,
  content text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.contract_templates(id),
  clause_name text NOT NULL,
  clause_text text NOT NULL,
  category text,
  is_mandatory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  version_number integer NOT NULL DEFAULT 1,
  content text,
  status text NOT NULL DEFAULT 'rascunho',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  version_id uuid NOT NULL REFERENCES public.contract_versions(id),
  approver_member_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  decision_notes text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  obligation_text text NOT NULL,
  responsible_member_id uuid,
  due_date date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_amendments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  amendment_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contract_counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.contract_requests(id),
  party_name text NOT NULL,
  party_document text,
  contact_name text,
  contact_email text,
  contact_phone text,
  role text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_builders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  form_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.form_builders(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  field_type text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  options jsonb DEFAULT '[]',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.form_builders(id),
  submitted_by uuid,
  submission_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'recebido',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  member_id uuid,
  professional_name text NOT NULL,
  specialty text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  price_cents bigint DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.scheduling_professionals(id),
  service_id uuid REFERENCES public.scheduling_services(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.scheduling_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.scheduling_slots(id),
  client_id uuid REFERENCES public.clients(id),
  booking_status text NOT NULL DEFAULT 'confirmado',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  sender_member_id uuid,
  recipient_member_id uuid,
  client_id uuid REFERENCES public.clients(id),
  subject text,
  body text NOT NULL,
  channel text NOT NULL DEFAULT 'interno',
  status text NOT NULL DEFAULT 'enviado',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  communication_id uuid NOT NULL REFERENCES public.communications(id),
  parent_id uuid,
  sender_member_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.communication_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  communication_id uuid NOT NULL REFERENCES public.communications(id),
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  consent_type text NOT NULL,
  purpose text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_data_subject_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id),
  request_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'recebido',
  deadline date,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  data_category text NOT NULL,
  retention_days integer NOT NULL,
  action_after_expiry text NOT NULL DEFAULT 'arquivar',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lgpd_data_classifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  classification_name text NOT NULL,
  description text,
  sensitivity_level text NOT NULL DEFAULT 'normal',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- RPC FUNCTIONS
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.register_payment(
  p_law_firm_id uuid,
  p_installment_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_paid_at timestamptz,
  p_discount_cents bigint DEFAULT 0,
  p_fine_cents bigint DEFAULT 0,
  p_interest_cents bigint DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_registered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment_id uuid;
  v_contract_id uuid;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
  v_remaining bigint;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode registrar pagamentos', v_member.role;
  END IF;

  IF p_registered_by IS NOT NULL AND p_registered_by != v_caller_id THEN
    RAISE EXCEPTION 'registered_by deve corresponder ao usuário autenticado';
  END IF;

  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = p_installment_id AND law_firm_id = p_law_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE installment_id = p_installment_id
      AND amount_cents = p_amount_cents
      AND paid_at::date = p_paid_at::date
      AND reversed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pagamento duplicado detectado';
  END IF;

  v_remaining := v_installment.final_amount_cents - v_installment.paid_amount_cents;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF p_amount_cents > v_remaining THEN
    RAISE EXCEPTION 'Valor excede o saldo da parcela (R$ %)', (v_remaining / 100.0)::text;
  END IF;

  v_new_paid := v_installment.paid_amount_cents + p_amount_cents;
  v_contract_id := v_installment.contract_id;

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      paid_at = p_paid_at,
      payment_method = p_payment_method,
      status = v_new_status::installment_status,
      discount_cents = installments.discount_cents + p_discount_cents,
      fine_cents = installments.fine_cents + p_fine_cents,
      interest_cents = installments.interest_cents + p_interest_cents,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_installment_id;

  INSERT INTO public.payments (
    law_firm_id, installment_id, client_id, contract_id,
    amount_cents, payment_method, paid_at,
    discount_cents, fine_cents, interest_cents,
    notes, registered_by
  ) VALUES (
    p_law_firm_id, p_installment_id, v_installment.client_id, v_contract_id,
    p_amount_cents, p_payment_method, p_paid_at,
    p_discount_cents, p_fine_cents, p_interest_cents,
    p_notes, p_registered_by
  ) RETURNING id INTO v_payment_id;

  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment(uuid, uuid, bigint, text, timestamptz, bigint, bigint, bigint, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_law_firm_id uuid,
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment record;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id, role INTO v_member
  FROM public.law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode estornar pagamentos', v_member.role;
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id AND law_firm_id = p_law_firm_id AND reversed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou já estornado';
  END IF;

  UPDATE public.payments
  SET reversed_at = now(),
      reversal_reason = p_reason
  WHERE id = p_payment_id;

  SELECT * INTO v_installment
  FROM public.installments
  WHERE id = v_payment.installment_id
  FOR UPDATE;

  v_new_paid := GREATEST(v_installment.paid_amount_cents - v_payment.amount_cents, 0);

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE public.installments
  SET paid_amount_cents = v_new_paid,
      status = v_new_status::installment_status,
      updated_at = now()
  WHERE id = v_payment.installment_id;

  SELECT total_amount_cents INTO v_contract
  FROM public.contracts WHERE id = v_payment.contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM public.installments
  WHERE contract_id = v_payment.contract_id AND status != 'cancelada';

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE public.contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_payment(uuid, uuid, text) TO authenticated;

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════

ALTER TABLE public.law_firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "tenant select law_firms" ON public.law_firms FOR SELECT USING (id IN (SELECT law_firm_id FROM public.law_firm_members WHERE user_id = auth.uid()));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select law_firm_members" ON public.law_firm_members FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select clients" ON public.clients FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select legal_cases" ON public.legal_cases FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select contracts" ON public.contracts FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select installments" ON public.installments FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select payments" ON public.payments FOR SELECT USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "financial roles write payments" ON public.payments FOR ALL USING (public.has_law_firm_role(law_firm_id, ARRAY['proprietario','administrador','financeiro']::public.member_role[])) WITH CHECK (public.has_law_firm_role(law_firm_id, ARRAY['proprietario','administrador','financeiro']::public.member_role[]));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0033_fix_missing_types.sql


-- >>> canonical source: 0034_fix_rpc_search_path.sql
-- Fix: set search_path to 'public' so enum types like installment_status are resolved
-- Also fully qualify the type cast to be safe

CREATE OR REPLACE FUNCTION public.register_payment(
  p_law_firm_id uuid,
  p_installment_id uuid,
  p_amount_cents bigint,
  p_payment_method text,
  p_paid_at timestamptz,
  p_discount_cents bigint DEFAULT 0,
  p_fine_cents bigint DEFAULT 0,
  p_interest_cents bigint DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_registered_by uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment_id uuid;
  v_contract_id uuid;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
  v_remaining bigint;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id, role INTO v_member
  FROM law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode registrar pagamentos', v_member.role;
  END IF;

  IF p_registered_by IS NOT NULL AND p_registered_by != v_caller_id THEN
    RAISE EXCEPTION 'registered_by deve corresponder ao usuário autenticado';
  END IF;

  SELECT * INTO v_installment
  FROM installments
  WHERE id = p_installment_id AND law_firm_id = p_law_firm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM payments
    WHERE installment_id = p_installment_id
      AND amount_cents = p_amount_cents
      AND paid_at::date = p_paid_at::date
      AND reversed_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Pagamento duplicado detectado';
  END IF;

  v_remaining := v_installment.final_amount_cents - v_installment.paid_amount_cents;
  IF p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'Valor do pagamento deve ser maior que zero';
  END IF;
  IF p_amount_cents > v_remaining THEN
    RAISE EXCEPTION 'Valor excede o saldo da parcela (R$ %)', (v_remaining / 100.0)::text;
  END IF;

  v_new_paid := v_installment.paid_amount_cents + p_amount_cents;
  v_contract_id := v_installment.contract_id;

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE installments
  SET paid_amount_cents = v_new_paid,
      paid_at = p_paid_at,
      payment_method = p_payment_method,
      status = v_new_status::installment_status,
      discount_cents = installments.discount_cents + p_discount_cents,
      fine_cents = installments.fine_cents + p_fine_cents,
      interest_cents = installments.interest_cents + p_interest_cents,
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_installment_id;

  INSERT INTO payments (
    law_firm_id, installment_id, client_id, contract_id,
    amount_cents, payment_method, paid_at,
    discount_cents, fine_cents, interest_cents,
    notes, registered_by
  ) VALUES (
    p_law_firm_id, p_installment_id, v_installment.client_id, v_contract_id,
    p_amount_cents, p_payment_method, p_paid_at,
    p_discount_cents, p_fine_cents, p_interest_cents,
    p_notes, p_registered_by
  ) RETURNING id INTO v_payment_id;

  SELECT total_amount_cents INTO v_contract
  FROM contracts WHERE id = v_contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM installments
  WHERE contract_id = v_contract_id AND status != 'cancelada'::installment_status;

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_contract_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_payment(uuid, uuid, bigint, text, timestamptz, bigint, bigint, bigint, text, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reverse_payment(
  p_law_firm_id uuid,
  p_payment_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_payment record;
  v_installment record;
  v_new_paid bigint;
  v_new_status text;
  v_contract record;
  v_total_paid bigint;
  v_new_balance bigint;
  v_caller_id uuid;
  v_member record;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT id, role INTO v_member
  FROM law_firm_members
  WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não pertence a este escritório';
  END IF;

  IF v_member.role NOT IN ('proprietario', 'administrador', 'financeiro') THEN
    RAISE EXCEPTION 'Permissão negada: papel % não pode estornar pagamentos', v_member.role;
  END IF;

  SELECT * INTO v_payment
  FROM payments
  WHERE id = p_payment_id AND law_firm_id = p_law_firm_id AND reversed_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento não encontrado ou já estornado';
  END IF;

  UPDATE payments
  SET reversed_at = now(),
      reversal_reason = p_reason
  WHERE id = p_payment_id;

  SELECT * INTO v_installment
  FROM installments
  WHERE id = v_payment.installment_id
  FOR UPDATE;

  v_new_paid := GREATEST(v_installment.paid_amount_cents - v_payment.amount_cents, 0);

  IF v_new_paid >= v_installment.final_amount_cents THEN
    v_new_status := 'paga';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'parcialmente_paga';
  ELSE
    v_new_status := 'pendente';
  END IF;

  UPDATE installments
  SET paid_amount_cents = v_new_paid,
      status = v_new_status::installment_status,
      updated_at = now()
  WHERE id = v_payment.installment_id;

  SELECT total_amount_cents INTO v_contract
  FROM contracts WHERE id = v_payment.contract_id;

  SELECT COALESCE(SUM(paid_amount_cents), 0) INTO v_total_paid
  FROM installments
  WHERE contract_id = v_payment.contract_id AND status != 'cancelada'::installment_status;

  v_new_balance := v_contract.total_amount_cents - v_total_paid;

  UPDATE contracts
  SET balance_cents = GREATEST(v_new_balance, 0),
      updated_at = now()
  WHERE id = v_payment.contract_id;

  RETURN jsonb_build_object(
    'payment_id', p_payment_id,
    'installment_status', v_new_status,
    'contract_balance', v_new_balance
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.reverse_payment(uuid, uuid, text) TO authenticated;
-- <<< canonical source: 0034_fix_rpc_search_path.sql


-- >>> canonical source: 0035_drop_balance_constraint.sql
-- Fix: remove incorrect balance constraint on contracts
-- The RPC register_payment calculates balance dynamically from installment payments,
-- not from upfront_amount_cents. The old constraint was mathematically wrong.

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_balance_matches;
-- <<< canonical source: 0035_drop_balance_constraint.sql


-- >>> canonical source: 0036_admin_trial_and_overrides.sql
-- Bloco 2: Administração do SaaS
-- Trial period, per-tenant limit overrides, admin audit logs

-- ══════════════════════════════════════════════
-- TRIAL PERIOD COLUMNS
-- ══════════════════════════════════════════════

ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_starts_at timestamptz;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════
-- PER-TENANT LIMIT OVERRIDES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tenant_limit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  limit_key text NOT NULL,
  override_value integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (law_firm_id, limit_key)
);

-- ══════════════════════════════════════════════
-- ADMIN AUDIT LOGS (platform-level, separate from tenant audit_logs)
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- RLS POLICIES
-- ══════════════════════════════════════════════

ALTER TABLE tenant_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "superadmin all tenant_limit_overrides" ON tenant_limit_overrides
    FOR ALL USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "superadmin all admin_audit_logs" ON admin_audit_logs
    FOR ALL USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- EXTEND PLATFORM_USAGE_METRICS
-- ══════════════════════════════════════════════

ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS active_members_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS legal_cases_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS payments_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS payments_value_cents bigint DEFAULT 0;
-- <<< canonical source: 0036_admin_trial_and_overrides.sql


-- >>> canonical source: 0037_plan_feature_overrides.sql
-- 0037_plan_feature_overrides.sql
-- Esta migration pode ser aplicada isoladamente no SQL Editor.
-- A tabela também existe na 0021, mas é criada aqui caso a sequência anterior
-- ainda não tenha sido executada.

create table if not exists public.plan_settings (
  id text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  feature_overrides jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.plan_settings (id, name, description, price_cents, features)
values
  ('starter', 'Starter', 'Para escritórios que querem organizar a operação desde o primeiro dia.', 0, '["Clientes e leads", "Processos e prazos", "Agenda e tarefas", "Documentos seguros"]'::jsonb),
  ('professional', 'Professional', 'Para equipes que precisam conectar operação, financeiro e produtividade.', 0, '["Tudo do Starter", "Contratos e recebimentos", "Relatórios gerenciais", "Gestão de equipe e permissões"]'::jsonb),
  ('business', 'Business', 'Para operações jurídicas maiores, com mais controle e escala.', 0, '["Tudo do Professional", "Múltiplos escritórios", "Governança e auditoria", "Atendimento prioritário"]'::jsonb)
on conflict (id) do nothing;

alter table public.plan_settings
  add column if not exists feature_overrides jsonb not null default '{}'::jsonb;

alter table public.plan_settings enable row level security;

drop policy if exists "public can view active plan settings" on public.plan_settings;
create policy "public can view active plan settings" on public.plan_settings
  for select using (active = true);
-- <<< canonical source: 0037_plan_feature_overrides.sql


-- >>> canonical source: 0038_error_events.sql
-- Observabilidade de erros de producao sem armazenar cookies, tokens ou query strings.
create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('server', 'client')),
  message text not null,
  digest text,
  path text not null,
  method text,
  route_path text,
  router_kind text,
  route_type text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_at_idx on public.error_events(created_at desc);
create index if not exists error_events_path_idx on public.error_events(path, created_at desc);
alter table public.error_events enable row level security;

-- Somente o service role usado pela instrumentacao insere/consulta os eventos.
-- Nenhuma policy para usuarios comuns evita vazamento de diagnosticos internos.
-- <<< canonical source: 0038_error_events.sql


-- >>> canonical source: 0039_support_tickets.sql
-- 0039: Sistema de Suporte ao Cliente (Support Tickets)
-- Multi-tenant SaaS com RLS

-- ══════════════════════════════════════════════
-- TABLE: support_categories
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_tickets
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  protocol text NOT NULL UNIQUE,
  created_by uuid NOT NULL,
  category_id uuid REFERENCES public.support_categories(id),
  priority text NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'aguardando_suporte', 'em_analise', 'aguardando_cliente', 'resolvido', 'fechado', 'cancelado')),
  assigned_to uuid,
  route_origin text,
  app_version text,
  browser_info text,
  os_info text,
  error_identifier text,
  technical_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_messages
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('client', 'support', 'system')),
  message_type text NOT NULL DEFAULT 'message'
    CHECK (message_type IN ('message', 'internal_note', 'system', 'info_request', 'resolution')),
  content text NOT NULL,
  visibility text NOT NULL DEFAULT 'public'
    CHECK (visibility IN ('public', 'internal', 'system')),
  is_read boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_attachments
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.support_messages(id) ON DELETE SET NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_events
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('client', 'operator', 'system')),
  event_type text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_assignments
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL,
  assigned_by uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_sla_policies
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('baixa', 'normal', 'alta', 'critica')),
  first_response_minutes integer NOT NULL DEFAULT 240,
  resolution_minutes integer NOT NULL DEFAULT 1440,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, priority)
);

-- ══════════════════════════════════════════════
-- TABLE: support_notifications
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- FUNCTION: generate_support_protocol
-- ══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.generate_support_protocol()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  today_prefix text;
  next_seq integer;
begin
  today_prefix := 'SUP-' || to_char(now(), 'YYYYMMDD') || '-';

  SELECT COALESCE(
    (SELECT MAX(
      CAST(SUBSTRING(protocol FROM LENGTH(today_prefix) + 1) AS integer)
    )
    FROM public.support_tickets
    WHERE protocol LIKE today_prefix || '%'),
    0
  ) + 1 INTO next_seq;

  NEW.protocol := today_prefix || LPAD(next_seq::text, 4, '0');
  RETURN NEW;
END;
$$;

-- ══════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════

CREATE TRIGGER support_tickets_generate_protocol
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  WHEN (NEW.protocol IS NULL OR NEW.protocol = '')
  EXECUTE FUNCTION public.generate_support_protocol();

CREATE TRIGGER support_tickets_set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- support_tickets
CREATE INDEX IF NOT EXISTS support_tickets_law_firm_id_idx ON public.support_tickets(law_firm_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS support_tickets_priority_idx ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS support_tickets_assigned_to_idx ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS support_tickets_created_at_idx ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS support_tickets_law_firm_status_idx ON public.support_tickets(law_firm_id, status);
CREATE INDEX IF NOT EXISTS support_tickets_law_firm_created_at_idx ON public.support_tickets(law_firm_id, created_at DESC);

-- support_messages
CREATE INDEX IF NOT EXISTS support_messages_ticket_id_idx ON public.support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS support_messages_law_firm_id_idx ON public.support_messages(law_firm_id);
CREATE INDEX IF NOT EXISTS support_messages_created_at_idx ON public.support_messages(created_at DESC);

-- support_attachments
CREATE INDEX IF NOT EXISTS support_attachments_ticket_id_idx ON public.support_attachments(ticket_id);
CREATE INDEX IF NOT EXISTS support_attachments_message_id_idx ON public.support_attachments(message_id);
CREATE INDEX IF NOT EXISTS support_attachments_law_firm_id_idx ON public.support_attachments(law_firm_id);

-- support_events
CREATE INDEX IF NOT EXISTS support_events_ticket_id_idx ON public.support_events(ticket_id);
CREATE INDEX IF NOT EXISTS support_events_law_firm_id_idx ON public.support_events(law_firm_id);
CREATE INDEX IF NOT EXISTS support_events_created_at_idx ON public.support_events(created_at DESC);

-- support_assignments
CREATE INDEX IF NOT EXISTS support_assignments_ticket_id_idx ON public.support_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS support_assignments_operator_id_idx ON public.support_assignments(operator_id);

-- support_notifications
CREATE INDEX IF NOT EXISTS support_notifications_law_firm_id_idx ON public.support_notifications(law_firm_id);
CREATE INDEX IF NOT EXISTS support_notifications_user_id_idx ON public.support_notifications(user_id);
CREATE INDEX IF NOT EXISTS support_notifications_ticket_id_idx ON public.support_notifications(ticket_id);
CREATE INDEX IF NOT EXISTS support_notifications_is_read_idx ON public.support_notifications(is_read);

-- support_sla_policies
CREATE INDEX IF NOT EXISTS support_sla_policies_plan_id_idx ON public.support_sla_policies(plan_id);

-- ══════════════════════════════════════════════
-- SEED: Default support categories (14)
-- ══════════════════════════════════════════════

INSERT INTO public.support_categories (name, slug, description, sort_order) VALUES
  ('Dúvidas Gerais',         'duvidas-gerais',         'Perguntas e dúvidas sobre o uso geral do sistema', 1),
  ('Solicitação de Treinamento', 'solicitacao-treinamento', 'Solicitação de treinamento ou capacitação para a equipe', 2),
  ('Erros e Bugs',           'erros-e-bugs',            'Reporte de erros, bugs ou comportamentos inesperados', 3),
  ('Funcionalidade Indisponível', 'funcionalidade-indisponivel', 'Funcionalidade que não está acessível ou retornando erro', 4),
  ('Solicitação de Nova Funcionalidade', 'solicitacao-nova-funcionalidade', 'Sugestão ou pedido de novas funcionalidades', 5),
  ('Problemas de Acesso',    'problemas-de-acesso',     'Dificuldades de login, permissões ou autenticação', 6),
  ('Performance e Lentidão', 'performance-e-lentidão',  'Problemas de desempenho ou lentidão no sistema', 7),
  ('Integrações',            'integracoes',             'Questões relacionadas a integrações externas (APIs, webhooks, etc.)', 8),
  ('Cobranças e Faturamento','cobrancas-e-faturamento', 'Dúvidas sobre planos, cobranças, faturas e pagamentos', 9),
  ('Configuração do Escritório', 'configuracao-do-escritorio', 'Ajuda com configurações gerais do escritório no sistema', 10),
  ('Dados e Relatórios',     'dados-e-relatorios',      'Problemas ou dúvidas sobre dados, exportações e relatórios', 11),
  ('Migração de Dados',      'migracao-de-dados',       'Auxílio com importação ou migração de dados de outros sistemas', 12),
  ('Sugestão de Melhoria',   'sugestao-de-melhoria',    'Ideias e sugestões para melhorias no sistema', 13),
  ('Outros',                 'outros',                  'Assuntos que não se enquadram nas categorias acima', 14)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════
-- SEED: Default SLA policies (starter/professional/business)
-- ══════════════════════════════════════════════

INSERT INTO public.support_sla_policies (plan_id, priority, first_response_minutes, resolution_minutes) VALUES
  -- Starter
  ('starter',        'baixa',   480,  2880),
  ('starter',        'normal',  240,  1440),
  ('starter',        'alta',    120,   720),
  ('starter',        'critica',  60,   360),
  -- Professional
  ('professional',   'baixa',   360,  2160),
  ('professional',   'normal',  180,  1080),
  ('professional',   'alta',     90,   480),
  ('professional',   'critica',  30,   240),
  -- Business
  ('business',       'baixa',   240,  1440),
  ('business',       'normal',  120,   720),
  ('business',       'alta',     60,   360),
  ('business',       'critica',  15,   120)
ON CONFLICT (plan_id, priority) DO NOTHING;

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.support_categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_attachments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_sla_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_notifications ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- RLS: support_categories
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_categories"
    ON public.support_categories FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "all can view active support_categories"
    ON public.support_categories FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_tickets
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_tickets"
    ON public.support_tickets FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_tickets"
    ON public.support_tickets FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update own tenant support_tickets"
    ON public.support_tickets FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_messages
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_messages"
    ON public.support_messages FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select non-internal support_messages"
    ON public.support_messages FOR SELECT
    USING (
      public.has_law_firm_access(law_firm_id)
      AND (visibility IN ('public', 'system') OR author_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_messages"
    ON public.support_messages FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_attachments
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_attachments"
    ON public.support_attachments FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_attachments"
    ON public.support_attachments FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_attachments"
    ON public.support_attachments FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_events"
    ON public.support_events FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_events"
    ON public.support_events FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_assignments
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_assignments"
    ON public.support_assignments FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own tenant support_assignments"
    ON public.support_assignments FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.support_tickets t
        WHERE t.id = support_assignments.ticket_id
          AND public.has_law_firm_access(t.law_firm_id)
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_sla_policies
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_sla_policies"
    ON public.support_sla_policies FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "all can view active support_sla_policies"
    ON public.support_sla_policies FOR SELECT
    USING (is_active = true);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_notifications
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_notifications"
    ON public.support_notifications FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members select own notifications"
    ON public.support_notifications FOR SELECT
    USING (
      public.has_law_firm_access(law_firm_id)
      AND user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update own notifications"
    ON public.support_notifications FOR UPDATE
    USING (
      public.has_law_firm_access(law_firm_id)
      AND user_id = auth.uid()
    )
    WITH CHECK (
      public.has_law_firm_access(law_firm_id)
      AND user_id = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert own tenant support_notifications"
    ON public.support_notifications FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0039_support_tickets.sql


-- >>> canonical source: 0040_assisted_access.sql
-- 0040: Sistema de Acesso Assistido (Assisted Access)
-- Permite que operadores de suporte acessem temporariamente dados de um tenant
-- com aprovação explícita do administrador do escritório.

-- ══════════════════════════════════════════════
-- TABLE: support_access_requests
-- Solicitação de acesso do operador ao tenant
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  support_ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  requested_by uuid NOT NULL,
  reason text NOT NULL,
  technical_description text,
  requested_duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN (
      'rascunho',
      'pendente',
      'visualizada',
      'aprovada',
      'aprovada_com_restrições',
      'recusada',
      'cancelada',
      'expirada',
      'utilizada',
      'encerrada'
    )),
  viewed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  approved_duration_minutes integer,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_access_request_scopes
-- Escopos de acesso por solicitação
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_request_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.support_access_requests(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  module text NOT NULL,
  actions text[] NOT NULL DEFAULT ARRAY['visualizar']::text[],
  resource_ids uuid[],
  restrictions jsonb NOT NULL DEFAULT '{}'::jsonb,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_access_sessions
-- Sessão ativa de acesso assistido
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_request_id uuid NOT NULL REFERENCES public.support_access_requests(id),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL,
  approved_by uuid NOT NULL,
  support_ticket_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  ended_by uuid,
  revoked_at timestamptz,
  revoked_by uuid,
  revocation_reason text,
  status text NOT NULL DEFAULT 'aguardando_inicio'
    CHECK (status IN (
      'aguardando_inicio',
      'ativa',
      'suspensa',
      'encerrada',
      'revogada',
      'expirada'
    )),
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: support_access_events
-- Log de auditoria imutável
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_access_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.support_access_sessions(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.support_access_requests(id) ON DELETE SET NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  operator_id uuid NOT NULL,
  event_type text NOT NULL,
  module text,
  action_name text,
  entity_type text,
  entity_id uuid,
  route text,
  result text NOT NULL DEFAULT 'success',
  reason text,
  ip_address inet,
  user_agent text,
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ══════════════════════════════════════════════

CREATE TRIGGER support_access_requests_set_updated_at
  BEFORE UPDATE ON public.support_access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- support_access_requests
CREATE INDEX IF NOT EXISTS support_access_requests_law_firm_id_idx
  ON public.support_access_requests(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_requests_status_idx
  ON public.support_access_requests(status);
CREATE INDEX IF NOT EXISTS support_access_requests_requested_by_idx
  ON public.support_access_requests(requested_by);
CREATE INDEX IF NOT EXISTS support_access_requests_support_ticket_id_idx
  ON public.support_access_requests(support_ticket_id);
CREATE INDEX IF NOT EXISTS support_access_requests_created_at_idx
  ON public.support_access_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS support_access_requests_law_firm_status_idx
  ON public.support_access_requests(law_firm_id, status);

-- support_access_request_scopes
CREATE INDEX IF NOT EXISTS support_access_request_scopes_request_id_idx
  ON public.support_access_request_scopes(request_id);
CREATE INDEX IF NOT EXISTS support_access_request_scopes_law_firm_id_idx
  ON public.support_access_request_scopes(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_request_scopes_module_idx
  ON public.support_access_request_scopes(module);

-- support_access_sessions
CREATE INDEX IF NOT EXISTS support_access_sessions_access_request_id_idx
  ON public.support_access_sessions(access_request_id);
CREATE INDEX IF NOT EXISTS support_access_sessions_law_firm_id_idx
  ON public.support_access_sessions(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_sessions_operator_id_idx
  ON public.support_access_sessions(operator_id);
CREATE INDEX IF NOT EXISTS support_access_sessions_status_idx
  ON public.support_access_sessions(status);
CREATE INDEX IF NOT EXISTS support_access_sessions_expires_at_idx
  ON public.support_access_sessions(expires_at);
CREATE INDEX IF NOT EXISTS support_access_sessions_law_firm_status_idx
  ON public.support_access_sessions(law_firm_id, status);
CREATE INDEX IF NOT EXISTS support_access_sessions_law_firm_operator_idx
  ON public.support_access_sessions(law_firm_id, operator_id);

-- support_access_events
CREATE INDEX IF NOT EXISTS support_access_events_session_id_idx
  ON public.support_access_events(session_id);
CREATE INDEX IF NOT EXISTS support_access_events_request_id_idx
  ON public.support_access_events(request_id);
CREATE INDEX IF NOT EXISTS support_access_events_law_firm_id_idx
  ON public.support_access_events(law_firm_id);
CREATE INDEX IF NOT EXISTS support_access_events_operator_id_idx
  ON public.support_access_events(operator_id);
CREATE INDEX IF NOT EXISTS support_access_events_event_type_idx
  ON public.support_access_events(event_type);
CREATE INDEX IF NOT EXISTS support_access_events_created_at_idx
  ON public.support_access_events(created_at DESC);
CREATE INDEX IF NOT EXISTS support_access_events_law_firm_event_type_idx
  ON public.support_access_events(law_firm_id, event_type);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.support_access_requests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_request_scopes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_access_events          ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_access_requests       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_access_request_scopes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_access_sessions       TO authenticated;
GRANT SELECT, INSERT                ON public.support_access_events         TO authenticated;

-- ══════════════════════════════════════════════
-- RLS: support_access_requests
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_requests"
    ON public.support_access_requests FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators select requests they created"
    ON public.support_access_requests FOR SELECT
    USING (requested_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators insert own requests"
    ON public.support_access_requests FOR INSERT
    WITH CHECK (requested_by = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators update own draft/cancelled requests"
    ON public.support_access_requests FOR UPDATE
    USING (
      requested_by = auth.uid()
      AND status IN ('rascunho', 'pendente')
    )
    WITH CHECK (
      requested_by = auth.uid()
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins view requests for their tenant"
    ON public.support_access_requests FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins approve/reject requests"
    ON public.support_access_requests FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_access_request_scopes
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_request_scopes"
    ON public.support_access_request_scopes FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators manage scopes on own requests"
    ON public.support_access_request_scopes FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM public.support_access_requests r
        WHERE r.id = support_access_request_scopes.request_id
          AND r.requested_by = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.support_access_requests r
        WHERE r.id = support_access_request_scopes.request_id
          AND r.requested_by = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins view and approve scopes for their tenant"
    ON public.support_access_request_scopes FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins update scopes for approval"
    ON public.support_access_request_scopes FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins insert scopes for their tenant"
    ON public.support_access_request_scopes FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_access_sessions
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_sessions"
    ON public.support_access_sessions FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators view their own sessions"
    ON public.support_access_sessions FOR SELECT
    USING (operator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "operators update activity on own sessions"
    ON public.support_access_sessions FOR UPDATE
    USING (operator_id = auth.uid())
    WITH CHECK (operator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins view sessions for their tenant"
    ON public.support_access_sessions FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins manage sessions for their tenant"
    ON public.support_access_sessions FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant admins insert sessions for their tenant"
    ON public.support_access_sessions FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: support_access_events
-- Log de auditoria imutável — INSERT amplo, SELECT/UPDATE/DELETE superadmin
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all support_access_events"
    ON public.support_access_events FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated users insert events for their tenant"
    ON public.support_access_events FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "authenticated users insert own events"
    ON public.support_access_events FOR INSERT
    WITH CHECK (operator_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0040_assisted_access.sql


-- >>> canonical source: 0041_onboarding_invites.sql
-- 0041: Sistema de Onboarding e Melhorias no Fluxo de Convites
-- Tabelas de sessão e progresso de onboarding para novos escritórios,
-- e colunas adicionais em team_invitations para controle completo do ciclo de vida.

-- ══════════════════════════════════════════════
-- TABLE: onboarding_sessions
-- Sessão de onboarding vinculada a um escritório
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL UNIQUE REFERENCES public.law_firms(id) ON DELETE CASCADE,
  profile text NOT NULL DEFAULT 'small'
    CHECK (profile IN ('individual', 'small', 'team', 'department')),
  current_step integer NOT NULL DEFAULT 1,
  total_steps integer NOT NULL DEFAULT 18,
  completed_steps integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  skipped_steps integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  completed_optional_steps integer[] NOT NULL DEFAULT ARRAY[]::integer[],
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: onboarding_progress
-- Progresso individual de cada etapa do onboarding
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.onboarding_sessions(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, step_key)
);

-- ══════════════════════════════════════════════
-- ALTER TABLE: team_invitations
-- Colunas adicionais para controle completo do ciclo de vida do convite
-- ══════════════════════════════════════════════

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS declined_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS cancelled_by uuid;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS resend_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS last_resent_at timestamptz;

ALTER TABLE public.team_invitations
  ADD COLUMN IF NOT EXISTS notes text;

-- Atualizar CHECK constraint da coluna status para incluir novos valores
DO $$ BEGIN
  ALTER TABLE public.team_invitations
    DROP CONSTRAINT IF EXISTS team_invitations_status_check;
  ALTER TABLE public.team_invitations
    ADD CONSTRAINT team_invitations_status_check
    CHECK (status IN ('pendente', 'visualizado', 'aceito', 'expirado', 'cancelado', 'recusado'));
EXCEPTION WHEN undefined_object THEN null;
END $$;

-- Atualizar status de convites existentes baseado nos dados atuais
UPDATE public.team_invitations
SET status = 'aceito'
WHERE status = 'pendente'
  AND accepted_at IS NOT NULL;

UPDATE public.team_invitations
SET status = 'expirado'
WHERE status = 'pendente'
  AND expires_at < now()
  AND accepted_at IS NULL;

-- ══════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ══════════════════════════════════════════════

CREATE TRIGGER onboarding_sessions_set_updated_at
  BEFORE UPDATE ON public.onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER onboarding_progress_set_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- onboarding_sessions
CREATE INDEX IF NOT EXISTS onboarding_sessions_law_firm_id_idx
  ON public.onboarding_sessions(law_firm_id);
CREATE INDEX IF NOT EXISTS onboarding_sessions_profile_idx
  ON public.onboarding_sessions(profile);
CREATE INDEX IF NOT EXISTS onboarding_sessions_created_at_idx
  ON public.onboarding_sessions(created_at DESC);

-- onboarding_progress
CREATE INDEX IF NOT EXISTS onboarding_progress_session_id_idx
  ON public.onboarding_progress(session_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_law_firm_id_idx
  ON public.onboarding_progress(law_firm_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_step_key_idx
  ON public.onboarding_progress(step_key);
CREATE INDEX IF NOT EXISTS onboarding_progress_status_idx
  ON public.onboarding_progress(status);
CREATE INDEX IF NOT EXISTS onboarding_progress_session_status_idx
  ON public.onboarding_progress(session_id, status);
CREATE INDEX IF NOT EXISTS onboarding_progress_law_firm_step_idx
  ON public.onboarding_progress(law_firm_id, step_number);

-- team_invitations (novos índices para as novas colunas)
CREATE INDEX IF NOT EXISTS team_invitations_cancelled_by_idx
  ON public.team_invitations(cancelled_by);
CREATE INDEX IF NOT EXISTS team_invitations_status_idx
  ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS team_invitations_email_status_idx
  ON public.team_invitations(email, status);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress  ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.onboarding_progress  TO authenticated;

-- ══════════════════════════════════════════════
-- RLS: onboarding_sessions
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all onboarding_sessions"
    ON public.onboarding_sessions FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members view onboarding session for their tenant"
    ON public.onboarding_sessions FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert onboarding session for their tenant"
    ON public.onboarding_sessions FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update onboarding session for their tenant"
    ON public.onboarding_sessions FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS: onboarding_progress
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all onboarding_progress"
    ON public.onboarding_progress FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members view onboarding progress for their tenant"
    ON public.onboarding_progress FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members insert onboarding progress for their tenant"
    ON public.onboarding_progress FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "members update onboarding progress for their tenant"
    ON public.onboarding_progress FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0041_onboarding_invites.sql


-- >>> canonical source: 0041_solo_mode.sql
-- Migration: Solo Mode for Independent Lawyers and Small Firms
-- Description: Adds solo mode tables, policies, and seeds for simplified interface

-- =============================================================================
-- PART 1: Add columns to law_firms table for interface mode
-- =============================================================================

ALTER TABLE public.law_firms
ADD COLUMN IF NOT EXISTS operation_profile TEXT,
ADD COLUMN IF NOT EXISTS interface_mode TEXT DEFAULT 'completa',
ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hidden_modules TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS recommended_features TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMP WITH TIME ZONE;

-- =============================================================================
-- PART 2: Create tables for Solo Mode features
-- =============================================================================

-- Legal area templates for solo practitioners
CREATE TABLE IF NOT EXISTS public.legal_area_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    area_key TEXT NOT NULL,
    area_name TEXT NOT NULL,
    description TEXT,
    document_templates JSONB DEFAULT '[]',
    contract_clauses JSONB DEFAULT '[]',
    default_checklist JSONB DEFAULT '[]',
    sample_documents JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fee proposals for solo practitioners
CREATE TABLE IF NOT EXISTS public.fee_proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    service_description TEXT NOT NULL,
    scope TEXT,
    total_amount_cents INTEGER NOT NULL,
    upfront_amount_cents INTEGER DEFAULT 0,
    balance_cents INTEGER NOT NULL,
    installments_count INTEGER DEFAULT 1,
    installment_value_cents INTEGER,
    success_fee_percentage INTEGER,
    included_expenses TEXT,
    excluded_expenses TEXT,
    validity_days INTEGER DEFAULT 15,
    charging_model TEXT DEFAULT 'fixo',
    observations TEXT,
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'rascunho',
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Receipts for solo practitioners
CREATE TABLE IF NOT EXISTS public.receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    receipt_number TEXT,
    lawyer_name TEXT NOT NULL,
    oab_number TEXT,
    oab_state TEXT,
    client_name TEXT NOT NULL,
    client_document TEXT,
    service_description TEXT NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_method TEXT,
    payment_date DATE NOT NULL,
    observations TEXT,
    status TEXT DEFAULT 'emitido',
    cancellation_reason TEXT,
    canceled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Follow-ups/Returns for solo practitioners
CREATE TABLE IF NOT EXISTS public.follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    follow_up_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TIME,
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT DEFAULT 'pendente',
    result TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Intake forms for solo practitioners
CREATE TABLE IF NOT EXISTS public.intake_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    consultation_reason TEXT NOT NULL,
    practice_area TEXT,
    problem_summary TEXT,
    urgency TEXT DEFAULT 'normal',
    has_active_process BOOLEAN DEFAULT false,
    process_number TEXT,
    client_objective TEXT,
    perceived_risks TEXT,
    private_notes TEXT,
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'rascunho',
    converted_to_client_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Professional profiles for solo practitioners
CREATE TABLE IF NOT EXISTS public.professional_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE UNIQUE,
    professional_name TEXT NOT NULL,
    oab_number TEXT,
    oab_state TEXT,
    cnpj TEXT,
    cpf TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    logo_url TEXT,
    signature_url TEXT,
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#64748b',
    bio TEXT,
    specializations TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Demo data tracking for solo mode onboarding
CREATE TABLE IF NOT EXISTS public.demo_data_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- PART 3: Create indexes for performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_legal_area_templates_firm ON public.legal_area_templates(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_legal_area_templates_area ON public.legal_area_templates(area_key);
CREATE INDEX IF NOT EXISTS idx_fee_proposals_firm ON public.fee_proposals(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_fee_proposals_client ON public.fee_proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_fee_proposals_case ON public.fee_proposals(legal_case_id);
CREATE INDEX IF NOT EXISTS idx_receipts_firm ON public.receipts(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON public.receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_firm ON public.follow_ups(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_client ON public.follow_ups(client_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON public.follow_ups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_intake_forms_firm ON public.intake_forms(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_professional_profiles_firm ON public.professional_profiles(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_demo_data_firm ON public.demo_data_records(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_demo_data_entity ON public.demo_data_records(entity_type, entity_id);

-- =============================================================================
-- PART 4: RLS Policies for Solo Mode Tables
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.legal_area_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_data_records ENABLE ROW LEVEL SECURITY;

-- has_law_firm_access is defined by 0001_foundation.sql in the canonical chain.
-- Policies for legal_area_templates
CREATE POLICY "legal_area_templates_select" ON public.legal_area_templates
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "legal_area_templates_insert" ON public.legal_area_templates
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "legal_area_templates_update" ON public.legal_area_templates
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "legal_area_templates_delete" ON public.legal_area_templates
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for fee_proposals
CREATE POLICY "fee_proposals_select" ON public.fee_proposals
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "fee_proposals_insert" ON public.fee_proposals
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "fee_proposals_update" ON public.fee_proposals
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "fee_proposals_delete" ON public.fee_proposals
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for receipts
CREATE POLICY "receipts_select" ON public.receipts
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "receipts_insert" ON public.receipts
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "receipts_update" ON public.receipts
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "receipts_delete" ON public.receipts
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for follow_ups
CREATE POLICY "follow_ups_select" ON public.follow_ups
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "follow_ups_insert" ON public.follow_ups
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "follow_ups_update" ON public.follow_ups
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "follow_ups_delete" ON public.follow_ups
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for intake_forms
CREATE POLICY "intake_forms_select" ON public.intake_forms
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "intake_forms_insert" ON public.intake_forms
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "intake_forms_update" ON public.intake_forms
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "intake_forms_delete" ON public.intake_forms
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for professional_profiles
CREATE POLICY "professional_profiles_select" ON public.professional_profiles
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "professional_profiles_insert" ON public.professional_profiles
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "professional_profiles_update" ON public.professional_profiles
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "professional_profiles_delete" ON public.professional_profiles
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies for demo_data_records
CREATE POLICY "demo_data_records_select" ON public.demo_data_records
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "demo_data_records_insert" ON public.demo_data_records
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "demo_data_records_delete" ON public.demo_data_records
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- =============================================================================
-- PART 5: Seed Data for Legal Area Templates
-- =============================================================================

INSERT INTO public.legal_area_templates (law_firm_id, area_key, area_name, description, document_templates, contract_clauses, default_checklist, sample_documents)
VALUES
(NULL, 'trabalhista', 'Direito Trabalhista', 'Ações trabalhistas, rescisões, verbas rescisórias, assédio moral e sexual no trabalho.', '[{"name": "Petição Inicial", "type": "peticao"}, {"name": "Contestação", "type": "peticao"}, {"name": "Reclamação Trabalhista", "type": "documento"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 30% sobre o valor total da condenação ou acordo..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas processuais, custas, perícias..."}]', '[{"task": "Analisar documentação", "done": false}, {"task": "Calcular verbas rescisórias", "done": false}, {"task": "Protocolar reclamação", "done": false}, {"task": "Acompanhar audiência", "done": false}]', '[{"title": "CTPS Anotada", "type": "ctps"}, {"title": "Contracheque", "type": "holerite"}, {"title": "TRCT", "type": "rescisao"}]'),

(NULL, 'previdenciario', 'Direito Previdenciário', 'Aposentadorias, benefícios INSS, revisão de benefícios, auxílio-doença, LOAS.', '[{"name": "Requerimento Administrativo", "type": "requerimento"}, {"name": "Mandado de Segurança", "type": "peticao"}, {"name": "Embargos à Execução", "type": "peticao"}]', '[{"title": "Êxito", "text": "O êxito é alcançado quando o benefício é concedido administrativamente ou judicialmente..."}, {"title": "Honorários", "text": "Na hipótese de ação judicial, os honorários serão de até 30% sobre os atrasados..."}]', '[{"task": "Obter CNIS", "done": false}, {"task": "Calcular tempo de contribuição", "done": false}, {"task": "Analisar requisitos", "done": false}, {"task": "Protocolar requerimento", "done": false}]', '[{"title": "CNIS Completo", "type": "cnis"}, {"title": "Laudo Médico", "type": "laudo"}, {"title": "Documento de Identidade", "type": "doc"}]'),

(NULL, 'familia', 'Direito de Família', 'Divórcios, guarda, alimentos, união estável, partilha, adoção, regulamentação de visitas.', '[{"name": "Petição Inicial de Divórcio", "type": "peticao"}, {"name": "Ação de Alimentos", "type": "peticao"}, {"name": "Guarda Compartilhada", "type": "termo"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 10% sobre o valor da partilha, quando houver..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais, emolumentos e despesas com perícias..."}]', '[{"task": "Analisar documentação", "done": false}, {"task": "Calcular pensão alimentícia", "done": false}, {"task": "Definir regime de bens", "done": false}, {"task": "Protocolar ação", "done": false}]', '[{"title": "Certidão de Casamento", "type": "certidao"}, {"title": "Certidão de Nascimento dos Filhos", "type": "certidao"}, {"title": "Comprovante de Renda", "type": "renda"}]'),

(NULL, 'consumidor', 'Direito do Consumidor', 'Ações de indenização, CDC, práticas abusivas, cobrança indevida, vício do produto/serviço.', '[{"name": "Ação de Indenização", "type": "peticao"}, {"name": "Notificação Extrajudicial", "type": "notificacao"}, {"name": "Reclamação no PROCON", "type": "reclamacao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 30% sobre o valor da indenização ou condenação..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas processuais, custas e perícias..."}]', '[{"task": "Analisar contrato", "done": false}, {"task": "Documentar danos", "done": false}, {"task": "Calcular indenização", "done": false}, {"task": "Protocolar ação", "done": false}]', '[{"title": "Contrato de Compra", "type": "contrato"}, {"title": "Notas Fiscais", "type": "nota"}, {"title": "Fotos/Provas do Dano", "type": "prova"}]'),

(NULL, 'civel', 'Direito Civil Geral', 'Ações possessórias, obrigações, responsabilidade civil, danos, enriquecimento sem causa, nulidades.', '[{"name": "Ação de Obrigação de Fazer", "type": "peticao"}, {"name": "Ação de Indenização", "type": "peticao"}, {"name": "Ação Rescisória", "type": "peticao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão conforme tabela da OAB/UF ou 30% sobre o proveito econômico..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais e despesas..."}]', '[{"task": "Analisar documentação", "done": false}, {"task": "Identificar causa de pedir", "done": false}, {"task": "Calcular pleito", "done": false}, {"task": "Protocolar ação", "done": false}]', '[{"title": "Documentos Pessoais", "type": "doc"}, {"title": "Comprovante de Endereço", "type": "endereco"}, {"title": "Provas do Fato", "type": "prova"}]'),

(NULL, 'criminal', 'Direito Criminal', 'Defesa criminal, habeas corpus, flagrante, recursos em geral, compliance criminal.', '[{"name": "Habeas Corpus", "type": "peticao"}, {"name": "Defesa Preliminar", "type": "defesa"}, {"name": "Recurso em Sentido Estrito", "type": "recurso"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de valor fixo ou conforme estipulado em contrato, independentemente do resultado..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas com viagens, estadias, cópias e custas processuais..."}]', '[{"task": "Analisar ficha criminal", "done": false}, {"task": "Reunir provas de defesa", "done": false}, {"task": "Elaborar estratégia", "done": false}, {"task": "Protocolar medida", "done": false}]', '[{"title": "Boletim de Ocorrência", "type": "bo"}, {"title": "Certidão Criminal", "type": "certidao"}, {"title": "Provas de Defesa", "type": "prova"}]'),

(NULL, 'imobiliario', 'Direito Imobiliário', 'Compra e venda, locação, condomínio, usucapião, regularização fundiária, loteamentos.', '[{"name": "Ação de Usucapião", "type": "peticao"}, {"name": "Contrato de Compra e Venda", "type": "contrato"}, {"name": "Ação de Despejo", "type": "peticao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de 5% a 10% sobre o valor do imóvel ou conforme tabela da OAB..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas cartoriais, registrais e processuais..."}]', '[{"task": "Analisar documentação do imóvel", "done": false}, {"task": "Verificar ônus", "done": false}, {"task": "Elaborar contrato/ação", "done": false}, {"task": "Registrar/protocolar", "done": false}]', '[{"title": "Escritura/Matrícula", "type": "escritura"}, {"title": "Certidão de Ônus", "type": "certidao"}, {"title": "IPTU/Condomínio", "type": "imposto"}]'),

(NULL, 'empresarial', 'Direito Empresarial', 'Contratos, societário, falências e recuperações, propriedade intelectual, startups, M&A.', '[{"name": "Contrato Social", "type": "contrato"}, {"name": "Contrato de Investimento", "type": "contrato"}, {"name": "Pedido de Recuperação Judicial", "type": "peticao"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão conforme tabela da OAB, valor hora ou percentual sobre o valor da transação..."}, {"title": "Despesas", "text": "Correm por conta do cliente as despesas com registro, publicações, viagens e custas..."}]', '[{"task": "Analisar estrutura societária", "done": false}, {"task": "Revisar contratos", "done": false}, {"task": "Elaborar documentação", "done": false}, {"task": "Registrar/publicar", "done": false}]', '[{"title": "Contrato Social/Alteração", "type": "social"}, {"title": "Certidões de Débitos", "type": "certidao"}, {"title": "Licenças e Alvarás", "type": "licenca"}]'),

(NULL, 'tributario', 'Direito Tributário', 'Contencioso administrativo e judicial, planejamento tributário, recuperação de créditos, compliance.', '[{"name": "Recurso Administrativo", "type": "recurso"}, {"name": "Mandado de Segurança Tributário", "type": "peticao"}, {"name": "Pedido de Compensação", "type": "requerimento"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão de percentual sobre o valor do crédito recuperado ou conforme tabela da OAB..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais e despesas com perícias contábeis..."}]', '[{"task": "Analisar autos de infração", "done": false}, {"task": "Calcular créditos", "done": false}, {"task": "Elaborar defesa/recurso", "done": false}, {"task": "Acompanhar processo", "done": false}]', '[{"title": "Autos de Infração", "type": "infracao"}, {"title": "Guias de Recolhimento", "type": "guia"}, {"title": "Declarações (DAS, DEFIS)", "type": "declaracao"}]'),

(NULL, 'administrativo', 'Direito Administrativo', 'Licitações, contratos administrativos, improbidade, mandados de segurança, processos disciplinares.', '[{"name": "Mandado de Segurança", "type": "peticao"}, {"name": "Impetração de Habilitação", "type": "peticao"}, {"name": "Defesa em Processo Administrativo", "type": "defesa"}]', '[{"title": "Honorários", "text": "Os honorários advocatícios serão conforme tabela da OAB ou valor fixo estipulado em contrato..."}, {"title": "Custas", "text": "Correm por conta do cliente as custas processuais e despesas com publicações..."}]', '[{"task": "Analisar edital/ato", "done": false}, {"task": "Elaborar impugnação/defesa", "done": false}, {"task": "Protocolar medida", "done": false}, {"task": "Acompanhar andamento", "done": false}]', '[{"title": "Edital/Portaria", "type": "edital"}, {"title": "Certidão de Antecedentes", "type": "certidao"}, {"title": "Procuração", "type": "procuracao"}]');

-- PART 6 omitted: this project uses public.plan_settings, not the undefined public.plans table.

-- =============================================================================
-- PART 7: Insert Solo Feature Flags
-- =============================================================================

INSERT INTO public.feature_flags (key, name, description, enabled_by_default, created_at, updated_at)
VALUES
    ('solo_mode', 'Modo Solo', 'Interface simplificada para advogados independentes', true, now(), now()),
    ('solo_templates', 'Templates de Áreas', 'Templates específicos por área de atuação', true, now(), now()),
    ('solo_receipts', 'Recibos Avulsos', 'Emissão de recibos avulsos sem necessidade de contrato', true, now(), now()),
    ('solo_proposals', 'Propostas de Honorários', 'Criação de propostas de honorários personalizadas', true, now(), now()),
    ('solo_intake', 'Fichas de Atendimento', 'Fichas de triagem para novos atendimentos', true, now(), now()),
    ('solo_follow_ups', 'Retornos Agendados', 'Sistema de acompanhamento de retornos', true, now(), now());

-- =============================================================================
-- PART 8: Create helper functions
-- =============================================================================

-- Function to switch interface mode
CREATE OR REPLACE FUNCTION public.switch_interface_mode(
    p_firm_id UUID,
    p_mode TEXT
) RETURNS void AS $$
BEGIN
    UPDATE public.law_firms
    SET interface_mode = p_mode,
        updated_at = now()
    WHERE id = p_firm_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear demo data
CREATE OR REPLACE FUNCTION public.clear_demo_data(
    p_firm_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- This is a placeholder - actual implementation would delete demo records
    -- based on demo_data_records table
    SELECT COUNT(*) INTO v_count
    FROM public.demo_data_records
    WHERE law_firm_id = p_firm_id;
    
    DELETE FROM public.demo_data_records
    WHERE law_firm_id = p_firm_id;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- <<< canonical source: 0041_solo_mode.sql


-- >>> canonical source: 0042_document_access_logs.sql
-- 0042: Logs de Acesso a Documentos
-- Registra visualizações, downloads, edições e compartilhamentos de documentos
-- para auditoria e conformidade com LGPD.

-- ══════════════════════════════════════════════
-- TABLE: document_access_logs
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.document_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('view', 'download', 'edit', 'share')),
  ip_address text,
  user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS document_access_logs_document_id_idx
  ON public.document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS document_access_logs_user_id_idx
  ON public.document_access_logs(user_id);
CREATE INDEX IF NOT EXISTS document_access_logs_created_at_idx
  ON public.document_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS document_access_logs_law_firm_id_idx
  ON public.document_access_logs(law_firm_id);
CREATE INDEX IF NOT EXISTS document_access_logs_law_firm_document_idx
  ON public.document_access_logs(law_firm_id, document_id);
CREATE INDEX IF NOT EXISTS document_access_logs_law_firm_user_idx
  ON public.document_access_logs(law_firm_id, user_id);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.document_access_logs ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT ON public.document_access_logs TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all document_access_logs"
    ON public.document_access_logs FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select document_access_logs"
    ON public.document_access_logs FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant insert document_access_logs"
    ON public.document_access_logs FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0042_document_access_logs.sql


-- >>> canonical source: 0042_solo_pro.sql
-- Migration: Solo Pro — Estabilização
-- Descrição: Tabelas, RPCs, seeds e políticas RLS para o Solo Pro.
-- NÃO destrói dados existentes. Usa IF NOT EXISTS.

-- =============================================================================
-- PART 0: Protect against re-run
-- =============================================================================

BEGIN;

-- =============================================================================
-- PART 1: Add columns to law_firms (idempotent)
-- =============================================================================

ALTER TABLE public.law_firms
ADD COLUMN IF NOT EXISTS solo_pro_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS setup_diagnostic_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS office_health_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS setup_diagnostic_answers JSONB DEFAULT '{}';

-- =============================================================================
-- PART 2: Create tables for Solo Pro features
-- =============================================================================

-- Operational rules for generating recommendations
CREATE TABLE IF NOT EXISTS public.operational_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    rule_key TEXT NOT NULL,
    rule_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'informativa',
    entity_type TEXT,
    entity_id UUID,
    action_url TEXT,
    action_label TEXT,
    enabled BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1,
    cooldown_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Operational recommendations generated by rules engine
CREATE TABLE IF NOT EXISTS public.operational_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES public.operational_rules(id) ON DELETE SET NULL,
    rule_key TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'informativa',
    entity_type TEXT,
    entity_id UUID,
    related_entity_name TEXT,
    reason TEXT,
    action_label TEXT,
    action_url TEXT,
    status TEXT DEFAULT 'ativa',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    dismissed_at TIMESTAMP WITH TIME ZONE,
    dismissed_by TEXT,
    dismissed_reason TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recommendation dismissals tracking
CREATE TABLE IF NOT EXISTS public.recommendation_dismissals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.operational_recommendations(id) ON DELETE CASCADE,
    dismissed_by UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    dismissed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recommendation actions tracking
CREATE TABLE IF NOT EXISTS public.recommendation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    recommendation_id UUID REFERENCES public.operational_recommendations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    action_label TEXT,
    action_url TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    executed_by UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Recommendation preferences (for silencing rules)
CREATE TABLE IF NOT EXISTS public.recommendation_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    rule_key TEXT NOT NULL,
    muted BOOLEAN DEFAULT false,
    muted_at TIMESTAMP WITH TIME ZONE,
    muted_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(law_firm_id, rule_key)
);

-- Office health snapshots
CREATE TABLE IF NOT EXISTS public.office_health_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    snapshot_type TEXT NOT NULL DEFAULT 'daily',
    snapshot_date DATE NOT NULL,
    clients_total INTEGER DEFAULT 0,
    clients_active INTEGER DEFAULT 0,
    clients_inactive INTEGER DEFAULT 0,
    cases_active INTEGER DEFAULT 0,
    cases_pending_action INTEGER DEFAULT 0,
    cases_overdue INTEGER DEFAULT 0,
    proposals_pending INTEGER DEFAULT 0,
    proposals_expired INTEGER DEFAULT 0,
    follow_ups_pending INTEGER DEFAULT 0,
    follow_ups_overdue INTEGER DEFAULT 0,
    tasks_pending INTEGER DEFAULT 0,
    tasks_overdue INTEGER DEFAULT 0,
    deadlines_upcoming INTEGER DEFAULT 0,
    deadlines_overdue INTEGER DEFAULT 0,
    revenue_month_cents INTEGER DEFAULT 0,
    received_month_cents INTEGER DEFAULT 0,
    overdue_amount_cents INTEGER DEFAULT 0,
    expenses_month_cents INTEGER DEFAULT 0,
    recommendations_active INTEGER DEFAULT 0,
    recommendations_critical INTEGER DEFAULT 0,
    score_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(law_firm_id, snapshot_date)
);

-- Setup diagnostic questions and answers
CREATE TABLE IF NOT EXISTS public.setup_diagnostic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    question_key TEXT NOT NULL,
    question_text TEXT NOT NULL,
    answer_value TEXT,
    answer_options JSONB DEFAULT '[]',
    order_index INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Client update schedules
CREATE TABLE IF NOT EXISTS public.client_update_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    legal_case_id UUID REFERENCES public.legal_cases(id) ON DELETE SET NULL,
    frequency TEXT NOT NULL DEFAULT 'mensal',
    preferred_channel TEXT DEFAULT 'email',
    responsible_member_id UUID REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
    last_update_date DATE,
    next_update_date DATE,
    message_template TEXT,
    status TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_operational_rules_firm ON public.operational_rules(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_operational_rules_key ON public.operational_rules(rule_key);
CREATE INDEX IF NOT EXISTS idx_operational_rules_type ON public.operational_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_operational_recommendations_firm ON public.operational_recommendations(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_operational_recommendations_status ON public.operational_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_operational_recommendations_priority ON public.operational_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_operational_recommendations_rule_key ON public.operational_recommendations(rule_key);
CREATE INDEX IF NOT EXISTS idx_operational_recommendations_entity ON public.operational_recommendations(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_dismissals_firm ON public.recommendation_dismissals(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_dismissals_rec ON public.recommendation_dismissals(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_firm ON public.recommendation_actions(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_actions_rec ON public.recommendation_actions(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_preferences_firm ON public.recommendation_preferences(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_preferences_key ON public.recommendation_preferences(rule_key);
CREATE INDEX IF NOT EXISTS idx_office_health_snapshots_firm ON public.office_health_snapshots(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_office_health_snapshots_date ON public.office_health_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_setup_diagnostic_firm ON public.setup_diagnostic(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_client_update_schedules_firm ON public.client_update_schedules(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_client_update_schedules_client ON public.client_update_schedules(client_id);

-- =============================================================================
-- PART 4: RLS Policies
-- =============================================================================

ALTER TABLE public.operational_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operational_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_diagnostic ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_update_schedules ENABLE ROW LEVEL SECURITY;

-- Policies: operational_rules
CREATE POLICY "operational_rules_select" ON public.operational_rules
    FOR SELECT USING (has_law_firm_access(law_firm_id) OR law_firm_id IS NULL);
CREATE POLICY "operational_rules_insert" ON public.operational_rules
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "operational_rules_update" ON public.operational_rules
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "operational_rules_delete" ON public.operational_rules
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: operational_recommendations
CREATE POLICY "operational_recommendations_select" ON public.operational_recommendations
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "operational_recommendations_insert" ON public.operational_recommendations
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "operational_recommendations_update" ON public.operational_recommendations
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "operational_recommendations_delete" ON public.operational_recommendations
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: recommendation_dismissals
CREATE POLICY "recommendation_dismissals_select" ON public.recommendation_dismissals
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_dismissals_insert" ON public.recommendation_dismissals
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_dismissals_delete" ON public.recommendation_dismissals
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: recommendation_actions
CREATE POLICY "recommendation_actions_select" ON public.recommendation_actions
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_actions_insert" ON public.recommendation_actions
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_actions_delete" ON public.recommendation_actions
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: recommendation_preferences
CREATE POLICY "recommendation_preferences_select" ON public.recommendation_preferences
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_preferences_insert" ON public.recommendation_preferences
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_preferences_update" ON public.recommendation_preferences
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "recommendation_preferences_delete" ON public.recommendation_preferences
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: office_health_snapshots
CREATE POLICY "office_health_snapshots_select" ON public.office_health_snapshots
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "office_health_snapshots_insert" ON public.office_health_snapshots
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "office_health_snapshots_update" ON public.office_health_snapshots
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "office_health_snapshots_delete" ON public.office_health_snapshots
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: setup_diagnostic
CREATE POLICY "setup_diagnostic_select" ON public.setup_diagnostic
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "setup_diagnostic_insert" ON public.setup_diagnostic
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "setup_diagnostic_update" ON public.setup_diagnostic
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "setup_diagnostic_delete" ON public.setup_diagnostic
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- Policies: client_update_schedules
CREATE POLICY "client_update_schedules_select" ON public.client_update_schedules
    FOR SELECT USING (has_law_firm_access(law_firm_id));
CREATE POLICY "client_update_schedules_insert" ON public.client_update_schedules
    FOR INSERT WITH CHECK (has_law_firm_access(law_firm_id));
CREATE POLICY "client_update_schedules_update" ON public.client_update_schedules
    FOR UPDATE USING (has_law_firm_access(law_firm_id));
CREATE POLICY "client_update_schedules_delete" ON public.client_update_schedules
    FOR DELETE USING (has_law_firm_access(law_firm_id));

-- =============================================================================
-- PART 5: Seed operational rules (as platform global defaults)
-- Use law_firm_id = NULL for global defaults; RLS policy allows SELECT when NULL.
-- =============================================================================

INSERT INTO public.operational_rules (law_firm_id, rule_key, rule_type, title, description, priority, enabled) VALUES
(NULL, 'leads_without_return', 'clientes', 'Leads sem retorno', 'Leads sem resposta há mais de 2 dias.', 'atencao', true),
(NULL, 'proposals_expiring_soon', 'propostas', 'Propostas prestes a vencer', 'Propostas de honorários com vencimento próximo ou já vencidas.', 'importante', true),
(NULL, 'cases_without_next_action', 'juridico', 'Processos sem próxima ação', 'Casos ativos que não possuem próxima ação ou prazo definido.', 'importante', true),
(NULL, 'overdue_installments_no_charge', 'financeiro', 'Parcelas atrasadas sem cobrança', 'Existem parcelas atrasadas sem registro de cobrança.', 'critica', true),
(NULL, 'monthly_recovery_insufficient', 'financeiro', 'Baixa recebimento mensal', 'O valor recebido no mês está abaixo do esperado.', 'atencao', true),
(NULL, 'referral_clients_this_quarter', 'clientes', 'Clientes por indicação', 'Você recebeu clientes por indicação neste trimestre.', 'informativa', true),
(NULL, 'pending_documents_audience', 'juridico', 'Documentos pendentes para audiência', 'Existem documentos pendentes para audiência da próxima semana.', 'importante', true),
(NULL, 'tasks_over_capacity', 'produtividade', 'Tarefas acima da capacidade', 'Você está com mais tarefas previstas do que sua capacidade diária.', 'importante', true),
(NULL, 'client_no_update_30days', 'clientes', 'Cliente sem atualização há 30 dias', 'O cliente não recebe uma atualização há 30 dias.', 'atencao', true),
(NULL, 'contract_active_no_installment', 'financeiro', 'Contrato ativo sem parcela gerada', 'O contrato está ativo, mas ainda não há parcela gerada.', 'importante', true),
(NULL, 'deadline_without_review', 'juridico', 'Prazo cadastrado sem revisão', 'Existe prazo cadastrado sem revisão.', 'atencao', true),
(NULL, 'proposal_template_not_configured', 'configuracao', 'Modelo de proposta não configurado', 'Você ainda não configurou um modelo de proposta.', 'informativa', true)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 6: Seed setup diagnostic questions (platform defaults)
-- =============================================================================

INSERT INTO public.setup_diagnostic (law_firm_id, question_key, question_text, answer_options, order_index) VALUES
(NULL, 'practice_areas', 'Em quais áreas atua?', '["trabalhista", "previdenciario", "familia", "consumidor", "civel", "criminal", "imobiliario", "empresarial", "tributario", "administrativo"]', 1),
(NULL, 'has_clients', 'Já possui clientes?', '["sim", "nao"]', 2),
(NULL, 'has_cases', 'Já possui processos?', '["sim", "nao"]', 3),
(NULL, 'practice_type', 'Trabalha somente com atendimento particular?', '["sim", "nao", "parcialmente"]', 4),
(NULL, 'charging_model', 'Cobrar valor fixo, parcelas, êxito ou mensalidade?', '["fixo", "parcelas", "exito", "mensalidade", "misto"]', 5),
(NULL, 'has_recurring_expenses', 'Possui despesas recorrentes?', '["sim", "nao"]', 6),
(NULL, 'uses_spreadsheet', 'Usa planilhas?', '["sim", "nao", "pretendo usar"]', 7),
(NULL, 'uses_external_calendar', 'Usa agenda externa?', '["sim", "nao", "pretendo usar"]', 8),
(NULL, 'has_website', 'Possui site?', '["sim", "nao", "pretendo criar"]', 9),
(NULL, 'receives_referrals', 'Recebe clientes por indicação?', '["sim", "nao", "parcialmente"]', 10),
(NULL, 'work_location', 'Trabalha em casa, coworking ou escritório?', '["casa", "coworking", "escritorio"]', 11),
(NULL, 'intends_hire', 'Pretende contratar alguém?', '["sim", "nao", "futuramente"]', 12),
(NULL, 'hours_per_week', 'Quantas horas por semana pretende trabalhar?', '["20", "30", "40", "50", "60"]', 13),
(NULL, 'monthly_revenue_goal', 'Qual é sua meta mensal de receita?', '["ate_5000", "5000_10000", "10000_20000", "20000_30000", "acima_30000"]', 14),
(NULL, 'new_clients_goal', 'Qual é sua meta de novos clientes?', '["ate_2", "3_5", "6_10", "acima_10"]', 15),
(NULL, 'biggest_problem', 'Qual é seu maior problema atual?', '["falta_clientes", "perda_prazos", "falta_cobranca", "desorganizacao", "falta_tempo", "falta_documento"]', 16)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 7: RPC — calculate_office_health_score
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calculate_office_health_score(
    p_law_firm_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_score INTEGER := 100;
    v_overdue_deadlines INTEGER;
    v_overdue_installments INTEGER;
    v_pending_follow_ups INTEGER;
    v_pending_tasks INTEGER;
    v_proposals_pending INTEGER;
    v_active_cases INTEGER;
BEGIN
    -- Deduct for overdue deadlines (critical, max 25)
    SELECT COUNT(*) INTO v_overdue_deadlines
    FROM public.deadlines
    WHERE law_firm_id = p_law_firm_id
    AND status IN ('pendente', 'em_andamento')
    AND due_date < CURRENT_DATE;
    v_score := v_score - LEAST(v_overdue_deadlines * 5, 25);

    -- Deduct for overdue installments (critical, max 20)
    SELECT COUNT(*) INTO v_overdue_installments
    FROM public.installments
    WHERE law_firm_id = p_law_firm_id
    AND status IN ('pendente', 'vencendo', 'atrasada', 'parcialmente_paga')
    AND due_date < CURRENT_DATE;
    v_score := v_score - LEAST(v_overdue_installments * 5, 20);

    -- Deduct for pending follow-ups (attention, max 15)
    SELECT COUNT(*) INTO v_pending_follow_ups
    FROM public.follow_ups
    WHERE law_firm_id = p_law_firm_id
    AND status = 'pendente'
    AND scheduled_date <= CURRENT_DATE;
    v_score := v_score - LEAST(v_pending_follow_ups * 3, 15);

    -- Deduct for pending tasks (attention, max 15)
    SELECT COUNT(*) INTO v_pending_tasks
    FROM public.tasks
    WHERE law_firm_id = p_law_firm_id
    AND status IN ('pendente', 'em_andamento')
    AND (due_at IS NULL OR due_at <= CURRENT_DATE + INTERVAL '3 days');
    v_score := v_score - LEAST(v_pending_tasks * 2, 15);

    -- Deduct for pending proposals (important, max 15)
    SELECT COUNT(*) INTO v_proposals_pending
    FROM public.fee_proposals
    WHERE law_firm_id = p_law_firm_id
    AND status = 'rascunho';
    v_score := v_score - LEAST(v_proposals_pending * 3, 15);

    -- Add bonus for active cases (max 5)
    SELECT COUNT(*) INTO v_active_cases
    FROM public.legal_cases
    WHERE law_firm_id = p_law_firm_id
    AND status IN ('em_andamento', 'ativo');
    IF v_active_cases > 5 THEN
        v_score := v_score + 5;
    END IF;

    v_score := GREATEST(0, LEAST(100, v_score));
    RETURN v_score;
END;
$$;

-- =============================================================================
-- PART 8: RPC — generate_office_health_snapshot (idempotent)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_office_health_snapshot(
    p_law_firm_id UUID,
    p_snapshot_date DATE DEFAULT CURRENT_DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clients_total INTEGER;
    v_clients_active INTEGER;
    v_clients_inactive INTEGER;
    v_cases_active INTEGER;
    v_proposals_pending INTEGER;
    v_proposals_expired INTEGER;
    v_follow_ups_pending INTEGER;
    v_follow_ups_overdue INTEGER;
    v_tasks_pending INTEGER;
    v_tasks_overdue INTEGER;
    v_deadlines_upcoming INTEGER;
    v_deadlines_overdue INTEGER;
    v_revenue_month_cents INTEGER;
    v_received_month_cents INTEGER;
    v_overdue_amount_cents INTEGER;
    v_expenses_month_cents INTEGER;
    v_recommendations_active INTEGER;
    v_recommendations_critical INTEGER;
    v_score INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_clients_total FROM public.clients WHERE law_firm_id = p_law_firm_id;
    SELECT COUNT(*) INTO v_clients_active FROM public.clients WHERE law_firm_id = p_law_firm_id AND status = 'ativo';
    v_clients_inactive := v_clients_total - v_clients_active;

    SELECT COUNT(*) INTO v_cases_active FROM public.legal_cases WHERE law_firm_id = p_law_firm_id AND status IN ('em_andamento', 'ativo');

    SELECT COUNT(*) INTO v_proposals_pending FROM public.fee_proposals WHERE law_firm_id = p_law_firm_id AND status = 'rascunho';
    SELECT COUNT(*) INTO v_proposals_expired FROM public.fee_proposals WHERE law_firm_id = p_law_firm_id AND status = 'enviada' AND created_at < CURRENT_DATE - INTERVAL '15 days';

    SELECT COUNT(*) INTO v_follow_ups_pending FROM public.follow_ups WHERE law_firm_id = p_law_firm_id AND status = 'pendente';
    SELECT COUNT(*) INTO v_follow_ups_overdue FROM public.follow_ups WHERE law_firm_id = p_law_firm_id AND status = 'pendente' AND scheduled_date < CURRENT_DATE;

    SELECT COUNT(*) INTO v_tasks_pending FROM public.tasks WHERE law_firm_id = p_law_firm_id AND status IN ('pendente', 'em_andamento');
    SELECT COUNT(*) INTO v_tasks_overdue FROM public.tasks WHERE law_firm_id = p_law_firm_id AND status IN ('pendente', 'em_andamento') AND due_at < CURRENT_DATE;

    SELECT COUNT(*) INTO v_deadlines_upcoming FROM public.deadlines WHERE law_firm_id = p_law_firm_id AND status IN ('pendente', 'em_andamento') AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';
    SELECT COUNT(*) INTO v_deadlines_overdue FROM public.deadlines WHERE law_firm_id = p_law_firm_id AND status IN ('pendente', 'em_andamento') AND due_date < CURRENT_DATE;

    SELECT COALESCE(SUM(final_amount_cents), 0) INTO v_revenue_month_cents FROM public.installments WHERE law_firm_id = p_law_firm_id AND due_date >= DATE_TRUNC('month', CURRENT_DATE) AND due_date <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_received_month_cents FROM public.payments WHERE law_firm_id = p_law_firm_id AND paid_at >= DATE_TRUNC('month', CURRENT_DATE) AND paid_at <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';
    SELECT COALESCE(SUM(final_amount_cents - COALESCE(paid_amount_cents, 0)), 0) INTO v_overdue_amount_cents FROM public.installments WHERE law_firm_id = p_law_firm_id AND due_date < CURRENT_DATE AND status IN ('pendente', 'atrasada', 'parcialmente_paga');
    SELECT COALESCE(SUM(amount_cents), 0) INTO v_expenses_month_cents FROM public.expenses WHERE law_firm_id = p_law_firm_id AND due_date >= DATE_TRUNC('month', CURRENT_DATE) AND due_date <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day';

    SELECT COUNT(*) INTO v_recommendations_active FROM public.operational_recommendations WHERE law_firm_id = p_law_firm_id AND status = 'ativa';
    SELECT COUNT(*) INTO v_recommendations_critical FROM public.operational_recommendations WHERE law_firm_id = p_law_firm_id AND status = 'ativa' AND priority = 'critica';

    v_score := public.calculate_office_health_score(p_law_firm_id);

    INSERT INTO public.office_health_snapshots (
        law_firm_id, snapshot_type, snapshot_date, clients_total, clients_active, clients_inactive,
        cases_active, proposals_pending, proposals_expired,
        follow_ups_pending, follow_ups_overdue, tasks_pending, tasks_overdue,
        deadlines_upcoming, deadlines_overdue, revenue_month_cents, received_month_cents,
        overdue_amount_cents, expenses_month_cents, recommendations_active, recommendations_critical,
        score_number
    ) VALUES (
        p_law_firm_id, 'daily', p_snapshot_date, v_clients_total, v_clients_active, v_clients_inactive,
        v_cases_active, v_proposals_pending, v_proposals_expired,
        v_follow_ups_pending, v_follow_ups_overdue, v_tasks_pending, v_tasks_overdue,
        v_deadlines_upcoming, v_deadlines_overdue, v_revenue_month_cents, v_received_month_cents,
        v_overdue_amount_cents, v_expenses_month_cents, v_recommendations_active, v_recommendations_critical,
        v_score
    )
    ON CONFLICT (law_firm_id, snapshot_date) DO UPDATE SET
        clients_total = v_clients_total,
        clients_active = v_clients_active,
        clients_inactive = v_clients_inactive,
        cases_active = v_cases_active,
        proposals_pending = v_proposals_pending,
        proposals_expired = v_proposals_expired,
        follow_ups_pending = v_follow_ups_pending,
        follow_ups_overdue = v_follow_ups_overdue,
        tasks_pending = v_tasks_pending,
        tasks_overdue = v_tasks_overdue,
        deadlines_upcoming = v_deadlines_upcoming,
        deadlines_overdue = v_deadlines_overdue,
        revenue_month_cents = v_revenue_month_cents,
        received_month_cents = v_received_month_cents,
        overdue_amount_cents = v_overdue_amount_cents,
        expenses_month_cents = v_expenses_month_cents,
        recommendations_active = v_recommendations_active,
        recommendations_critical = v_recommendations_critical,
        score_number = v_score,
        updated_at = now();
END;
$$;

-- =============================================================================
-- PART 9: RPC — generate_operational_recommendations (idempotent, safe)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.generate_operational_recommendations(
    p_law_firm_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rule RECORD;
    v_count INTEGER := 0;
    v_condition_met BOOLEAN;
    v_muted BOOLEAN;
    v_count_val INTEGER;
    v_last_generated TIMESTAMPTZ;
BEGIN
    FOR v_rule IN
        SELECT * FROM public.operational_rules
        WHERE (law_firm_id = p_law_firm_id OR law_firm_id IS NULL)
        AND enabled = true
        ORDER BY priority, created_at
    LOOP
        SELECT muted INTO v_muted FROM public.recommendation_preferences
        WHERE law_firm_id = p_law_firm_id AND rule_key = v_rule.rule_key;

        IF v_muted = true THEN CONTINUE; END IF;

        v_condition_met := false;
        v_count_val := 0;

        CASE v_rule.rule_key
            WHEN 'leads_without_return' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.leads
                WHERE law_firm_id = p_law_firm_id
                AND status IN ('novo', 'aguardando_retorno')
                AND created_at < CURRENT_DATE - INTERVAL '2 days';
                v_condition_met := v_count_val > 0;
            WHEN 'proposals_expiring_soon' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.fee_proposals
                WHERE law_firm_id = p_law_firm_id
                AND status = 'enviada'
                AND created_at + (validity_days || ' days')::INTERVAL < CURRENT_DATE + INTERVAL '2 days';
                v_condition_met := v_count_val > 0;
            WHEN 'cases_without_next_action' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.legal_cases
                WHERE law_firm_id = p_law_firm_id
                AND status IN ('em_andamento', 'ativo')
                AND updated_at < CURRENT_DATE - INTERVAL '30 days';
                v_condition_met := v_count_val > 0;
            WHEN 'overdue_installments_no_charge' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.installments
                WHERE law_firm_id = p_law_firm_id
                AND status IN ('pendente', 'atrasada', 'parcialmente_paga')
                AND due_date < CURRENT_DATE
                AND (paid_amount_cents IS NULL OR paid_amount_cents = 0);
                v_condition_met := v_count_val > 0;
            WHEN 'referral_clients_this_quarter' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.clients
                WHERE law_firm_id = p_law_firm_id
                AND source = 'indicacao'
                AND created_at >= DATE_TRUNC('quarter', CURRENT_DATE);
                v_condition_met := v_count_val > 0;
            WHEN 'pending_documents_audience' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.deadlines
                WHERE law_firm_id = p_law_firm_id
                AND title ILIKE '%audiência%'
                AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
                AND status IN ('pendente', 'em_andamento');
                v_condition_met := v_count_val > 0;
            WHEN 'tasks_over_capacity' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.tasks
                WHERE law_firm_id = p_law_firm_id
                AND status IN ('pendente', 'em_andamento');
                v_condition_met := v_count_val > 20;
            WHEN 'client_no_update_30days' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.clients
                WHERE law_firm_id = p_law_firm_id
                AND status = 'ativo'
                AND updated_at < CURRENT_DATE - INTERVAL '30 days';
                v_condition_met := v_count_val > 0;
            WHEN 'contract_active_no_installment' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.contracts c
                WHERE c.law_firm_id = p_law_firm_id
                AND c.status = 'ativo'
                AND NOT EXISTS (
                    SELECT 1 FROM public.installments i WHERE i.contract_id = c.id
                );
                v_condition_met := v_count_val > 0;
            WHEN 'deadline_without_review' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.deadlines
                WHERE law_firm_id = p_law_firm_id
                AND status = 'pendente'
                AND due_date > CURRENT_DATE + INTERVAL '30 days';
                v_condition_met := v_count_val > 0;
            WHEN 'proposal_template_not_configured' THEN
                SELECT COUNT(*) INTO v_count_val FROM public.fee_proposals
                WHERE law_firm_id = p_law_firm_id;
                v_condition_met := v_count_val = 0;
            ELSE
                v_condition_met := false;
        END CASE;

        IF v_condition_met THEN
            IF NOT EXISTS (
                SELECT 1 FROM public.operational_recommendations
                WHERE law_firm_id = p_law_firm_id
                AND rule_key = v_rule.rule_key
                AND status IN ('ativa', 'visualizada')
            ) THEN
                INSERT INTO public.operational_recommendations (
                    law_firm_id, rule_id, rule_key, recommendation_type, title, description,
                    priority, action_label, action_url, status
                ) VALUES (
                    p_law_firm_id, v_rule.id, v_rule.rule_key, v_rule.rule_type, v_rule.title, v_rule.description,
                    v_rule.priority, 'Ver detalhes', '/meu-escritorio', 'ativa'
                );
                v_count := v_count + 1;
            END IF;
        ELSE
            UPDATE public.operational_recommendations
            SET status = 'concluida', completed_at = now(), updated_at = now()
            WHERE law_firm_id = p_law_firm_id
            AND rule_key = v_rule.rule_key
            AND status IN ('ativa', 'visualizada');
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

-- =============================================================================
-- PART 10: RPC — save_setup_diagnostic_answers (safe, tenant-isolated)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.save_setup_diagnostic_answers(
    p_law_firm_id UUID,
    p_answers JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.law_firms
    SET setup_diagnostic_answers = p_answers,
        setup_diagnostic_completed_at = now(),
        updated_at = now()
    WHERE id = p_law_firm_id;

    DELETE FROM public.setup_diagnostic WHERE law_firm_id = p_law_firm_id;

    INSERT INTO public.setup_diagnostic (law_firm_id, question_key, answer_value, completed)
    SELECT p_law_firm_id, key::text, value::text, true
    FROM jsonb_each_text(p_answers);
END;
$$;

-- =============================================================================
-- PART 11: View — office_health_summary
-- =============================================================================

CREATE OR REPLACE VIEW public.office_health_summary AS
SELECT
    oh.law_firm_id,
    oh.snapshot_date,
    oh.score_number,
    oh.cases_active,
    oh.follow_ups_pending,
    oh.follow_ups_overdue,
    oh.tasks_overdue,
    oh.deadlines_overdue,
    oh.received_month_cents,
    oh.overdue_amount_cents,
    oh.recommendations_critical,
    oh.created_at,
    lf.name as firm_name
FROM public.office_health_snapshots oh
JOIN public.law_firms lf ON lf.id = oh.law_firm_id
WHERE oh.snapshot_date = CURRENT_DATE
ORDER BY oh.created_at DESC;

-- =============================================================================
-- DONE
-- =============================================================================

COMMIT;
-- <<< canonical source: 0042_solo_pro.sql


-- >>> canonical source: 0043_security_incidents.sql
-- 0043: Gestão de Incidentes de Segurança
-- Registra, acompanha e resolve incidentes de segurança
-- com trilha de auditoria completa.

-- ══════════════════════════════════════════════
-- TABLE: security_incidents
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL
    CHECK (severity IN ('baixa', 'media', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'investigando', 'resolvido', 'fechado')),
  reported_by uuid NOT NULL,
  assigned_to uuid,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: security_incident_events
-- Trilha de auditoria para mudanças de status
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_incident_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES public.security_incidents(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TRIGGERS: updated_at
-- ══════════════════════════════════════════════

CREATE TRIGGER security_incidents_set_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS security_incidents_law_firm_id_idx
  ON public.security_incidents(law_firm_id);
CREATE INDEX IF NOT EXISTS security_incidents_status_idx
  ON public.security_incidents(status);
CREATE INDEX IF NOT EXISTS security_incidents_severity_idx
  ON public.security_incidents(severity);
CREATE INDEX IF NOT EXISTS security_incidents_reported_by_idx
  ON public.security_incidents(reported_by);
CREATE INDEX IF NOT EXISTS security_incidents_assigned_to_idx
  ON public.security_incidents(assigned_to);
CREATE INDEX IF NOT EXISTS security_incidents_created_at_idx
  ON public.security_incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS security_incidents_law_firm_status_idx
  ON public.security_incidents(law_firm_id, status);
CREATE INDEX IF NOT EXISTS security_incidents_law_firm_severity_idx
  ON public.security_incidents(law_firm_id, severity);

-- security_incident_events
CREATE INDEX IF NOT EXISTS security_incident_events_incident_id_idx
  ON public.security_incident_events(incident_id);
CREATE INDEX IF NOT EXISTS security_incident_events_law_firm_id_idx
  ON public.security_incident_events(law_firm_id);
CREATE INDEX IF NOT EXISTS security_incident_events_created_at_idx
  ON public.security_incident_events(created_at DESC);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incident_events ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE ON public.security_incidents TO authenticated;
GRANT SELECT, INSERT ON public.security_incident_events TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: security_incidents
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all security_incidents"
    ON public.security_incidents FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select security_incidents"
    ON public.security_incidents FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant insert security_incidents"
    ON public.security_incidents FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant update security_incidents"
    ON public.security_incidents FOR UPDATE
    USING (public.has_law_firm_access(law_firm_id))
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: security_incident_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all security_incident_events"
    ON public.security_incident_events FOR ALL
    USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant select security_incident_events"
    ON public.security_incident_events FOR SELECT
    USING (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "tenant insert security_incident_events"
    ON public.security_incident_events FOR INSERT
    WITH CHECK (public.has_law_firm_access(law_firm_id));
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0043_security_incidents.sql


-- >>> canonical source: 0044_mfa_enhanced.sql
-- 0044: MFA Aprimorado — Códigos de recuperação, dispositivos confiáveis e reforço de políticas.
-- Complementa as tabelas de MFA e sessões do 0023.

-- ══════════════════════════════════════════════
-- TABLE: user_recovery_codes
-- Códigos de recuperação de conta (hash SHA-256).
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  batch_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'utilizado', 'revogado', 'expirado')),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: recovery_code_events
-- Trilha de auditoria para códigos de recuperação.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.recovery_code_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  recovery_code_id uuid REFERENCES public.user_recovery_codes(id),
  action text NOT NULL
    CHECK (action IN ('gerado', 'utilizado', 'revogado', 'expirado', 'regenerado')),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: trusted_devices
-- Dispositivos reconhecidos pelo usuário.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  device_hash text NOT NULL,
  device_name text NOT NULL,
  user_agent_summary text,
  ip_first_seen text NOT NULL,
  ip_last_seen text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  trusted_until timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  status text NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'revogado', 'expirado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: trusted_device_events
-- Trilha de auditoria para dispositivos confiáveis.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.trusted_device_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id uuid NOT NULL REFERENCES public.trusted_devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL
    CHECK (action IN ('criado', 'confiado', 'revogado', 'expirado', 'acesso')),
  ip_address text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- ALTER: security_policies — Novos campos de enforcement MFA
-- ══════════════════════════════════════════════

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS enforcement_mode text NOT NULL DEFAULT 'opcional'
    CHECK (enforcement_mode IN ('opcional', 'recomendado', 'obrigatorio_todos', 'obrigatorio_roles', 'obrigatorio_usuarios'));

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS required_roles text[] DEFAULT '{}';

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS required_user_ids uuid[] DEFAULT '{}';

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS grace_period_days integer NOT NULL DEFAULT 14;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS enforcement_start_at timestamptz;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS trusted_device_duration_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_financial_actions boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_exports boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_permission_changes boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_sensitive_documents boolean NOT NULL DEFAULT false;

ALTER TABLE public.security_policies
  ADD COLUMN IF NOT EXISTS require_for_support_access_approval boolean NOT NULL DEFAULT false;

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- user_recovery_codes
CREATE INDEX IF NOT EXISTS user_recovery_codes_user_status_idx
  ON public.user_recovery_codes(user_id, status);
CREATE INDEX IF NOT EXISTS user_recovery_codes_user_batch_idx
  ON public.user_recovery_codes(user_id, batch_id);

-- recovery_code_events
CREATE INDEX IF NOT EXISTS recovery_code_events_user_created_idx
  ON public.recovery_code_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS recovery_code_events_law_firm_idx
  ON public.recovery_code_events(law_firm_id);

-- trusted_devices
CREATE INDEX IF NOT EXISTS trusted_devices_user_status_idx
  ON public.trusted_devices(user_id, status);
CREATE INDEX IF NOT EXISTS trusted_devices_user_hash_idx
  ON public.trusted_devices(user_id, device_hash);
CREATE INDEX IF NOT EXISTS trusted_devices_law_firm_idx
  ON public.trusted_devices(law_firm_id);

-- trusted_device_events
CREATE INDEX IF NOT EXISTS trusted_device_events_device_created_idx
  ON public.trusted_device_events(device_id, created_at DESC);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_code_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_device_events ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recovery_codes TO authenticated;
GRANT SELECT, INSERT ON public.recovery_code_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trusted_devices TO authenticated;
GRANT SELECT, INSERT ON public.trusted_device_events TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: user_recovery_codes
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all user_recovery_codes"
    ON public.user_recovery_codes FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own recovery codes"
    ON public.user_recovery_codes FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: recovery_code_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all recovery_code_events"
    ON public.recovery_code_events FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own recovery code events"
    ON public.recovery_code_events FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: trusted_devices
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all trusted_devices"
    ON public.trusted_devices FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own trusted devices"
    ON public.trusted_devices FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own trusted devices"
    ON public.trusted_devices FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own trusted devices"
    ON public.trusted_devices FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user delete own trusted devices"
    ON public.trusted_devices FOR DELETE
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: trusted_device_events
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all trusted_device_events"
    ON public.trusted_device_events FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own trusted device events"
    ON public.trusted_device_events FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0044_mfa_enhanced.sql


-- >>> canonical source: 0045_sessions_risk_stepup.sql
-- 0045: Sessões Aprimoradas, Detecção de Risco e Step-Up de Confiança.
-- Modelagem avançada de sessões, log imutável de eventos, flags de risco
-- e autorizações temporárias de elevação de privilégio (step-up).

-- ══════════════════════════════════════════════
-- TABLE: user_sessions
-- Modelo de sessão aprimorado com rastreio de
-- dispositivo, IP e nível MFA.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_session_id text,
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  member_id uuid REFERENCES public.law_firm_members(id) ON DELETE SET NULL,
  device_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  revoke_reason text,
  ip_first_seen text,
  ip_last_seen text,
  user_agent text,
  mfa_level text NOT NULL DEFAULT 'none'
    CHECK (mfa_level IN ('none', 'totp', 'recovery_code')),
  status text NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'expirada', 'revogada', 'encerrada', 'suspeita')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: session_events
-- Log imutável de auditoria para sessões.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  event_type text NOT NULL
    CHECK (event_type IN (
      'criada', 'renovada', 'revogada', 'encerrada', 'expirada',
      'suspeita_detectada', 'ip_mudou', 'device_mudou',
      'mfa_validado', 'step_up_aprovado', 'step_up_negado'
    )),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: session_risk_flags
-- Flags de detecção de risco para sessões.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.session_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  risk_type text NOT NULL
    CHECK (risk_type IN (
      'novo_dispositivo', 'ip_desconhecido', 'ua_mudanca_brusca',
      'multiplas_sessoes', 'tentativas_falhas', 'uso_recovery_code',
      'mfa_reset_recente', 'acesso_fora_horario', 'bloqueado_por_politica',
      'pos_alteracao_senha'
    )),
  risk_level text NOT NULL DEFAULT 'informativo'
    CHECK (risk_level IN ('informativo', 'atencao', 'alto_risco')),
  description text,
  resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TABLE: step_up_authorizations
-- Autorizações temporárias de elevação de confiança.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.step_up_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.user_sessions(id) ON DELETE SET NULL,
  action_type text NOT NULL
    CHECK (action_type IN (
      'mfa_enable', 'mfa_disable', 'password_change', 'email_change',
      'permission_change', 'owner_change', 'admin_invite',
      'sensitive_document', 'data_export', 'financial_change',
      'support_access', 'policy_change', 'api_key',
      'recovery_code_regenerate'
    )),
  auth_method text NOT NULL
    CHECK (auth_method IN ('password', 'totp', 'recovery_code')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false,
  consumed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- TRIGGERS: set_updated_at
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE TRIGGER user_sessions_set_updated_at
    BEFORE UPDATE ON public.user_sessions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- user_sessions
CREATE INDEX IF NOT EXISTS user_sessions_user_status_idx
  ON public.user_sessions(user_id, status);
CREATE INDEX IF NOT EXISTS user_sessions_law_firm_status_idx
  ON public.user_sessions(law_firm_id, status);
CREATE INDEX IF NOT EXISTS user_sessions_provider_session_idx
  ON public.user_sessions(provider_session_id);
CREATE INDEX IF NOT EXISTS user_sessions_expires_active_idx
  ON public.user_sessions(expires_at) WHERE status = 'ativa';

-- session_events
CREATE INDEX IF NOT EXISTS session_events_user_created_idx
  ON public.session_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_events_law_firm_created_idx
  ON public.session_events(law_firm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS session_events_session_idx
  ON public.session_events(session_id);

-- session_risk_flags
CREATE INDEX IF NOT EXISTS session_risk_flags_user_resolved_created_idx
  ON public.session_risk_flags(user_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS session_risk_flags_law_firm_risk_level_idx
  ON public.session_risk_flags(law_firm_id, risk_level);

-- step_up_authorizations
CREATE INDEX IF NOT EXISTS step_up_authorizations_user_action_consumed_expires_idx
  ON public.step_up_authorizations(user_id, action_type, consumed, expires_at);
CREATE INDEX IF NOT EXISTS step_up_authorizations_session_idx
  ON public.step_up_authorizations(session_id);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.step_up_authorizations ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT SELECT, INSERT ON public.session_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_risk_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.step_up_authorizations TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: user_sessions
-- Usuário vê suas próprias sessões; superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all user_sessions"
    ON public.user_sessions FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own user_sessions"
    ON public.user_sessions FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own user_sessions"
    ON public.user_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own user_sessions"
    ON public.user_sessions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: session_events
-- Imutável: usuário vê os seus; admin tem ALL.
-- Sem UPDATE/DELETE — log de auditoria imutável.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all session_events"
    ON public.session_events FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "admin all session_events"
    ON public.session_events FOR ALL
    USING (
      public.has_law_firm_role(
        law_firm_id,
        ARRAY['proprietario', 'administrador']::public.member_role[]
      )
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own session_events"
    ON public.session_events FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: session_risk_flags
-- Usuário vê os seus; superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all session_risk_flags"
    ON public.session_risk_flags FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own session_risk_flags"
    ON public.session_risk_flags FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own session_risk_flags"
    ON public.session_risk_flags FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own session_risk_flags"
    ON public.session_risk_flags FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- RLS Policies: step_up_authorizations
-- Usuário vê as suas; superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all step_up_authorizations"
    ON public.step_up_authorizations FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own step_up_authorizations"
    ON public.step_up_authorizations FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own step_up_authorizations"
    ON public.step_up_authorizations FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own step_up_authorizations"
    ON public.step_up_authorizations FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0045_sessions_risk_stepup.sql


-- >>> canonical source: 0046_notifications_mfa_metadata.sql
-- 0046: Notificações de Segurança e Metadados de MFA/Sessões.
-- Tabela de notificações internas de segurança, enriquecimento
-- de mfa_enrollments e active_sessions com campos de metadados.

-- ══════════════════════════════════════════════
-- TABLE: security_notifications
-- Notificações internas de segurança para o usuário.
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  law_firm_id uuid NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  notification_type text NOT NULL
    CHECK (notification_type IN (
      'mfa_activated', 'mfa_deactivated', 'mfa_reset',
      'recovery_code_used', 'recovery_codes_regenerated',
      'new_session', 'new_device_trusted', 'session_revoked_remote',
      'password_changed', 'unusual_activity', 'mfa_policy_changed',
      'grace_period_ending', 'mfa_required_not_configured',
      'multiple_failures', 'admin_recovery', 'high_risk_session',
      'step_up_required'
    )),
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ══════════════════════════════════════════════
-- ALTER: mfa_enrollments — Novos campos de metadados
-- ══════════════════════════════════════════════

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS last_challenge_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS last_success_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS last_failure_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS deactivation_reason text;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS reset_at timestamptz;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS reset_by uuid;

ALTER TABLE public.mfa_enrollments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'desativado';

DO $$ BEGIN
  ALTER TABLE public.mfa_enrollments
    ADD CONSTRAINT mfa_enrollments_status_check
    CHECK (status IN (
      'desativado', 'configuracao_iniciada', 'aguardando_confirmacao',
      'ativo', 'recuperacao_pendente', 'suspenso', 'redefinicao_solicitada'
    ));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- ALTER: active_sessions — Novos campos de metadados
-- ══════════════════════════════════════════════

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS mfa_level text NOT NULL DEFAULT 'none';

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS device_id uuid;

ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativa';

DO $$ BEGIN
  ALTER TABLE public.active_sessions
    ADD CONSTRAINT active_sessions_status_check
    CHECK (status IN ('ativa', 'expirada', 'revogada', 'encerrada', 'suspeita'));
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════

-- security_notifications
CREATE INDEX IF NOT EXISTS security_notifications_user_read_created_idx
  ON public.security_notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS security_notifications_law_firm_created_idx
  ON public.security_notifications(law_firm_id, created_at DESC);

-- mfa_enrollments (novos índices para campos adicionados)
CREATE INDEX IF NOT EXISTS mfa_enrollments_status_idx
  ON public.mfa_enrollments(status);

-- active_sessions (novos índices para campos adicionados)
CREATE INDEX IF NOT EXISTS active_sessions_status_idx
  ON public.active_sessions(status);

-- ══════════════════════════════════════════════
-- RLS: Enable Row Level Security
-- ══════════════════════════════════════════════

ALTER TABLE public.security_notifications ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════
-- GRANT: Permissões para role authenticated
-- ══════════════════════════════════════════════

GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_notifications TO authenticated;

-- ══════════════════════════════════════════════
-- RLS Policies: security_notifications
-- Usuário SELECT/UPDATE nas suas (flag read);
-- superadmin tem ALL.
-- ══════════════════════════════════════════════

DO $$ BEGIN
  CREATE POLICY "superadmin all security_notifications"
    ON public.security_notifications FOR ALL
    USING (public.is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user select own security_notifications"
    ON public.security_notifications FOR SELECT
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user update own security_notifications"
    ON public.security_notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "user insert own security_notifications"
    ON public.security_notifications FOR INSERT
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
-- <<< canonical source: 0046_notifications_mfa_metadata.sql


-- >>> canonical source: 0047_service_catalog.sql
-- ============================================================
-- MIGRATION 0047 — SERVICE CATALOG (Catálogo de Serviços)
-- SUBETAPA 5.2.1 — BLOCO 5 Modo Solo Pro
-- ============================================================
-- Cria a tabela `service_catalog` com RLS, indices, seed
-- de serviços da plataforma e permissões baseadas no papel.
-- ============================================================

BEGIN;

-- ── ENUM de status do serviço ──────────────────────────────
CREATE TYPE public.service_status AS ENUM (
  'rascunho',
  'ativo',
  'inativo',
  'arquivado'
);

-- ── ENUM de formas de cobrança ─────────────────────────────
CREATE TYPE public.service_charging_model AS ENUM (
  'consulta',
  'fixo',
  'parcelado',
  'mensalidade',
  'por_hora',
  'por_atividade',
  'exito',
  'hibrido',
  'personalizado'
);

-- ── Tabela principal: service_catalog ──────────────────────
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID REFERENCES public.law_firms(id) ON DELETE CASCADE,

  -- Identificação
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  practice_area TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'servico',

  -- Descrições
  short_description TEXT,
  public_description TEXT,
  internal_description TEXT,

  -- Escopo
  scope_included TEXT,
  scope_excluded TEXT,

  -- Duração / Esforço
  estimated_duration INTEGER,
  duration_unit TEXT DEFAULT 'dias',
  estimated_hours INTEGER,

  -- Valores (centavos para monetário)
  reference_value_cents INTEGER,
  min_value_cents INTEGER,
  max_value_cents INTEGER,
  currency TEXT DEFAULT 'BRL',

  -- Cobrança
  charging_model public.service_charging_model DEFAULT 'fixo',
  default_upfront_cents INTEGER,
  default_installments INTEGER,
  success_fee_percentage NUMERIC,

  -- Despesas
  included_expenses TEXT,
  excluded_expenses TEXT,

  -- Documentos / Checklists
  required_documents TEXT,
  suggested_steps TEXT,

  -- Prazos
  estimated_deadline INTEGER,
  deadline_unit TEXT DEFAULT 'dias',

  -- Vinculação a modelos
  proposal_template_id UUID,
  contract_template_id UUID,
  checklist_template_id UUID,

  -- Controle
  status public.service_status DEFAULT 'rascunho',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_platform_library BOOLEAN NOT NULL DEFAULT false,

  -- Auditoria
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT service_catalog_slug_unique
    UNIQUE (law_firm_id, slug),
  CONSTRAINT service_catalog_status_check
    CHECK (status IN ('rascunho', 'ativo', 'inativo', 'arquivado')),
  CONSTRAINT service_catalog_charging_check
    CHECK (charging_model IN (
      'consulta', 'fixo', 'parcelado', 'mensalidade',
      'por_hora', 'por_atividade', 'exito', 'hibrido', 'personalizado'
    )),
  CONSTRAINT service_catalog_duration_unit_check
    CHECK (duration_unit IN ('horas', 'dias', 'semanas', 'meses')),
  CONSTRAINT service_catalogDeadline_unit_check
    CHECK (deadline_unit IN ('horas', 'dias', 'semanas', 'meses')),
  CONSTRAINT service_catalog_cents_non_negative
    CHECK (
      reference_value_cents IS NULL OR reference_value_cents >= 0
    ),
  CONSTRAINT service_catalog_success_fee_check
    CHECK (
      success_fee_percentage IS NULL OR (success_fee_percentage >= 0 AND success_fee_percentage <= 100)
    )
);

-- ── Indices ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_service_catalog_law_firm
  ON public.service_catalog (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_service_catalog_status
  ON public.service_catalog (law_firm_id, status);

CREATE INDEX IF NOT EXISTS idx_service_catalog_practice_area
  ON public.service_catalog (law_firm_id, practice_area);

CREATE INDEX IF NOT EXISTS idx_service_catalog_slug
  ON public.service_catalog (law_firm_id, slug);

CREATE INDEX IF NOT EXISTS idx_service_catalog_platform
  ON public.service_catalog (is_platform_library)
  WHERE is_platform_library = true;

-- ── Trigger: updated_at automático ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_service_catalog_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_service_catalog_updated_at ON public.service_catalog;
CREATE TRIGGER trigger_service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_service_catalog_updated_at();

-- ── RLS Policies ────────────────────────────────────────────
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

-- SELECT: acesso ao tenant OU biblioteca da plataforma (law_firm_id IS NULL)
DROP POLICY IF EXISTS "service_catalog_select" ON public.service_catalog;
CREATE POLICY "service_catalog_select" ON public.service_catalog
  FOR SELECT
  USING (
    has_law_firm_access(law_firm_id) OR law_firm_id IS NULL
  );

-- INSERT: só pode inserir se tem acesso ao tenant
DROP POLICY IF EXISTS "service_catalog_insert" ON public.service_catalog;
CREATE POLICY "service_catalog_insert" ON public.service_catalog
  FOR INSERT
  WITH CHECK (
    has_law_firm_access(law_firm_id) OR law_firm_id IS NULL
  );

-- UPDATE: só se tem acesso ao tenant
DROP POLICY IF EXISTS "service_catalog_update" ON public.service_catalog;
CREATE POLICY "service_catalog_update" ON public.service_catalog
  FOR UPDATE
  USING (
    has_law_firm_access(law_firm_id)
  );

-- DELETE: só se tem acesso ao tenant (soft delete via archived_at)
DROP POLICY IF EXISTS "service_catalog_delete" ON public.service_catalog;
CREATE POLICY "service_catalog_delete" ON public.service_catalog
  FOR DELETE
  USING (
    has_law_firm_access(law_firm_id)
  );

-- ── Permissões (adicionar ao sistema de permissões) ──────────────────
-- As permissões são verificadas no front-end pelo sistema can()
-- Elas serão adicionadas no arquivo lib/auth/permissions.ts
-- (services.view, services.create, services.edit, services.archive,
--  services.manage_templates, services.view_pricing, services.edit_pricing)

-- ── RNA: Biblioteca de Serviços da Plataforma (seed) ──────────────────
-- Serviços da plataforma: law_firm_id IS NULL (somente leitura)
-- Dados de exemplo para as 10 áreas jurídicas

INSERT INTO public.service_catalog (
  law_firm_id, name, slug, practice_area, category,
  short_description, public_description, internal_description,
  scope_included, scope_excluded,
  estimated_duration, duration_unit,
  reference_value_cents, min_value_cents, max_value_cents,
  charging_model, default_upfront_cents, default_installments,
  included_expenses, excluded_expenses,
  required_documents, suggested_steps,
  estimated_deadline, deadline_unit,
  status, sort_order, is_platform_library, created_by
)
VALUES
  -- 1. Consulta Inicial
  (NULL, 'Consulta Inicial', 'consulta-inicial', 'civel', 'servico',
   'Análise preliminar de caso jurídico',
   'Primeira consulta para avaliação do caso, orientação inicial e definição de estratégia.',
   'Análise de documentos do cliente, parecer inicial, definição de próximos passos.',
   'Análise de documentos, parecer, orientação',
   'Assistência processual, representação em juízo',
   1, 'horas', NULL, NULL, NULL,
   'consulta', NULL, NULL,
   NULL,
   'Custas de original, viagens, custas de cópia',
   'Documentos pessoais, documento de identidade, CPF, contratos, documentos relativos ao caso',
   '1. Consulta com cliente; 2. Análise de documentos; 3. Parecer escrito',
   7, 'dias', 'rascunho', 1, true, NULL),

  -- 2. Análise Documental
  (NULL, 'Análise Documental', 'analise-documental', 'civel', 'servico',
   'Revisão e análise de documentos jurídicos',
   'Análise detalhada de documentos relevantes para o caso.',
   'Verificação de cláusulas, validade, conformidade, potenciais riscos.',
   'Análise documental, relatório, orientação',
   'Elaboração de documentos, representação processual',
   3, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   NULL, NULL,
   'Documentos do caso, poderes de representação',
   '1. Coleta de documentos; 2. Análise detalhada; 3. Relatório',
   10, 'dias', 'rascunho', 2, true, NULL),

  -- 3. Notificação Extrajudicial
  (NULL, 'Elaboração de Notificação Extrajudicial', 'notificacao-extrajudicial', 'civel', 'servico',
   'Elaboração e envio de notificação extrajudicial',
   'Redação de notificação para resolução amigável.',
   'Redação da notificação, assessoria jurídica, envio por meio seguro.',
   'Redação, envio, orientação',
   'Representação processual, ação judicial',
   2, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custos de envio, certidão de notificação',
   'Custas processuais, honorários periciais',
   'Documentos do caso, dados do notificado',
   '1. Coleta de informações; 2. Elaboração da notificação; 3. Envio via advogado; 4. Registro de recebimento',
   5, 'dias', 'rascunho', 3, true, NULL),

  -- 4. Elaboração de Contrato
  (NULL, 'Elaboração de Contrato', 'elaboracao-contrato', 'civel', 'servico',
   'Criação de contrato personalizado',
   'Elaboração de contrato com cláusulas personalizadas.',
   'Redação de contrato, revisão de cláusulas, adequação ao caso.',
   'Redação, revisão, modelo, assessoria',
   'Registro em cartório, construção',
   5, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas do cartório, tags, cartões de apresentação',
   'Pesquisa de clientele, campanhas pagas',
   'Dados do cliente, dados do contrato, cláusulas específicas',
   '1. Levantamento de informações; 2. Redação do contrato; 3. Revisão com cliente; 4. Assinatura',
   15, 'dias', 'rascunho', 4, true, NULL),

  -- 5. Revisão de Contrato
  (NULL, 'Revisão de Contrato', 'revisao-contrato', 'civel', 'servico',
   'Análise e revisão de contrato existente',
   'Análise de cláusulas, pontos de atenção, recomendações.',
   'Verificação de conformidade, cláusulas abusivas, riscos.',
   'Análise, relatório, orientação',
   'Redação de novo contrato, representação processual',
   3, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   NULL, NULL,
   'Contrato original, PCB, documento de identidade',
   '1. Análise do contrato; 2. Identificação de riscos; 3. Relatório orientativo',
   10, 'dias', 'rascunho', 5, true, NULL),

  -- 6. Divórcio Consensual
  (NULL, 'Divórcio Consensual', 'divorcio-consensual', 'familia', 'servico',
   'Processo de divórcio consensual',
   'Acompanhamento de divórcio consensual.',
   'Redação de documento, assessoria jurídica, registro em cartório.',
   'Assessoria, documento, registro, orientação',
   'Negociação de bens, guarda',
   30, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas cartorárias, chaves da casa',
   'Investigação, análise de patrimônio',
   'RAP, certidão de casamento, documento de identidade',
   '1. Levantamento de bens; 2. Redação do documento; 3. Registro em cartório; 4. Orientação',
   30, 'dias', 'rascunho', 6, true, NULL),

  -- 7. Inventário
  (NULL, 'Inventário', 'inventario', 'familia', 'servico',
   'Processo de inventário judicial ou extrajudicial',
   'Acompanhamento de inventário com atendimento personalizado.',
   'Levantamento de bens, cálculos, documentação, registro.',
   'Assessoria, documentação, registro, orientação',
   'Ação judicial',
   60, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas cartorárias, perícias',
   'Investigação de titularidade',
   'Certidão de óbito, certidão de casamento, documentos de bens',
   '1. Levantamento de bens; 2. Redação de inventário; 3. Registro em cartório; 4. Acompanhamento',
   60, 'dias', 'rascunho', 7, true, NULL),

  -- 8. Reclamação Trabalhista
  (NULL, 'Reclamação Trabalhista', 'reclamacao-trabalhista', 'trabalhista', 'servico',
   'Elaboração e protocolo de reclamação trabalhista',
   'Acompanhamento de reclamação trabalhista com foco em justiça.',
   'Elaboração da petição, protocolo, audiência, recurso.',
   'Elaboração, protocolo, audiência, recurso',
   'Negociação extrajudicial, conciliação',
   90, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas processuais, custas de perito',
   'Custas de viagem, demais despesas extra',
   'RAP, documento de identidade, carteira de trabalho, contratos',
   '1. Levantamento de informações; 2. Elaboração da reclamação; 3. Protocolo; 4. Audiência; 5. Recurso',
   90, 'dias', 'rascunho', 8, true, NULL),

  -- 9. Defesa Trabalhista
  (NULL, 'Defesa Trabalhista', 'defesa-trabalhista', 'trabalhista', 'servico',
   'Elaboração de defesa em reclamação trabalhista',
   'Acompanhamento de defesa trabalhista.',
   'Elaboração de defesa, audiência, recurso, recurso.',
   'Elaboração, audiência, recurso',
   'Ação trabalhista',
   90, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas processuais, perícias',
   'Custas de viagem, custas adicionais',
   'Documentos de identidade, RAP, documentos do caso',
   '1. Análise da reclamação; 2. Elaboração da defesa; 3. Audiência; 4. Recurso',
   90, 'dias', 'rascunho', 9, true, NULL),

  -- 10. Requerimento Previdenciário
  (NULL, 'Requerimento Previdenciário', 'requerimento-previdenciario', 'previdenciario', 'servico',
   'Elaboração e protocolo de requerimento previdenciário',
   'Acompanhamento de requerimento previdenciário.',
   'Elaboração, protocolo, recurso, follow-up.',
   'Elaboração, protocolo, recurso, rapp',
   'Ação judicial',
   30, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas cartorárias, custas de perito',
   'Investigação complementar',
   'RAP, documento de identidade, CPF, documentos médicos',
   '1. Levantamento de informações; 2. Elaboração do requerimento; 3. Protocolo; 4. Recurso',
   30, 'dias', 'rascunho', 10, true, NULL),

  -- 11. Recurso Administrativo
  (NULL, 'Recurso Administrativo', 'recurso-administrativo', 'administrativo', 'servico',
   'Elaboração de recurso administrativo',
   'Análise e protocolo de recurso administrativo.',
   'Verificar fundamentação, elaboração de recurso, protocolo, acompanhamento.',
   'Elaboração, protocolo, acompanhamento',
   'Ação judicial',
   30, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas de protocolo, custas de certidão',
   'Investigação complementar',
   'Documento de identidade, protocolo anterior, documentos do caso',
   '1. Análise do ato; 2. Elaboração do recurso; 3. Protocolo; 4. Acompanhamento',
   30, 'dias', 'rascunho', 11, true, NULL),

  -- 12. Ação de Consumidor
  (NULL, 'Ação de Consumidor', 'acao-consumidor', 'consumidor', 'servico',
   'Elaboração e protocolo de ação de consumidor',
   'Acompanhamento de ação de consumidor.',
   'Elaboração da petição, protocolo, audiência, recurso.',
   'Elaboração, protocolo, audiência, recurso',
   'Ação trabalhista',
   90, 'dias', NULL, NULL, NULL,
   'fixo', NULL, NULL,
   'Custas processuais, perícias',
   'Investigação, custas intermediárias',
   'Documentos de identidade, CPF, notificações, contrato',
   '1. Levantamento de informações; 2. Elaboração da petição; 3. Protocolo; 4. Audiência; 5. Recurso',
   90, 'dias', 'rascunho', 12, true, NULL),

  -- 13. Acompanhamento Processual
  (NULL, 'Acompanhamento Processual', 'acompanhamento-processual', 'civel', 'servico',
   'Monitoramento e acompanhamento de processo judicial',
   'Acompanhamento de processo judicial em andamento.',
   'Verificar andamento, prazos, movimentações, jurisprudência.',
   'Monitoramento, relatório, alertas',
   'Recurso, ação, consulta, construção',
   NULL, NULL, NULL, NULL, NULL,
   'mensalidade', NULL, NULL,
   NULL, NULL,
   'Nº do processo, documento de identidade',
   '1. Consulta ao processo; 2. Relatório; 3. Alertas de praze',
   NULL, NULL, 'rascunho', 13, true, NULL),

  -- 14. Assessoria Mensal
  (NULL, 'Assessoria Mensal', 'assessoria-mensal', 'empresarial', 'servico',
   'Assessoria jurídica contínua para empresas',
   'Acompanhamento emprestado de assessoria mensal.',
   'Consultoria jurídica contínua, revisão de contratos, orientação.',
   'Consultoria, revisão, orientação, reunião',
   'Ação judicial, contrato',
   NULL, NULL, NULL, NULL, NULL,
   'mensalidade', NULL, NULL,
   NULL, NULL,
   'Documentos da empresa, contrato de assessoria',
   '1. Reunião mensal; 2. Revisão de contratos; 3. Orientação; 4. Relatório',
   NULL, NULL, 'rascunho', 14, true, NULL)
ON CONFLICT DO NOTHING;

COMMIT;
-- <<< canonical source: 0047_service_catalog.sql


-- >>> canonical source: 0048_pricing_scenarios.sql
-- ============================================================
-- MIGRATION 0048 — PRICING SCENARIOS (Cenários de Precificação)
-- ETAPA 5.2.2.2 — Simulador de Honorários
-- ============================================================
-- Cria estrutura completa do simulador de honorários:
-- enums, tabelas, constraints, índices, RLS, funções RPC.
-- ============================================================

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================

-- Status do cenário
CREATE TYPE public.pricing_scenario_status AS ENUM (
  'draft',
  'saved',
  'archived',
  'converted_to_proposal'
);

-- Tipo do cenário
CREATE TYPE public.pricing_scenario_type AS ENUM (
  'conservative',
  'main',
  'expanded',
  'custom'
);

-- Tipo de item de composição
CREATE TYPE public.pricing_item_type AS ENUM (
  'work_hours',
  'direct_expense',
  'indirect_expense',
  'third_party_cost',
  'travel',
  'hearing',
  'activity',
  'fee',
  'tax',
  'adjustment',
  'discount',
  'other'
);

-- Tipo de evento de auditoria
CREATE TYPE public.pricing_event_type AS ENUM (
  'scenario_created',
  'scenario_updated',
  'scenario_duplicated',
  'scenario_archived',
  'scenario_restored',
  'version_created',
  'version_activated',
  'comparison_generated',
  'memory_viewed',
  'memory_printed',
  'memory_exported',
  'conversion_started',
  'conversion_completed',
  'conversion_failed'
);

-- ============================================================
-- TABELA: pricing_scenarios
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,

  -- Identificação
  name TEXT NOT NULL,
  description TEXT,

  -- Status
  status public.pricing_scenario_status NOT NULL DEFAULT 'draft',

  -- Referências opcionais
  service_id UUID,
  lead_id UUID,
  client_id UUID,

  -- Versão ativa
  active_version_id UUID,

  -- Conversão (futuro)
  converted_proposal_id UUID,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT pricing_scenarios_name_check
    CHECK (char_length(name) >= 1 AND char_length(name) <= 500),
  CONSTRAINT pricing_scenarios_archived_status_check
    CHECK (
      (archived_at IS NULL AND status != 'archived')
      OR (archived_at IS NOT NULL AND status = 'archived')
    )
);

-- ============================================================
-- TABELA: pricing_scenario_versions (imutável)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenario_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  pricing_scenario_id UUID NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,

  -- Versão
  version_number INTEGER NOT NULL,
  scenario_type public.pricing_scenario_type NOT NULL DEFAULT 'main',

  -- Parâmetros e resultado (JSON)
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculation_memory JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Valores financeiros (centavos)
  currency TEXT NOT NULL DEFAULT 'BRL',
  total_amount_cents BIGINT NOT NULL DEFAULT 0,
  entry_amount_cents BIGINT NOT NULL DEFAULT 0,
  financed_amount_cents BIGINT NOT NULL DEFAULT 0,
  installment_count INTEGER NOT NULL DEFAULT 0,

  -- Êxito
  success_fee_percentage_bps INTEGER NOT NULL DEFAULT 0,
  success_fee_base_cents BIGINT,
  estimated_success_fee_cents BIGINT,

  -- Mensalidade
  monthly_fee_cents BIGINT,
  monthly_fee_count INTEGER,

  -- Auditoria (somente criação, sem updated_at)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pricing_scenario_versions_unique_number
    UNIQUE (pricing_scenario_id, version_number),
  CONSTRAINT pricing_scenario_versions_version_check
    CHECK (version_number > 0),
  CONSTRAINT pricing_scenario_versions_total_check
    CHECK (total_amount_cents >= 0),
  CONSTRAINT pricing_scenario_versions_entry_check
    CHECK (entry_amount_cents >= 0),
  CONSTRAINT pricing_scenario_versions_financed_check
    CHECK (financed_amount_cents >= 0),
  CONSTRAINT pricing_scenario_versions_entry_total_check
    CHECK (entry_amount_cents <= total_amount_cents),
  CONSTRAINT pricing_scenario_versions_installment_check
    CHECK (installment_count >= 0),
  CONSTRAINT pricing_scenario_versions_bps_check
    CHECK (success_fee_percentage_bps >= 0 AND success_fee_percentage_bps <= 10000),
  CONSTRAINT pricing_scenario_versions_monthly_fee_check
    CHECK (monthly_fee_cents IS NULL OR monthly_fee_cents >= 0),
  CONSTRAINT pricing_scenario_versions_monthly_count_check
    CHECK (monthly_fee_count IS NULL OR monthly_fee_count >= 0)
);

-- ============================================================
-- TABELA: pricing_scenario_items (imutável)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenario_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  scenario_version_id UUID NOT NULL REFERENCES public.pricing_scenario_versions(id) ON DELETE CASCADE,

  -- Identificação
  item_type public.pricing_item_type NOT NULL,
  description TEXT NOT NULL,

  -- Valores
  quantity NUMERIC(12,4) NOT NULL DEFAULT 1,
  unit_amount_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL DEFAULT 0,

  -- Ordenação
  order_index INTEGER NOT NULL DEFAULT 0,

  -- Metadados adicionais
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT pricing_scenario_items_quantity_check
    CHECK (quantity >= 0),
  CONSTRAINT pricing_scenario_items_unit_check
    CHECK (unit_amount_cents >= 0),
  CONSTRAINT pricing_scenario_items_total_check
    CHECK (total_amount_cents >= 0),
  CONSTRAINT pricing_scenario_items_order_check
    CHECK (order_index >= 0)
);

-- ============================================================
-- TABELA: pricing_scenario_events (append-only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pricing_scenario_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  pricing_scenario_id UUID NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  version_id UUID,

  -- Evento
  event_type public.pricing_event_type NOT NULL,
  actor_id UUID NOT NULL,

  -- Metadados seguros (sem dados sensíveis)
  safe_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Auditoria
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- updated_at automático em pricing_scenarios
CREATE OR REPLACE FUNCTION public.set_pricing_scenarios_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pricing_scenarios_updated_at ON public.pricing_scenarios;
CREATE TRIGGER trigger_pricing_scenarios_updated_at
  BEFORE UPDATE ON public.pricing_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.set_pricing_scenarios_updated_at();

-- ============================================================
-- FUNÇÃO: Resolver membro atual (reutiliza padrão existente)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_member_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid()
    AND m.status = 'ativo'
  LIMIT 1;
$$;

-- ============================================================
-- FUNÇÃO: set_active_pricing_version (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_active_pricing_version(
  p_scenario_id UUID,
  p_version_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_scenario RECORD;
  v_version RECORD;
BEGIN
  -- 1. Resolver membro
  SELECT m.id, m.law_firm_id INTO v_member_id, v_law_firm_id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar cenário
  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário não encontrado');
  END IF;

  -- 3. Validar versão
  SELECT * INTO v_version
  FROM public.pricing_scenario_versions
  WHERE id = p_version_id
    AND pricing_scenario_id = p_scenario_id
    AND law_firm_id = v_law_firm_id;

  IF v_version IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Versão não encontrada ou pertence a outro cenário');
  END IF;

  -- 4. Atualizar active_version_id
  UPDATE public.pricing_scenarios
  SET active_version_id = p_version_id
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

  -- 5. Registrar evento
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id, version_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, p_scenario_id, p_version_id,
    'version_activated', v_member_id,
    jsonb_build_object('version_number', v_version.version_number)
  );

  RETURN jsonb_build_object('ok', true, 'version_number', v_version.version_number);
END;
$$;

-- ============================================================
-- FUNÇÃO: create_pricing_scenario_version (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_pricing_scenario_version(
  p_scenario_id UUID,
  p_parameters JSONB,
  p_calculation_result JSONB,
  p_calculation_memory JSONB,
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
  p_activate BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_scenario RECORD;
  v_next_version INTEGER;
  v_new_version_id UUID;
BEGIN
  -- 1. Resolver membro
  SELECT m.id, m.law_firm_id INTO v_member_id, v_law_firm_id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar cenário (lock para concorrência)
  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id
  FOR UPDATE;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário não encontrado');
  END IF;

  IF v_scenario.status = 'archived' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Não é possível criar versão de cenário arquivado');
  END IF;

  -- 3. Calcular próximo version_number (concorrência segura com FOR UPDATE)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.pricing_scenario_versions
  WHERE pricing_scenario_id = p_scenario_id;

  -- 4. Inserir versão
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

  -- 5. Registrar evento
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id, version_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, p_scenario_id, v_new_version_id,
    'version_created', v_member_id,
    jsonb_build_object('version_number', v_next_version, 'scenario_type', p_scenario_type)
  );

  -- 6. Ativar se solicitado
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

  -- 7. Atualizar status para saved
  UPDATE public.pricing_scenarios
  SET status = 'saved'
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id AND status = 'draft';

  RETURN jsonb_build_object(
    'ok', true,
    'version_id', v_new_version_id,
    'version_number', v_next_version,
    'activated', p_activate
  );
END;
$$;

-- ============================================================
-- FUNÇÃO: duplicate_pricing_scenario (RPC)
-- ============================================================

CREATE OR REPLACE FUNCTION public.duplicate_pricing_scenario(
  p_source_scenario_id UUID,
  p_new_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_law_firm_id UUID;
  v_source RECORD;
  v_new_scenario_id UUID;
  v_new_name TEXT;
  v_active_version RECORD;
BEGIN
  -- 1. Resolver membro
  SELECT m.id, m.law_firm_id INTO v_member_id, v_law_firm_id
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro não encontrado');
  END IF;

  -- 2. Validar cenário origem
  SELECT * INTO v_source
  FROM public.pricing_scenarios
  WHERE id = p_source_scenario_id AND law_firm_id = v_law_firm_id;

  IF v_source IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenário origem não encontrado');
  END IF;

  -- 3. Definir nome
  v_new_name := COALESCE(p_new_name, v_source.name || ' (Cópia)');

  -- 4. Criar novo cenário
  INSERT INTO public.pricing_scenarios (
    law_firm_id, created_by,
    name, description, status,
    service_id, lead_id, client_id
  ) VALUES (
    v_law_firm_id, v_member_id,
    v_new_name, v_source.description, 'draft',
    v_source.service_id, v_source.lead_id, v_source.client_id
  ) RETURNING id INTO v_new_scenario_id;

  -- 5. Copiar versão ativa (se existir)
  IF v_source.active_version_id IS NOT NULL THEN
    SELECT * INTO v_active_version
    FROM public.pricing_scenario_versions
    WHERE id = v_source.active_version_id;

    IF v_active_version IS NOT NULL THEN
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
        v_law_firm_id, v_new_scenario_id, v_member_id,
        1, v_active_version.scenario_type,
        v_active_version.parameters, v_active_version.calculation_result,
        v_active_version.calculation_memory,
        v_active_version.currency, v_active_version.total_amount_cents,
        v_active_version.entry_amount_cents,
        v_active_version.financed_amount_cents, v_active_version.installment_count,
        v_active_version.success_fee_percentage_bps, v_active_version.success_fee_base_cents,
        v_active_version.estimated_success_fee_cents,
        v_active_version.monthly_fee_cents, v_active_version.monthly_fee_count
      );

      -- Copiar itens da versão
      INSERT INTO public.pricing_scenario_items (
        law_firm_id, scenario_version_id,
        item_type, description, quantity,
        unit_amount_cents, total_amount_cents,
        order_index, metadata
      )
      SELECT
        v_law_firm_id, (
          SELECT id FROM public.pricing_scenario_versions
          WHERE pricing_scenario_id = v_new_scenario_id
            AND version_number = 1
            AND law_firm_id = v_law_firm_id
        ),
        item_type, description, quantity,
        unit_amount_cents, total_amount_cents,
        order_index, metadata
      FROM public.pricing_scenario_items
      WHERE scenario_version_id = v_active_version.id;

      -- Ativar versão no novo cenário
      UPDATE public.pricing_scenarios
      SET active_version_id = (
        SELECT id FROM public.pricing_scenario_versions
        WHERE pricing_scenario_id = v_new_scenario_id
          AND version_number = 1
          AND law_firm_id = v_law_firm_id
      )
      WHERE id = v_new_scenario_id;
    END IF;
  END IF;

  -- 6. Registrar evento
  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id,
    event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, v_new_scenario_id,
    'scenario_duplicated', v_member_id,
    jsonb_build_object('source_scenario_id', p_source_scenario_id)
  );

  RETURN jsonb_build_object('ok', true, 'scenario_id', v_new_scenario_id, 'name', v_new_name);
END;
$$;

-- ============================================================
-- FUNÇÃO: canUseServiceForPricing (validação de serviço)
-- ============================================================

CREATE OR REPLACE FUNCTION public.can_use_service_for_pricing(
  p_service_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_catalog sc
    WHERE sc.id = p_service_id
      AND (
        -- Biblioteca da plataforma (somente leitura)
        (sc.is_platform_library = true AND sc.law_firm_id IS NULL)
        OR
        -- Serviço privado do próprio tenant
        (sc.law_firm_id = (
          SELECT m.law_firm_id
          FROM public.law_firm_members m
          WHERE m.user_id = auth.uid() AND m.status = 'ativo'
          LIMIT 1
        ))
      )
      AND sc.status != 'arquivado'
  );
$$;

-- ============================================================
-- ÍNDICES
-- ============================================================

-- pricing_scenarios
CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_law_firm
  ON public.pricing_scenarios (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_status
  ON public.pricing_scenarios (law_firm_id, status);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_created_at
  ON public.pricing_scenarios (law_firm_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_archived_at
  ON public.pricing_scenarios (law_firm_id, archived_at);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_service
  ON public.pricing_scenarios (service_id)
  WHERE service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_lead
  ON public.pricing_scenarios (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_client
  ON public.pricing_scenarios (client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_created_by
  ON public.pricing_scenarios (created_by);

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_active_version
  ON public.pricing_scenarios (active_version_id)
  WHERE active_version_id IS NOT NULL;

-- Habilitar extensão para busca por texto (se necessário)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_name_search
  ON public.pricing_scenarios USING gin (name gin_trgm_ops);

-- pricing_scenario_versions
CREATE INDEX IF NOT EXISTS idx_pricing_versions_scenario
  ON public.pricing_scenario_versions (pricing_scenario_id);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_law_firm
  ON public.pricing_scenario_versions (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_scenario_number
  ON public.pricing_scenario_versions (pricing_scenario_id, version_number);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_type
  ON public.pricing_scenario_versions (scenario_type);

CREATE INDEX IF NOT EXISTS idx_pricing_versions_created_at
  ON public.pricing_scenario_versions (created_at DESC);

-- pricing_scenario_items
CREATE INDEX IF NOT EXISTS idx_pricing_items_version
  ON public.pricing_scenario_items (scenario_version_id);

CREATE INDEX IF NOT EXISTS idx_pricing_items_law_firm
  ON public.pricing_scenario_items (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_items_type
  ON public.pricing_scenario_items (item_type);

CREATE INDEX IF NOT EXISTS idx_pricing_items_order
  ON public.pricing_scenario_items (scenario_version_id, order_index);

-- pricing_scenario_events
CREATE INDEX IF NOT EXISTS idx_pricing_events_scenario
  ON public.pricing_scenario_events (pricing_scenario_id);

CREATE INDEX IF NOT EXISTS idx_pricing_events_law_firm
  ON public.pricing_scenario_events (law_firm_id);

CREATE INDEX IF NOT EXISTS idx_pricing_events_type
  ON public.pricing_scenario_events (event_type);

CREATE INDEX IF NOT EXISTS idx_pricing_events_created_at
  ON public.pricing_scenario_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_events_actor
  ON public.pricing_scenario_events (actor_id);

-- ============================================================
-- RLS: pricing_scenarios
-- ============================================================

ALTER TABLE public.pricing_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_scenarios_select" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_select" ON public.pricing_scenarios
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_scenarios_insert" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_insert" ON public.pricing_scenarios
  FOR INSERT
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND created_by = public.get_current_member_id()
  );

DROP POLICY IF EXISTS "pricing_scenarios_update" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_update" ON public.pricing_scenarios
  FOR UPDATE
  USING (has_law_firm_access(law_firm_id))
  WITH CHECK (
    has_law_firm_access(law_firm_id)
    AND law_firm_id = law_firm_id
    AND created_by = created_by
  );

DROP POLICY IF EXISTS "pricing_scenarios_delete" ON public.pricing_scenarios;
CREATE POLICY "pricing_scenarios_delete" ON public.pricing_scenarios
  FOR DELETE
  USING (false); -- Bloquear exclusão física

-- ============================================================
-- RLS: pricing_scenario_versions (imutável)
-- ============================================================

ALTER TABLE public.pricing_scenario_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_versions_select" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_select" ON public.pricing_scenario_versions
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_versions_insert" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_insert" ON public.pricing_scenario_versions
  FOR INSERT
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_versions_update" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_update" ON public.pricing_scenario_versions
  FOR UPDATE
  USING (false); -- Imutável

DROP POLICY IF EXISTS "pricing_versions_delete" ON public.pricing_scenario_versions;
CREATE POLICY "pricing_versions_delete" ON public.pricing_scenario_versions
  FOR DELETE
  USING (false); -- Imutável

-- ============================================================
-- RLS: pricing_scenario_items (imutável)
-- ============================================================

ALTER TABLE public.pricing_scenario_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_items_select" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_select" ON public.pricing_scenario_items
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_items_insert" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_insert" ON public.pricing_scenario_items
  FOR INSERT
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_items_update" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_update" ON public.pricing_scenario_items
  FOR UPDATE
  USING (false); -- Imutável

DROP POLICY IF EXISTS "pricing_items_delete" ON public.pricing_scenario_items;
CREATE POLICY "pricing_items_delete" ON public.pricing_scenario_items
  FOR DELETE
  USING (false); -- Imutável

-- ============================================================
-- RLS: pricing_scenario_events (append-only)
-- ============================================================

ALTER TABLE public.pricing_scenario_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_events_select" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_select" ON public.pricing_scenario_events
  FOR SELECT
  USING (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_events_insert" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_insert" ON public.pricing_scenario_events
  FOR INSERT
  WITH CHECK (has_law_firm_access(law_firm_id));

DROP POLICY IF EXISTS "pricing_events_update" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_update" ON public.pricing_scenario_events
  FOR UPDATE
  USING (false); -- Append-only

DROP POLICY IF EXISTS "pricing_events_delete" ON public.pricing_scenario_events;
CREATE POLICY "pricing_events_delete" ON public.pricing_scenario_events
  FOR DELETE
  USING (false); -- Append-only

-- ============================================================
-- TRIGGER DE PROTEÇÃO: Versões imutáveis via trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_version_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Versões de cenário são imutáveis. Crie uma nova versão em vez de modificar a existente.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_version_update ON public.pricing_scenario_versions;
CREATE TRIGGER trigger_prevent_version_update
  BEFORE UPDATE ON public.pricing_scenario_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_version_modification();

DROP TRIGGER IF EXISTS trigger_prevent_version_delete ON public.pricing_scenario_versions;
CREATE TRIGGER trigger_prevent_version_delete
  BEFORE DELETE ON public.pricing_scenario_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_version_modification();

-- ============================================================
-- TRIGGER DE PROTEÇÃO: Itens imutáveis via trigger
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_item_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Itens de versão são imutáveis. Crie uma nova versão em vez de modificar itens existentes.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_item_update ON public.pricing_scenario_items;
CREATE TRIGGER trigger_prevent_item_update
  BEFORE UPDATE ON public.pricing_scenario_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_item_modification();

DROP TRIGGER IF EXISTS trigger_prevent_item_delete ON public.pricing_scenario_items;
CREATE TRIGGER trigger_prevent_item_delete
  BEFORE DELETE ON public.pricing_scenario_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_item_modification();

-- ============================================================
-- TRIGGER DE PROTEÇÃO: Eventos append-only
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_event_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Eventos de auditoria são append-only e não podem ser modificados.';
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_event_update ON public.pricing_scenario_events;
CREATE TRIGGER trigger_prevent_event_update
  BEFORE UPDATE ON public.pricing_scenario_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_event_modification();

DROP TRIGGER IF EXISTS trigger_prevent_event_delete ON public.pricing_scenario_events;
CREATE TRIGGER trigger_prevent_event_delete
  BEFORE DELETE ON public.pricing_scenario_events
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_event_modification();

COMMIT;
-- <<< canonical source: 0048_pricing_scenarios.sql


-- >>> canonical source: 0049_pricing_idempotency.sql
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
-- <<< canonical source: 0049_pricing_idempotency.sql


-- >>> canonical source: 0050_fix_pricing_idempotency.sql
-- ============================================================
-- MIGRATION 0050 — FIX PRICING IDEMPOTENCY (Correções da RPC)
-- ETAPA 5.2.2.6.3 — Correção do ciclo de vida da chave
-- ============================================================
-- Corrige a RPC create_pricing_scenario_version_idempotent
-- para:
-- 1. Validar hash diferente com mesma chave (IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT)
-- 2. Criar itens em pricing_scenario_items (p_items)
-- 3. Atualizar status do cenário para 'saved'
-- 4. Marcar operação como completed com resultado correto
-- 5. Criar operação de fallback öffnen als TX um szybszy
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Criar tabela pricing_idempotency_operations se não existir
-- ============================================================

-- pricing_idempotency_status is created by 0049_pricing_idempotency.sql in the canonical chain.

CREATE TABLE IF NOT EXISTS public.pricing_idempotency_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id UUID NOT NULL REFERENCES public.law_firms(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL,
  pricing_scenario_id UUID NOT NULL REFERENCES public.pricing_scenarios(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL
    CHECK (char_length(operation_type) >= 1 AND char_length(operation_type) <= 100),
  idempotency_key TEXT NOT NULL
    CHECK (char_length(idempotency_key) >= 1 AND char_length(idempotency_key) <= 256),
  input_hash TEXT NOT NULL
    CHECK (char_length(input_hash) >= 1),
  status public.pricing_idempotency_status NOT NULL DEFAULT 'processing',
  result_version_id UUID REFERENCES public.pricing_scenario_versions(id) ON DELETE SET NULL,
  safe_error_code TEXT
    CHECK (char_length(safe_error_code) <= 256),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_idempotency_operations_unique
  ON public.pricing_idempotency_operations
  (law_firm_id, actor_id, pricing_scenario_id, operation_type, idempotency_key);

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

-- RLS
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
  USING (false);

-- ============================================================
-- 2. Recriar RPC com correções
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
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
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
  v_item JSONB;
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
      IF v_existing.input_hash = p_input_hash THEN
        -- Mesma chave e mesmo hash: retornar resultado anterior
        RETURN jsonb_build_object(
          'ok', true,
          'version_id', v_existing.result_version_id,
          'idempotent', true,
          'message', 'Operação já processada anteriormente'
        );
      ELSE
        -- Mesma chave e hash diferente: conflito
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT: Chave já utilizada com parâmetros diferentes'
        );
      END IF;
    ELSIF v_existing.status = 'processing' THEN
      -- Operação em andamento: rejeitar duplicata
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'Operação em processamento. Aguarde a conclusão.'
      );
    ELSIF v_existing.status = 'failed' THEN
      IF v_existing.input_hash = p_input_hash THEN
        -- Mesma chave e mesmo hash: permitir retry
        UPDATE public.pricing_idempotency_operations
        SET status = 'processing',
            safe_error_code = NULL,
            completed_at = NULL,
            expires_at = now() + INTERVAL '24 hours'
        WHERE id = v_existing.id;
      ELSE
        -- Mesma chave e hash diferente: conflito
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT: Chave já utilizada com parâmetros diferentes'
        );
      END IF;
    END IF;
  ELSE
    -- Nova operação
    INSERT INTO public.pricing_idempotency_operations (
      law_firm_id, actor_id, pricing_scenario_id,
      operation_type, idempotency_key, input_hash, status
    ) VALUES (
      v_law_firm_id, v_member_id, p_scenario_id,
      'create_version', p_idempotency_key, p_input_hash, 'processing'
    );
  END IF;

  -- 7. Calcular próximo version_number (com lock)
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.pricing_scenario_versions
  WHERE pricing_scenario_id = p_scenario_id;

  -- 8. Criar versão
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

  -- 9. Criar itens em pricing_scenario_items
  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.pricing_scenario_items (
        law_firm_id, scenario_version_id, item_type, description,
        quantity, unit_amount_cents, total_amount_cents, order_index, metadata
      ) VALUES (
        v_law_firm_id, v_new_version_id,
        COALESCE(v_item->>'item_type', 'service'),
        COALESCE(v_item->>'description', 'Item'),
        COALESCE((v_item->>'quantity')::numeric, 1),
        COALESCE((v_item->>'unit_amount_cents')::bigint, 0),
        COALESCE((v_item->>'total_amount_cents')::bigint, 0),
        COALESCE((v_item->>'order_index')::int, 0),
        v_item->'metadata'
      );
    END LOOP;
  END IF;

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
      'idempotency_key', p_idempotency_key,
      'item_count', jsonb_array_length(p_items)
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
    'idempotent', false,
    'item_count', jsonb_array_length(p_items)
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
-- 3. Função de limpeza
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
-- <<< canonical source: 0050_fix_pricing_idempotency.sql


-- >>> canonical source: 0051_fix_pricing_idempotency_retry.sql
-- ============================================================
-- MIGRATION 0051 — FIX PRICING IDEMPOTENCY RETRY
-- ETAPA 5.2.2.6.3 — correção do ciclo de vida da chave
-- ============================================================
-- Motivo:
-- 1. A RPC anterior usava `v_existing IS NOT NULL` com RECORD.
--    Em PL/pgSQL isso falha quando a linha tem campos nulos e a
--    função tenta reinserir a mesma chave, gerando 23505.
-- 2. Retries com a mesma chave precisam reler a operação existente
--    e retornar o resultado persistido, nunca criar nova versão.
-- 3. Completed/failed devem permanecer por 24 horas para cobrir
--    retries reais; o cleanup remove apenas registros antigos.
-- ============================================================

BEGIN;

COMMENT ON TABLE public.pricing_idempotency_operations IS
  'Operações idempotentes de pricing. TTL operacional: 24 horas após a criação para cobrir retries de rede e timeout sem duplicar versões.';

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
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
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
  v_item JSONB;
BEGIN
  SELECT m.id, m.law_firm_id, m.role
  INTO v_member_id, v_law_firm_id, v_member_role
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro nao encontrado');
  END IF;

  IF v_member_role NOT IN ('proprietario', 'administrador', 'advogado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissao');
  END IF;

  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id
  FOR UPDATE;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenario nao encontrado');
  END IF;

  IF v_scenario.status = 'archived' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenario arquivado');
  END IF;

  IF p_expected_updated_at IS NOT NULL AND v_scenario.updated_at != p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Conflito de concorrencia');
  END IF;

  <<idempotency_guard>>
  LOOP
    SELECT * INTO v_existing
    FROM public.pricing_idempotency_operations
    WHERE law_firm_id = v_law_firm_id
      AND actor_id = v_member_id
      AND pricing_scenario_id = p_scenario_id
      AND operation_type = 'create_version'
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing.input_hash <> p_input_hash THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT'
        );
      END IF;

      IF v_existing.status = 'completed' THEN
        RETURN jsonb_build_object(
          'ok', true,
          'version_id', v_existing.result_version_id,
          'idempotent', true,
          'message', 'Operacao ja processada'
        );
      ELSIF v_existing.status = 'processing' THEN
        RETURN jsonb_build_object(
          'ok', false,
          'error', 'operation_in_progress'
        );
      ELSIF v_existing.status = 'failed' THEN
        UPDATE public.pricing_idempotency_operations
        SET status = 'processing',
            safe_error_code = NULL,
            completed_at = NULL,
            expires_at = now() + INTERVAL '24 hours'
        WHERE id = v_existing.id;

        EXIT idempotency_guard;
      END IF;
    ELSE
      BEGIN
        INSERT INTO public.pricing_idempotency_operations (
          law_firm_id,
          actor_id,
          pricing_scenario_id,
          operation_type,
          idempotency_key,
          input_hash,
          status
        ) VALUES (
          v_law_firm_id,
          v_member_id,
          p_scenario_id,
          'create_version',
          p_idempotency_key,
          p_input_hash,
          'processing'
        );

        EXIT idempotency_guard;
      EXCEPTION
        WHEN unique_violation THEN
          -- Outra chamada inseriu a operação primeiro. Releia e trate o estado.
          NULL;
      END;
    END IF;
  END LOOP;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.pricing_scenario_versions
  WHERE pricing_scenario_id = p_scenario_id;

  INSERT INTO public.pricing_scenario_versions (
    law_firm_id,
    pricing_scenario_id,
    created_by,
    version_number,
    scenario_type,
    parameters,
    calculation_result,
    calculation_memory,
    currency,
    total_amount_cents,
    entry_amount_cents,
    financed_amount_cents,
    installment_count,
    success_fee_percentage_bps,
    success_fee_base_cents,
    estimated_success_fee_cents,
    monthly_fee_cents,
    monthly_fee_count
  ) VALUES (
    v_law_firm_id,
    p_scenario_id,
    v_member_id,
    v_next_version,
    p_scenario_type,
    p_parameters,
    p_calculation_result,
    p_calculation_memory,
    p_currency,
    p_total_amount_cents,
    p_entry_amount_cents,
    p_financed_amount_cents,
    p_installment_count,
    p_success_fee_percentage_bps,
    p_success_fee_base_cents,
    p_estimated_success_fee_cents,
    p_monthly_fee_cents,
    p_monthly_fee_count
  ) RETURNING id INTO v_new_version_id;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.pricing_scenario_items (
        law_firm_id,
        scenario_version_id,
        item_type,
        description,
        quantity,
        unit_amount_cents,
        total_amount_cents,
        order_index,
        metadata
      ) VALUES (
        v_law_firm_id,
        v_new_version_id,
        COALESCE(v_item->>'item_type', 'service'),
        COALESCE(v_item->>'description', 'Item'),
        COALESCE((v_item->>'quantity')::numeric, 1),
        COALESCE((v_item->>'unit_amount_cents')::bigint, 0),
        COALESCE((v_item->>'total_amount_cents')::bigint, 0),
        COALESCE((v_item->>'order_index')::int, 0),
        v_item->'metadata'
      );
    END LOOP;
  END IF;

  INSERT INTO public.pricing_scenario_events (
    law_firm_id,
    pricing_scenario_id,
    version_id,
    event_type,
    actor_id,
    safe_metadata
  ) VALUES (
    v_law_firm_id,
    p_scenario_id,
    v_new_version_id,
    'version_created',
    v_member_id,
    jsonb_build_object(
      'version_number', v_next_version,
      'scenario_type', p_scenario_type,
      'idempotency_key', p_idempotency_key,
      'item_count', jsonb_array_length(p_items)
    )
  );

  IF p_activate THEN
    UPDATE public.pricing_scenarios
    SET active_version_id = v_new_version_id
    WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

    INSERT INTO public.pricing_scenario_events (
      law_firm_id,
      pricing_scenario_id,
      version_id,
      event_type,
      actor_id,
      safe_metadata
    ) VALUES (
      v_law_firm_id,
      p_scenario_id,
      v_new_version_id,
      'version_activated',
      v_member_id,
      jsonb_build_object('version_number', v_next_version)
    );
  END IF;

  UPDATE public.pricing_scenarios
  SET status = 'saved'
  WHERE id = p_scenario_id
    AND law_firm_id = v_law_firm_id
    AND status = 'draft';

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
    'idempotent', false,
    'item_count', jsonb_array_length(p_items)
  );

EXCEPTION WHEN OTHERS THEN
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
    'error', 'Erro interno ao criar versao',
    'safe_error_code', SQLSTATE
  );
END;
$$;

COMMIT;
-- <<< canonical source: 0051_fix_pricing_idempotency_retry.sql


-- >>> canonical source: 0052_fix_pricing_item_type_default.sql
-- ============================================================
-- MIGRATION 0052 — FIX PRICING ITEM TYPE DEFAULT
-- ETAPA 5.2.2.6.3 — alinhamento do payload p_items
-- ============================================================
-- Motivo:
-- A RPC aceitava fallback `service`, mas o enum real `pricing_item_type`
-- não possui esse valor. O fallback correto para itens financeiros
-- gerados pelo simulador é `fee`.
-- ============================================================

BEGIN;

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
  p_expected_updated_at TIMESTAMPTZ DEFAULT NULL,
  p_items JSONB DEFAULT '[]'::jsonb
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
  v_item JSONB;
BEGIN
  SELECT m.id, m.law_firm_id, m.role
  INTO v_member_id, v_law_firm_id, v_member_role
  FROM public.law_firm_members m
  WHERE m.user_id = auth.uid() AND m.status = 'ativo'
  LIMIT 1;

  IF v_member_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Membro nao encontrado');
  END IF;

  IF v_member_role NOT IN ('proprietario', 'administrador', 'advogado') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Sem permissao');
  END IF;

  SELECT * INTO v_scenario
  FROM public.pricing_scenarios
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id
  FOR UPDATE;

  IF v_scenario IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenario nao encontrado');
  END IF;

  IF v_scenario.status = 'archived' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Cenario arquivado');
  END IF;

  IF p_expected_updated_at IS NOT NULL AND v_scenario.updated_at != p_expected_updated_at THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Conflito de concorrencia');
  END IF;

  <<idempotency_guard>>
  LOOP
    SELECT * INTO v_existing
    FROM public.pricing_idempotency_operations
    WHERE law_firm_id = v_law_firm_id
      AND actor_id = v_member_id
      AND pricing_scenario_id = p_scenario_id
      AND operation_type = 'create_version'
      AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing.input_hash <> p_input_hash THEN
        RETURN jsonb_build_object('ok', false, 'error', 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_INPUT');
      END IF;

      IF v_existing.status = 'completed' THEN
        RETURN jsonb_build_object('ok', true, 'version_id', v_existing.result_version_id, 'idempotent', true, 'message', 'Operacao ja processada');
      ELSIF v_existing.status = 'processing' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'operation_in_progress');
      ELSIF v_existing.status = 'failed' THEN
        UPDATE public.pricing_idempotency_operations
        SET status = 'processing', safe_error_code = NULL, completed_at = NULL, expires_at = now() + INTERVAL '24 hours'
        WHERE id = v_existing.id;

        EXIT idempotency_guard;
      END IF;
    ELSE
      BEGIN
        INSERT INTO public.pricing_idempotency_operations (
          law_firm_id, actor_id, pricing_scenario_id, operation_type, idempotency_key, input_hash, status
        ) VALUES (
          v_law_firm_id, v_member_id, p_scenario_id, 'create_version', p_idempotency_key, p_input_hash, 'processing'
        );

        EXIT idempotency_guard;
      EXCEPTION WHEN unique_violation THEN
        NULL;
      END;
    END IF;
  END LOOP;

  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO v_next_version
  FROM public.pricing_scenario_versions
  WHERE pricing_scenario_id = p_scenario_id;

  INSERT INTO public.pricing_scenario_versions (
    law_firm_id, pricing_scenario_id, created_by, version_number, scenario_type,
    parameters, calculation_result, calculation_memory, currency, total_amount_cents,
    entry_amount_cents, financed_amount_cents, installment_count, success_fee_percentage_bps,
    success_fee_base_cents, estimated_success_fee_cents, monthly_fee_cents, monthly_fee_count
  ) VALUES (
    v_law_firm_id, p_scenario_id, v_member_id, v_next_version, p_scenario_type,
    p_parameters, p_calculation_result, p_calculation_memory, p_currency, p_total_amount_cents,
    p_entry_amount_cents, p_financed_amount_cents, p_installment_count, p_success_fee_percentage_bps,
    p_success_fee_base_cents, p_estimated_success_fee_cents, p_monthly_fee_cents, p_monthly_fee_count
  ) RETURNING id INTO v_new_version_id;

  IF p_items IS NOT NULL AND jsonb_array_length(p_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      INSERT INTO public.pricing_scenario_items (
        law_firm_id, scenario_version_id, item_type, description, quantity,
        unit_amount_cents, total_amount_cents, order_index, metadata
      ) VALUES (
        v_law_firm_id,
        v_new_version_id,
        COALESCE((v_item->>'item_type')::public.pricing_item_type, 'fee'::public.pricing_item_type),
        COALESCE(v_item->>'description', 'Item'),
        COALESCE((v_item->>'quantity')::numeric, 1),
        COALESCE((v_item->>'unit_amount_cents')::bigint, 0),
        COALESCE((v_item->>'total_amount_cents')::bigint, 0),
        COALESCE((v_item->>'order_index')::int, 0),
        v_item->'metadata'
      );
    END LOOP;
  END IF;

  INSERT INTO public.pricing_scenario_events (
    law_firm_id, pricing_scenario_id, version_id, event_type, actor_id, safe_metadata
  ) VALUES (
    v_law_firm_id, p_scenario_id, v_new_version_id, 'version_created', v_member_id,
    jsonb_build_object(
      'version_number', v_next_version,
      'scenario_type', p_scenario_type,
      'idempotency_key', p_idempotency_key,
      'item_count', jsonb_array_length(p_items)
    )
  );

  IF p_activate THEN
    UPDATE public.pricing_scenarios
    SET active_version_id = v_new_version_id
    WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id;

    INSERT INTO public.pricing_scenario_events (
      law_firm_id, pricing_scenario_id, version_id, event_type, actor_id, safe_metadata
    ) VALUES (
      v_law_firm_id, p_scenario_id, v_new_version_id, 'version_activated', v_member_id,
      jsonb_build_object('version_number', v_next_version)
    );
  END IF;

  UPDATE public.pricing_scenarios
  SET status = 'saved'
  WHERE id = p_scenario_id AND law_firm_id = v_law_firm_id AND status = 'draft';

  UPDATE public.pricing_idempotency_operations
  SET status = 'completed', result_version_id = v_new_version_id, completed_at = now()
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
    'idempotent', false,
    'item_count', jsonb_array_length(p_items)
  );

EXCEPTION WHEN OTHERS THEN
  UPDATE public.pricing_idempotency_operations
  SET status = 'failed', safe_error_code = SQLSTATE, completed_at = now()
  WHERE law_firm_id = v_law_firm_id
    AND actor_id = v_member_id
    AND pricing_scenario_id = p_scenario_id
    AND operation_type = 'create_version'
    AND idempotency_key = p_idempotency_key
    AND status = 'processing';

  RETURN jsonb_build_object(
    'ok', false,
    'error', 'Erro interno ao criar versao',
    'safe_error_code', SQLSTATE
  );
END;
$$;

COMMIT;
-- <<< canonical source: 0052_fix_pricing_item_type_default.sql


-- >>> canonical source: 0053_harden_pricing_permissions.sql
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
-- <<< canonical source: 0053_harden_pricing_permissions.sql
