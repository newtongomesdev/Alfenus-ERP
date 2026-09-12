
create table if not exists public.contract_signature_provider_configurations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  provider text not null check (provider in ('internal_sandbox','reserved_external')),
  environment text not null check (environment in ('sandbox','production')),
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  status text not null default 'draft' check (status in ('draft','valid','invalid','disabled')),
  is_default boolean not null default false,
  encrypted_credentials text,
  credentials_key_version text,
  public_configuration_json jsonb not null default '{}'::jsonb,
  webhook_reference text,
  last_connection_test_at timestamptz,
  last_connection_test_status text check (last_connection_test_status is null or last_connection_test_status in ('passed','failed','not_implemented')),
  last_connection_error_code text,
  enabled_at timestamptz,
  disabled_at timestamptz,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 1 check (lock_version > 0),
  unique (law_firm_id, environment, id)
);

create unique index if not exists contract_signature_provider_config_default_idx
  on public.contract_signature_provider_configurations(law_firm_id, environment)
  where is_default = true and status = 'valid';
create unique index if not exists contract_signature_provider_config_idempotency_idx
  on public.contract_signature_provider_configurations(law_firm_id, provider, environment, display_name);
create index if not exists contract_signature_provider_config_tenant_idx
  on public.contract_signature_provider_configurations(law_firm_id, environment, updated_at desc);

alter table public.contract_signature_provider_configurations enable row level security;
revoke all on public.contract_signature_provider_configurations from anon, authenticated;

alter table public.contract_signature_events drop constraint if exists contract_signature_events_event_type_check;
alter table public.contract_signature_events add constraint contract_signature_events_event_type_check check (event_type in (
  'signature_envelope_created','signature_signer_added','signature_signer_updated','signature_signer_removed','signature_signers_reordered',
  'signature_envelope_prepared','signature_envelope_cancelled','signature_envelope_operation_failed','signature_delivery_requested',
  'signature_delivery_started','signature_envelope_sent','signature_delivery_failed','signature_delivery_retry_requested',
  'signature_delivery_reconciled','signature_provider_viewed','signature_provider_partially_signed','signature_provider_signed',
  'signature_provider_refused','signature_provider_expired','signature_provider_cancelled',
  'signature_provider_configuration_created','signature_provider_credentials_replaced','signature_provider_connection_tested',
  'signature_provider_enabled','signature_provider_disabled','signature_provider_default_changed',
  'signature_provider_configuration_deleted','signature_provider_operation_failed'
));

create or replace function public.set_contract_signature_provider_configuration_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists contract_signature_provider_config_updated_at on public.contract_signature_provider_configurations;
create trigger contract_signature_provider_config_updated_at before update on public.contract_signature_provider_configurations
for each row execute function public.set_contract_signature_provider_configuration_updated_at();
