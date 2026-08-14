-- Editor data includes internal notes, parties and immutable snapshots. It is
-- intentionally unavailable to assistant, collaborator and support sessions.
create or replace function public.get_contract_editor_secure(p_contract_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_role public.member_role; v_firm uuid; v_contract public.contracts%rowtype;
begin
 if v_actor is null then raise exception 'CONTRACT_EDITOR_AUTH_REQUIRED' using errcode='42501'; end if;
 select m.role,m.law_firm_id into v_role,v_firm from public.law_firm_members m join public.contracts c on c.law_firm_id=m.law_firm_id where c.id=p_contract_id and m.user_id=v_actor and m.status='ativo' limit 1;
 if v_firm is null or v_role not in ('proprietario','administrador','advogado') or public.is_active_assisted_support_session(v_firm) then raise exception 'CONTRACT_EDITOR_PERMISSION_DENIED' using errcode='42501'; end if;
 select * into v_contract from public.contracts where id=p_contract_id and law_firm_id=v_firm;
 return jsonb_build_object('contract',jsonb_build_object('id',v_contract.id,'title',v_contract.service_description,'status',v_contract.status,'updatedAt',v_contract.contract_editor_updated_at,'activeVersionId',v_contract.active_contract_version_id,'archivedAt',v_contract.archived_at,'metadata',jsonb_build_object('reference',v_contract.internal_reference,'effectiveFrom',v_contract.effective_from,'effectiveUntil',v_contract.effective_until,'jurisdiction',v_contract.jurisdiction,'language',v_contract.contract_language),'canWrite',true),'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'number',v.version_number,'title',v.title,'content',v.content,'parties',v.parties_json,'terms',v.commercial_terms_json,'metadata',v.metadata_json,'readiness',v.readiness_json,'hash',v.snapshot_hash,'isActive',v.is_active,'createdAt',v.created_at,'clauses',(select coalesce(jsonb_agg(jsonb_build_object('id',cl.id,'title',cl.title,'content',cl.content,'order',cl.order_index,'type',cl.clause_type,'required',cl.is_required,'enabled',cl.is_enabled) order by cl.order_index),'[]'::jsonb) from public.contract_conversion_clauses cl where cl.version_id=v.id)) order by v.version_number),'[]'::jsonb) from public.contract_conversion_versions v where v.contract_id=p_contract_id),'events',(select coalesce(jsonb_agg(jsonb_build_object('type',e.event_type,'versionId',e.version_id,'createdAt',e.created_at,'metadata',e.metadata) order by e.created_at desc),'[]'::jsonb) from public.contract_editor_events e where e.contract_id=p_contract_id));
end $$;

revoke all on function public.get_contract_editor_secure(uuid) from public, anon;
grant execute on function public.get_contract_editor_secure(uuid) to authenticated;
