-- Delivery metadata is restricted to roles that can operate signature envelopes.
drop policy if exists contract_signature_provider_deliveries_select on public.contract_signature_provider_deliveries;
create policy contract_signature_provider_deliveries_select on public.contract_signature_provider_deliveries
for select to authenticated
using (
  public.has_law_firm_access(law_firm_id)
  and exists (
    select 1 from public.law_firm_members m
    where m.user_id = auth.uid()
      and m.law_firm_id = contract_signature_provider_deliveries.law_firm_id
      and m.status = 'ativo'
      and m.role in ('proprietario','administrador','advogado')
  )
);
