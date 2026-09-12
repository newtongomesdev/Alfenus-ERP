-- Encerramento da fundacao: duplicacao e optimistic locking.

create policy commercial_proposal_recipients_insert on public.commercial_proposal_recipients
  for insert to authenticated with check (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[])
    and exists (select 1 from public.commercial_proposals p where p.id = proposal_id and p.law_firm_id = commercial_proposal_recipients.law_firm_id)
  );

create or replace function public.duplicate_commercial_proposal(
  p_source_proposal_id uuid,
  p_title text default null,
  p_copy_recipients boolean default false,
  p_idempotency_key text default null,
  p_input_hash text default null
)
returns table(proposal_id uuid, version_id uuid, idempotent boolean, error_code text)
language plpgsql security invoker set search_path = public as $$
declare
  v_actor uuid := (select auth.uid()); v_firm uuid; source_p public.commercial_proposals%rowtype; source_v public.commercial_proposal_versions%rowtype;
  v_proposal uuid; v_version uuid; v_hash text; existing_op public.commercial_proposal_idempotency_operations%rowtype; item record; section record; recipient record;
begin
  if v_actor is null then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  select law_firm_id into v_firm from public.law_firm_members where user_id=v_actor and status='ativo' order by created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  if p_idempotency_key is null or p_input_hash is null or length(p_idempotency_key) > 256 or p_input_hash !~ '^[0-9a-f]{64}$' then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  select * into source_p from public.commercial_proposals where id=p_source_proposal_id and law_firm_id=v_firm;
  if source_p.id is null then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0002'; end if;
  select * into source_v from public.commercial_proposal_versions where id=source_p.active_version_id and proposal_id=source_p.id and law_firm_id=v_firm;
  if source_v.id is null then raise exception 'PROPOSAL_VERSION_NOT_FOUND' using errcode='P0002'; end if;

  insert into public.commercial_proposal_idempotency_operations(law_firm_id,actor_id,source_pricing_version_id,operation_type,idempotency_key,input_hash,status,expires_at)
    values(v_firm,v_actor,source_p.source_pricing_version_id,'duplicate',p_idempotency_key,p_input_hash,'processing',now()+interval '1 hour')
    on conflict (law_firm_id,actor_id,operation_type,idempotency_key) do nothing;
  select * into existing_op from public.commercial_proposal_idempotency_operations where law_firm_id=v_firm and actor_id=v_actor and operation_type='duplicate' and idempotency_key=p_idempotency_key;
  if existing_op.input_hash <> p_input_hash then raise exception 'PROPOSAL_IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
  if existing_op.status = 'completed' then return query select existing_op.result_proposal_id, existing_op.result_version_id, true, null::text; return; end if;
  if existing_op.status = 'processing' and existing_op.created_at > now()-interval '5 minutes' and existing_op.id <> (select id from public.commercial_proposal_idempotency_operations where id=existing_op.id for update) then raise exception 'PROPOSAL_OPERATION_IN_PROGRESS' using errcode='P0001'; end if;

  v_hash := p_input_hash;
  insert into public.commercial_proposals(law_firm_id,created_by,updated_by,client_id,contact_id,legal_case_id,source_pricing_scenario_id,source_pricing_version_id,origin_type,status,title,internal_reference,currency,valid_until,internal_notes)
    values(v_firm,v_actor,v_actor,source_p.client_id,source_p.contact_id,source_p.legal_case_id,source_p.source_pricing_scenario_id,source_p.source_pricing_version_id,'duplicated','draft',coalesce(nullif(btrim(p_title),''),source_p.title),source_p.internal_reference,source_p.currency,source_p.valid_until,source_p.internal_notes) returning id into v_proposal;
  insert into public.commercial_proposal_versions(law_firm_id,proposal_id,version_number,schema_version,pricing_engine_version,title,introduction,conclusion,currency,subtotal_cents,discount_cents,total_cents,entry_amount_cents,installment_count,installment_amount_cents,recurring_amount_cents,recurring_months,success_fee_bps,validity_days,payment_terms_json,commercial_summary_json,pricing_snapshot_json,content_hash,pricing_snapshot_hash,created_by)
    values(v_firm,v_proposal,1,source_v.schema_version,source_v.pricing_engine_version,coalesce(nullif(btrim(p_title),''),source_v.title),source_v.introduction,source_v.conclusion,source_v.currency,source_v.subtotal_cents,source_v.discount_cents,source_v.total_cents,source_v.entry_amount_cents,source_v.installment_count,source_v.installment_amount_cents,source_v.recurring_amount_cents,source_v.recurring_months,source_v.success_fee_bps,source_v.validity_days,source_v.payment_terms_json,source_v.commercial_summary_json,source_v.pricing_snapshot_json,v_hash,source_v.pricing_snapshot_hash,v_actor) returning id into v_version;
  for section in select * from public.commercial_proposal_sections where proposal_version_id=source_v.id order by order_index loop
    insert into public.commercial_proposal_sections(law_firm_id,proposal_version_id,section_type,title,body_markdown,order_index,is_required) values(v_firm,v_version,section.section_type,section.title,section.body_markdown,section.order_index,section.is_required);
  end loop;
  for item in select * from public.commercial_proposal_items where proposal_version_id=source_v.id order by order_index loop
    insert into public.commercial_proposal_items(law_firm_id,proposal_version_id,source_pricing_item_id,item_type,description,quantity,unit_amount_cents,total_amount_cents,is_optional,is_included,order_index,metadata) values(v_firm,v_version,item.source_pricing_item_id,item.item_type,item.description,item.quantity,item.unit_amount_cents,item.total_amount_cents,item.is_optional,item.is_included,item.order_index,item.metadata);
  end loop;
  if p_copy_recipients then
    for recipient in select * from public.commercial_proposal_recipients where proposal_id=source_p.id order by created_at loop
      insert into public.commercial_proposal_recipients(law_firm_id,proposal_id,client_id,contact_id,recipient_type,name,email,phone,company_name,is_primary) values(v_firm,v_proposal,recipient.client_id,recipient.contact_id,recipient.recipient_type,recipient.name,recipient.email,recipient.phone,recipient.company_name,recipient.is_primary);
    end loop;
  end if;
  update public.commercial_proposals set active_version_id=v_version where id=v_proposal;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type,metadata) values(v_firm,v_proposal,v_version,v_actor,'proposal_duplicated',jsonb_build_object('sourceProposalId',source_p.id)),(v_firm,v_proposal,v_version,v_actor,'proposal_version_created','{}');
  update public.commercial_proposal_idempotency_operations set proposal_id=v_proposal,result_proposal_id=v_proposal,result_version_id=v_version,status='completed',completed_at=now() where id=existing_op.id;
  return query select v_proposal,v_version,false,null::text;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_VALIDATION_ERROR','PROPOSAL_NOT_FOUND','PROPOSAL_VERSION_NOT_FOUND','PROPOSAL_IDEMPOTENCY_CONFLICT','PROPOSAL_OPERATION_IN_PROGRESS') then raise; end if;
  raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;

create or replace function public.update_commercial_proposal_metadata(
  p_proposal_id uuid, p_expected_updated_at timestamptz, p_title text default null, p_internal_reference text default null, p_valid_until timestamptz default null, p_internal_notes text default null
)
returns table(proposal_id uuid, updated_at timestamptz)
language plpgsql security invoker set search_path = public as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_updated timestamptz;
begin
  select law_firm_id into v_firm from public.law_firm_members where user_id=v_actor and status='ativo' order by created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  if p_title is not null and char_length(btrim(p_title))=0 then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  update public.commercial_proposals set title=coalesce(nullif(btrim(p_title),''),title), internal_reference=p_internal_reference, valid_until=p_valid_until, internal_notes=p_internal_notes, updated_by=v_actor where id=p_proposal_id and law_firm_id=v_firm and updated_at=p_expected_updated_at returning commercial_proposals.updated_at into v_updated;
  if v_updated is null then raise exception 'PROPOSAL_OPTIMISTIC_LOCK_CONFLICT' using errcode='P0001'; end if;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,actor_id,event_type,metadata) values(v_firm,p_proposal_id,v_actor,'proposal_updated',jsonb_build_object('updatedAt',v_updated));
  return query select p_proposal_id,v_updated;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_VALIDATION_ERROR','PROPOSAL_OPTIMISTIC_LOCK_CONFLICT') then raise; end if;
  raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;
revoke execute on function public.duplicate_commercial_proposal(uuid,text,boolean,text,text), public.update_commercial_proposal_metadata(uuid,timestamptz,text,text,timestamptz,text) from public,anon;
grant execute on function public.duplicate_commercial_proposal(uuid,text,boolean,text,text), public.update_commercial_proposal_metadata(uuid,timestamptz,text,text,timestamptz,text) to authenticated;
