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
