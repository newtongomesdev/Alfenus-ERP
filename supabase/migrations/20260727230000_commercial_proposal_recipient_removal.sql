create or replace function public.remove_commercial_proposal_recipient(p_proposal_id uuid, p_recipient_id uuid)
returns table(removed_id uuid) language plpgsql security definer set search_path = public as $$
declare v_actor uuid := (select auth.uid()); v_firm uuid; v_removed uuid;
begin
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id=v_actor and m.status='ativo' order by m.created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'PROPOSAL_PERMISSION_DENIED' using errcode='42501'; end if;
  delete from public.commercial_proposal_recipients r where r.id=p_recipient_id and r.proposal_id=p_proposal_id and r.law_firm_id=v_firm returning r.id into v_removed;
  if v_removed is null then raise exception 'PROPOSAL_NOT_FOUND' using errcode='P0002'; end if;
  return query select v_removed;
end $$;
revoke execute on function public.remove_commercial_proposal_recipient(uuid,uuid) from public,anon;
grant execute on function public.remove_commercial_proposal_recipient(uuid,uuid) to authenticated;
