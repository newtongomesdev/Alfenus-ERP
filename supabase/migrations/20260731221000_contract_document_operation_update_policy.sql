create policy contract_document_operations_update on public.contract_document_operations
  for update to authenticated
  using (
    public.has_law_firm_access(law_firm_id)
    and exists (select 1 from public.law_firm_members m where m.user_id=auth.uid() and m.law_firm_id=law_firm_id and m.status='ativo' and m.role in ('proprietario','administrador','advogado'))
    and not public.is_active_assisted_support_session(law_firm_id)
  )
  with check (public.has_law_firm_access(law_firm_id));
