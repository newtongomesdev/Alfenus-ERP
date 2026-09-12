create or replace function public.update_commercial_proposal_metadata(p_proposal_id uuid, p_expected_updated_at timestamptz, p_title text default null, p_internal_reference text default null, p_valid_until timestamptz default null, p_internal_notes text default null)
returns table(proposal_id uuid, updated_at timestamptz) language plpgsql security definer set search_path = public, extensions as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_updated timestamptz;
begin
  select law_firm_id into v_firm from public.law_firm_members where user_id=v_actor and status='ativo' order by created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  if p_title is not null and char_length(btrim(p_title))=0 then raise exception 'PROPOSAL_VALIDATION_ERROR' using errcode='22023'; end if;
  update public.commercial_proposals as proposal set title=coalesce(nullif(btrim(p_title),''),proposal.title), internal_reference=p_internal_reference, valid_until=p_valid_until, internal_notes=p_internal_notes, updated_by=v_actor where proposal.id=p_proposal_id and proposal.law_firm_id=v_firm and proposal.updated_at=p_expected_updated_at returning proposal.updated_at into v_updated;
  if v_updated is null then raise exception 'PROPOSAL_OPTIMISTIC_LOCK_CONFLICT' using errcode='P0001'; end if;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,actor_id,event_type,metadata) values(v_firm,p_proposal_id,v_actor,'proposal_updated',jsonb_build_object('updatedAt',v_updated));
  return query select p_proposal_id,v_updated;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_VALIDATION_ERROR','PROPOSAL_OPTIMISTIC_LOCK_CONFLICT') then raise; end if;
  raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;
