create or replace function public.create_contract_version(
  p_contract_id uuid, p_expected_updated_at timestamptz, p_title text, p_content text,
  p_parties jsonb, p_clauses jsonb, p_terms jsonb, p_metadata jsonb,
  p_content_hash text, p_idempotency_key text, p_input_hash text, p_activate boolean default false
) returns table(contract_version_id uuid, version_number integer, idempotent boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_firm uuid; v_member uuid; v_contract public.contracts%rowtype; v_existing public.contract_version_operations%rowtype;
  v_version_id uuid; v_number integer; v_clause jsonb; v_index integer := 0; v_now timestamptz := now();
begin
  select law_firm_id, member_id into v_firm, v_member from public.contract_editor_actor(p_contract_id);
  if p_expected_updated_at is null or coalesce(length(trim(p_title)),0) < 3 or p_content_hash !~ '^[0-9a-f]{64}$' or p_input_hash !~ '^[0-9a-f]{64}$' or coalesce(length(trim(p_idempotency_key)),0) not between 1 and 256 or jsonb_typeof(p_parties) <> 'object' or jsonb_typeof(p_clauses) <> 'array' or jsonb_typeof(p_terms) <> 'object' then
    raise exception 'CONTRACT_EDITOR_VALIDATION_ERROR' using errcode = 'P0001';
  end if;
  select * into v_existing from public.contract_version_operations where law_firm_id = v_firm and actor_id = auth.uid() and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.input_hash <> p_input_hash then raise exception 'CONTRACT_EDITOR_IDEMPOTENCY_CONFLICT' using errcode = 'P0001'; end if;
    return query select v_existing.contract_version_id, cv.version_number, true, c.contract_editor_updated_at from public.contracts c join public.contract_conversion_versions cv on cv.id = v_existing.contract_version_id where c.id = p_contract_id; return;
  end if;
  select * into v_contract from public.contracts where id = p_contract_id and law_firm_id = v_firm for update;
  if v_contract.id is null then raise exception 'CONTRACT_EDITOR_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_contract.status not in ('rascunho','aguardando_assinatura') or v_contract.archived_at is not null then raise exception 'CONTRACT_EDITOR_NOT_EDITABLE' using errcode = 'P0001'; end if;
  select * into v_existing from public.contract_version_operations where law_firm_id = v_firm and actor_id = auth.uid() and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.input_hash <> p_input_hash then raise exception 'CONTRACT_EDITOR_IDEMPOTENCY_CONFLICT' using errcode = 'P0001'; end if;
    return query select v_existing.contract_version_id, cv.version_number, true, v_contract.contract_editor_updated_at from public.contract_conversion_versions cv where cv.id = v_existing.contract_version_id; return;
  end if;
  if v_contract.contract_editor_updated_at <> p_expected_updated_at then raise exception 'CONTRACT_EDITOR_OPTIMISTIC_LOCK_CONFLICT' using errcode = 'P0001'; end if;
  select coalesce(max(cv.version_number),0) + 1 into v_number from public.contract_conversion_versions cv where cv.contract_id = p_contract_id;
  insert into public.contract_conversion_versions(law_firm_id,contract_id,source_proposal_id,source_proposal_version_id,version_number,title,content,snapshot_json,snapshot_hash,created_by,parties_json,commercial_terms_json,metadata_json,is_active,activated_at,activated_by) values(v_firm,p_contract_id,v_contract.source_proposal_id,v_contract.source_proposal_version_id,v_number,trim(p_title),coalesce(p_content,''),'{}'::jsonb,p_content_hash,auth.uid(),p_parties,p_terms,coalesce(p_metadata,'{}'::jsonb),p_activate,case when p_activate then v_now else null end,case when p_activate then auth.uid() else null end) returning id into v_version_id;
  for v_clause in select value from jsonb_array_elements(p_clauses) loop
    insert into public.contract_conversion_clauses(law_firm_id,contract_id,version_id,title,content,order_index,clause_type,is_required,is_enabled) values(v_firm,p_contract_id,v_version_id,coalesce(nullif(trim(v_clause->>'title'),''),'Clausula'),coalesce(v_clause->>'content',''),v_index,coalesce(nullif(v_clause->>'type',''),'custom'),coalesce((v_clause->>'required')::boolean,false),coalesce((v_clause->>'enabled')::boolean,true)); v_index := v_index + 1;
  end loop;
  if p_activate then update public.contract_conversion_versions set is_active = false where contract_id = p_contract_id and id <> v_version_id and is_active; end if;
  update public.contracts set service_description = trim(p_title), active_contract_version_id = case when p_activate then v_version_id else active_contract_version_id end, contract_editor_updated_at = v_now, updated_at = v_now where id = p_contract_id;
  insert into public.contract_version_operations(law_firm_id,contract_id,actor_id,idempotency_key,input_hash,contract_version_id) values(v_firm,p_contract_id,auth.uid(),p_idempotency_key,p_input_hash,v_version_id);
  insert into public.contract_editor_events(law_firm_id,contract_id,actor_id,event_type,version_id,metadata) values(v_firm,p_contract_id,v_member,'version_created',v_version_id,jsonb_build_object('versionNumber',v_number));
  if p_activate then insert into public.contract_editor_events(law_firm_id,contract_id,actor_id,event_type,version_id) values(v_firm,p_contract_id,v_member,'version_activated',v_version_id); end if;
  return query select v_version_id, v_number, false, v_now;
end $$;

revoke all on function public.create_contract_version(uuid,timestamptz,text,text,jsonb,jsonb,jsonb,jsonb,text,text,text,boolean) from public, anon;
grant execute on function public.create_contract_version(uuid,timestamptz,text,text,jsonb,jsonb,jsonb,jsonb,text,text,text,boolean) to authenticated;
