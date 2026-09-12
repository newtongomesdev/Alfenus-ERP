-- ETAPA 5.2.3.1 - Fundacao de dominio, banco e seguranca das propostas comerciais.
-- Forward-only. Nao altera a baseline nem a tabela legada fee_proposals.

create type public.proposal_status as enum ('draft','ready','sent','viewed','accepted','rejected','expired','cancelled','superseded','archived');
create type public.proposal_origin_type as enum ('pricing_scenario','manual','duplicated','template');

create table public.commercial_proposals (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  created_by uuid not null, updated_by uuid, client_id uuid references public.clients(id) on delete set null,
  contact_id uuid, legal_case_id uuid references public.legal_cases(id) on delete set null,
  source_pricing_scenario_id uuid references public.pricing_scenarios(id) on delete set null,
  source_pricing_version_id uuid references public.pricing_scenario_versions(id) on delete set null,
  origin_type public.proposal_origin_type not null, status public.proposal_status not null default 'draft',
  title text not null, internal_reference text, currency char(3) not null default 'BRL', active_version_id uuid,
  valid_until timestamptz, sent_at timestamptz, first_viewed_at timestamptz, accepted_at timestamptz,
  rejected_at timestamptz, cancelled_at timestamptz, superseded_at timestamptz, archived_at timestamptz,
  superseded_by_proposal_id uuid references public.commercial_proposals(id) on delete set null, internal_notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint commercial_proposals_title_check check (char_length(btrim(title)) between 1 and 500),
  constraint commercial_proposals_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint commercial_proposals_self_supersede check (superseded_by_proposal_id is null or superseded_by_proposal_id <> id),
  constraint commercial_proposals_status_dates_check check (
    (accepted_at is null or status = 'accepted') and (rejected_at is null or status = 'rejected') and
    (cancelled_at is null or status = 'cancelled') and (archived_at is null or status = 'archived') and
    (superseded_at is null or status = 'superseded'))
);

create table public.commercial_proposal_versions (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  proposal_id uuid not null references public.commercial_proposals(id) on delete cascade, version_number integer not null,
  schema_version integer not null default 1, pricing_engine_version text, title text not null, introduction text,
  conclusion text, currency char(3) not null default 'BRL', subtotal_cents bigint not null default 0,
  discount_cents bigint not null default 0, total_cents bigint not null default 0, entry_amount_cents bigint not null default 0,
  installment_count integer not null default 1, installment_amount_cents bigint not null default 0,
  recurring_amount_cents bigint not null default 0, recurring_months integer not null default 0,
  success_fee_bps integer not null default 0, validity_days integer, payment_terms_json jsonb not null default '{}'::jsonb,
  commercial_summary_json jsonb not null default '{}'::jsonb, pricing_snapshot_json jsonb, content_hash text not null,
  pricing_snapshot_hash text, created_by uuid not null, created_at timestamptz not null default now(),
  unique (proposal_id, version_number),
  constraint commercial_proposal_versions_values_check check (
    version_number > 0 and schema_version > 0 and subtotal_cents >= 0 and discount_cents >= 0 and total_cents >= 0 and
    entry_amount_cents >= 0 and installment_count between 0 and 1200 and installment_amount_cents >= 0 and
    recurring_amount_cents >= 0 and recurring_months between 0 and 1200 and success_fee_bps between 0 and 10000 and
    (validity_days is null or validity_days between 1 and 3650) and currency ~ '^[A-Z]{3}$'),
  constraint commercial_proposal_versions_hash_check check (content_hash ~ '^[0-9a-f]{64}$' and (pricing_snapshot_hash is null or pricing_snapshot_hash ~ '^[0-9a-f]{64}$'))
);
alter table public.commercial_proposals add constraint commercial_proposals_active_version_fk foreign key (active_version_id) references public.commercial_proposal_versions(id) on delete restrict;

create table public.commercial_proposal_sections (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  proposal_version_id uuid not null references public.commercial_proposal_versions(id) on delete cascade,
  section_type text not null check (section_type in ('introduction','scope','deliverables','exclusions','responsibilities','schedule','fees','payment_terms','success_fee','validity','confidentiality','observations','conclusion','custom')),
  title text, body_markdown text, order_index integer not null default 0 check (order_index >= 0), is_required boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.commercial_proposal_items (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  proposal_version_id uuid not null references public.commercial_proposal_versions(id) on delete cascade, source_pricing_item_id uuid,
  item_type text not null, description text not null check (char_length(btrim(description)) between 1 and 1000), quantity numeric(14,4) not null default 1 check (quantity >= 0),
  unit_amount_cents bigint not null default 0 check (unit_amount_cents >= 0), total_amount_cents bigint not null default 0 check (total_amount_cents >= 0),
  is_optional boolean not null default false, is_included boolean not null default true, order_index integer not null default 0 check (order_index >= 0), metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.commercial_proposal_recipients (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade, proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null, contact_id uuid, recipient_type text not null check (recipient_type in ('client','contact','representative','decision_maker','billing','other')),
  name text not null check (char_length(btrim(name)) between 1 and 500), email text, phone text, company_name text, is_primary boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index commercial_proposal_one_primary_recipient on public.commercial_proposal_recipients(proposal_id) where is_primary;
create table public.commercial_proposal_events (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade, proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  proposal_version_id uuid references public.commercial_proposal_versions(id) on delete set null, actor_id uuid, event_type text not null, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.commercial_proposal_idempotency_operations (
  id uuid primary key default gen_random_uuid(), law_firm_id uuid not null references public.law_firms(id) on delete cascade, actor_id uuid not null, proposal_id uuid references public.commercial_proposals(id) on delete set null,
  source_pricing_version_id uuid references public.pricing_scenario_versions(id) on delete set null, operation_type text not null, idempotency_key text not null, input_hash text not null,
  status text not null check (status in ('processing','completed','failed')), result_proposal_id uuid references public.commercial_proposals(id) on delete set null, result_version_id uuid references public.commercial_proposal_versions(id) on delete set null, safe_error_code text, created_at timestamptz not null default now(), completed_at timestamptz, expires_at timestamptz, unique(law_firm_id, actor_id, operation_type, idempotency_key)
);

create index commercial_proposals_tenant_status_idx on public.commercial_proposals(law_firm_id,status,updated_at desc);
create index commercial_proposal_versions_proposal_idx on public.commercial_proposal_versions(proposal_id,version_number desc);
create index commercial_proposal_sections_version_idx on public.commercial_proposal_sections(proposal_version_id,order_index);
create index commercial_proposal_items_version_idx on public.commercial_proposal_items(proposal_version_id,order_index);
create index commercial_proposal_recipients_tenant_idx on public.commercial_proposal_recipients(law_firm_id,proposal_id);
create index commercial_proposal_events_proposal_idx on public.commercial_proposal_events(proposal_id,created_at desc);

create or replace function public.touch_commercial_proposal() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger commercial_proposals_updated_at before update on public.commercial_proposals for each row execute function public.touch_commercial_proposal();
create trigger commercial_proposal_recipients_updated_at before update on public.commercial_proposal_recipients for each row execute function public.touch_commercial_proposal();
create or replace function public.block_commercial_proposal_history_mutation() returns trigger language plpgsql as $$ begin raise exception 'commercial_proposal_history_immutable' using errcode = '42501'; end $$;
create trigger commercial_proposal_versions_immutable before update or delete on public.commercial_proposal_versions for each row execute function public.block_commercial_proposal_history_mutation();
create trigger commercial_proposal_sections_immutable before update or delete on public.commercial_proposal_sections for each row execute function public.block_commercial_proposal_history_mutation();
create trigger commercial_proposal_items_immutable before update or delete on public.commercial_proposal_items for each row execute function public.block_commercial_proposal_history_mutation();
create trigger commercial_proposal_events_immutable before update or delete on public.commercial_proposal_events for each row execute function public.block_commercial_proposal_history_mutation();

alter table public.commercial_proposals enable row level security;
alter table public.commercial_proposal_versions enable row level security;
alter table public.commercial_proposal_sections enable row level security;
alter table public.commercial_proposal_items enable row level security;
alter table public.commercial_proposal_recipients enable row level security;
alter table public.commercial_proposal_events enable row level security;
alter table public.commercial_proposal_idempotency_operations enable row level security;
create policy commercial_proposals_select on public.commercial_proposals for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy commercial_proposals_write on public.commercial_proposals for all to authenticated using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[])) with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[]));
create policy commercial_proposal_versions_select on public.commercial_proposal_versions for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy commercial_proposal_versions_insert on public.commercial_proposal_versions for insert to authenticated with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[]));
create policy commercial_proposal_children_select on public.commercial_proposal_sections for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy commercial_proposal_children_items_select on public.commercial_proposal_items for select to authenticated using (public.has_law_firm_access(law_firm_id));
create policy commercial_proposal_recipients_select on public.commercial_proposal_recipients for select to authenticated using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[]));
create policy commercial_proposal_events_select on public.commercial_proposal_events for select to authenticated using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[]));

revoke all on public.commercial_proposals, public.commercial_proposal_versions, public.commercial_proposal_sections, public.commercial_proposal_items, public.commercial_proposal_recipients, public.commercial_proposal_events, public.commercial_proposal_idempotency_operations from anon;
revoke all on public.commercial_proposal_recipients, public.commercial_proposal_events, public.commercial_proposal_idempotency_operations from authenticated;
grant select on public.commercial_proposals, public.commercial_proposal_versions, public.commercial_proposal_sections, public.commercial_proposal_items to authenticated;

create or replace function public.get_commercial_proposals_secure(p_status public.proposal_status default null)
returns table(id uuid, law_firm_id uuid, title text, status public.proposal_status, origin_type public.proposal_origin_type, currency char(3), active_version_id uuid, valid_until timestamptz, created_at timestamptz, updated_at timestamptz)
language sql stable security invoker set search_path = public as $$ select p.id,p.law_firm_id,p.title,p.status,p.origin_type,p.currency,p.active_version_id,p.valid_until,p.created_at,p.updated_at from public.commercial_proposals p where public.has_law_firm_access(p.law_firm_id) and (p_status is null or p.status=p_status) order by p.updated_at desc $$;
create or replace function public.get_commercial_proposal_secure(p_proposal_id uuid)
returns setof public.commercial_proposals language sql stable security invoker set search_path = public as $$ select p.* from public.commercial_proposals p where p.id=p_proposal_id and public.has_law_firm_access(p.law_firm_id) $$;
create or replace function public.get_commercial_proposal_version_secure(p_proposal_id uuid, p_version_id uuid default null)
returns table(id uuid, proposal_id uuid, version_number integer, title text, currency char(3), subtotal_cents bigint, discount_cents bigint, total_cents bigint, entry_amount_cents bigint, installment_count integer, installment_amount_cents bigint, recurring_amount_cents bigint, recurring_months integer, success_fee_bps integer, validity_days integer, commercial_summary_json jsonb, content_hash text, created_at timestamptz)
language sql stable security invoker set search_path = public as $$ select v.id,v.proposal_id,v.version_number,v.title,v.currency,v.subtotal_cents,v.discount_cents,v.total_cents,v.entry_amount_cents,v.installment_count,v.installment_amount_cents,v.recurring_amount_cents,v.recurring_months,v.success_fee_bps,v.validity_days,v.commercial_summary_json,v.content_hash,v.created_at from public.commercial_proposal_versions v join public.commercial_proposals p on p.id=v.proposal_id and p.law_firm_id=v.law_firm_id where p.id=p_proposal_id and (p_version_id is null and v.id=p.active_version_id or v.id=p_version_id) and public.has_law_firm_access(p.law_firm_id) $$;
revoke execute on function public.get_commercial_proposals_secure(public.proposal_status), public.get_commercial_proposal_secure(uuid), public.get_commercial_proposal_version_secure(uuid,uuid) from public, anon;
grant execute on function public.get_commercial_proposals_secure(public.proposal_status), public.get_commercial_proposal_secure(uuid), public.get_commercial_proposal_version_secure(uuid,uuid) to authenticated;

create or replace function public.create_commercial_proposal_manual(p_title text, p_currency char(3), p_validity_days integer, p_idempotency_key text)
returns table(proposal_id uuid, version_id uuid) language plpgsql security invoker set search_path = public as $$
declare v_firm uuid; v_proposal uuid; v_version uuid; v_hash text;
begin
  select law_firm_id into v_firm from public.law_firm_members where user_id = (select auth.uid()) and status = 'ativo' order by created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm, array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'proposal_permission_denied' using errcode='42501'; end if;
  if char_length(btrim(coalesce(p_title,''))) = 0 or p_currency !~ '^[A-Z]{3}$' or p_validity_days is not null and p_validity_days not between 1 and 3650 then raise exception 'proposal_validation_error' using errcode='22023'; end if;
  v_hash := encode(extensions.digest(convert_to(jsonb_build_object('title',btrim(p_title),'currency',p_currency,'validityDays',p_validity_days)::text,'utf8'),'sha256'),'hex');
  select result_proposal_id,result_version_id into v_proposal,v_version from public.commercial_proposal_idempotency_operations where law_firm_id=v_firm and actor_id=(select auth.uid()) and operation_type='manual_create' and idempotency_key=p_idempotency_key and input_hash=v_hash and status='completed';
  if v_proposal is not null then return query select v_proposal,v_version; return; end if;
  insert into public.commercial_proposals(law_firm_id,created_by,origin_type,title,currency,valid_until) values(v_firm,(select auth.uid()),'manual',btrim(p_title),p_currency,case when p_validity_days is null then null else now()+make_interval(days=>p_validity_days) end) returning id into v_proposal;
  insert into public.commercial_proposal_versions(law_firm_id,proposal_id,version_number,schema_version,title,currency,validity_days,content_hash) values(v_firm,v_proposal,1,1,btrim(p_title),p_currency,p_validity_days,v_hash) returning id into v_version;
  update public.commercial_proposals set active_version_id=v_version where id=v_proposal;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type) values(v_firm,v_proposal,v_version,(select auth.uid()),'proposal_created'),(v_firm,v_proposal,v_version,(select auth.uid()),'proposal_version_created');
  insert into public.commercial_proposal_idempotency_operations(law_firm_id,actor_id,proposal_id,result_proposal_id,result_version_id,operation_type,idempotency_key,input_hash,status,completed_at) values(v_firm,(select auth.uid()),v_proposal,v_proposal,v_version,'manual_create',p_idempotency_key,v_hash,'completed',now());
  return query select v_proposal,v_version;
end $$;

create or replace function public.create_commercial_proposal_from_pricing_version(p_pricing_scenario_id uuid, p_pricing_version_id uuid, p_title text, p_client_id uuid default null, p_contact_id uuid default null, p_validity_days integer default null, p_idempotency_key text default null, p_input_hash text default null)
returns table(proposal_id uuid, version_id uuid) language plpgsql security invoker set search_path = public as $$
declare v_firm uuid; v_actor uuid; s public.pricing_scenarios%rowtype; v public.pricing_scenario_versions%rowtype; p uuid; pv uuid; h text; item record;
begin
  v_actor := (select auth.uid()); select law_firm_id into v_firm from public.law_firm_members where user_id=v_actor and status='ativo' order by created_at limit 1;
  if v_firm is null or not public.has_law_firm_role(v_firm,array['proprietario','administrador','advogado']::public.member_role[]) then raise exception 'proposal_permission_denied' using errcode='42501'; end if;
  select * into s from public.pricing_scenarios where id=p_pricing_scenario_id and law_firm_id=v_firm;
  select * into v from public.pricing_scenario_versions where id=p_pricing_version_id and pricing_scenario_id=p_pricing_scenario_id and law_firm_id=v_firm;
  if s.id is null or v.id is null then raise exception 'proposal_source_pricing_not_found' using errcode='P0002'; end if;
  if p_input_hash is null or char_length(p_input_hash) <> 64 then raise exception 'proposal_validation_error' using errcode='22023'; end if;
  select result_proposal_id,result_version_id into p,pv from public.commercial_proposal_idempotency_operations where law_firm_id=v_firm and actor_id=v_actor and operation_type='pricing_create' and idempotency_key=p_idempotency_key and input_hash=p_input_hash and status='completed';
  if p is not null then return query select p,pv; return; end if;
  insert into public.commercial_proposals(law_firm_id,created_by,client_id,contact_id,source_pricing_scenario_id,source_pricing_version_id,origin_type,title,currency,valid_until) values(v_firm,v_actor,p_client_id,p_contact_id,s.id,v.id,'pricing_scenario',btrim(p_title),v.currency,case when p_validity_days is null then null else now()+make_interval(days=>p_validity_days) end) returning id into p;
  insert into public.commercial_proposal_versions(law_firm_id,proposal_id,version_number,schema_version,pricing_engine_version,title,currency,subtotal_cents,total_cents,entry_amount_cents,installment_count,installment_amount_cents,recurring_amount_cents,recurring_months,success_fee_bps,validity_days,payment_terms_json,commercial_summary_json,pricing_snapshot_json,content_hash,pricing_snapshot_hash,created_by) values(v_firm,p,1,1,'pricing-v1',btrim(p_title),v.currency,coalesce((v.calculation_result->>'base_fee_cents')::bigint,v.total_amount_cents),v.total_amount_cents,v.entry_amount_cents,v.installment_count,case when v.installment_count>0 then v.financed_amount_cents/greatest(v.installment_count,1) else 0 end,coalesce(v.monthly_fee_cents,0),coalesce(v.monthly_fee_count,0),v.success_fee_percentage_bps,p_validity_days,'{}',jsonb_build_object('totalCents',v.total_amount_cents,'currency',v.currency),jsonb_build_object('pricingScenarioId',s.id,'pricingVersionId',v.id,'pricingVersionNumber',v.version_number,'scenarioType',v.scenario_type,'currency',v.currency,'items',jsonb_build_array(),'snapshotAt',now()),p_input_hash,null,v_actor) returning id into pv;
  update public.commercial_proposals set active_version_id=pv where id=p;
  for item in select * from public.pricing_scenario_items where scenario_version_id=v.id and (metadata->>'includedInClientPrice')::boolean is distinct from false order by order_index loop insert into public.commercial_proposal_items(law_firm_id,proposal_version_id,source_pricing_item_id,item_type,description,quantity,unit_amount_cents,total_amount_cents,order_index,metadata) values(v_firm,pv,item.id,item.item_type,item.description,item.quantity,item.unit_amount_cents,item.total_amount_cents,item.order_index,jsonb_build_object('source','pricing')); end loop;
  insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type) values(v_firm,p,pv,v_actor,'proposal_created'),(v_firm,p,pv,v_actor,'proposal_version_created');
  insert into public.commercial_proposal_idempotency_operations(law_firm_id,actor_id,proposal_id,source_pricing_version_id,result_proposal_id,result_version_id,operation_type,idempotency_key,input_hash,status,completed_at) values(v_firm,v_actor,p,v.id,p,pv,'pricing_create',p_idempotency_key,p_input_hash,'completed',now());
  return query select p,pv;
end $$;
revoke execute on function public.create_commercial_proposal_manual(text,char(3),integer,text), public.create_commercial_proposal_from_pricing_version(uuid,uuid,text,uuid,uuid,integer,text,text) from public,anon;
grant execute on function public.create_commercial_proposal_manual(text,char(3),integer,text), public.create_commercial_proposal_from_pricing_version(uuid,uuid,text,uuid,uuid,integer,text,text) to authenticated;
