-- Correção da fundação: RPCs invoker precisam de INSERT explícito sob RLS.
-- Mantém o acesso tenant-aware e impede associar filhos a outra proposta/versão.
create policy commercial_proposal_sections_insert on public.commercial_proposal_sections
  for insert to authenticated with check (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[])
    and exists (select 1 from public.commercial_proposal_versions v where v.id = proposal_version_id and v.law_firm_id = commercial_proposal_sections.law_firm_id)
  );
create policy commercial_proposal_items_insert on public.commercial_proposal_items
  for insert to authenticated with check (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[])
    and exists (select 1 from public.commercial_proposal_versions v where v.id = proposal_version_id and v.law_firm_id = commercial_proposal_items.law_firm_id)
  );
create policy commercial_proposal_events_insert on public.commercial_proposal_events
  for insert to authenticated with check (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[])
    and exists (select 1 from public.commercial_proposals p where p.id = proposal_id and p.law_firm_id = commercial_proposal_events.law_firm_id)
  );
create policy commercial_proposal_idempotency_insert on public.commercial_proposal_idempotency_operations
  for insert to authenticated with check (
    actor_id = (select auth.uid())
    and public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado']::public.member_role[])
  );
