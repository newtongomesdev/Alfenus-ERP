-- Internal sandbox delivery orchestration. No external provider or public signing link.
alter table public.contract_signature_signers drop constraint if exists contract_signature_signers_status_check;
alter table public.contract_signature_signers add constraint contract_signature_signers_status_check check (status in ('pending','notified','viewed','signed','refused','expired','ready','removed'));

alter table public.contract_signature_events drop constraint if exists contract_signature_events_event_type_check;
alter table public.contract_signature_events add constraint contract_signature_events_event_type_check check (event_type in (
  'signature_envelope_created','signature_signer_added','signature_signer_updated','signature_signer_removed',
  'signature_signers_reordered','signature_envelope_prepared','signature_envelope_cancelled',
  'signature_envelope_operation_failed','signature_delivery_requested','signature_delivery_started',
  'signature_envelope_sent','signature_delivery_failed','signature_delivery_retry_requested',
  'signature_provider_viewed','signature_provider_partially_signed','signature_provider_signed',
  'signature_provider_refused','signature_provider_expired','signature_provider_cancelled',
  'signature_delivery_reconciled'
));

create table if not exists public.contract_signature_provider_deliveries (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade,
  provider text not null check (provider = 'internal_sandbox'),
  provider_envelope_id text,
  status text not null default 'pending' check (status in ('pending','sending','sent','viewed','partially_signed','signed','refused','expired','cancelled','failed')),
  attempt_number integer not null default 0 check (attempt_number >= 0),
  request_snapshot_json jsonb not null default '{}'::jsonb,
  response_snapshot_json jsonb not null default '{}'::jsonb,
  last_error_code text,
  last_error_at timestamptz,
  sent_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 1,
  unique (law_firm_id, envelope_id, provider),
  unique (provider, provider_envelope_id)
);

create table if not exists public.contract_signature_webhook_receipts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'internal_sandbox'),
  provider_event_id text not null,
  provider_envelope_id text not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  signature_valid boolean not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'received' check (processing_status in ('received','processed','duplicate','rejected','failed')),
  safe_error_code text,
  normalized_event_type text,
  envelope_id uuid references public.contract_signature_envelopes(id) on delete set null,
  law_firm_id uuid references public.law_firms(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.contract_signature_outbox (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade,
  operation_type text not null check (operation_type in ('send','retry','cancel','reconcile')),
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  available_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  completed_at timestamptz,
  safe_error_code text,
  idempotency_key text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (law_firm_id, envelope_id, operation_type, idempotency_key)
);

create index if not exists contract_signature_deliveries_envelope_idx on public.contract_signature_provider_deliveries(law_firm_id, envelope_id, updated_at desc);
create index if not exists contract_signature_receipts_envelope_idx on public.contract_signature_webhook_receipts(provider, provider_envelope_id, received_at desc);
create index if not exists contract_signature_outbox_available_idx on public.contract_signature_outbox(status, available_at);

alter table public.contract_signature_provider_deliveries enable row level security;
alter table public.contract_signature_webhook_receipts enable row level security;
alter table public.contract_signature_outbox enable row level security;
revoke all on public.contract_signature_provider_deliveries, public.contract_signature_webhook_receipts, public.contract_signature_outbox from anon, authenticated;
grant select on public.contract_signature_provider_deliveries to authenticated;
create policy contract_signature_provider_deliveries_select on public.contract_signature_provider_deliveries for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy contract_signature_provider_deliveries_write on public.contract_signature_provider_deliveries for update to authenticated using (public.has_law_firm_access(law_firm_id) and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado'))) with check (public.has_law_firm_access(law_firm_id));
