-- Permite cleanup administrativo confiavel sem liberar DML para usuarios da aplicacao.
create or replace function public.block_commercial_proposal_history_mutation() returns trigger
language plpgsql security invoker as $$
begin
  if current_user in ('service_role', 'postgres') then return coalesce(new, old); end if;
  raise exception 'commercial_proposal_history_immutable' using errcode = '42501';
end $$;
