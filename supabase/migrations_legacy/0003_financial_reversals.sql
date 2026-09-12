alter table public.payments add column if not exists reversed_at timestamptz;
alter table public.payments add column if not exists reversal_reason text;
create index if not exists payments_law_firm_reversed_idx on public.payments(law_firm_id, reversed_at);
