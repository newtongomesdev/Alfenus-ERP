create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'geral',
  content text not null,
  created_by uuid references public.law_firm_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists document_templates_law_firm_idx on public.document_templates(law_firm_id, category) where archived_at is null;
create trigger document_templates_set_updated_at before update on public.document_templates for each row execute function public.set_updated_at();
alter table public.document_templates enable row level security;
create policy document_templates_select on public.document_templates for select using (public.has_law_firm_access(law_firm_id));
create policy document_templates_write on public.document_templates for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
