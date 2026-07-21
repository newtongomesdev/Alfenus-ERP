-- Alfenus - schema completo consolidado
-- Gerado a partir de supabase/migrations. Aplicar este arquivo uma única vez em um banco vazio.
-- As migrations individuais permanecem como histórico incremental do projeto.

begin;

-- >>> 0001_foundation.sql
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
-- <<< 0001_foundation.sql

-- >>> 0002_operational_completeness.sql
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
-- <<< 0002_operational_completeness.sql

-- >>> 0003_financial_reversals.sql
alter table public.payments add column if not exists reversed_at timestamptz;
alter table public.payments add column if not exists reversal_reason text;
create index if not exists payments_law_firm_reversed_idx on public.payments(law_firm_id, reversed_at);
-- <<< 0003_financial_reversals.sql

-- >>> 0004_storage_delete_policy.sql
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
-- <<< 0004_storage_delete_policy.sql

-- >>> 0005_invitation_rls_fix.sql
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
-- <<< 0005_invitation_rls_fix.sql

-- >>> 0006_payment_rpc.sql
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
-- <<< 0006_payment_rpc.sql

-- >>> 0007_lgpd_privacy.sql
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
-- <<< 0007_lgpd_privacy.sql

-- >>> 0007_admin_panel.sql
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
-- <<< 0007_admin_panel.sql

-- >>> 0008_self_account_deletion.sql
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
-- <<< 0008_self_account_deletion.sql

-- >>> 0009_stripe_billing.sql
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
-- <<< 0009_stripe_billing.sql

-- >>> 0010_portal_workflows_time_tracking.sql
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
-- <<< 0010_portal_workflows_time_tracking.sql

-- >>> 0011_timeline_comments_notifications.sql
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
-- <<< 0011_timeline_comments_notifications.sql

-- >>> 0012_global_search_function.sql
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
-- <<< 0012_global_search_function.sql

-- >>> 0013_checklists_and_pipeline.sql
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
-- <<< 0013_checklists_and_pipeline.sql

-- >>> 0014_document_requests.sql
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
-- <<< 0014_document_requests.sql

-- >>> 0015_correspondents_and_powers.sql
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
-- <<< 0015_correspondents_and_powers.sql

-- >>> 0016_custom_fields_and_export.sql
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
-- <<< 0016_custom_fields_and_export.sql

-- >>> 0021_plan_settings_and_admin_controls.sql
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

alter table public.plan_settings enable row level security;
drop policy if exists "public can view active plan settings" on public.plan_settings;
create policy "public can view active plan settings" on public.plan_settings
  for select using (active = true);
-- <<< 0021_plan_settings_and_admin_controls.sql

-- >>> 0037_plan_feature_overrides.sql
alter table public.plan_settings
  add column if not exists feature_overrides jsonb not null default '{}'::jsonb;
-- <<< 0037_plan_feature_overrides.sql

-- >>> 0038_error_events.sql
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
-- Somente o service role usado pela instrumentacao insere e consulta os eventos.
-- <<< 0038_error_events.sql

commit;
