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
