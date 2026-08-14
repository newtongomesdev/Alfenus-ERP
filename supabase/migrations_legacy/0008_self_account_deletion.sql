-- Self-service account deletion. Shared office records are retained and only
-- references that identify the departing member are removed.
create or replace function public.delete_my_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  member_ids uuid[];
  document_paths text[];
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into member_ids
  from public.law_firm_members
  where user_id = current_user_id;

  if cardinality(member_ids) = 0 then
    return jsonb_build_object('storage_paths', '[]'::jsonb);
  end if;

  select coalesce(array_agg(storage_path), '{}'::text[])
    into document_paths
  from public.documents
  where uploaded_by = any(member_ids);

  delete from public.legal_case_collaborators where member_id = any(member_ids);
  delete from public.notifications where member_id = any(member_ids);
  delete from public.documents where uploaded_by = any(member_ids);

  update public.clients set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.leads set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.legal_cases set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.contracts set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.expenses set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.deadlines set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.tasks set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.appointments set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.payments set registered_by = null where registered_by = any(member_ids);
  update public.legal_case_movements set created_by = null where created_by = any(member_ids);
  update public.privacy_requests set handled_by = null where handled_by = any(member_ids);
  update public.team_invitations set invited_by = null where invited_by = any(member_ids);
  update public.audit_logs set actor_id = null where actor_id = any(member_ids);

  update public.deadlines
    set participant_ids = array( select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids) )
    where participant_ids && member_ids;
  update public.tasks
    set participant_ids = array( select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids) )
    where participant_ids && member_ids;

  delete from public.privacy_consents where user_id = current_user_id;
  delete from public.law_firm_members where user_id = current_user_id;

  return jsonb_build_object('storage_paths', to_jsonb(coalesce(document_paths, '{}'::text[])));
end;
$$;

revoke all on function public.delete_my_account_data() from public;
grant execute on function public.delete_my_account_data() to authenticated;
