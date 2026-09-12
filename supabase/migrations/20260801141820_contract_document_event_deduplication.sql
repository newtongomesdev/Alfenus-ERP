create unique index if not exists contract_editor_events_document_generated_once
  on public.contract_editor_events(event_type, ((metadata ->> 'documentId')))
  where event_type in ('contract_document_generated', 'contract_document_generation_failed')
    and metadata ? 'documentId';

create or replace function public.record_contract_document_event(
  p_law_firm_id uuid,
  p_contract_id uuid,
  p_actor_id uuid,
  p_event_type text,
  p_version_id uuid,
  p_document_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.law_firm_members m
    where m.id = p_actor_id
      and m.user_id = auth.uid()
      and m.law_firm_id = p_law_firm_id
      and m.status = 'ativo'
  ) then
    raise exception 'CONTRACT_DOCUMENT_EVENT_FORBIDDEN' using errcode = '42501';
  end if;

  if p_event_type not in ('contract_document_generated', 'contract_document_generation_failed') then
    raise exception 'CONTRACT_DOCUMENT_EVENT_TYPE_INVALID' using errcode = '22023';
  end if;

  insert into public.contract_editor_events(law_firm_id, contract_id, actor_id, event_type, version_id, metadata)
  values (
    p_law_firm_id,
    p_contract_id,
    p_actor_id,
    p_event_type,
    p_version_id,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('documentId', p_document_id)
  )
  on conflict do nothing;

  return true;
end;
$$;

revoke execute on function public.record_contract_document_event(uuid, uuid, uuid, text, uuid, uuid, jsonb) from public, anon;
grant execute on function public.record_contract_document_event(uuid, uuid, uuid, text, uuid, uuid, jsonb) to authenticated;
