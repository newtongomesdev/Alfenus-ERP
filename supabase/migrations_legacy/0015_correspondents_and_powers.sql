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
