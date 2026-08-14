-- Immutable final artifacts retrieved from the internal signature sandbox.
alter table public.contract_signature_events drop constraint if exists contract_signature_events_event_type_check;
alter table public.contract_signature_events add constraint contract_signature_events_event_type_check check (event_type in (
  'signature_envelope_created','signature_signer_added','signature_signer_updated','signature_signer_removed','signature_signers_reordered','signature_envelope_prepared','signature_envelope_cancelled','signature_envelope_operation_failed','signature_delivery_requested','signature_delivery_started','signature_envelope_sent','signature_delivery_failed','signature_delivery_retry_requested','signature_provider_viewed','signature_provider_partially_signed','signature_provider_signed','signature_provider_refused','signature_provider_expired','signature_provider_cancelled','signature_delivery_reconciled','signature_artifacts_retrieval_requested','signature_artifacts_retrieved','signature_artifacts_failed','signature_artifact_archived'));

create table if not exists public.contract_signature_artifacts (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade, envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade,
  delivery_id uuid not null references public.contract_signature_provider_deliveries(id) on delete restrict, contract_document_id uuid not null references public.contract_documents(id) on delete restrict,
  provider text not null check (provider = 'internal_sandbox'), provider_envelope_id text not null, artifact_type text not null check (artifact_type in ('signed_document','completion_certificate','evidence_report')),
  status text not null default 'retrieving' check (status in ('retrieving','completed','failed','invalid','archived')), storage_bucket text not null default 'documents', storage_path text not null,
  mime_type text not null, file_name text not null, file_hash text, provider_hash text, file_size bigint, page_count integer, source_document_hash text,
  evidence_snapshot_json jsonb not null default '{}'::jsonb, provider_metadata_json jsonb not null default '{}'::jsonb, retrieved_at timestamptz, validated_at timestamptz, archived_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), lock_version integer not null default 1,
  unique (law_firm_id,envelope_id,artifact_type), unique (storage_bucket,storage_path),
  check (status not in ('completed','archived') or (file_hash ~ '^[0-9a-f]{64}$' and file_size > 0 and page_count > 0 and retrieved_at is not null and validated_at is not null)),
  check (storage_path like 'contracts/%/%/signatures/%/%/%')
);

create table if not exists public.contract_signature_artifact_operations (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade, contract_id uuid not null references public.contracts(id) on delete cascade,
  envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade, operation_type text not null check (operation_type in ('retrieval','validation','retry','archive')),
  status text not null default 'processing' check (status in ('processing','completed','failed')), idempotency_key text not null, input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  safe_error_code text, attempt_count integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz,
  unique (law_firm_id,envelope_id,operation_type,idempotency_key)
);

create table if not exists public.contract_signature_evidence_entries (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade, envelope_id uuid not null references public.contract_signature_envelopes(id) on delete cascade,
  artifact_id uuid not null references public.contract_signature_artifacts(id) on delete cascade, signer_id uuid references public.contract_signature_signers(id) on delete set null, evidence_type text not null,
  occurred_at timestamptz not null, safe_evidence_json jsonb not null default '{}'::jsonb, evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'), created_at timestamptz not null default now(), unique (artifact_id,signer_id,evidence_type)
);

create index if not exists contract_signature_artifacts_contract_idx on public.contract_signature_artifacts(law_firm_id,contract_id,created_at desc);
create index if not exists contract_signature_artifact_operations_lookup_idx on public.contract_signature_artifact_operations(law_firm_id,envelope_id,operation_type);
alter table public.contract_signature_artifacts enable row level security; alter table public.contract_signature_artifact_operations enable row level security; alter table public.contract_signature_evidence_entries enable row level security;
revoke all on public.contract_signature_artifacts, public.contract_signature_artifact_operations, public.contract_signature_evidence_entries from anon, authenticated;

create or replace function public.prevent_completed_signature_artifact_mutation() returns trigger language plpgsql set search_path = public as $$
begin if old.status in ('completed','archived') and (new.file_hash, new.source_document_hash, new.evidence_snapshot_json, new.artifact_type, new.envelope_id, new.provider_envelope_id, new.storage_path) is distinct from (old.file_hash, old.source_document_hash, old.evidence_snapshot_json, old.artifact_type, old.envelope_id, old.provider_envelope_id, old.storage_path) then raise exception 'COMPLETED_SIGNATURE_ARTIFACT_IMMUTABLE'; end if; return new; end; $$;
drop trigger if exists contract_signature_artifact_immutable on public.contract_signature_artifacts;
create trigger contract_signature_artifact_immutable before update on public.contract_signature_artifacts for each row execute function public.prevent_completed_signature_artifact_mutation();
