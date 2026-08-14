-- ETAPA 5.2.3.5 - Aceite, recusa e registro probatorio da proposta.
-- Aceite comercial simples. Nao e assinatura digital ou certificada.

create type public.commercial_proposal_decision_type as enum ('accepted', 'rejected');

create table public.commercial_proposal_decisions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  proposal_id uuid not null references public.commercial_proposals(id) on delete cascade,
  proposal_version_id uuid not null references public.commercial_proposal_versions(id) on delete restrict,
  public_link_id uuid not null references public.commercial_proposal_public_links(id) on delete restrict,
  decision_type public.commercial_proposal_decision_type not null,
  signer_name text not null check (char_length(btrim(signer_name)) between 1 and 500),
  signer_email text check (signer_email is null or (char_length(signer_email) between 3 and 320 and signer_email = lower(signer_email))),
  signer_document_last4 text check (signer_document_last4 is null or signer_document_last4 ~ '^[0-9]{4}$'),
  signer_role text check (signer_role is null or char_length(btrim(signer_role)) between 1 and 200),
  company_name text check (company_name is null or char_length(btrim(company_name)) between 1 and 500),
  rejection_reason text check (rejection_reason is null or (char_length(btrim(rejection_reason)) between 1 and 1000 and rejection_reason !~ '[<>]')),
  consent_text_version text not null check (char_length(btrim(consent_text_version)) between 1 and 64),
  consent_text_snapshot text not null check (char_length(btrim(consent_text_snapshot)) between 1 and 2000),
  proposal_content_hash text not null check (proposal_content_hash ~ '^[0-9a-f]{64}$'),
  public_payload_hash text not null check (public_payload_hash ~ '^[0-9a-f]{64}$'),
  decision_payload_hash text not null check (decision_payload_hash ~ '^[0-9a-f]{64}$'),
  request_input_hash text not null check (request_input_hash ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^[0-9a-f]{64}$'),
  constraint commercial_proposal_decision_reason_check check (decision_type = 'accepted' or decision_type = 'rejected'),
  constraint commercial_proposal_decision_acceptance_check check (decision_type <> 'accepted' or rejection_reason is null)
);

create unique index commercial_proposal_decisions_one_per_proposal on public.commercial_proposal_decisions(proposal_id);
create unique index commercial_proposal_decisions_one_per_link on public.commercial_proposal_decisions(public_link_id);
create unique index commercial_proposal_decisions_idempotency on public.commercial_proposal_decisions(law_firm_id, idempotency_key_hash);
create index commercial_proposal_decisions_tenant_idx on public.commercial_proposal_decisions(law_firm_id, decided_at desc);

create or replace function public.validate_commercial_proposal_decision()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1
    from public.commercial_proposals p
    join public.commercial_proposal_versions v on v.id = new.proposal_version_id and v.proposal_id = p.id and v.law_firm_id = p.law_firm_id
    join public.commercial_proposal_public_links l on l.id = new.public_link_id and l.proposal_id = p.id and l.proposal_version_id = v.id and l.law_firm_id = p.law_firm_id
    where p.id = new.proposal_id and p.law_firm_id = new.law_firm_id
  ) then
    raise exception 'commercial_proposal_decision_tenant_mismatch' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger commercial_proposal_decisions_validate
before insert on public.commercial_proposal_decisions
for each row execute function public.validate_commercial_proposal_decision();

create or replace function public.block_commercial_proposal_decision_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  raise exception 'commercial_proposal_decision_immutable' using errcode = '42501';
end $$;

create trigger commercial_proposal_decisions_immutable
before update or delete on public.commercial_proposal_decisions
for each row execute function public.block_commercial_proposal_decision_mutation();

create or replace function public.block_decided_proposal_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status in ('accepted', 'rejected') then
    if new.status <> 'archived'
      or new.title is distinct from old.title
      or new.currency is distinct from old.currency
      or new.active_version_id is distinct from old.active_version_id
      or new.valid_until is distinct from old.valid_until
      or new.internal_reference is distinct from old.internal_reference
      or new.internal_notes is distinct from old.internal_notes
      or new.client_id is distinct from old.client_id
      or new.contact_id is distinct from old.contact_id
      or new.legal_case_id is distinct from old.legal_case_id
      or new.source_pricing_scenario_id is distinct from old.source_pricing_scenario_id
      or new.source_pricing_version_id is distinct from old.source_pricing_version_id
    then
      raise exception 'PROPOSAL_DECISION_LOCKED' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists commercial_proposals_decision_lock on public.commercial_proposals;
create trigger commercial_proposals_decision_lock
before update on public.commercial_proposals
for each row execute function public.block_decided_proposal_mutation();

create or replace function public.block_decided_proposal_child_mutation()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_proposal_id uuid; v_status public.proposal_status;
begin
  if tg_table_name = 'commercial_proposal_versions' then
    v_proposal_id := case when tg_op = 'DELETE' then old.proposal_id else new.proposal_id end;
  elsif tg_table_name = 'commercial_proposal_recipients' then
    v_proposal_id := case when tg_op = 'DELETE' then old.proposal_id else new.proposal_id end;
  else
    v_proposal_id := (select proposal_id from public.commercial_proposal_versions where id = case when tg_op = 'DELETE' then old.proposal_version_id else new.proposal_version_id end);
  end if;
  select status into v_status from public.commercial_proposals where id = v_proposal_id;
  if v_status in ('accepted', 'rejected') then
    raise exception 'PROPOSAL_DECISION_LOCKED' using errcode = '42501';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

drop trigger if exists commercial_proposal_versions_decision_lock on public.commercial_proposal_versions;
create trigger commercial_proposal_versions_decision_lock before insert on public.commercial_proposal_versions for each row execute function public.block_decided_proposal_child_mutation();
drop trigger if exists commercial_proposal_sections_decision_lock on public.commercial_proposal_sections;
create trigger commercial_proposal_sections_decision_lock before insert on public.commercial_proposal_sections for each row execute function public.block_decided_proposal_child_mutation();
drop trigger if exists commercial_proposal_items_decision_lock on public.commercial_proposal_items;
create trigger commercial_proposal_items_decision_lock before insert on public.commercial_proposal_items for each row execute function public.block_decided_proposal_child_mutation();
drop trigger if exists commercial_proposal_recipients_decision_lock on public.commercial_proposal_recipients;
create trigger commercial_proposal_recipients_decision_lock before insert or update or delete on public.commercial_proposal_recipients for each row execute function public.block_decided_proposal_child_mutation();

alter table public.commercial_proposal_decisions enable row level security;
revoke all on public.commercial_proposal_decisions from public, anon, authenticated;

create or replace function public.decide_public_commercial_proposal(
  p_token_hash text,
  p_decision_type public.commercial_proposal_decision_type,
  p_signer_name text,
  p_signer_email text default null,
  p_signer_document_last4 text default null,
  p_signer_role text default null,
  p_company_name text default null,
  p_rejection_reason text default null,
  p_consent_text_version text default null,
  p_consent_text_snapshot text default null,
  p_idempotency_key_hash text default null,
  p_input_hash text default null
)
returns table(decision_id uuid, decision_type public.commercial_proposal_decision_type, decided_at timestamptz, signer_name text, message text, idempotent boolean, already_decided boolean)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_link public.commercial_proposal_public_links%rowtype;
  v_proposal public.commercial_proposals%rowtype;
  v_version public.commercial_proposal_versions%rowtype;
  v_existing public.commercial_proposal_decisions%rowtype;
  v_decision public.commercial_proposal_decisions%rowtype;
  v_public_payload jsonb;
  v_public_payload_hash text;
  v_decision_payload_hash text;
  v_now timestamptz := now();
  v_name text := btrim(nullif(p_signer_name, ''));
  v_email text := lower(btrim(nullif(p_signer_email, '')));
  v_document text := nullif(btrim(p_signer_document_last4), '');
  v_role text := btrim(nullif(p_signer_role, ''));
  v_company text := btrim(nullif(p_company_name, ''));
  v_reason text := btrim(nullif(p_rejection_reason, ''));
  v_expected_consent text;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key_hash is null or p_idempotency_key_hash !~ '^[0-9a-f]{64}$' or p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'PROPOSAL_DECISION_VALIDATION_ERROR' using errcode = '22023';
  end if;
  if p_decision_type = 'accepted' then
    v_expected_consent := 'Declaro que li e compreendi esta proposta comercial e confirmo minha decisao em relacao a versao apresentada. Concordo com os servicos, valores e condicoes comerciais apresentados.';
  else
    v_expected_consent := 'Declaro que li e compreendi esta proposta comercial e confirmo minha decisao em relacao a versao apresentada. Confirmo que nao desejo aceitar esta proposta nas condicoes apresentadas.';
  end if;
  if p_consent_text_version <> '2026-07-31.v1' or p_consent_text_snapshot <> v_expected_consent then
    raise exception 'PROPOSAL_DECISION_VALIDATION_ERROR' using errcode = '22023';
  end if;
  if v_name is null or char_length(v_name) > 500 or (v_email is not null and (char_length(v_email) > 320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) or (v_document is not null and v_document !~ '^[0-9]{4}$') or (v_role is not null and char_length(v_role) > 200) or (v_company is not null and char_length(v_company) > 500) or (v_reason is not null and (char_length(v_reason) > 1000 or v_reason ~ '[<>]')) or (p_decision_type = 'accepted' and v_reason is not null) then
    raise exception 'PROPOSAL_DECISION_VALIDATION_ERROR' using errcode = '22023';
  end if;

  select l.* into v_link from public.commercial_proposal_public_links l where l.token_hash = p_token_hash for update;
  if v_link.id is null or v_link.status <> 'active' or (v_link.expires_at is not null and v_link.expires_at <= v_now) then
    raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode = 'P0002';
  end if;

  select d.* into v_existing from public.commercial_proposal_decisions d where d.law_firm_id = v_link.law_firm_id and d.idempotency_key_hash = p_idempotency_key_hash;
  if v_existing.id is not null then
    if v_existing.request_input_hash <> p_input_hash then raise exception 'PROPOSAL_DECISION_CONFLICT' using errcode = '23505'; end if;
    return query select v_existing.id, v_existing.decision_type, v_existing.decided_at, v_existing.signer_name, case when v_existing.decision_type = 'accepted' then 'Esta proposta já foi aceita.' else 'Esta proposta já foi recusada.' end, true, true;
    return;
  end if;

  select d.* into v_existing from public.commercial_proposal_decisions d where d.proposal_id = v_link.proposal_id;
  if v_existing.id is not null then
    return query select v_existing.id, v_existing.decision_type, v_existing.decided_at, v_existing.signer_name, case when v_existing.decision_type = 'accepted' then 'Esta proposta já foi aceita.' else 'Esta proposta já foi recusada.' end, false, true;
    return;
  end if;

  select p.* into v_proposal from public.commercial_proposals p where p.id = v_link.proposal_id for update;
  select v.* into v_version from public.commercial_proposal_versions v where v.id = v_link.proposal_version_id and v.proposal_id = v_proposal.id and v.law_firm_id = v_proposal.law_firm_id;
  if v_proposal.id is null or v_version.id is null or v_proposal.status not in ('sent','viewed') or v_link.proposal_version_id <> v_proposal.active_version_id then
    raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode = 'P0002';
  end if;
  select public_payload into v_public_payload from public.get_public_commercial_proposal(p_token_hash) limit 1;
  if v_public_payload is null then raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode = 'P0002'; end if;
  v_public_payload_hash := encode(extensions.digest(convert_to(v_public_payload::text, 'utf8'), 'sha256'), 'hex');
  v_decision_payload_hash := encode(extensions.digest(convert_to(jsonb_build_object('decisionType', p_decision_type::text, 'signerName', v_name, 'signerEmail', v_email, 'signerDocumentLast4', v_document, 'signerRole', v_role, 'companyName', v_company, 'rejectionReason', v_reason, 'consentTextVersion', p_consent_text_version, 'consentTextSnapshot', p_consent_text_snapshot, 'proposalId', v_proposal.id, 'proposalVersionId', v_version.id, 'proposalContentHash', v_version.content_hash, 'publicPayloadHash', v_public_payload_hash, 'requestInputHash', p_input_hash)::text, 'utf8'), 'sha256'), 'hex');
  insert into public.commercial_proposal_decisions(law_firm_id, proposal_id, proposal_version_id, public_link_id, decision_type, signer_name, signer_email, signer_document_last4, signer_role, company_name, rejection_reason, consent_text_version, consent_text_snapshot, proposal_content_hash, public_payload_hash, decision_payload_hash, request_input_hash, decided_at, metadata, idempotency_key_hash)
  values(v_proposal.law_firm_id, v_proposal.id, v_version.id, v_link.id, p_decision_type, v_name, v_email, v_document, v_role, v_company, v_reason, p_consent_text_version, p_consent_text_snapshot, v_version.content_hash, v_public_payload_hash, v_decision_payload_hash, p_input_hash, v_now, jsonb_build_object('locale','pt-BR','actorType','public_recipient'), p_idempotency_key_hash)
  returning * into v_decision;
  update public.commercial_proposals set status = case when p_decision_type = 'accepted' then 'accepted' else 'rejected' end, accepted_at = case when p_decision_type = 'accepted' then v_now else accepted_at end, rejected_at = case when p_decision_type = 'rejected' then v_now else rejected_at end where id = v_proposal.id;
  insert into public.commercial_proposal_events(law_firm_id, proposal_id, proposal_version_id, actor_id, event_type, metadata) values(v_proposal.law_firm_id, v_proposal.id, v_version.id, null, case when p_decision_type = 'accepted' then 'proposal_accepted' else 'proposal_rejected' end, jsonb_build_object('decisionId', v_decision.id, 'proposalVersionId', v_version.id, 'decisionType', p_decision_type::text, 'consentTextVersion', p_consent_text_version, 'actorType', 'public_recipient'));
  return query select v_decision.id, v_decision.decision_type, v_decision.decided_at, v_decision.signer_name, case when p_decision_type = 'accepted' then 'Proposta aceita com sucesso.' else 'Recusa registrada com sucesso.' end, false, false;
exception when unique_violation then
  select d.* into v_existing from public.commercial_proposal_decisions d where d.law_firm_id = v_link.law_firm_id and d.idempotency_key_hash = p_idempotency_key_hash;
  if v_existing.id is not null and v_existing.request_input_hash = p_input_hash then return query select v_existing.id, v_existing.decision_type, v_existing.decided_at, v_existing.signer_name, case when v_existing.decision_type = 'accepted' then 'Esta proposta já foi aceita.' else 'Esta proposta já foi recusada.' end, true, true; return; end if;
  raise exception 'PROPOSAL_DECISION_CONFLICT' using errcode = '23505';
end $$;

create or replace function public.get_commercial_proposal_decision_secure(p_proposal_id uuid)
returns table(decision_id uuid, proposal_id uuid, proposal_version_id uuid, public_link_id uuid, decision_type public.commercial_proposal_decision_type, signer_name text, signer_email text, signer_document_last4 text, signer_role text, company_name text, rejection_reason text, consent_text_version text, consent_text_snapshot text, proposal_content_hash text, public_payload_hash text, decision_payload_hash text, decided_at timestamptz, created_at timestamptz, metadata jsonb, member_role public.member_role)
language sql stable security definer set search_path = public as $$
  select d.id,d.proposal_id,d.proposal_version_id,d.public_link_id,d.decision_type,d.signer_name,
    case when m.role in ('proprietario','administrador','advogado') then d.signer_email else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.signer_document_last4 else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.signer_role else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.company_name else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.rejection_reason else null end,
    d.consent_text_version,d.consent_text_snapshot,d.proposal_content_hash,d.public_payload_hash,d.decision_payload_hash,d.decided_at,d.created_at,d.metadata,m.role
  from public.commercial_proposal_decisions d join public.law_firm_members m on m.law_firm_id=d.law_firm_id and m.user_id=auth.uid() and m.status='ativo' and m.role in ('proprietario','administrador','advogado','assistente','colaborador')
  where d.proposal_id=p_proposal_id limit 1
$$;

create or replace function public.get_commercial_proposal_decision_receipt_secure(p_decision_id uuid)
returns table(decision_id uuid, proposal_id uuid, proposal_version_id uuid, public_link_id uuid, decision_type public.commercial_proposal_decision_type, proposal_title text, proposal_currency char(3), total_cents bigint, entry_amount_cents bigint, installment_count integer, installment_amount_cents bigint, recurring_amount_cents bigint, recurring_months integer, success_fee_bps integer, valid_until timestamptz, signer_name text, signer_email text, signer_document_last4 text, signer_role text, company_name text, rejection_reason text, consent_text_version text, consent_text_snapshot text, proposal_content_hash text, public_payload_hash text, decision_payload_hash text, decided_at timestamptz, link_status text)
language sql stable security definer set search_path = public as $$
  select d.id,d.proposal_id,d.proposal_version_id,d.public_link_id,d.decision_type,v.title,v.currency,v.total_cents,v.entry_amount_cents,v.installment_count,v.installment_amount_cents,v.recurring_amount_cents,v.recurring_months,v.success_fee_bps,p.valid_until,d.signer_name,
    case when m.role in ('proprietario','administrador','advogado') then d.signer_email else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.signer_document_last4 else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.signer_role else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.company_name else null end,
    case when m.role in ('proprietario','administrador','advogado') then d.rejection_reason else null end,
    d.consent_text_version,d.consent_text_snapshot,d.proposal_content_hash,d.public_payload_hash,d.decision_payload_hash,d.decided_at,l.status
  from public.commercial_proposal_decisions d join public.commercial_proposals p on p.id=d.proposal_id join public.commercial_proposal_versions v on v.id=d.proposal_version_id join public.commercial_proposal_public_links l on l.id=d.public_link_id join public.law_firm_members m on m.law_firm_id=d.law_firm_id and m.user_id=auth.uid() and m.status='ativo' and m.role in ('proprietario','administrador','advogado','assistente','colaborador')
  where d.id=p_decision_id limit 1
$$;

create or replace function public.can_commercial_proposal_receive_decision(p_proposal_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.commercial_proposals p where p.id=p_proposal_id and p.status in ('sent','viewed') and p.active_version_id is not null and not exists(select 1 from public.commercial_proposal_decisions d where d.proposal_id=p.id))
$$;

create or replace function public.assert_commercial_proposal_decision_allowed(p_proposal_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_commercial_proposal_receive_decision(p_proposal_id) then raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode='P0002'; end if;
end $$;

-- Reexpose only a sanitized public payload. Internal pricing and decision hashes remain server-side.
create or replace function public.get_public_commercial_proposal(p_token_hash text)
returns table(public_payload jsonb)
language plpgsql stable security definer set search_path = public as $$
declare v_link public.commercial_proposal_public_links%rowtype; v_payload jsonb;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return; end if;
  select l.* into v_link from public.commercial_proposal_public_links l where l.token_hash=p_token_hash and l.status='active' and (l.expires_at is null or l.expires_at > now());
  if v_link.id is null then return; end if;
  select jsonb_build_object(
    'officeName',lf.name,'logoPath',case when lf.logo_path like 'https://%' then lf.logo_path else null end,'title',v.title,'recipientName',coalesce((select r.name from public.commercial_proposal_recipients r where r.proposal_id=p.id and r.is_primary order by r.created_at limit 1),'Destinatario'),'status',p.status::text,'validUntil',p.valid_until,'validityDays',v.validity_days,'introduction',v.introduction,'conclusion',v.conclusion,'currency',v.currency,'subtotalCents',v.subtotal_cents,'discountCents',v.discount_cents,'totalCents',v.total_cents,'entryAmountCents',v.entry_amount_cents,'installmentCount',v.installment_count,'installmentAmountCents',v.installment_amount_cents,'recurringAmountCents',v.recurring_amount_cents,'recurringMonths',v.recurring_months,'successFeeBps',v.success_fee_bps,'paymentTerms',jsonb_build_object('method',coalesce(v.payment_terms_json->>'method',''),'description',coalesce(v.payment_terms_json->>'description','')),'sections',coalesce((select jsonb_agg(jsonb_build_object('type',s.section_type,'title',s.title,'body',s.body_markdown) order by s.order_index) from public.commercial_proposal_sections s where s.proposal_version_id=v.id),'[]'::jsonb),'items',coalesce((select jsonb_agg(jsonb_build_object('type',i.item_type,'description',i.description,'quantity',i.quantity,'unitAmountCents',i.unit_amount_cents,'totalAmountCents',i.total_amount_cents) order by i.order_index) from public.commercial_proposal_items i where i.proposal_version_id=v.id and i.is_included),'[]'::jsonb),'decision',case when d.id is null then null else jsonb_build_object('type',d.decision_type::text,'decidedAt',d.decided_at,'signerName',d.signer_name,'message',case when d.decision_type='accepted' then 'Esta proposta já foi aceita.' else 'Esta proposta já foi recusada.' end) end
  ) into v_payload from public.commercial_proposals p join public.law_firms lf on lf.id=p.law_firm_id join public.commercial_proposal_versions v on v.id=v_link.proposal_version_id and v.proposal_id=p.id left join public.commercial_proposal_decisions d on d.proposal_id=p.id where p.id=v_link.proposal_id and p.status in ('sent','viewed','accepted','rejected');
  if v_payload is not null then return query select v_payload; end if;
end $$;

revoke all on function public.decide_public_commercial_proposal(text,public.commercial_proposal_decision_type,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.decide_public_commercial_proposal(text,public.commercial_proposal_decision_type,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
revoke all on function public.get_commercial_proposal_decision_secure(uuid), public.get_commercial_proposal_decision_receipt_secure(uuid), public.can_commercial_proposal_receive_decision(uuid), public.assert_commercial_proposal_decision_allowed(uuid) from public, anon;
grant execute on function public.get_commercial_proposal_decision_secure(uuid), public.get_commercial_proposal_decision_receipt_secure(uuid), public.can_commercial_proposal_receive_decision(uuid), public.assert_commercial_proposal_decision_allowed(uuid) to authenticated;
