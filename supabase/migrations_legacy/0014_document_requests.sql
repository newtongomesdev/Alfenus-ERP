-- Tabela de solicitações de documentos
create table if not exists public.document_requests (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  client_id uuid references public.clients(id),
  legal_case_id uuid references public.legal_cases(id),
  requested_by uuid not null references public.law_firm_members(id),
  title text not null,
  description text,
  document_type text not null default 'outro',
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido', 'cancelado')),
  priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  due_date date,
  completed_at timestamptz,
  document_id uuid references public.documents(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table public.document_requests enable row level security;

create policy "document_requests_tenant_access"
  on public.document_requests
  for all
  using (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid)
  with check (law_firm_id = (auth.jwt() ->> 'law_firm_id')::uuid);

-- Índices
create index if not exists idx_document_requests_law_firm
  on public.document_requests(law_firm_id);
create index if not exists idx_document_requests_status
  on public.document_requests(status);
create index if not exists idx_document_requests_client
  on public.document_requests(client_id);
