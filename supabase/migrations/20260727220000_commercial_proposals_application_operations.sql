-- ETAPA 5.2.3.2 - Operacoes transacionais da camada de aplicacao.
-- Incremental: usa as tabelas, enums e RPCs da fundacao existente.

create or replace function public.create_commercial_proposal_version(
  p_proposal_id uuid,
  p_expected_updated_at timestamptz,
  p_draft jsonb
)
returns table(version_id uuid, version_number integer, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor uuid := (select auth.uid()); v_firm uuid; v_status public.proposal_status; v_next integer; v_version uuid; v_updated timestamptz;
  v_summary jsonb := coalesce(p_draft->'summary', '{}'::jsonb); v_item jsonb; v_section jsonb;
begin
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id=v_actor and m.status='ativo' order by m.created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm, array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  select p.status into v_status from public.commercial_proposals p where p.id=p_proposal_id and p.law_firm_id=v_firm;
  if v_status is null then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0002'; end if;
  if v_status not in ('draft','ready') then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  if not exists (select 1 from public.commercial_proposals p where p.id=p_proposal_id and p.updated_at=p_expected_updated_at) then raise exception 'PROPOSAL_OPTIMISTIC_LOCK_CONFLICT' using errcode='P0001'; end if;
  if coalesce(length(btrim(p_draft->>'title')),0)=0 or p_draft->>'currency' !~ '^[A-Z]{3}$' then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  if coalesce((v_summary->>'discountCents')::bigint,0) > coalesce((v_summary->>'subtotalCents')::bigint,0) or coalesce((v_summary->>'totalCents')::bigint,0) <> coalesce((v_summary->>'subtotalCents')::bigint,0) - coalesce((v_summary->>'discountCents')::bigint,0) then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  select coalesce(max(v.version_number),0)+1 into v_next from public.commercial_proposal_versions v where v.proposal_id=p_proposal_id;
  insert into public.commercial_proposal_versions(law_firm_id,proposal_id,version_number,schema_version,title,introduction,conclusion,currency,subtotal_cents,discount_cents,total_cents,entry_amount_cents,installment_count,installment_amount_cents,recurring_amount_cents,recurring_months,success_fee_bps,validity_days,payment_terms_json,commercial_summary_json,pricing_snapshot_json,content_hash,created_by)
  values(v_firm,p_proposal_id,v_next,coalesce((p_draft->>'schemaVersion')::integer,1),btrim(p_draft->>'title'),p_draft->>'introduction',p_draft->>'conclusion',p_draft->>'currency',coalesce((v_summary->>'subtotalCents')::bigint,0),coalesce((v_summary->>'discountCents')::bigint,0),coalesce((v_summary->>'totalCents')::bigint,0),coalesce((v_summary->>'entryAmountCents')::bigint,0),coalesce((v_summary->>'installmentCount')::integer,0),coalesce((v_summary->>'installmentAmountCents')::bigint,0),coalesce((v_summary->>'recurringAmountCents')::bigint,0),coalesce((v_summary->>'recurringMonths')::integer,0),coalesce((v_summary->>'successFeeBps')::integer,0),nullif((p_draft->>'validityDays')::integer,0),coalesce(p_draft->'paymentTerms','{}'::jsonb),v_summary,p_draft->'pricingSnapshot',p_draft->>'contentHash',v_actor) returning id into v_version;
  for v_section in select value from jsonb_array_elements(coalesce(p_draft->'sections','[]'::jsonb)) loop
    insert into public.commercial_proposal_sections(law_firm_id,proposal_version_id,section_type,title,body_markdown,order_index,is_required) values(v_firm,v_version,v_section->>'sectionType',v_section->>'title',v_section->>'bodyMarkdown',coalesce((v_section->>'orderIndex')::integer,0),coalesce((v_section->>'isRequired')::boolean,false));
  end loop;
  for v_item in select value from jsonb_array_elements(coalesce(p_draft->'items','[]'::jsonb)) loop
    insert into public.commercial_proposal_items(law_firm_id,proposal_version_id,item_type,description,quantity,unit_amount_cents,total_amount_cents,is_optional,is_included,order_index,metadata) values(v_firm,v_version,v_item->>'itemType',btrim(v_item->>'description'),coalesce((v_item->>'quantity')::numeric,1),coalesce((v_item->>'unitAmountCents')::bigint,0),coalesce((v_item->>'totalAmountCents')::bigint,0),coalesce((v_item->>'isOptional')::boolean,false),coalesce((v_item->>'isIncluded')::boolean,true),coalesce((v_item->>'orderIndex')::integer,0),coalesce(v_item->'metadata','{}'::jsonb));
  end loop;
  update public.commercial_proposals p set updated_by=v_actor where p.id=p_proposal_id returning p.updated_at into v_updated;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type,metadata) values(v_firm,p_proposal_id,v_version,v_actor,'proposal_version_created',jsonb_build_object('versionNumber',v_next));
  return query select v_version,v_next,v_updated;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_NOT_FOUND','PROPOSAL_VALIDATION_ERROR','PROPOSAL_OPTIMISTIC_LOCK_CONFLICT') then raise; end if;
  raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;

create or replace function public.activate_commercial_proposal_version(p_proposal_id uuid, p_version_id uuid, p_expected_updated_at timestamptz)
returns table(updated_at timestamptz) language plpgsql security definer set search_path = public as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_updated timestamptz;
begin
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id=v_actor and m.status='ativo' order by m.created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  if not exists(select 1 from public.commercial_proposal_versions v where v.id=p_version_id and v.proposal_id=p_proposal_id and v.law_firm_id=v_firm) then raise exception 'PROPOSAL_VERSION_NOT_FOUND' using errcode='P0002'; end if;
  update public.commercial_proposals p set active_version_id=p_version_id, updated_by=v_actor where p.id=p_proposal_id and p.law_firm_id=v_firm and p.updated_at=p_expected_updated_at returning p.updated_at into v_updated;
  if v_updated is null then raise exception 'PROPOSAL_OPTIMISTIC_LOCK_CONFLICT' using errcode='P0001'; end if;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type) values(v_firm,p_proposal_id,p_version_id,v_actor,'proposal_version_activated');
  return query select v_updated;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_VERSION_NOT_FOUND','PROPOSAL_OPTIMISTIC_LOCK_CONFLICT') then raise; end if; raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;

create or replace function public.transition_commercial_proposal(p_proposal_id uuid, p_to public.proposal_status, p_expected_updated_at timestamptz)
returns table(updated_at timestamptz) language plpgsql security definer set search_path = public as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_from public.proposal_status; v_updated timestamptz; v_event text;
begin
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id=v_actor and m.status='ativo' order by m.created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  select p.status into v_from from public.commercial_proposals p where p.id=p_proposal_id and p.law_firm_id=v_firm;
  if v_from is null then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0002'; end if;
  if not ((v_from='draft' and p_to in ('ready','cancelled','archived')) or (v_from='ready' and p_to in ('draft','sent','cancelled','archived')) or (v_from='sent' and p_to in ('viewed','accepted','rejected','expired','cancelled','superseded')) or (v_from='viewed' and p_to in ('accepted','rejected','expired','cancelled','superseded')) or (v_from in ('accepted','rejected','expired','cancelled','superseded') and p_to='archived') or (v_from='archived' and p_to='draft')) then raise exception 'PROPOSAL_INVALID_TRANSITION' using errcode='22023'; end if;
  if p_to='ready' and not exists(select 1 from public.commercial_proposal_versions v join public.commercial_proposals p on p.active_version_id=v.id where p.id=p_proposal_id and exists(select 1 from public.commercial_proposal_sections s where s.proposal_version_id=v.id and s.section_type='fees') and exists(select 1 from public.commercial_proposal_sections s where s.proposal_version_id=v.id and s.section_type='validity')) then raise exception 'PROPOSAL_NOT_READY' using errcode='22023'; end if;
  update public.commercial_proposals p set status=p_to, updated_by=v_actor, sent_at=case when p_to='sent' then now() else p.sent_at end, first_viewed_at=case when p_to='viewed' and p.first_viewed_at is null then now() else p.first_viewed_at end, accepted_at=case when p_to='accepted' then now() else p.accepted_at end, rejected_at=case when p_to='rejected' then now() else p.rejected_at end, cancelled_at=case when p_to='cancelled' then now() else p.cancelled_at end, archived_at=case when p_to='archived' then now() else p.archived_at end where p.id=p_proposal_id and p.updated_at=p_expected_updated_at returning p.updated_at into v_updated;
  if v_updated is null then raise exception 'PROPOSAL_OPTIMISTIC_LOCK_CONFLICT' using errcode='P0001'; end if;
  v_event := 'proposal_' || case when p_to='ready' then 'marked_ready' when p_to='draft' then 'restored' else p_to::text end;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,actor_id,event_type) values(v_firm,p_proposal_id,v_actor,v_event);
  return query select v_updated;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_NOT_FOUND','PROPOSAL_INVALID_TRANSITION','PROPOSAL_NOT_READY','PROPOSAL_OPTIMISTIC_LOCK_CONFLICT') then raise; end if; raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;

create or replace function public.upsert_commercial_proposal_recipient(p_proposal_id uuid, p_recipient jsonb)
returns table(recipient_id uuid) language plpgsql security definer set search_path = public as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_id uuid := nullif(p_recipient->>'id','')::uuid;
begin
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id=v_actor and m.status='ativo' order by m.created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  if not exists(select 1 from public.commercial_proposals p where p.id=p_proposal_id and p.law_firm_id=v_firm) then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0002'; end if;
  if v_id is null then insert into public.commercial_proposal_recipients(law_firm_id,proposal_id,client_id,contact_id,recipient_type,name,email,phone,company_name,is_primary) values(v_firm,p_proposal_id,nullif(p_recipient->>'clientId','')::uuid,nullif(p_recipient->>'contactId','')::uuid,coalesce(p_recipient->>'recipientType','other'),btrim(p_recipient->>'name'),p_recipient->>'email',p_recipient->>'phone',p_recipient->>'companyName',coalesce((p_recipient->>'isPrimary')::boolean,false)) returning id into v_id; else update public.commercial_proposal_recipients r set name=btrim(p_recipient->>'name'),email=p_recipient->>'email',phone=p_recipient->>'phone',company_name=p_recipient->>'companyName',is_primary=coalesce((p_recipient->>'isPrimary')::boolean,false) where r.id=v_id and r.proposal_id=p_proposal_id and r.law_firm_id=v_firm; end if;
  return query select v_id;
exception when others then if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_NOT_FOUND') then raise; end if; raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end $$;

create or replace function public.get_commercial_proposal_events_secure(p_proposal_id uuid)
returns table(id uuid, proposal_id uuid, proposal_version_id uuid, event_type text, metadata jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
 select e.id,e.proposal_id,e.proposal_version_id,e.event_type,
   coalesce((select jsonb_object_agg(k.value,v.value) from jsonb_each(e.metadata) k join jsonb_each(e.metadata) v on v.key=k.key where lower(k.key) not in ('internal_notes','pricing_snapshot_json','payment_terms_json','email','phone','token','stack','sqlstate')), '{}'::jsonb),e.created_at
 from public.commercial_proposal_events e join public.commercial_proposals p on p.id=e.proposal_id and p.law_firm_id=e.law_firm_id
 where e.proposal_id=p_proposal_id and public.has_law_firm_role(p.law_firm_id,array['proprietario','administrador','advogado']::public.member_role[]) order by e.created_at desc $$;

create or replace function public.get_commercial_proposal_recipients_secure(p_proposal_id uuid)
returns table(id uuid, proposal_id uuid, client_id uuid, contact_id uuid, recipient_type text, name text, email text, phone text, company_name text, is_primary boolean)
language sql stable security definer set search_path = public as $$
  select r.id,r.proposal_id,r.client_id,r.contact_id,r.recipient_type,r.name,r.email,r.phone,r.company_name,r.is_primary
  from public.commercial_proposal_recipients r join public.commercial_proposals p on p.id=r.proposal_id and p.law_firm_id=r.law_firm_id
  where r.proposal_id=p_proposal_id and public.has_law_firm_role(p.law_firm_id,array['proprietario','administrador','advogado']::public.member_role[]) order by r.is_primary desc,r.created_at $$;

revoke execute on function public.create_commercial_proposal_version(uuid,timestamptz,jsonb), public.activate_commercial_proposal_version(uuid,uuid,timestamptz), public.transition_commercial_proposal(uuid,public.proposal_status,timestamptz), public.upsert_commercial_proposal_recipient(uuid,jsonb), public.get_commercial_proposal_events_secure(uuid), public.get_commercial_proposal_recipients_secure(uuid) from public, anon;
grant execute on function public.create_commercial_proposal_version(uuid,timestamptz,jsonb), public.activate_commercial_proposal_version(uuid,uuid,timestamptz), public.transition_commercial_proposal(uuid,public.proposal_status,timestamptz), public.upsert_commercial_proposal_recipient(uuid,jsonb), public.get_commercial_proposal_events_secure(uuid), public.get_commercial_proposal_recipients_secure(uuid) to authenticated;
