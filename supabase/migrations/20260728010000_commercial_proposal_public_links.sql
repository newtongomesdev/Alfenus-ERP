-- ETAPA 5.2.3.4 - Link seguro e visualizacao publica de propostas.
-- Forward-only. O token bruto nunca e persistido.

create table public.commercial_proposal_public_links (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.commercial_proposal_versions(id) on delete restrict,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_prefix text check (token_prefix is null or char_length(token_prefix) between 1 and 32),
  status text not null default 'active' check (status in ('active','revoked','expired','rotated')),
  expires_at timestamptz,
  activated_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  view_count bigint not null default 0 check (view_count >= 0),
  idempotency_key text not null check (char_length(btrim(idempotency_key)) between 1 and 256),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  constraint commercial_proposal_public_links_tenant_match check (law_firm_id is not null)
);

create unique index commercial_proposal_public_links_one_active
  on public.commercial_proposal_public_links(proposal_id) where status = 'active';
create unique index commercial_proposal_public_links_idempotency
  on public.commercial_proposal_public_links(law_firm_id, created_by, idempotency_key);
create index commercial_proposal_public_links_token_hash_idx on public.commercial_proposal_public_links(token_hash);
create index commercial_proposal_public_links_proposal_idx on public.commercial_proposal_public_links(proposal_id);
create index commercial_proposal_public_links_tenant_idx on public.commercial_proposal_public_links(law_firm_id);
create index commercial_proposal_public_links_status_idx on public.commercial_proposal_public_links(status);
create index commercial_proposal_public_links_expires_idx on public.commercial_proposal_public_links(expires_at);
create unique index commercial_proposal_viewed_once on public.commercial_proposal_events(proposal_id) where event_type = 'proposal_viewed';

create or replace function public.validate_commercial_proposal_public_link()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.commercial_proposals p
    join public.commercial_proposal_versions v on v.proposal_id = p.id and v.law_firm_id = p.law_firm_id
    where p.id = new.proposal_id and v.id = new.proposal_version_id and p.law_firm_id = new.law_firm_id
  ) then
    raise exception 'commercial_proposal_public_link_tenant_mismatch' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger commercial_proposal_public_links_validate
before insert or update on public.commercial_proposal_public_links
for each row execute function public.validate_commercial_proposal_public_link();

alter table public.commercial_proposal_public_links enable row level security;
revoke all on public.commercial_proposal_public_links from anon, authenticated;

create or replace function public.create_commercial_proposal_public_link(
  p_proposal_id uuid,
  p_proposal_version_id uuid default null,
  p_expires_at timestamptz default null,
  p_token_hash text default null,
  p_token_prefix text default null,
  p_idempotency_key text default null,
  p_input_hash text default null
)
returns table(link_id uuid, proposal_id uuid, proposal_version_id uuid, expires_at timestamptz, idempotent boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_actor uuid := auth.uid(); v_firm uuid; v_role public.member_role; v_proposal public.commercial_proposals%rowtype;
  v_version uuid; v_existing public.commercial_proposal_public_links%rowtype; v_link uuid; v_now timestamptz := now();
begin
  if v_actor is null then raise exception 'proposal_public_link_permission_denied' using errcode = '42501'; end if;
  select m.law_firm_id, m.role into v_firm, v_role from public.law_firm_members m where m.user_id = v_actor and m.status = 'ativo' order by m.created_at limit 1;
  if v_firm is null or v_role not in ('proprietario','administrador','advogado') then raise exception 'proposal_public_link_permission_denied' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key is null then raise exception 'proposal_public_link_validation_error' using errcode = '22023'; end if;
  if p_expires_at is not null and p_expires_at <= v_now then raise exception 'proposal_public_link_validation_error' using errcode = '22023'; end if;

  select l.* into v_existing from public.commercial_proposal_public_links l where l.law_firm_id = v_firm and l.created_by = v_actor and l.idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.input_hash <> p_input_hash then raise exception 'proposal_public_link_idempotency_conflict' using errcode = '23505'; end if;
    return query select v_existing.id, v_existing.proposal_id, v_existing.proposal_version_id, v_existing.expires_at, true;
    return;
  end if;

  select p.* into v_proposal from public.commercial_proposals p where p.id = p_proposal_id and p.law_firm_id = v_firm for update;
  if v_proposal.id is null or v_proposal.status <> 'ready' then raise exception 'proposal_public_link_not_ready' using errcode = '22023'; end if;
  v_version := coalesce(p_proposal_version_id, v_proposal.active_version_id);
  if v_version is null or not exists (select 1 from public.commercial_proposal_versions v where v.id = v_version and v.proposal_id = v_proposal.id and v.law_firm_id = v_firm) then raise exception 'proposal_public_link_version_invalid' using errcode = '22023'; end if;
  if not exists (select 1 from public.commercial_proposal_versions v where v.id = v_version and v.total_cents > 0 and jsonb_typeof(v.payment_terms_json) = 'object' and exists (select 1 from public.commercial_proposal_sections s where s.proposal_version_id = v.id and s.section_type = 'fees') and exists (select 1 from public.commercial_proposal_sections s where s.proposal_version_id = v.id and s.section_type = 'validity') and exists (select 1 from public.commercial_proposal_items i where i.proposal_version_id = v.id and i.is_included and char_length(btrim(i.description)) > 0)) then raise exception 'proposal_public_link_not_ready' using errcode = '22023'; end if;
  update public.commercial_proposal_public_links as l set status = 'rotated', revoked_at = v_now where l.proposal_id = v_proposal.id and l.status = 'active';
  insert into public.commercial_proposal_public_links(law_firm_id, proposal_id, proposal_version_id, token_hash, token_prefix, status, expires_at, activated_at, created_by, idempotency_key, input_hash)
  values(v_firm, v_proposal.id, v_version, p_token_hash, p_token_prefix, 'active', p_expires_at, v_now, v_actor, p_idempotency_key, p_input_hash) returning id into v_link;
  update public.commercial_proposals set status = 'sent', sent_at = coalesce(sent_at, v_now), active_version_id = v_version where id = v_proposal.id;
  insert into public.commercial_proposal_events(law_firm_id, proposal_id, proposal_version_id, actor_id, event_type, metadata) values(v_firm, v_proposal.id, v_version, v_actor, 'public_link_created', jsonb_build_object('linkId', v_link)), (v_firm, v_proposal.id, v_version, v_actor, 'proposal_sent', jsonb_build_object('source','public_link'));
  return query select v_link, v_proposal.id, v_version, p_expires_at, false;
exception when unique_violation then
  select l.* into v_existing from public.commercial_proposal_public_links l where l.law_firm_id = v_firm and l.created_by = v_actor and l.idempotency_key = p_idempotency_key;
  if v_existing.id is not null and v_existing.input_hash = p_input_hash then return query select v_existing.id, v_existing.proposal_id, v_existing.proposal_version_id, v_existing.expires_at, true; return; end if;
  raise;
end $$;

create or replace function public.revoke_commercial_proposal_public_link(p_link_id uuid)
returns table(link_id uuid, status text)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_actor uuid := auth.uid(); v_firm uuid; v_link public.commercial_proposal_public_links%rowtype;
begin
  select law_firm_id into v_firm from public.law_firm_members where user_id = v_actor and status = 'ativo' and role in ('proprietario','administrador','advogado') order by created_at limit 1;
  if v_firm is null then raise exception 'proposal_public_link_permission_denied' using errcode = '42501'; end if;
  select l.* into v_link from public.commercial_proposal_public_links l where l.id = p_link_id and l.law_firm_id = v_firm for update;
  if v_link.id is null then raise exception 'proposal_public_link_not_found' using errcode = 'P0002'; end if;
  if v_link.status = 'active' then update public.commercial_proposal_public_links as l set status = 'revoked', revoked_at = now() where l.id = v_link.id returning l.* into v_link; insert into public.commercial_proposal_events(law_firm_id, proposal_id, proposal_version_id, actor_id, event_type, metadata) values(v_firm, v_link.proposal_id, v_link.proposal_version_id, v_actor, 'public_link_revoked', jsonb_build_object('linkId',v_link.id)); end if;
  return query select v_link.id, v_link.status;
end $$;

create or replace function public.rotate_commercial_proposal_public_link(
  p_proposal_id uuid,
  p_proposal_version_id uuid default null,
  p_expires_at timestamptz default null,
  p_token_hash text default null,
  p_token_prefix text default null,
  p_idempotency_key text default null,
  p_input_hash text default null
)
returns table(link_id uuid, proposal_id uuid, proposal_version_id uuid, expires_at timestamptz, idempotent boolean)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare v_actor uuid := auth.uid(); v_firm uuid; v_proposal public.commercial_proposals%rowtype; v_old public.commercial_proposal_public_links%rowtype; v_version uuid; v_link uuid; v_existing public.commercial_proposal_public_links%rowtype;
begin
  select law_firm_id into v_firm from public.law_firm_members where user_id = v_actor and status = 'ativo' and role in ('proprietario','administrador','advogado') order by created_at limit 1;
  if v_firm is null then raise exception 'proposal_public_link_permission_denied' using errcode = '42501'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key is null then raise exception 'proposal_public_link_validation_error' using errcode = '22023'; end if;
  select l.* into v_existing from public.commercial_proposal_public_links l where l.law_firm_id = v_firm and l.created_by = v_actor and l.idempotency_key = p_idempotency_key;
  if v_existing.id is not null then if v_existing.input_hash <> p_input_hash then raise exception 'proposal_public_link_idempotency_conflict' using errcode = '23505'; end if; return query select v_existing.id, v_existing.proposal_id, v_existing.proposal_version_id, v_existing.expires_at, true; return; end if;
  select p.* into v_proposal from public.commercial_proposals p where p.id = p_proposal_id and p.law_firm_id = v_firm for update;
  if v_proposal.id is null or v_proposal.status not in ('sent','viewed') then raise exception 'proposal_public_link_validation_error' using errcode = '22023'; end if;
  v_version := coalesce(p_proposal_version_id, v_proposal.active_version_id);
  if v_version is null or not exists(select 1 from public.commercial_proposal_versions as v where v.id = v_version and v.proposal_id = v_proposal.id and v.law_firm_id = v_firm) then raise exception 'proposal_public_link_version_invalid' using errcode = '22023'; end if;
  update public.commercial_proposal_public_links as l set status = 'rotated', revoked_at = now() where l.proposal_id = v_proposal.id and l.status = 'active' returning l.* into v_old;
  insert into public.commercial_proposal_public_links(law_firm_id, proposal_id, proposal_version_id, token_hash, token_prefix, status, expires_at, created_by, idempotency_key, input_hash) values(v_firm, v_proposal.id, v_version, p_token_hash, p_token_prefix, 'active', p_expires_at, v_actor, p_idempotency_key, p_input_hash) returning id into v_link;
  insert into public.commercial_proposal_events(law_firm_id, proposal_id, proposal_version_id, actor_id, event_type, metadata) values(v_firm, v_proposal.id, v_version, v_actor, 'public_link_rotated', jsonb_build_object('linkId',v_link));
  return query select v_link, v_proposal.id, v_version, p_expires_at, false;
end $$;

create or replace function public.get_commercial_proposal_public_link_status(p_proposal_id uuid)
returns table(link_id uuid, proposal_id uuid, proposal_version_id uuid, status text, expires_at timestamptz, activated_at timestamptz, revoked_at timestamptz, created_at timestamptz, first_viewed_at timestamptz, last_viewed_at timestamptz, view_count bigint)
language sql stable security definer set search_path = public as $$
  select l.id,l.proposal_id,l.proposal_version_id,case when l.status='active' and l.expires_at is not null and l.expires_at <= now() then 'expired' else l.status end,l.expires_at,l.activated_at,l.revoked_at,l.created_at,l.first_viewed_at,l.last_viewed_at,l.view_count
  from public.commercial_proposal_public_links l join public.law_firm_members m on m.law_firm_id=l.law_firm_id and m.user_id=auth.uid() and m.status='ativo' and m.role in ('proprietario','administrador','advogado') where l.proposal_id=p_proposal_id order by l.created_at desc limit 1
$$;

create or replace function public.get_public_commercial_proposal(p_token_hash text)
returns table(public_payload jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_link public.commercial_proposal_public_links%rowtype; v_payload jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return; end if;
  select l.* into v_link from public.commercial_proposal_public_links l where l.token_hash=p_token_hash and l.status='active' and (l.expires_at is null or l.expires_at > now());
  if v_link.id is null then return; end if;
  select jsonb_build_object(
    'officeName', lf.name,
    'logoPath', case when lf.logo_path like 'https://%' then lf.logo_path else null end,
    'title', v.title,
    'recipientName', coalesce((select r.name from public.commercial_proposal_recipients r where r.proposal_id=p.id and r.is_primary order by r.created_at limit 1),'Destinatario'),
    'status', p.status::text,
    'validUntil', p.valid_until,
    'validityDays', v.validity_days,
    'introduction', v.introduction,
    'conclusion', v.conclusion,
    'currency', v.currency,
    'subtotalCents', v.subtotal_cents,
    'discountCents', v.discount_cents,
    'totalCents', v.total_cents,
    'entryAmountCents', v.entry_amount_cents,
    'installmentCount', v.installment_count,
    'installmentAmountCents', v.installment_amount_cents,
    'recurringAmountCents', v.recurring_amount_cents,
    'recurringMonths', v.recurring_months,
    'successFeeBps', v.success_fee_bps,
    'paymentTerms', jsonb_build_object('method',coalesce(v.payment_terms_json->>'method',''),'description',coalesce(v.payment_terms_json->>'description','')),
    'sections', coalesce((select jsonb_agg(jsonb_build_object('type',s.section_type,'title',s.title,'body',s.body_markdown) order by s.order_index) from public.commercial_proposal_sections s where s.proposal_version_id=v.id),'[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('type',i.item_type,'description',i.description,'quantity',i.quantity,'unitAmountCents',i.unit_amount_cents,'totalAmountCents',i.total_amount_cents) order by i.order_index) from public.commercial_proposal_items i where i.proposal_version_id=v.id and i.is_included),'[]'::jsonb)
  ) into v_payload from public.commercial_proposals p join public.law_firms lf on lf.id=p.law_firm_id join public.commercial_proposal_versions v on v.id=v_link.proposal_version_id and v.proposal_id=p.id where p.id=v_link.proposal_id and p.status in ('sent','viewed');
  if v_payload is not null then return query select v_payload; end if;
end $$;

create or replace function public.register_public_commercial_proposal_view(p_token_hash text)
returns table(view_count bigint, first_view boolean)
language plpgsql security definer set search_path = public as $$
declare v_link public.commercial_proposal_public_links%rowtype; v_first boolean; v_now timestamptz := now();
begin
  select l.* into v_link from public.commercial_proposal_public_links l where l.token_hash=p_token_hash and l.status='active' and (l.expires_at is null or l.expires_at > v_now) for update;
  if v_link.id is null then return; end if;
  v_first := v_link.first_viewed_at is null;
  update public.commercial_proposal_public_links as l set first_viewed_at=coalesce(l.first_viewed_at,v_now),last_viewed_at=v_now,view_count=l.view_count+1 where l.id=v_link.id returning l.* into v_link;
  if v_first then
    update public.commercial_proposals set status=case when status='sent' then 'viewed' else status end,first_viewed_at=coalesce(first_viewed_at,v_now) where id=v_link.proposal_id and status in ('sent','viewed');
    insert into public.commercial_proposal_events(law_firm_id,proposal_id,proposal_version_id,actor_id,event_type,metadata) select v_link.law_firm_id,v_link.proposal_id,v_link.proposal_version_id,null,'proposal_viewed',jsonb_build_object('source','public_link') where not exists(select 1 from public.commercial_proposal_events e where e.proposal_id=v_link.proposal_id and e.event_type='proposal_viewed');
  end if;
  return query select v_link.view_count,v_first;
end $$;

revoke all on function public.create_commercial_proposal_public_link(uuid,uuid,timestamptz,text,text,text,text), public.revoke_commercial_proposal_public_link(uuid), public.rotate_commercial_proposal_public_link(uuid,uuid,timestamptz,text,text,text,text), public.get_commercial_proposal_public_link_status(uuid) from public, anon;
grant execute on function public.create_commercial_proposal_public_link(uuid,uuid,timestamptz,text,text,text,text), public.revoke_commercial_proposal_public_link(uuid), public.rotate_commercial_proposal_public_link(uuid,uuid,timestamptz,text,text,text,text), public.get_commercial_proposal_public_link_status(uuid) to authenticated;
revoke all on function public.get_public_commercial_proposal(text), public.register_public_commercial_proposal_view(text) from public;
grant execute on function public.get_public_commercial_proposal(text), public.register_public_commercial_proposal_view(text) to anon, authenticated;
