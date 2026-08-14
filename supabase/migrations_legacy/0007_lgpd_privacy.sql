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
