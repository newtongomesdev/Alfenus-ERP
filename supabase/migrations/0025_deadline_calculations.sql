-- Calculo de prazos processuais: calendarios legais, eventos e calculo automatico de prazos com suspensao e interrupcao.

-- ──────────────────────────────────────────────
-- 1. legal_calendars — Calendarios judiciais/legais
-- ──────────────────────────────────────────────

create table if not exists public.legal_calendars (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  country text not null default 'BR',
  state text,
  city text,
  tribunal text,
  judicial_unit text,

  calendar_type text not null default 'nacional'
    check (calendar_type in ('nacional','estadual','municipal','tribunal','judicial_unit')),

  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. calendar_events — Feriados, recessos, suspensao e indisponibilidade
-- ──────────────────────────────────────────────

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  calendar_id uuid not null references public.legal_calendars(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  event_name text not null,
  event_type text not null
    check (event_type in ('feriado','recesso','suspensao','indisponibilidade','sem_expediente')),

  start_date date not null,
  end_date date not null,

  is_recurring boolean not null default false,
  recurrence_rule text,
  description text,

  created_at timestamptz not null default now(),

  constraint calendar_events_calendar_type_start_unique
    unique (calendar_id, event_type, start_date)
);

-- ──────────────────────────────────────────────
-- 3. deadline_calculations — Calculo de prazos
-- ──────────────────────────────────────────────

create table if not exists public.deadline_calculations (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  -- Vinculacao
  deadline_id uuid references public.deadlines(id) on delete set null,
  publication_id uuid references public.legal_publications(id) on delete set null,

  -- Dados processuais
  tribunal text not null,
  jurisdition text,
  procedure_type text,
  rule_description text,

  -- Datas de referencia
  disponibilized_at timestamptz,
  published_at timestamptz,
  knowledge_at timestamptz,

  -- Parametros de calculo
  start_date date not null,
  quantity integer not null,
  unit text not null default 'dias'
    check (unit in ('dias','horas','meses','anos')),
  business_days boolean not null default true,
  include_start_date boolean not null default false,
  include_end_date boolean not null default true,

  -- Resultado
  calculated_date date,
  adjusted_date date,
  adjustment_reason text,

  -- Calendario utilizado
  calendar_id uuid references public.legal_calendars(id) on delete set null,
  holidays_considered jsonb not null default '[]'::jsonb,
  suspensions_considered jsonb not null default '[]'::jsonb,

  -- Fluxo de aprovacao
  calculated_by uuid,
  calculated_at timestamptz,
  reviewed_by uuid,
  reviewed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,

  -- Status e versionamento
  status text not null default 'rascunho'
    check (status in ('rascunho','calculado','aguardando_revisao','revisado','confirmado','substituido','cancelado')),
  version integer not null default 1,
  previous_version_id uuid references public.deadline_calculations(id) on delete set null,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger legal_calendars_set_updated_at
  before update on public.legal_calendars
  for each row execute function public.set_updated_at();

create trigger deadline_calculations_set_updated_at
  before update on public.deadline_calculations
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 5. Indexes
-- ──────────────────────────────────────────────

-- legal_calendars
create index if not exists legal_calendars_law_firm_idx
  on public.legal_calendars(law_firm_id);

create index if not exists legal_calendars_tribunal_idx
  on public.legal_calendars(tribunal)
  where tribunal is not null;

-- calendar_events
create index if not exists calendar_events_calendar_id_idx
  on public.calendar_events(calendar_id);

create index if not exists calendar_events_law_firm_idx
  on public.calendar_events(law_firm_id);

create index if not exists calendar_events_dates_idx
  on public.calendar_events(start_date, end_date);

-- deadline_calculations
create index if not exists deadline_calculations_law_firm_idx
  on public.deadline_calculations(law_firm_id);

create index if not exists deadline_calculations_status_idx
  on public.deadline_calculations(law_firm_id, status);

create index if not exists deadline_calculations_deadline_idx
  on public.deadline_calculations(deadline_id)
  where deadline_id is not null;

create index if not exists deadline_calculations_calculated_date_idx
  on public.deadline_calculations(calculated_date)
  where calculated_date is not null;

create index if not exists deadline_calculations_tribunal_idx
  on public.deadline_calculations(tribunal);

create index if not exists deadline_calculations_version_idx
  on public.deadline_calculations(deadline_id, version)
  where deadline_id is not null;

-- ──────────────────────────────────────────────
-- 6. Row Level Security
-- ──────────────────────────────────────────────

alter table public.legal_calendars enable row level security;
alter table public.calendar_events enable row level security;
alter table public.deadline_calculations enable row level security;
