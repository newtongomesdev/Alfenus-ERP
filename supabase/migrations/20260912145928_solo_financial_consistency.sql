-- Keeps the upfront amount visible as a receivable instead of silently
-- removing it from the installment ledger created by the Solo shortcut.
create or replace function public.create_solo_case(
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
  v_member_id uuid;
  v_role public.member_role;
  v_client_id uuid;
  v_case_id uuid;
  v_contract_id uuid;
  v_deadline_id uuid;
  v_balance_cents bigint;
  v_installment_cents bigint;
  v_remainder bigint;
  v_index integer;
  v_due_date date;
begin
  if auth.uid() is null then
    raise exception 'SOLO_CASE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  select id, law_firm_id, role into v_member_id, v_law_firm_id, v_role
  from public.law_firm_members
  where user_id = auth.uid() and status = 'ativo'
  order by created_at asc limit 1;

  if v_member_id is null or v_role not in ('proprietario', 'administrador', 'advogado') then
    raise exception 'SOLO_CASE_PERMISSION_DENIED' using errcode = '42501';
  end if;
  if coalesce(trim(p_case_title), '') = '' or coalesce(trim(p_action_type), '') = '' then
    raise exception 'SOLO_CASE_CASE_FIELDS_REQUIRED' using errcode = '22023';
  end if;
  if p_case_kind not in ('judicial', 'extrajudicial') then
    raise exception 'SOLO_CASE_CASE_KIND_INVALID' using errcode = '22023';
  end if;
  if p_case_kind = 'judicial' and coalesce(trim(p_case_number), '') = '' then
    raise exception 'SOLO_CASE_CASE_NUMBER_REQUIRED' using errcode = '22023';
  end if;

  if p_existing_client_id is not null then
    select id into v_client_id from public.clients
    where id = p_existing_client_id and law_firm_id = v_law_firm_id and archived_at is null;
    if v_client_id is null then
      raise exception 'SOLO_CASE_CLIENT_NOT_FOUND' using errcode = '22023';
    end if;
  else
    if length(trim(coalesce(p_client_name, ''))) < 2 then
      raise exception 'SOLO_CASE_CLIENT_NAME_REQUIRED' using errcode = '22023';
    end if;
    insert into public.clients (law_firm_id, name, phone, whatsapp, email, document, interest_area, responsible_member_id, status)
    values (v_law_firm_id, trim(p_client_name), nullif(trim(p_client_phone), ''), nullif(trim(p_client_phone), ''), nullif(trim(p_client_email), ''), nullif(trim(p_client_document), ''), nullif(trim(p_client_interest_area), ''), v_member_id, 'ativo')
    returning id into v_client_id;
    insert into public.audit_logs (law_firm_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_law_firm_id, v_member_id, 'criou_cliente', 'client', v_client_id, jsonb_build_object('origem', 'novo_caso_solo'));
  end if;

  insert into public.legal_cases (law_firm_id, client_id, title, case_kind, action_type, case_number, main_responsible_id, status, priority, opposing_party, strategic_notes)
  values (v_law_firm_id, v_client_id, trim(p_case_title), p_case_kind, trim(p_action_type), nullif(trim(p_case_number), ''), v_member_id, 'em_analise', 'normal', nullif(trim(p_opposing_party), ''), nullif(trim(p_notes), ''))
  returning id into v_case_id;
  insert into public.audit_logs (law_firm_id, actor_id, action, entity_type, entity_id, metadata)
  values (v_law_firm_id, v_member_id, 'criou_processo', 'legal_case', v_case_id, jsonb_build_object('origem', 'novo_caso_solo', 'client_id', v_client_id));

  if p_contract_total_amount_cents is not null or p_contract_service_description is not null then
    if p_contract_total_amount_cents is null or p_contract_total_amount_cents <= 0 or length(trim(coalesce(p_contract_service_description, ''))) < 5 or p_contract_first_due_date is null or length(trim(coalesce(p_contract_payment_method, ''))) < 2 or p_contract_upfront_amount_cents < 0 or p_contract_upfront_amount_cents > p_contract_total_amount_cents or p_contract_installments_count < 1 then
      raise exception 'SOLO_CASE_CONTRACT_FIELDS_REQUIRED' using errcode = '22023';
    end if;
    v_balance_cents := p_contract_total_amount_cents - p_contract_upfront_amount_cents;
    insert into public.contracts (law_firm_id, client_id, legal_case_id, service_description, total_amount_cents, upfront_amount_cents, balance_cents, has_installments, installments_count, first_due_date, frequency, payment_method, responsible_member_id, status)
    values (v_law_firm_id, v_client_id, v_case_id, trim(p_contract_service_description), p_contract_total_amount_cents, p_contract_upfront_amount_cents, v_balance_cents, p_contract_installments_count > 1, p_contract_installments_count, p_contract_first_due_date, 'mensal', trim(p_contract_payment_method), v_member_id, 'ativo')
    returning id into v_contract_id;

    if p_contract_upfront_amount_cents > 0 then
      insert into public.installments (law_firm_id, contract_id, client_id, number, original_amount_cents, final_amount_cents, due_date, payment_method, status)
      values (v_law_firm_id, v_contract_id, v_client_id, 0, p_contract_upfront_amount_cents, p_contract_upfront_amount_cents, p_contract_first_due_date, trim(p_contract_payment_method), 'pendente');
    end if;

    v_installment_cents := floor(v_balance_cents::numeric / p_contract_installments_count)::bigint;
    v_remainder := mod(v_balance_cents, p_contract_installments_count);
    for v_index in 1..p_contract_installments_count loop
      v_due_date := (p_contract_first_due_date + make_interval(months => v_index - 1))::date;
      insert into public.installments (law_firm_id, contract_id, client_id, number, original_amount_cents, final_amount_cents, due_date, payment_method, status)
      values (v_law_firm_id, v_contract_id, v_client_id, v_index, v_installment_cents + case when v_index <= v_remainder then 1 else 0 end, v_installment_cents + case when v_index <= v_remainder then 1 else 0 end, v_due_date, trim(p_contract_payment_method), case when v_installment_cents = 0 and v_remainder = 0 then 'pago' else 'pendente' end);
    end loop;
    insert into public.audit_logs (law_firm_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_law_firm_id, v_member_id, 'criou_contrato', 'contract', v_contract_id, jsonb_build_object('origem', 'novo_caso_solo', 'legal_case_id', v_case_id, 'entrada_registrada_como_recebivel', p_contract_upfront_amount_cents > 0));
  end if;

  if p_deadline_title is not null or p_deadline_date is not null then
    if length(trim(coalesce(p_deadline_title, ''))) < 3 or p_deadline_date is null then
      raise exception 'SOLO_CASE_DEADLINE_FIELDS_REQUIRED' using errcode = '22023';
    end if;
    insert into public.deadlines (law_firm_id, title, type, client_id, legal_case_id, responsible_member_id, due_date, priority, status)
    values (v_law_firm_id, trim(p_deadline_title), 'processual', v_client_id, v_case_id, v_member_id, p_deadline_date, p_deadline_priority, 'pendente')
    returning id into v_deadline_id;
    insert into public.audit_logs (law_firm_id, actor_id, action, entity_type, entity_id, metadata)
    values (v_law_firm_id, v_member_id, 'criou_prazo', 'deadline', v_deadline_id, jsonb_build_object('origem', 'novo_caso_solo', 'legal_case_id', v_case_id));
  end if;

  return query select v_client_id, v_case_id, v_contract_id, v_deadline_id;
end;
$$;

revoke all on function public.create_solo_case(uuid, text, text, text, text, text, text, text, text, text, text, text, text, bigint, bigint, integer, date, text, text, date, public.priority_level) from public;
grant execute on function public.create_solo_case(uuid, text, text, text, text, text, text, text, text, text, text, text, text, bigint, bigint, integer, date, text, text, date, public.priority_level) to authenticated;
