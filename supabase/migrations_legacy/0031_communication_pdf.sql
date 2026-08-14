-- Comunicação e PDF: mensagens internas, threads e anexos.

-- ──────────────────────────────────────────────
-- 1. communications — Comunicações
-- ──────────────────────────────────────────────

create table if not exists public.communications (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  sender_member_id uuid not null,

  subject text not null,
  content text not null,

  communication_type text not null default 'mensagem_interna'
    check (communication_type in (
      'mensagem_interna','mensagem_cliente','comunicado','reuniao',
      'ligacao','carta','correspondencia','anotacao','atualizacao_processo'
    )),

  visibility text not null default 'equipe'
    check (visibility in ('privada','equipe','cliente','participantes')),

  channel text default 'interno'
    check (channel in ('interno','portal','email','whatsapp')),

  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,
  contract_request_id uuid references public.contract_requests(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,

  thread_id uuid references public.communications(id) on delete set null,
  parent_id uuid references public.communications(id) on delete set null,

  is_pinned boolean default false,
  read_by jsonb default '[]'::jsonb,

  status text not null default 'enviada'
    check (status in ('rascunho','enviada','lida','arquivada')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. communication_threads — Threads
-- ──────────────────────────────────────────────

create table if not exists public.communication_threads (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  title text not null,
  subject text,

  client_id uuid references public.clients(id) on delete set null,
  legal_case_id uuid references public.legal_cases(id) on delete set null,

  created_by uuid not null,
  last_message_at timestamptz,
  message_count integer default 0,
  is_archived boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. communication_attachments — Anexos
-- ──────────────────────────────────────────────

create table if not exists public.communication_attachments (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  communication_id uuid not null references public.communications(id) on delete cascade,

  file_name text not null,
  file_size integer,
  mime_type text,
  storage_path text not null,
  uploaded_by uuid not null,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger communications_set_updated_at
  before update on public.communications
  for each row execute function public.set_updated_at();

create trigger communication_threads_set_updated_at
  before update on public.communication_threads
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 5. Indexes
-- ──────────────────────────────────────────────

-- communications
create index if not exists communications_law_firm_idx
  on public.communications(law_firm_id);

create index if not exists communications_thread_idx
  on public.communications(thread_id)
  where thread_id is not null;

create index if not exists communications_parent_idx
  on public.communications(parent_id)
  where parent_id is not null;

create index if not exists communications_type_idx
  on public.communications(communication_type);

create index if not exists communications_client_idx
  on public.communications(client_id)
  where client_id is not null;

create index if not exists communications_created_at_idx
  on public.communications(created_at);

create index if not exists communications_law_firm_status_idx
  on public.communications(law_firm_id, status);

-- communication_threads
create index if not exists communication_threads_law_firm_idx
  on public.communication_threads(law_firm_id);

create index if not exists communication_threads_client_idx
  on public.communication_threads(client_id)
  where client_id is not null;

create index if not exists communication_threads_created_at_idx
  on public.communication_threads(created_at);

-- communication_attachments
create index if not exists communication_attachments_law_firm_idx
  on public.communication_attachments(law_firm_id);

create index if not exists communication_attachments_communication_idx
  on public.communication_attachments(communication_id);

-- ──────────────────────────────────────────────
-- 6. Row Level Security
-- ──────────────────────────────────────────────

alter table public.communications enable row level security;
alter table public.communication_threads enable row level security;
alter table public.communication_attachments enable row level security;

-- communications
create policy communications_select on public.communications
  for select using (public.has_law_firm_access(law_firm_id));

create policy communications_insert on public.communications
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy communications_update on public.communications
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy communications_delete on public.communications
  for delete using (public.has_law_firm_access(law_firm_id));

-- communication_threads
create policy communication_threads_select on public.communication_threads
  for select using (public.has_law_firm_access(law_firm_id));

create policy communication_threads_insert on public.communication_threads
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy communication_threads_update on public.communication_threads
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy communication_threads_delete on public.communication_threads
  for delete using (public.has_law_firm_access(law_firm_id));

-- communication_attachments
create policy communication_attachments_select on public.communication_attachments
  for select using (public.has_law_firm_access(law_firm_id));

create policy communication_attachments_insert on public.communication_attachments
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy communication_attachments_update on public.communication_attachments
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy communication_attachments_delete on public.communication_attachments
  for delete using (public.has_law_firm_access(law_firm_id));
