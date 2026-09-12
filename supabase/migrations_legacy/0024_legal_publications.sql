-- Publicacoes judiciais: diarios oficiais, intimacoes, sentencas e demais publicacoes vinculadas a processos e clientes.

-- ──────────────────────────────────────────────
-- 1. legal_publications — Publicacoes judiciais
-- ──────────────────────────────────────────────

create table if not exists public.legal_publications (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  -- Vinculacao (opcional)
  legal_case_id uuid references public.legal_cases(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,

  -- Dados da publicacao
  tribunal text not null default '',
  diario text,
  case_number text,
  disponibilized_at date,
  published_at date,
  content text,
  summary text,

  -- Classificacao
  publication_type text not null default 'despacho'
    check (publication_type in ('intimacao','despacho','decisao','sentenca','acordao','citacao','publicacao_administrativa','outro')),
  origin text not null default 'manual'
    check (origin in ('manual','csv','importacao','webhook','sistema')),

  -- Fluxo
  status text not null default 'recebida'
    check (status in ('recebida','aguardando_triagem','em_analise','aguardando_distribuicao','aguardando_calculo','aguardando_revisao','tratada','ignorada','duplicada','arquivada')),
  priority text not null default 'normal'
    check (priority in ('baixa','normal','alta','urgente')),

  -- Atribuicao
  triage_member_id uuid references public.law_firm_members(id) on delete set null,
  responsible_member_id uuid references public.law_firm_members(id) on delete set null,

  -- Prazos
  suggested_deadline date,
  confirmed_deadline date,

  -- Tratamento
  treated_at timestamptz,
  treated_by text,
  treated_by_member_id uuid references public.law_firm_members(id) on delete set null,
  ignore_reason text,

  -- Revisao
  reviewed_at timestamptz,
  reviewed_by text,
  reviewed_by_member_id uuid references public.law_firm_members(id) on delete set null,
  review_notes text,

  -- Metadados
  observations text,
  is_read boolean not null default false,
  read_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. search_vector — Coluna para busca full-text
-- ──────────────────────────────────────────────

alter table public.legal_publications add column if not exists search_vector tsvector;

-- ──────────────────────────────────────────────
-- 3. Funcao de atualizacao do search_vector
-- ──────────────────────────────────────────────

create or replace function public.update_legal_publications_search_vector()
returns trigger
language plpgsql
as $function$
begin
  new.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(new.tribunal, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.case_number, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(new.summary, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(new.content, '')), 'C');
  return new;
end;
$function$;

-- ──────────────────────────────────────────────
-- 4. Triggers
-- ──────────────────────────────────────────────

create trigger legal_publications_set_updated_at
  before update on public.legal_publications
  for each row execute function public.set_updated_at();

create trigger update_legal_publications_search_vector
  before insert or update on public.legal_publications
  for each row execute function public.update_legal_publications_search_vector();

-- ──────────────────────────────────────────────
-- 5. Indexes
-- ──────────────────────────────────────────────

create index if not exists legal_publications_law_firm_status_idx
  on public.legal_publications(law_firm_id, status);

create index if not exists legal_publications_law_firm_responsible_idx
  on public.legal_publications(law_firm_id, responsible_member_id);

create index if not exists legal_publications_case_idx
  on public.legal_publications(legal_case_id)
  where legal_case_id is not null;

create index if not exists legal_publications_client_idx
  on public.legal_publications(client_id)
  where client_id is not null;

create index if not exists legal_publications_disponibilized_idx
  on public.legal_publications(disponibilized_at)
  where disponibilized_at is not null;

create index if not exists legal_publications_search_idx
  on public.legal_publications using gin (search_vector);

-- ──────────────────────────────────────────────
-- 6. Row Level Security
-- ──────────────────────────────────────────────

alter table public.legal_publications enable row level security;

create policy legal_publications_select on public.legal_publications
  for select using (public.has_law_firm_access(law_firm_id));

create policy legal_publications_insert on public.legal_publications
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy legal_publications_update on public.legal_publications
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy legal_publications_delete on public.legal_publications
  for delete using (public.has_law_firm_access(law_firm_id));
