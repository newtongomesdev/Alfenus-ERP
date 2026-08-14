create or replace function public.get_commercial_proposal_events_secure(p_proposal_id uuid)
returns table(id uuid, proposal_id uuid, proposal_version_id uuid, event_type text, metadata jsonb, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.id,e.proposal_id,e.proposal_version_id,e.event_type,
    coalesce((select jsonb_object_agg(entry.key, entry.value) from jsonb_each(e.metadata) as entry(key,value) where lower(entry.key) not in ('internal_notes','pricing_snapshot_json','payment_terms_json','email','phone','token','stack','sqlstate')), '{}'::jsonb),e.created_at
  from public.commercial_proposal_events e join public.commercial_proposals p on p.id=e.proposal_id and p.law_firm_id=e.law_firm_id
  where e.proposal_id=p_proposal_id and public.has_law_firm_role(p.law_firm_id,array['proprietario','administrador','advogado']::public.member_role[])
  order by e.created_at desc
$$;
