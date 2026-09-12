create extension if not exists vector with schema extensions;

create table if not exists public.ai_platform_settings (
  id text primary key default 'default',
  active_model text not null default 'openai/gpt-4o-mini',
  embedding_model text not null default 'openai/text-embedding-3-small',
  enabled boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.ai_platform_settings (id) values ('default') on conflict (id) do nothing;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid references public.law_firms(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  operation text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(18, 10) not null default 0,
  generation_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_document_chunks (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  legal_case_id uuid references public.legal_cases(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists ai_document_chunks_tenant_idx on public.ai_document_chunks(law_firm_id);
create index if not exists ai_document_chunks_embedding_idx on public.ai_document_chunks using hnsw (embedding vector_cosine_ops);

create or replace function public.match_ai_document_chunks(
  query_law_firm_id uuid,
  query_embedding extensions.vector(1536),
  match_count integer default 8
)
returns table (id uuid, content text, metadata jsonb, similarity double precision)
language sql stable security invoker set search_path = public, extensions
as $$
  select c.id, c.content, c.metadata, 1 - (c.embedding <=> query_embedding) as similarity
  from public.ai_document_chunks c
  where c.law_firm_id = query_law_firm_id and c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.ai_platform_settings enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_document_chunks enable row level security;
create policy ai_settings_admin on public.ai_platform_settings for all using (public.is_superadmin()) with check (public.is_superadmin());
create policy ai_usage_tenant_select on public.ai_usage_logs for select using (law_firm_id is null or public.has_law_firm_access(law_firm_id) or public.is_superadmin());
create policy ai_chunks_tenant_select on public.ai_document_chunks for select using (public.has_law_firm_access(law_firm_id));
create policy ai_chunks_tenant_write on public.ai_document_chunks for all using (public.has_law_firm_access(law_firm_id)) with check (public.has_law_firm_access(law_firm_id));
