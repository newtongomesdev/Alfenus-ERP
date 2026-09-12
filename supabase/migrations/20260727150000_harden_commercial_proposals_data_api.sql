-- A Data API nao deve expor colunas internas por SELECT direto.
revoke select on public.commercial_proposals from authenticated;
revoke select on public.commercial_proposal_versions from authenticated;
drop function public.get_commercial_proposal_secure(uuid);
create function public.get_commercial_proposal_secure(p_proposal_id uuid)
returns table(id uuid, law_firm_id uuid, title text, status public.proposal_status, origin_type public.proposal_origin_type, currency char(3), active_version_id uuid, valid_until timestamptz, sent_at timestamptz, first_viewed_at timestamptz, accepted_at timestamptz, rejected_at timestamptz, cancelled_at timestamptz, superseded_at timestamptz, archived_at timestamptz, created_at timestamptz, updated_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select p.id,p.law_firm_id,p.title,p.status,p.origin_type,p.currency,p.active_version_id,p.valid_until,p.sent_at,p.first_viewed_at,p.accepted_at,p.rejected_at,p.cancelled_at,p.superseded_at,p.archived_at,p.created_at,p.updated_at
  from public.commercial_proposals p where p.id=p_proposal_id and public.has_law_firm_access(p.law_firm_id)
$$;
revoke execute on function public.get_commercial_proposal_secure(uuid) from public, anon;
grant execute on function public.get_commercial_proposal_secure(uuid) to authenticated;

create or replace function public.create_commercial_proposal_manual(p_title text, p_currency char(3), p_validity_days integer, p_idempotency_key text)
returns table(proposal_id uuid, version_id uuid) language plpgsql security invoker set search_path = public as $$
declare v_firm uuid; v_actor uuid := (select auth.uid()); v_proposal uuid; v_version uuid; v_hash text; existing_op public.commercial_proposal_idempotency_operations%rowtype;
begin
  select law_firm_id into v_firm from public.law_firm_members where user_id=v_actor and status='ativo' order by created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_title,'')))=0 or p_currency !~ '^[A-Z]{3}$' or p_validity_days is not null and p_validity_days not between 1 and 3650 then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  v_hash := encode(extensions.digest(convert_to(jsonb_build_object('title',btrim(p_title),'currency',p_currency,'validityDays',p_validity_days)::text,'utf8'),'sha256'),'hex');
  select * into existing_op from public.commercial_proposal_idempotency_operations where law_firm_id=v_firm and actor_id=v_actor and operation_type='manual_create' and idempotency_key=p_idempotency_key;
  if existing_op.id is not null and existing_op.input_hash <> v_hash then raise exception 'PROPOSAL_IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
  if existing_op.status='completed' then return query select existing_op.result_proposal_id,existing_op.result_version_id; return; end if;
  insert into public.commercial_proposals(law_firm_id,created_by,updated_by,origin_type,title,currency,valid_until) values(v_firm,v_actor,v_actor,'manual',btrim(p_title),p_currency,case when p_validity_days is null then null else now()+make_interval(days=>p_validity_days) end) returning id into v_proposal;
  insert into public.commercial_proposal_versions(law_firm_id,proposal_id,version_number,schema_version,title,currency,validity_days,payment_terms_json,commercial_summary_json,content_hash,created_by) values(v_firm,v_proposal,1,1,btrim(p_title),p_currency,p_validity_days,'{}','{}',v_hash,v_actor) returning id into v_version;
  insert into public.commercial_proposal_sections(law_firm_id,proposal_version_id,section_type,title,order_index,is_required) values(v_firm,v_version,'introduction','Introdução',0,true),(v_firm,v_version,'scope','Escopo dos serviços',1,false),(v_firm,v_version,'fees','Honorários',2,true),(v_firm,v_version,'payment_terms','Condições de pagamento',3,false),(v_firm,v_version,'validity','Validade',4,false),(v_firm,v_version,'conclusion','Conclusão',5,false);
  update public.commercial_proposals set active_version_id=v_version where id=v_proposal;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type) values(v_firm,v_proposal,v_version,v_actor,'proposal_created'),(v_firm,v_proposal,v_version,v_actor,'proposal_version_created');
  insert into public.commercial_proposal_idempotency_operations(law_firm_id,actor_id,proposal_id,result_proposal_id,result_version_id,operation_type,idempotency_key,input_hash,status,completed_at) values(v_firm,v_actor,v_proposal,v_proposal,v_version,'manual_create',p_idempotency_key,v_hash,'completed',now());
  return query select v_proposal,v_version;
exception when unique_violation then raise exception 'PROPOSAL_IDEMPOTENCY_CONFLICT' using errcode='P0001'; when others then if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_VALIDATION_ERROR','PROPOSAL_IDEMPOTENCY_CONFLICT') then raise; end if; raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;
