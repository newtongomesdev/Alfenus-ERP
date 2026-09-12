create table if not exists public.solo_case_idempotency (
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  input_hash text not null,
  client_id uuid not null,
  legal_case_id uuid not null,
  contract_id uuid,
  deadline_id uuid,
  created_at timestamptz not null default now(),
  primary key (law_firm_id, actor_id, idempotency_key)
);

alter table public.solo_case_idempotency enable row level security;

drop policy if exists "solo case idempotency own rows" on public.solo_case_idempotency;
create policy "solo case idempotency own rows"
on public.solo_case_idempotency for all to authenticated
using (
  actor_id = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
)
with check (
  actor_id = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
);

create or replace function public.create_solo_case_idempotent(
  p_idempotency_key uuid,
  p_input_hash text,
  p_existing_client_id uuid default null,
  p_client_name text default null,
  p_client_phone text default null,
  p_client_email text default null,
  p_client_document text default null,
  p_client_interest_area text default null,
  p_case_title text default null,
  p_case_kind text default 'extrajudicial',
  p_case_number text default null,
  p_action_type text default null,
  p_opposing_party text default null,
  p_notes text default null,
  p_contract_service_description text default null,
  p_contract_total_amount_cents bigint default null,
  p_contract_upfront_amount_cents bigint default 0,
  p_contract_installments_count integer default 1,
  p_contract_first_due_date date default null,
  p_contract_payment_method text default null,
  p_deadline_title text default null,
  p_deadline_date date default null,
  p_deadline_priority public.priority_level default 'normal'
)
returns table (client_id uuid, legal_case_id uuid, contract_id uuid, deadline_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_law_firm_id uuid;
  v_actor_id uuid;
  v_existing public.solo_case_idempotency%rowtype;
  v_created record;
begin
  v_actor_id := auth.uid();
  if v_actor_id is null then
    raise exception 'SOLO_CASE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select law_firm_id into v_law_firm_id
  from public.law_firm_members
  where user_id = v_actor_id and status = 'ativo'
    and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
  order by created_at asc
  limit 1;

  if v_law_firm_id is null then
    raise exception 'SOLO_CASE_PERMISSION_DENIED' using errcode = '42501';
  end if;
  if p_idempotency_key is null or coalesce(trim(p_input_hash), '') = '' then
    raise exception 'SOLO_CASE_IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;

  insert into public.solo_case_idempotency (law_firm_id, actor_id, idempotency_key, input_hash, client_id, legal_case_id, contract_id, deadline_id)
  values (v_law_firm_id, v_actor_id, p_idempotency_key, p_input_hash, gen_random_uuid(), gen_random_uuid(), null, null)
  on conflict (law_firm_id, actor_id, idempotency_key) do nothing;

  select * into v_existing
  from public.solo_case_idempotency
  where law_firm_id = v_law_firm_id and actor_id = v_actor_id and idempotency_key = p_idempotency_key
  for update;

  if v_existing.input_hash <> p_input_hash then
    raise exception 'SOLO_CASE_IDEMPOTENCY_CONFLICT' using errcode = '23505';
  end if;

  if v_existing.client_id is not null and exists (select 1 from public.legal_cases where id = v_existing.legal_case_id) then
    return query select v_existing.client_id, v_existing.legal_case_id, v_existing.contract_id, v_existing.deadline_id;
    return;
  end if;

  select * into v_created
  from public.create_solo_case(
    p_existing_client_id, p_client_name, p_client_phone, p_client_email, p_client_document,
    p_client_interest_area, p_case_title, p_case_kind, p_case_number, p_action_type,
    p_opposing_party, p_notes, p_contract_service_description, p_contract_total_amount_cents,
    p_contract_upfront_amount_cents, p_contract_installments_count, p_contract_first_due_date,
    p_contract_payment_method, p_deadline_title, p_deadline_date, p_deadline_priority
  );

  update public.solo_case_idempotency
  set client_id = v_created.client_id,
      legal_case_id = v_created.legal_case_id,
      contract_id = v_created.contract_id,
      deadline_id = v_created.deadline_id
  where law_firm_id = v_law_firm_id and actor_id = v_actor_id and idempotency_key = p_idempotency_key;

  return query select v_created.client_id, v_created.legal_case_id, v_created.contract_id, v_created.deadline_id;
end;
$$;

revoke all on function public.create_solo_case_idempotent(uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, bigint, bigint, integer, date, text, text, date, public.priority_level) from public;
grant execute on function public.create_solo_case_idempotent(uuid, text, uuid, text, text, text, text, text, text, text, text, text, text, text, text, bigint, bigint, integer, date, text, text, date, public.priority_level) to authenticated;
