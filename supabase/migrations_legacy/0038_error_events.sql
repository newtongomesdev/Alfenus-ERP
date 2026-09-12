-- Observabilidade de erros de producao sem armazenar cookies, tokens ou query strings.
create table if not exists public.error_events (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('server', 'client')),
  message text not null,
  digest text,
  path text not null,
  method text,
  route_path text,
  router_kind text,
  route_type text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists error_events_created_at_idx on public.error_events(created_at desc);
create index if not exists error_events_path_idx on public.error_events(path, created_at desc);
alter table public.error_events enable row level security;

-- Somente o service role usado pela instrumentacao insere/consulta os eventos.
-- Nenhuma policy para usuarios comuns evita vazamento de diagnosticos internos.
