-- ETAPA 5.2.3.3 - restauração deve limpar a data de arquivamento.
create or replace function public.transition_commercial_proposal(p_proposal_id uuid, p_to public.proposal_status, p_expected_updated_at timestamptz)
returns table(updated_at timestamptz) language plpgsql security definer set search_path = public as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_from public.proposal_status; v_updated timestamptz; v_event text;
begin
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id=v_actor and m.status='ativo' order by m.created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  select p.status into v_from from public.commercial_proposals p where p.id=p_proposal_id and p.law_firm_id=v_firm;
  if v_from is null then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0002'; end if;
  if not ((v_from='draft' and p_to in ('ready','cancelled','archived')) or (v_from='ready' and p_to in ('draft','sent','cancelled','archived')) or (v_from='sent' and p_to in ('viewed','accepted','rejected','expired','cancelled','superseded')) or (v_from='viewed' and p_to in ('accepted','rejected','expired','cancelled','superseded')) or (v_from in ('accepted','rejected','expired','cancelled','superseded') and p_to='archived') or (v_from='archived' and p_to='draft')) then raise exception 'PROPOSAL_INVALID_TRANSITION' using errcode='22023'; end if;
  update public.commercial_proposals p set status=p_to, updated_by=v_actor, archived_at=case when p_to='archived' then now() when p_to='draft' then null else p.archived_at end where p.id=p_proposal_id and p.updated_at=p_expected_updated_at returning p.updated_at into v_updated;
  if v_updated is null then raise exception 'PROPOSAL_OPTIMISTIC_LOCK_CONFLICT' using errcode='P0001'; end if;
  v_event := 'proposal_' || case when p_to='draft' then 'restored' else p_to::text end;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,actor_id,event_type) values(v_firm,p_proposal_id,v_actor,v_event);
  return query select v_updated;
exception when others then
  if SQLERRM in ('PROPOSAL_PERMISSION_DENIED','PROPOSAL_NOT_FOUND','PROPOSAL_INVALID_TRANSITION','PROPOSAL_OPTIMISTIC_LOCK_CONFLICT') then raise; end if; raise exception 'PROPOSAL_PERSISTENCE_ERROR' using errcode='P0001';
end $$;
