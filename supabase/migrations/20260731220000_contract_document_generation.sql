create table if not exists public.contract_documents (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  contract_version_id uuid not null references public.contract_conversion_versions(id) on delete restrict,
  document_type text not null default 'contract',
  status text not null default 'processing' check (status in ('processing','completed','failed','superseded','archived')),
  storage_bucket text not null default 'documents',
  storage_path text not null,
  file_name text not null,
  mime_type text not null default 'application/pdf',
  file_size bigint,
  page_count integer,
  contract_content_hash text not null check (contract_content_hash ~ '^[0-9a-f]{64}$'),
  renderer_version text not null,
  template_version text not null,
  file_hash text,
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  safe_error_code text,
  metadata jsonb not null default '{}'::jsonb,
  unique (id, contract_id)
);

create index if not exists contract_documents_tenant_contract_idx on public.contract_documents(law_firm_id, contract_id, generated_at desc);
create index if not exists contract_documents_version_idx on public.contract_documents(contract_version_id);
create table if not exists public.contract_document_operations (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade, contract_version_id uuid not null references public.contract_conversion_versions(id) on delete restrict,
  actor_id uuid not null references auth.users(id), idempotency_key text not null, input_hash text not null, document_id uuid references public.contract_documents(id) on delete set null,
  status text not null default 'processing' check (status in ('processing','completed','failed')), created_at timestamptz not null default now(), unique(law_firm_id, actor_id, idempotency_key)
);
alter table public.contract_document_operations enable row level security;
revoke all on public.contract_document_operations from anon, authenticated;
grant select, insert, update on public.contract_document_operations to authenticated;
create policy contract_document_operations_select on public.contract_document_operations for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy contract_document_operations_insert on public.contract_document_operations for insert to authenticated with check (
  public.has_law_firm_access(law_firm_id)
  and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado'))
  and not public.is_active_assisted_support_session(law_firm_id)
);
alter table public.contract_documents enable row level security;
revoke all on public.contract_documents from anon;
grant select, insert, update on public.contract_documents to authenticated;

create policy contract_documents_select on public.contract_documents for select to authenticated
  using (public.has_law_firm_access(law_firm_id));
create policy contract_documents_insert on public.contract_documents for insert to authenticated
  with check (
    public.has_law_firm_access(law_firm_id)
    and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado'))
    and not public.is_active_assisted_support_session(law_firm_id)
  );
create policy contract_documents_update on public.contract_documents for update to authenticated
  using (public.has_law_firm_access(law_firm_id) and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado')) and not public.is_active_assisted_support_session(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create or replace function public.validate_contract_document_version()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.contract_conversion_versions v where v.id=new.contract_version_id and v.contract_id=new.contract_id and v.law_firm_id=new.law_firm_id) then
    raise exception 'CONTRACT_DOCUMENT_VERSION_MISMATCH' using errcode='23514';
  end if;
  if new.status='completed' and (new.file_hash is null or new.file_size is null) then
    raise exception 'CONTRACT_DOCUMENT_FILE_REQUIRED' using errcode='23514';
  end if;
  if tg_op='UPDATE' and old.status='completed' and (new.storage_path<>old.storage_path or new.contract_version_id<>old.contract_version_id or new.file_hash<>old.file_hash) then
    raise exception 'CONTRACT_DOCUMENT_IMMUTABLE' using errcode='23514';
  end if;
  return new;
end $$;
drop trigger if exists contract_documents_validate on public.contract_documents;
create trigger contract_documents_validate before insert or update on public.contract_documents for each row execute function public.validate_contract_document_version();
revoke execute on function public.validate_contract_document_version() from public, anon, authenticated;
