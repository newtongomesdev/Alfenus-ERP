-- Definição de campos personalizados
create table if not exists public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  entity_type text not null check (entity_type in ('client', 'lead', 'legal_case')),
  label text not null,
  field_type text not null default 'text' check (field_type in ('text', 'number', 'date', 'select', 'boolean')),
  options jsonb,
  required boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Valores dos campos personalizados
create table if not exists public.custom_field_values (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  custom_field_id uuid not null references public.custom_fields(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(law_firm_id, custom_field_id, entity_id)
);

-- RLS
alter table public.custom_fields enable row level security;
alter table public.custom_field_values enable row level security;

create policy "custom_fields_tenant_access"
  on public.custom_fields
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

create policy "custom_field_values_tenant_access"
  on public.custom_field_values
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

create index if not exists idx_custom_fields_entity
  on public.custom_fields(law_firm_id, entity_type);
create index if not exists idx_custom_field_values_entity
  on public.custom_field_values(law_firm_id, entity_type, entity_id);
