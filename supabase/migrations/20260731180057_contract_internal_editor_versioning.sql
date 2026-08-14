-- ETAPA 5.2.3.7 - Editor interno, versionamento e revisao de contratos.
-- Extends the immutable conversion chain introduced in 5.2.3.6.

alter table public.contracts
  add column if not exists internal_reference text,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists jurisdiction text,
  add column if not exists contract_language text not null default 'pt-BR',
  add column if not exists archived_at timestamptz,
  add column if not exists active_contract_version_id uuid,
  add column if not exists contract_editor_updated_at timestamptz not null default now();

alter table public.contract_conversion_versions
  add column if not exists parties_json jsonb not null default '{}'::jsonb,
  add column if not exists commercial_terms_json jsonb not null default '{}'::jsonb,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists readiness_json jsonb not null default '[]'::jsonb,
  add column if not exists is_active boolean not null default false,
  add column if not exists activated_at timestamptz,
  add column if not exists activated_by uuid;

alter table public.contract_conversion_clauses
  add column if not exists clause_type text not null default 'custom',
  add column if not exists is_required boolean not null default false,
  add column if not exists is_enabled boolean not null default true;

create table if not exists public.contract_version_operations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  actor_id uuid not null,
  idempotency_key text not null,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  contract_version_id uuid references public.contract_conversion_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (law_firm_id, actor_id, idempotency_key)
);

create table if not exists public.contract_editor_events (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  actor_id uuid not null,
  event_type text not null check (event_type in ('metadata_updated','version_created','version_activated','marked_ready','returned_to_draft','archived','restored')),
  version_id uuid references public.contract_conversion_versions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists contract_conversion_versions_one_active
  on public.contract_conversion_versions(contract_id) where is_active;
create index if not exists contract_editor_events_contract_created_idx
  on public.contract_editor_events(contract_id, created_at desc);

-- Version one is the conversion snapshot and must remain the active baseline.
update public.contract_conversion_versions v
set is_active = true,
    activated_at = coalesce(activated_at, created_at)
where v.version_number = 1
  and not exists (select 1 from public.contract_conversion_versions x where x.contract_id = v.contract_id and x.is_active);

update public.contracts c
set active_contract_version_id = v.id,
    contract_editor_updated_at = coalesce(c.contract_editor_updated_at, c.updated_at, now())
from public.contract_conversion_versions v
where v.contract_id = c.id and v.is_active and c.active_contract_version_id is null;

alter table public.contract_version_operations enable row level security;
alter table public.contract_editor_events enable row level security;
revoke all on public.contract_version_operations, public.contract_editor_events from anon, authenticated;

create or replace function public.contract_editor_actor(p_contract_id uuid)
returns table(law_firm_id uuid, member_id uuid, user_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then raise exception 'CONTRACT_EDITOR_AUTH_REQUIRED' using errcode = '42501'; end if;
  return query
  select m.law_firm_id, m.id, m.user_id
  from public.law_firm_members m join public.contracts c on c.law_firm_id = m.law_firm_id
  where c.id = p_contract_id and m.user_id = v_actor and m.status = 'ativo'
    and m.role in ('proprietario','administrador','advogado')
    and not public.is_active_assisted_support_session(m.law_firm_id)
  limit 1;
  if not found then raise exception 'CONTRACT_EDITOR_PERMISSION_DENIED' using errcode = '42501'; end if;
end $$;

create or replace function public.create_contract_version(
  p_contract_id uuid,
  p_expected_updated_at timestamptz,
  p_title text,
  p_content text,
  p_parties jsonb,
  p_clauses jsonb,
  p_terms jsonb,
  p_metadata jsonb,
  p_content_hash text,
  p_idempotency_key text,
  p_input_hash text,
  p_activate boolean default false
)
returns table(contract_version_id uuid, version_number integer, idempotent boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_firm uuid; v_member uuid; v_contract public.contracts%rowtype; v_existing public.contract_version_operations%rowtype;
  v_version_id uuid; v_number integer; v_clause jsonb; v_index integer := 0; v_now timestamptz := now();
begin
  select law_firm_id, member_id into v_firm, v_member from public.contract_editor_actor(p_contract_id);
  if p_expected_updated_at is null or coalesce(length(trim(p_title)),0) < 3 or p_content_hash !~ '^[0-9a-f]{64}$' or p_input_hash !~ '^[0-9a-f]{64}$' or coalesce(length(trim(p_idempotency_key)),0) not between 1 and 256 or jsonb_typeof(p_parties) <> 'object' or jsonb_typeof(p_clauses) <> 'array' or jsonb_typeof(p_terms) <> 'object' then raise exception 'CONTRACT_EDITOR_VALIDATION_ERROR' using errcode='22023'; end if;
  select * into v_contract from public.contracts where id=p_contract_id and law_firm_id=v_firm for update;
  if v_contract.id is null then raise exception 'CONTRACT_EDITOR_NOT_FOUND' using errcode='P0002'; end if;
  if v_contract.status not in ('rascunho','aguardando_assinatura') or v_contract.archived_at is not null then raise exception 'CONTRACT_EDITOR_NOT_EDITABLE' using errcode='22023'; end if;
  if v_contract.contract_editor_updated_at <> p_expected_updated_at then raise exception 'CONTRACT_EDITOR_OPTIMISTIC_LOCK_CONFLICT' using errcode='40001'; end if;
  select * into v_existing from public.contract_version_operations where law_firm_id=v_firm and actor_id=auth.uid() and idempotency_key=p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.input_hash <> p_input_hash then raise exception 'CONTRACT_EDITOR_IDEMPOTENCY_CONFLICT' using errcode='23505'; end if;
    return query select v_existing.contract_version_id, (select version_number from public.contract_conversion_versions where id=v_existing.contract_version_id), true, v_contract.contract_editor_updated_at; return;
  end if;
  select coalesce(max(version_number),0)+1 into v_number from public.contract_conversion_versions where contract_id=p_contract_id;
  insert into public.contract_conversion_versions(law_firm_id,contract_id,source_proposal_id,source_proposal_version_id,version_number,title,content,snapshot_json,snapshot_hash,created_by,parties_json,commercial_terms_json,metadata_json,is_active,activated_at,activated_by)
  values(v_firm,p_contract_id,v_contract.source_proposal_id,v_contract.source_proposal_version_id,v_number,trim(p_title),coalesce(p_content,''),'{}'::jsonb,p_content_hash,auth.uid(),p_parties,p_terms,coalesce(p_metadata,'{}'::jsonb),p_activate,case when p_activate then v_now else null end,case when p_activate then auth.uid() else null end) returning id into v_version_id;
  for v_clause in select value from jsonb_array_elements(p_clauses) loop
    insert into public.contract_conversion_clauses(law_firm_id,contract_id,version_id,title,content,order_index,clause_type,is_required,is_enabled)
    values(v_firm,p_contract_id,v_version_id,coalesce(nullif(trim(v_clause->>'title'),''),'Clausula'),coalesce(v_clause->>'content',''),v_index,coalesce(nullif(v_clause->>'type',''),'custom'),coalesce((v_clause->>'required')::boolean,false),coalesce((v_clause->>'enabled')::boolean,true));
    v_index := v_index + 1;
  end loop;
  if p_activate then
    update public.contract_conversion_versions set is_active=false where contract_id=p_contract_id and id<>v_version_id and is_active;
  end if;
  update public.contracts set service_description=trim(p_title), active_contract_version_id=case when p_activate then v_version_id else active_contract_version_id end, contract_editor_updated_at=v_now, updated_at=v_now where id=p_contract_id;
  insert into public.contract_version_operations(law_firm_id,contract_id,actor_id,idempotency_key,input_hash,contract_version_id) values(v_firm,p_contract_id,auth.uid(),p_idempotency_key,p_input_hash,v_version_id);
  insert into public.contract_editor_events(law_firm_id,contract_id,actor_id,event_type,version_id,metadata) values(v_firm,p_contract_id,v_member,'version_created',v_version_id,jsonb_build_object('versionNumber',v_number));
  if p_activate then insert into public.contract_editor_events(law_firm_id,contract_id,actor_id,event_type,version_id) values(v_firm,p_contract_id,v_member,'version_activated',v_version_id); end if;
  return query select v_version_id,v_number,false,v_now;
end $$;

create or replace function public.activate_contract_version(p_contract_id uuid,p_version_id uuid,p_expected_updated_at timestamptz)
returns table(updated_at timestamptz) language plpgsql security definer set search_path=public as $$
declare v_firm uuid; v_member uuid; v_contract public.contracts%rowtype; v_now timestamptz:=now();
begin
 select law_firm_id,member_id into v_firm,v_member from public.contract_editor_actor(p_contract_id);
 select * into v_contract from public.contracts where id=p_contract_id and law_firm_id=v_firm for update;
 if v_contract.contract_editor_updated_at<>p_expected_updated_at then raise exception 'CONTRACT_EDITOR_OPTIMISTIC_LOCK_CONFLICT' using errcode='40001'; end if;
 if not exists(select 1 from public.contract_conversion_versions where id=p_version_id and contract_id=p_contract_id and law_firm_id=v_firm) then raise exception 'CONTRACT_EDITOR_VERSION_NOT_FOUND' using errcode='P0002'; end if;
 update public.contract_conversion_versions set is_active=false where contract_id=p_contract_id and is_active;
 update public.contract_conversion_versions set is_active=true,activated_at=v_now,activated_by=auth.uid() where id=p_version_id;
 update public.contracts set active_contract_version_id=p_version_id,contract_editor_updated_at=v_now,updated_at=v_now where id=p_contract_id;
 insert into public.contract_editor_events(law_firm_id,contract_id,actor_id,event_type,version_id) values(v_firm,p_contract_id,v_member,'version_activated',p_version_id);
 return query select v_now;
end $$;

create or replace function public.transition_contract_editor_state(p_contract_id uuid,p_transition text,p_expected_updated_at timestamptz,p_readiness jsonb default '[]'::jsonb)
returns table(status text,updated_at timestamptz) language plpgsql security definer set search_path=public as $$
declare v_firm uuid; v_member uuid; v_contract public.contracts%rowtype; v_next text; v_event text; v_now timestamptz:=now();
begin
 select law_firm_id,member_id into v_firm,v_member from public.contract_editor_actor(p_contract_id);
 select * into v_contract from public.contracts where id=p_contract_id and law_firm_id=v_firm for update;
 if v_contract.contract_editor_updated_at<>p_expected_updated_at then raise exception 'CONTRACT_EDITOR_OPTIMISTIC_LOCK_CONFLICT' using errcode='40001'; end if;
 if p_transition='ready' then
   if v_contract.status<>'rascunho' or v_contract.active_contract_version_id is null or exists(select 1 from jsonb_array_elements(coalesce(p_readiness,'[]'::jsonb)) x where coalesce((x->>'blocking')::boolean,false)) then raise exception 'CONTRACT_EDITOR_READINESS_BLOCKED' using errcode='22023'; end if;
   v_next:='aguardando_assinatura'; v_event:='marked_ready';
 elsif p_transition='draft' then
   if v_contract.status<>'aguardando_assinatura' then raise exception 'CONTRACT_EDITOR_INVALID_TRANSITION' using errcode='22023'; end if; v_next:='rascunho'; v_event:='returned_to_draft';
 elsif p_transition='archive' then
   if v_contract.status not in ('rascunho','aguardando_assinatura') then raise exception 'CONTRACT_EDITOR_INVALID_TRANSITION' using errcode='22023'; end if; v_next:='rascunho'; v_event:='archived';
 elsif p_transition='restore' then
   if v_contract.archived_at is null then raise exception 'CONTRACT_EDITOR_INVALID_TRANSITION' using errcode='22023'; end if; v_next:='rascunho'; v_event:='restored';
 else raise exception 'CONTRACT_EDITOR_INVALID_TRANSITION' using errcode='22023'; end if;
 update public.contracts set status=v_next, archived_at=case when p_transition='archive' then v_now when p_transition='restore' then null else archived_at end, contract_editor_updated_at=v_now,updated_at=v_now where id=p_contract_id;
 insert into public.contract_editor_events(law_firm_id,contract_id,actor_id,event_type,version_id) values(v_firm,p_contract_id,v_member,v_event,v_contract.active_contract_version_id);
 return query select v_next,v_now;
end $$;

create or replace function public.get_contract_editor_secure(p_contract_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_role public.member_role; v_firm uuid; v_contract public.contracts%rowtype;
begin
 if v_actor is null then raise exception 'CONTRACT_EDITOR_AUTH_REQUIRED' using errcode='42501'; end if;
 select m.role,m.law_firm_id into v_role,v_firm from public.law_firm_members m join public.contracts c on c.law_firm_id=m.law_firm_id where c.id=p_contract_id and m.user_id=v_actor and m.status='ativo' limit 1;
 if v_firm is null then raise exception 'CONTRACT_EDITOR_PERMISSION_DENIED' using errcode='42501'; end if;
 select * into v_contract from public.contracts where id=p_contract_id and law_firm_id=v_firm;
 return jsonb_build_object('contract',jsonb_build_object('id',v_contract.id,'title',v_contract.service_description,'status',v_contract.status,'updatedAt',v_contract.contract_editor_updated_at,'activeVersionId',v_contract.active_contract_version_id,'archivedAt',v_contract.archived_at,'metadata',jsonb_build_object('reference',v_contract.internal_reference,'effectiveFrom',v_contract.effective_from,'effectiveUntil',v_contract.effective_until,'jurisdiction',v_contract.jurisdiction,'language',v_contract.contract_language),'canWrite',v_role in ('proprietario','administrador','advogado')),'versions',(select coalesce(jsonb_agg(jsonb_build_object('id',v.id,'number',v.version_number,'title',v.title,'content',v.content,'parties',v.parties_json,'terms',v.commercial_terms_json,'metadata',v.metadata_json,'readiness',v.readiness_json,'hash',v.snapshot_hash,'isActive',v.is_active,'createdAt',v.created_at,'clauses',(select coalesce(jsonb_agg(jsonb_build_object('id',cl.id,'title',cl.title,'content',cl.content,'order',cl.order_index,'type',cl.clause_type,'required',cl.is_required,'enabled',cl.is_enabled) order by cl.order_index),'[]'::jsonb) from public.contract_conversion_clauses cl where cl.version_id=v.id)) order by v.version_number),'[]'::jsonb) from public.contract_conversion_versions v where v.contract_id=p_contract_id),'events',(select coalesce(jsonb_agg(jsonb_build_object('type',e.event_type,'versionId',e.version_id,'createdAt',e.created_at,'metadata',e.metadata) order by e.created_at desc),'[]'::jsonb) from public.contract_editor_events e where e.contract_id=p_contract_id));
end $$;

revoke all on function public.contract_editor_actor(uuid), public.create_contract_version(uuid,timestamptz,text,text,jsonb,jsonb,jsonb,jsonb,text,text,text,boolean), public.activate_contract_version(uuid,uuid,timestamptz), public.transition_contract_editor_state(uuid,text,timestamptz,jsonb), public.get_contract_editor_secure(uuid) from public, anon;
grant execute on function public.create_contract_version(uuid,timestamptz,text,text,jsonb,jsonb,jsonb,jsonb,text,text,text,boolean), public.activate_contract_version(uuid,uuid,timestamptz), public.transition_contract_editor_state(uuid,text,timestamptz,jsonb), public.get_contract_editor_secure(uuid) to authenticated;
