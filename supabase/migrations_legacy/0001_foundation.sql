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
