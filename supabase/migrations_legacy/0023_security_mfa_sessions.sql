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
