create table if not exists public.contract_signature_envelopes (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_document_id uuid not null,
  contract_version_id uuid not null references public.contract_conversion_versions(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','prepared','sending','sent','viewed','partially_signed','signed','refused','expired','cancelled','failed')),
  title text not null check (length(btrim(title)) between 3 and 500),
  provider text,
  provider_envelope_id text,
  document_hash text not null check (document_hash ~ '^[0-9a-f]{64}$'),
  document_file_size bigint not null check (document_file_size > 0),
  document_page_count integer not null check (document_page_count > 0),
  document_snapshot_json jsonb not null default '{}'::jsonb,
  consent_version text not null check (length(btrim(consent_version)) between 1 and 100),
  signing_order_enabled boolean not null default true,
  expires_at timestamptz,
  prepared_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users(id),
  cancellation_reason text,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lock_version integer not null default 1,
  idempotency_key text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  unique (law_firm_id, created_by, idempotency_key),
  unique (id, contract_id)
);

create table if not exists public.contract_signature_signers (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade,
  signer_type text not null check (signer_type in ('person','organization_representative','internal_witness','external_witness')),
  role text not null check (length(btrim(role)) between 1 and 120),
  name text not null check (length(btrim(name)) between 2 and 300),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone text,
  tax_identifier text,
  organization_name text,
  signing_order integer not null check (signing_order > 0),
  requires_identity_verification boolean not null default false,
  status text not null default 'pending' check (status in ('pending','ready','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contract_signature_events (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade,
  event_type text not null check (event_type in ('signature_envelope_created','signature_signer_added','signature_signer_updated','signature_signer_removed','signature_signers_reordered','signature_envelope_prepared','signature_envelope_cancelled','signature_envelope_operation_failed')),
  actor_user_id uuid not null references auth.users(id),
  signer_id uuid references public.contract_signature_signers(id) on delete set null,
  safe_metadata_json jsonb not null default '{}'::jsonb,
  deduplication_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.contract_signature_operations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  envelope_id uuid references public.contract_signature_envelopes(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id),
  operation_type text not null check (operation_type in ('create','update','prepare','cancel')),
  idempotency_key text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing' check (status in ('processing','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (law_firm_id, actor_user_id, operation_type, idempotency_key)
);

create index if not exists contract_signature_envelopes_contract_idx on public.contract_signature_envelopes(law_firm_id, contract_id, created_at desc);
create index if not exists contract_signature_signers_envelope_idx on public.contract_signature_signers(envelope_id, signing_order);
create unique index if not exists contract_signature_signers_unique_email on public.contract_signature_signers(envelope_id, lower(email), signer_type);
create unique index if not exists contract_signature_one_open_intent on public.contract_signature_envelopes(law_firm_id, contract_document_id, input_hash) where status not in ('cancelled','failed','signed','refused','expired');

create or replace function public.validate_contract_signature_tenant() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.contracts c where c.id=new.contract_id and c.law_firm_id=new.law_firm_id)
     or not exists (select 1 from public.contract_conversion_versions v where v.id=new.contract_version_id and v.contract_id=new.contract_id and v.law_firm_id=new.law_firm_id)
     or not exists (select 1 from public.contract_documents d where d.id=new.contract_document_id and d.contract_id=new.contract_id and d.law_firm_id=new.law_firm_id and d.status='completed') then
    raise exception 'CONTRACT_SIGNATURE_SOURCE_MISMATCH' using errcode='23514';
  end if;
  if tg_op='UPDATE' and old.status='prepared' and (new.contract_id<>old.contract_id or new.contract_document_id<>old.contract_document_id or new.contract_version_id<>old.contract_version_id or new.document_snapshot_json<>old.document_snapshot_json or new.consent_version<>old.consent_version or new.lock_version<=old.lock_version) then
    raise exception 'CONTRACT_SIGNATURE_ENVELOPE_IMMUTABLE' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists contract_signature_envelopes_validate on public.contract_signature_envelopes;
create trigger contract_signature_envelopes_validate before insert or update on public.contract_signature_envelopes for each row execute function public.validate_contract_signature_tenant();

alter table public.contract_signature_envelopes enable row level security;
alter table public.contract_signature_signers enable row level security;
alter table public.contract_signature_events enable row level security;
alter table public.contract_signature_operations enable row level security;
revoke all on public.contract_signature_envelopes, public.contract_signature_signers, public.contract_signature_events, public.contract_signature_operations from anon, authenticated;
grant select, insert, update on public.contract_signature_envelopes, public.contract_signature_signers, public.contract_signature_events, public.contract_signature_operations to authenticated;
create policy contract_signature_envelopes_select on public.contract_signature_envelopes for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy contract_signature_envelopes_write on public.contract_signature_envelopes for all to authenticated using (public.has_law_firm_access(law_firm_id) and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado'))) with check (public.has_law_firm_access(law_firm_id));
create policy contract_signature_signers_select on public.contract_signature_signers for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy contract_signature_signers_write on public.contract_signature_signers for all to authenticated using (public.has_law_firm_access(law_firm_id) and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado'))) with check (public.has_law_firm_access(law_firm_id));
create policy contract_signature_events_select on public.contract_signature_events for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy contract_signature_events_insert on public.contract_signature_events for insert to authenticated with check (public.has_law_firm_access(law_firm_id) and actor_user_id=auth.uid());
create policy contract_signature_operations_select on public.contract_signature_operations for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy contract_signature_operations_write on public.contract_signature_operations for all to authenticated using (public.has_law_firm_access(law_firm_id) and actor_user_id=auth.uid()) with check (public.has_law_firm_access(law_firm_id) and actor_user_id=auth.uid());
