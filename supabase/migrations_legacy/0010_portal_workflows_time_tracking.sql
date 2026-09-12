-- 0010_portal_workflows_time_tracking.sql
-- Portal do cliente, templates de workflow, controle de horas,
-- exportacao de calendario e conflict check basico.

create table if not exists public.client_portal_invites (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  token text not null unique,
  email text,
  status text not null default 'ativo' check (status in ('ativo', 'revogado', 'expirado')),
  expires_at timestamptz,
  last_access_at timestamptz,
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  description text,
  practice_area text,
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_template_items (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  template_id uuid not null references public.workflow_templates(id) on delete cascade,
  item_type text not null check (item_type in ('task', 'deadline')),
  title text not null,
  description text,
  offset_days integer not null default 0,
  priority text not null default 'normal',
  responsible_role text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  member_id uuid not null references public.law_firm_members(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  description text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes integer not null check (duration_minutes > 0),
  hourly_rate_cents integer not null default 0 check (hourly_rate_cents >= 0),
  billable boolean not null default true,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovado', 'faturado', 'cancelado')),
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_portal_invites_law_firm_client_idx on public.client_portal_invites(law_firm_id, client_id);
create index if not exists workflow_templates_law_firm_status_idx on public.workflow_templates(law_firm_id, status);
create index if not exists workflow_template_items_template_idx on public.workflow_template_items(template_id, sort_order);
create index if not exists time_entries_law_firm_started_idx on public.time_entries(law_firm_id, started_at desc);
create index if not exists time_entries_case_idx on public.time_entries(law_firm_id, legal_case_id);

drop trigger if exists workflow_templates_set_updated_at on public.workflow_templates;
create trigger workflow_templates_set_updated_at before update on public.workflow_templates for each row execute function public.set_updated_at();

drop trigger if exists time_entries_set_updated_at on public.time_entries;
create trigger time_entries_set_updated_at before update on public.time_entries for each row execute function public.set_updated_at();

alter table public.client_portal_invites enable row level security;
alter table public.workflow_templates enable row level security;
alter table public.workflow_template_items enable row level security;
alter table public.time_entries enable row level security;

drop policy if exists "tenant access client portal invites" on public.client_portal_invites;
create policy "tenant access client portal invites"
  on public.client_portal_invites
  for all
  using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]));

drop policy if exists "tenant access workflow templates" on public.workflow_templates;
create policy "tenant access workflow templates"
  on public.workflow_templates
  for all
  using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]));

drop policy if exists "tenant access workflow template items" on public.workflow_template_items;
create policy "tenant access workflow template items"
  on public.workflow_template_items
  for all
  using (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]))
  with check (public.has_law_firm_role(law_firm_id, array['proprietario','administrador','advogado','assistente']::public.member_role[]));

drop policy if exists "tenant access time entries" on public.time_entries;
create policy "tenant access time entries"
  on public.time_entries
  for all
  using (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])
    or member_id in (select id from public.law_firm_members where user_id = auth.uid() and law_firm_id = time_entries.law_firm_id and status = 'ativo')
  )
  with check (
    public.has_law_firm_role(law_firm_id, array['proprietario','administrador','financeiro']::public.member_role[])
    or member_id in (select id from public.law_firm_members where user_id = auth.uid() and law_firm_id = time_entries.law_firm_id and status = 'ativo')
  );

insert into public.workflow_templates (law_firm_id, name, description, practice_area, created_by)
select lf.id, 'Processo judicial padrao', 'Cria tarefas e prazos iniciais para um novo processo judicial.', 'contencioso', lfm.id
from public.law_firms lf
join public.law_firm_members lfm on lfm.law_firm_id = lf.id and lfm.role = 'proprietario'
where not exists (
  select 1 from public.workflow_templates wt where wt.law_firm_id = lf.id and wt.name = 'Processo judicial padrao'
);

insert into public.workflow_template_items (law_firm_id, template_id, item_type, title, description, offset_days, priority, sort_order)
select wt.law_firm_id, wt.id, seed.item_type, seed.title, seed.description, seed.offset_days, seed.priority, seed.sort_order
from public.workflow_templates wt
cross join (values
  ('task', 'Conferir documentos iniciais', 'Validar procuração, documentos pessoais e provas enviadas pelo cliente.', 0, 'alta', 10),
  ('task', 'Definir tese e estratégia', 'Registrar tese principal, riscos e próximos passos do caso.', 2, 'alta', 20),
  ('deadline', 'Prazo interno de revisão inicial', 'Revisão do responsável antes de qualquer protocolo.', 5, 'normal', 30),
  ('task', 'Preparar minuta da peça', 'Criar primeira minuta da petição ou manifestação.', 7, 'normal', 40)
) as seed(item_type, title, description, offset_days, priority, sort_order)
where wt.name = 'Processo judicial padrao'
  and not exists (
    select 1 from public.workflow_template_items wti
    where wti.template_id = wt.id and wti.title = seed.title
  );

create or replace function public.delete_my_account_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  member_ids uuid[];
  document_paths text[];
begin
  if current_user_id is null then
    raise exception 'Usuário não autenticado.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into member_ids
  from public.law_firm_members
  where user_id = current_user_id;

  if cardinality(member_ids) = 0 then
    return jsonb_build_object('storage_paths', '[]'::jsonb);
  end if;

  select coalesce(array_agg(storage_path), '{}'::text[])
    into document_paths
  from public.documents
  where uploaded_by = any(member_ids);

  delete from public.time_entries where member_id = any(member_ids);
  delete from public.legal_case_collaborators where member_id = any(member_ids);
  delete from public.notifications where member_id = any(member_ids);
  delete from public.documents where uploaded_by = any(member_ids);

  update public.clients set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.leads set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.legal_cases set main_responsible_id = null where main_responsible_id = any(member_ids);
  update public.contracts set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.expenses set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.deadlines set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.tasks set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.appointments set responsible_member_id = null where responsible_member_id = any(member_ids);
  update public.payments set registered_by = null where registered_by = any(member_ids);
  update public.legal_case_movements set created_by = null where created_by = any(member_ids);
  update public.privacy_requests set handled_by = null where handled_by = any(member_ids);
  update public.team_invitations set invited_by = null where invited_by = any(member_ids);
  update public.client_portal_invites set created_by = null where created_by = any(member_ids);
  update public.workflow_templates set created_by = null where created_by = any(member_ids);
  update public.time_entries set created_by = null where created_by = any(member_ids);
  update public.audit_logs set actor_id = null where actor_id = any(member_ids);

  update public.deadlines
    set participant_ids = array(select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids))
    where participant_ids && member_ids;
  update public.tasks
    set participant_ids = array(select participant_id from unnest(participant_ids) as participant_id where participant_id <> all(member_ids))
    where participant_ids && member_ids;

  delete from public.privacy_consents where user_id = current_user_id;
  delete from public.law_firm_members where user_id = current_user_id;

  return jsonb_build_object('storage_paths', to_jsonb(coalesce(document_paths, '{}'::text[])));
end;
$$;

revoke all on function public.delete_my_account_data() from public;
grant execute on function public.delete_my_account_data() to authenticated;
