-- Adiciona coluna checklist nos processos (consistente com tasks/deadlines)
alter table public.legal_cases
  add column if not exists checklist jsonb not null default '[]'::jsonb;

-- Tabela de templates de checklist para processos
create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'geral',
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS na tabela de templates
alter table public.checklist_templates enable row level security;

create policy "checklist_templates_tenant_access"
  on public.checklist_templates
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

-- Índice para busca rápida por tenant
create index if not exists idx_checklist_templates_law_firm
  on public.checklist_templates(law_firm_id);

-- Adiciona coluna tags nos templates de workflow se não existir
-- (já existe, não precisa)
