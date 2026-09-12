-- ETAPA 5.2.3.6 - Conversao controlada de proposta aceita em contrato.

alter table public.contracts
  add column if not exists source_proposal_id uuid references public.commercial_proposals(id) on delete set null,
  add column if not exists source_proposal_version_id uuid references public.commercial_proposal_versions(id) on delete set null,
  add column if not exists conversion_snapshot_json jsonb,
  add column if not exists conversion_snapshot_hash text,
  add column if not exists converted_at timestamptz;

create unique index if not exists contracts_one_source_proposal
  on public.contracts(source_proposal_id) where source_proposal_id is not null;
create index if not exists contracts_source_proposal_idx on public.contracts(source_proposal_id);

create table if not exists public.contract_conversion_operations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  actor_id uuid not null,
  idempotency_key text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  contract_id uuid references public.contracts(id) on delete set null,
  contract_version_id uuid,
  status text not null default 'completed' check (status in ('processing','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(law_firm_id, actor_id, idempotency_key),
  unique(proposal_id)
);

create table if not exists public.contract_conversion_versions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  source_proposal_id uuid not null references public.commercial_proposals(id) on delete restrict,
  source_proposal_version_id uuid not null references public.commercial_proposal_versions(id) on delete restrict,
  version_number integer not null default 1 check (version_number > 0),
  title text not null,
  content text not null default '',
  snapshot_json jsonb not null default '{}'::jsonb,
  snapshot_hash text not null check (snapshot_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null,
  created_at timestamptz not null default now(),
  unique(contract_id, version_number),
  unique(contract_id, source_proposal_version_id)
);

create table if not exists public.contract_conversion_clauses (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  version_id uuid not null references public.contract_conversion_versions(id) on delete cascade,
  source_section_id uuid references public.commercial_proposal_sections(id) on delete set null,
  title text not null,
  content text not null default '',
  order_index integer not null default 0 check (order_index >= 0),
  created_at timestamptz not null default now(),
  unique(version_id, source_section_id),
  unique(version_id, order_index)
);

alter table public.contract_conversion_operations enable row level security;
alter table public.contract_conversion_versions enable row level security;
alter table public.contract_conversion_clauses enable row level security;
revoke all on public.contract_conversion_operations, public.contract_conversion_versions, public.contract_conversion_clauses from anon, authenticated;

create or replace function public.convert_accepted_commercial_proposal_to_contract(
  p_proposal_id uuid,
  p_idempotency_key text,
  p_input_hash text
)
returns table(contract_id uuid, contract_version_id uuid, idempotent boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor uuid := auth.uid();
  v_firm uuid;
  v_proposal public.commercial_proposals%rowtype;
  v_version public.commercial_proposal_versions%rowtype;
  v_decision public.commercial_proposal_decisions%rowtype;
  v_contract public.contracts%rowtype;
  v_contract_version uuid;
  v_snapshot jsonb;
  v_snapshot_hash text;
  v_method text;
  v_due_date date;
  v_existing public.contract_conversion_operations%rowtype;
  v_operation uuid;
  v_now timestamptz := now();
begin
  if v_actor is null or p_proposal_id is null or p_idempotency_key is null or char_length(btrim(p_idempotency_key)) not between 1 and 256 or p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'CONTRACT_CONVERSION_VALIDATION_ERROR' using errcode = '22023';
  end if;
  select m.law_firm_id into v_firm from public.law_firm_members m where m.user_id = v_actor and m.status = 'ativo' and m.role in ('proprietario','administrador','advogado') order by m.created_at limit 1;
  if v_firm is null then raise exception 'CONTRACT_CONVERSION_PERMISSION_DENIED' using errcode = '42501'; end if;
  select p.* into v_proposal from public.commercial_proposals p where p.id = p_proposal_id and p.law_firm_id = v_firm for update;
  if v_proposal.id is null then raise exception 'CONTRACT_CONVERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  select o.* into v_existing from public.contract_conversion_operations o where o.law_firm_id = v_firm and o.actor_id = v_actor and o.idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.input_hash <> p_input_hash then raise exception 'CONTRACT_CONVERSION_IDEMPOTENCY_CONFLICT' using errcode = '23505'; end if;
    return query select v_existing.contract_id, v_existing.contract_version_id, true;
    return;
  end if;
  select o.* into v_existing from public.contract_conversion_operations o where o.proposal_id = v_proposal.id;
  if v_existing.id is not null then
    if v_existing.input_hash <> p_input_hash then raise exception 'CONTRACT_CONVERSION_IDEMPOTENCY_CONFLICT' using errcode = '23505'; end if;
    insert into public.contract_conversion_operations(law_firm_id,proposal_id,actor_id,idempotency_key,input_hash,contract_id,contract_version_id,status,completed_at) values(v_firm,v_proposal.id,v_actor,p_idempotency_key,p_input_hash,v_existing.contract_id,v_existing.contract_version_id,'completed',now()) on conflict do nothing;
    return query select v_existing.contract_id, v_existing.contract_version_id, true;
    return;
  end if;
  if v_proposal.status <> 'accepted' or v_proposal.client_id is null then raise exception 'CONTRACT_CONVERSION_PROPOSAL_NOT_ACCEPTED' using errcode = '22023'; end if;
  select d.* into v_decision from public.commercial_proposal_decisions d where d.proposal_id = v_proposal.id and d.decision_type = 'accepted' for share;
  if v_decision.id is null then raise exception 'CONTRACT_CONVERSION_DECISION_NOT_FOUND' using errcode = 'P0002'; end if;
  select v.* into v_version from public.commercial_proposal_versions v where v.id = v_proposal.active_version_id and v.proposal_id = v_proposal.id and v.law_firm_id = v_firm;
  if v_version.id is null then raise exception 'CONTRACT_CONVERSION_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  v_snapshot := jsonb_build_object('schemaVersion',1,'sourceProposalId',v_proposal.id,'sourceProposalVersionId',v_version.id,'sourceDecisionId',v_decision.id,'title',v_version.title,'currency',v_version.currency,'subtotalCents',v_version.subtotal_cents,'discountCents',v_version.discount_cents,'totalCents',v_version.total_cents,'entryAmountCents',v_version.entry_amount_cents,'installmentCount',v_version.installment_count,'installmentAmountCents',v_version.installment_amount_cents,'recurringAmountCents',v_version.recurring_amount_cents,'recurringMonths',v_version.recurring_months,'successFeeBps',v_version.success_fee_bps,'validityDays',v_version.validity_days,'paymentTerms',jsonb_build_object('method',coalesce(v_version.payment_terms_json->>'method',''),'description',coalesce(v_version.payment_terms_json->>'description','')),'convertedAt',v_now);
  v_snapshot_hash := encode(extensions.digest(convert_to(v_snapshot::text,'utf8'),'sha256'),'hex');
  v_method := nullif(v_version.payment_terms_json->>'method','');
  v_due_date := case when v_version.validity_days is not null then (current_date + v_version.validity_days) else current_date end;
  insert into public.contracts(law_firm_id,client_id,legal_case_id,service_description,total_amount_cents,upfront_amount_cents,balance_cents,has_installments,installments_count,first_due_date,frequency,payment_method,responsible_member_id,status,notes,source_proposal_id,source_proposal_version_id,conversion_snapshot_json,conversion_snapshot_hash,converted_at)
  values(v_firm,v_proposal.client_id,v_proposal.legal_case_id,v_version.title,v_version.total_cents,v_version.entry_amount_cents,greatest(v_version.total_cents-v_version.entry_amount_cents,0),v_version.installment_count > 1,v_version.installment_count,v_due_date,'mensal',v_method,(select m.id from public.law_firm_members m where m.user_id=v_actor and m.law_firm_id=v_firm and m.status='ativo' limit 1),'rascunho', 'Contrato criado a partir de proposta aceita.',v_proposal.id,v_version.id,v_snapshot,v_snapshot_hash,v_now) returning * into v_contract;
  insert into public.contract_conversion_versions(law_firm_id,contract_id,source_proposal_id,source_proposal_version_id,title,content,snapshot_json,snapshot_hash,created_by) values(v_firm,v_contract.id,v_proposal.id,v_version.id,v_version.title,concat_ws(E'\n\n',v_version.introduction,v_version.conclusion),v_snapshot,v_snapshot_hash,v_actor) returning id into v_contract_version;
  insert into public.contract_conversion_clauses(law_firm_id,contract_id,version_id,source_section_id,title,content,order_index) select v_firm,v_contract.id,v_contract_version,s.id,coalesce(s.title,s.section_type),coalesce(s.body_markdown,''),s.order_index from public.commercial_proposal_sections s where s.proposal_version_id=v_version.id order by s.order_index;
  insert into public.contract_conversion_operations(law_firm_id,proposal_id,actor_id,idempotency_key,input_hash,contract_id,contract_version_id,status,completed_at) values(v_firm,v_proposal.id,v_actor,p_idempotency_key,p_input_hash,v_contract.id,v_contract_version,'completed',now()) returning id into v_operation;
  insert into public.audit_logs(law_firm_id,actor_id,action,entity_type,entity_id,metadata) values(v_firm,(select m.id from public.law_firm_members m where m.user_id=v_actor and m.law_firm_id=v_firm and m.status='ativo' limit 1),'converteu_proposta_em_contrato','contract',v_contract.id,jsonb_build_object('proposalId',v_proposal.id,'proposalVersionId',v_version.id,'decisionId',v_decision.id,'snapshotHash',v_snapshot_hash));
  return query select v_contract.id,v_contract_version,false;
exception when unique_violation then
  select o.* into v_existing from public.contract_conversion_operations o where o.proposal_id=p_proposal_id;
  if v_existing.id is not null and v_existing.input_hash=p_input_hash then return query select v_existing.contract_id,v_existing.contract_version_id,true; return; end if;
  raise exception 'CONTRACT_CONVERSION_CONFLICT' using errcode='23505';
end $$;

create or replace function public.get_contract_conversion_secure(p_contract_id uuid)
returns table(contract_id uuid, source_proposal_id uuid, source_proposal_version_id uuid, snapshot_json jsonb, snapshot_hash text, converted_at timestamptz, version_id uuid, version_number integer, version_title text, version_content text, clauses jsonb)
language sql stable security definer set search_path=public, extensions as $$
  select c.id,c.source_proposal_id,c.source_proposal_version_id,c.conversion_snapshot_json,c.conversion_snapshot_hash,c.converted_at,v.id,v.version_number,v.title,v.content,coalesce((select jsonb_agg(jsonb_build_object('id',cl.id,'title',cl.title,'content',cl.content,'orderIndex',cl.order_index) order by cl.order_index) from public.contract_conversion_clauses cl where cl.version_id=v.id),'[]'::jsonb)
  from public.contracts c left join public.contract_conversion_versions v on v.contract_id=c.id and v.version_number=1
  where c.id=p_contract_id and public.has_law_firm_access(c.law_firm_id)
$$;

grant execute on function public.convert_accepted_commercial_proposal_to_contract(uuid,text,text) to authenticated;
grant execute on function public.get_contract_conversion_secure(uuid) to authenticated;
revoke all on function public.convert_accepted_commercial_proposal_to_contract(uuid,text,text), public.get_contract_conversion_secure(uuid) from anon;
