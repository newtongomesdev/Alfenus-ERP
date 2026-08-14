-- Corrige a atribuicao do status enum no RPC publico de decisao.
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
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' or p_idempotency_key_hash is null or p_idempotency_key_hash !~ '^[0-9a-f]{64}$' or p_input_hash is null or p_input_hash !~ '^[0-9a-f]{64}$' then raise exception 'PROPOSAL_DECISION_VALIDATION_ERROR' using errcode = '22023'; end if;
  if p_decision_type = 'accepted' then v_expected_consent := 'Declaro que li e compreendi esta proposta comercial e confirmo minha decisao em relacao a versao apresentada. Concordo com os servicos, valores e condicoes comerciais apresentados.'; else v_expected_consent := 'Declaro que li e compreendi esta proposta comercial e confirmo minha decisao em relacao a versao apresentada. Confirmo que nao desejo aceitar esta proposta nas condicoes apresentadas.'; end if;
  if p_consent_text_version <> '2026-07-31.v1' or p_consent_text_snapshot <> v_expected_consent then raise exception 'PROPOSAL_DECISION_VALIDATION_ERROR' using errcode = '22023'; end if;
  if v_name is null or char_length(v_name) > 500 or (v_email is not null and (char_length(v_email) > 320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')) or (v_document is not null and v_document !~ '^[0-9]{4}$') or (v_role is not null and char_length(v_role) > 200) or (v_company is not null and char_length(v_company) > 500) or (v_reason is not null and (char_length(v_reason) > 1000 or v_reason ~ '[<>]')) or (p_decision_type = 'accepted' and v_reason is not null) then raise exception 'PROPOSAL_DECISION_VALIDATION_ERROR' using errcode = '22023'; end if;
  select l.* into v_link from public.commercial_proposal_public_links l where l.token_hash = p_token_hash for update;
  if v_link.id is null or v_link.status <> 'active' or (v_link.expires_at is not null and v_link.expires_at <= v_now) then raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode = 'P0002'; end if;
  select d.* into v_existing from public.commercial_proposal_decisions d where d.law_firm_id = v_link.law_firm_id and d.idempotency_key_hash = p_idempotency_key_hash;
  if v_existing.id is not null then
    if v_existing.request_input_hash <> p_input_hash then raise exception 'PROPOSAL_DECISION_CONFLICT' using errcode = '23505'; end if;
    return query select v_existing.id, v_existing.decision_type, v_existing.decided_at, v_existing.signer_name, case when v_existing.decision_type = 'accepted' then 'Esta proposta ja foi aceita.' else 'Esta proposta ja foi recusada.' end, true, true;
    return;
  end if;
  select d.* into v_existing from public.commercial_proposal_decisions d where d.proposal_id = v_link.proposal_id;
  if v_existing.id is not null then return query select v_existing.id, v_existing.decision_type, v_existing.decided_at, v_existing.signer_name, case when v_existing.decision_type = 'accepted' then 'Esta proposta ja foi aceita.' else 'Esta proposta ja foi recusada.' end, false, true; return; end if;
  select p.* into v_proposal from public.commercial_proposals p where p.id = v_link.proposal_id for update;
  select v.* into v_version from public.commercial_proposal_versions v where v.id = v_link.proposal_version_id and v.proposal_id = v_proposal.id and v.law_firm_id = v_proposal.law_firm_id;
  if v_proposal.id is null or v_version.id is null or v_proposal.status not in ('sent','viewed') or v_link.proposal_version_id <> v_proposal.active_version_id then raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode = 'P0002'; end if;
  select public_payload into v_public_payload from public.get_public_commercial_proposal(p_token_hash) limit 1;
  if v_public_payload is null then raise exception 'PROPOSAL_DECISION_UNAVAILABLE' using errcode = 'P0002'; end if;
  v_public_payload_hash := encode(extensions.digest(convert_to(v_public_payload::text, 'utf8'), 'sha256'), 'hex');
  v_decision_payload_hash := encode(extensions.digest(convert_to(jsonb_build_object('decisionType', p_decision_type::text, 'signerName', v_name, 'signerEmail', v_email, 'signerDocumentLast4', v_document, 'signerRole', v_role, 'companyName', v_company, 'rejectionReason', v_reason, 'consentTextVersion', p_consent_text_version, 'consentTextSnapshot', p_consent_text_snapshot, 'proposalId', v_proposal.id, 'proposalVersionId', v_version.id, 'proposalContentHash', v_version.content_hash, 'publicPayloadHash', v_public_payload_hash, 'requestInputHash', p_input_hash)::text, 'utf8'), 'sha256'), 'hex');
  insert into public.commercial_proposal_decisions(law_firm_id, proposal_id, proposal_version_id, public_link_id, decision_type, signer_name, signer_email, signer_document_last4, signer_role, company_name, rejection_reason, consent_text_version, consent_text_snapshot, proposal_content_hash, public_payload_hash, decision_payload_hash, request_input_hash, decided_at, metadata, idempotency_key_hash) values(v_proposal.law_firm_id, v_proposal.id, v_version.id, v_link.id, p_decision_type, v_name, v_email, v_document, v_role, v_company, v_reason, p_consent_text_version, p_consent_text_snapshot, v_version.content_hash, v_public_payload_hash, v_decision_payload_hash, p_input_hash, v_now, jsonb_build_object('locale','pt-BR','actorType','public_recipient'), p_idempotency_key_hash) returning * into v_decision;
  update public.commercial_proposals set status = (case when p_decision_type = 'accepted' then 'accepted' else 'rejected' end)::public.proposal_status, accepted_at = case when p_decision_type = 'accepted' then v_now else accepted_at end, rejected_at = case when p_decision_type = 'rejected' then v_now else rejected_at end where id = v_proposal.id;
  insert into public.commercial_proposal_events(law_firm_id, proposal_id, proposal_version_id, actor_id, event_type, metadata) values(v_proposal.law_firm_id, v_proposal.id, v_version.id, null, case when p_decision_type = 'accepted' then 'proposal_accepted' else 'proposal_rejected' end, jsonb_build_object('decisionId', v_decision.id, 'proposalVersionId', v_version.id, 'decisionType', p_decision_type::text, 'consentTextVersion', p_consent_text_version, 'actorType', 'public_recipient'));
  return query select v_decision.id, v_decision.decision_type, v_decision.decided_at, v_decision.signer_name, case when p_decision_type = 'accepted' then 'Proposta aceita com sucesso.' else 'Recusa registrada com sucesso.' end, false, false;
exception when unique_violation then
  select d.* into v_existing from public.commercial_proposal_decisions d where d.law_firm_id = v_link.law_firm_id and d.idempotency_key_hash = p_idempotency_key_hash;
  if v_existing.id is not null and v_existing.request_input_hash = p_input_hash then return query select v_existing.id, v_existing.decision_type, v_existing.decided_at, v_existing.signer_name, case when v_existing.decision_type = 'accepted' then 'Esta proposta ja foi aceita.' else 'Esta proposta ja foi recusada.' end, true, true; return; end if;
  raise exception 'PROPOSAL_DECISION_CONFLICT' using errcode = '23505';
end $$;

revoke all on function public.decide_public_commercial_proposal(text,public.commercial_proposal_decision_type,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.decide_public_commercial_proposal(text,public.commercial_proposal_decision_type,text,text,text,text,text,text,text,text,text,text) to anon, authenticated;
