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
