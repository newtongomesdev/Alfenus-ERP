-- Formularios e Agendamento: construtor de formularios, campos, submissoes,
-- profissionais, servicos, slots de disponibilidade e agendamentos.

-- ──────────────────────────────────────────────
-- 1. form_builders — Construtor de Formularios
-- ──────────────────────────────────────────────

create table if not exists public.form_builders (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  slug text not null,
  description text,

  form_type text not null default 'contato'
    check (form_type in (
      'contato','pre_atendimento','consulta_trabalhista','consulta_previdenciaria',
      'familia','inventario','criminal','empresarial','solicitacao_juridica',
      'cadastro_cliente','envio_documentos'
    )),

  is_active boolean not null default true,
  public_link text,
  confirmation_message text,
  max_submissions integer,
  legal_area text,
  default_responsible_member_id uuid,
  tags jsonb not null default '[]'::jsonb,
  lgpd_consent_text text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (law_firm_id, slug)
);

-- ──────────────────────────────────────────────
-- 2. form_fields — Campos do Formulario
-- ──────────────────────────────────────────────

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_builder_id uuid not null references public.form_builders(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  field_type text not null
    check (field_type in (
      'text','email','phone','number','textarea','select',
      'checkbox','radio','date','file','heading','paragraph'
    )),

  label text not null,
  placeholder text,
  required boolean not null default false,
  options jsonb,
  validation_rules jsonb,
  sort_order integer not null default 0,
  page_number integer not null default 1,
  conditional_logic jsonb,
  help_text text,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 3. form_submissions — Submissoes do Formulario
-- ──────────────────────────────────────────────

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  form_builder_id uuid not null references public.form_builders(id) on delete cascade,

  lead_id uuid references public.leads(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,

  submission_data jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  source text,
  campaign text,

  lgpd_consent boolean not null default false,
  lgpd_consent_text text,

  status text not null default 'recebido'
    check (status in ('recebido','processado','convertido','descartado')),

  processed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 4. scheduling_professionals — Profissionais de Agenda
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_professionals (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  member_id uuid not null,

  display_name text not null,
  specialty text,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 5. scheduling_services — Servicos de Agenda
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_services (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,

  name text not null,
  description text,
  duration_minutes integer not null default 60,

  modality text not null default 'presencial'
    check (modality in ('presencial','online','hibrido')),

  requires_approval boolean not null default false,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 6. scheduling_slots — Slots de Disponibilidade
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_slots (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  professional_id uuid not null references public.scheduling_professionals(id) on delete cascade,

  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_available boolean not null default true,

  created_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 7. scheduling_bookings — Agendamentos
-- ──────────────────────────────────────────────

create table if not exists public.scheduling_bookings (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  professional_id uuid not null references public.scheduling_professionals(id),
  service_id uuid not null references public.scheduling_services(id),

  client_name text not null,
  client_email text,
  client_phone text,
  client_id uuid references public.clients(id) on delete set null,

  booking_date date not null,
  start_time time not null,
  end_time time not null,

  modality text not null default 'presencial'
    check (modality in ('presencial','online','hibrido')),

  address text,
  meeting_link text,

  status text not null default 'confirmado'
    check (status in ('confirmado','cancelado','remarcado','concluido','nao_compareceu')),

  cancellation_token text,
  lgpd_consent boolean not null default false,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 8. Triggers — set_updated_at
-- ──────────────────────────────────────────────

create trigger form_builders_set_updated_at
  before update on public.form_builders
  for each row execute function public.set_updated_at();

create trigger scheduling_professionals_set_updated_at
  before update on public.scheduling_professionals
  for each row execute function public.set_updated_at();

create trigger scheduling_services_set_updated_at
  before update on public.scheduling_services
  for each row execute function public.set_updated_at();

create trigger scheduling_bookings_set_updated_at
  before update on public.scheduling_bookings
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────
-- 9. Indexes
-- ──────────────────────────────────────────────

-- form_builders
create index if not exists form_builders_law_firm_idx
  on public.form_builders(law_firm_id);

create index if not exists form_builders_slug_idx
  on public.form_builders(law_firm_id, slug);

-- form_fields
create index if not exists form_fields_law_firm_idx
  on public.form_fields(law_firm_id);

create index if not exists form_fields_form_builder_idx
  on public.form_fields(form_builder_id);

-- form_submissions
create index if not exists form_submissions_law_firm_idx
  on public.form_submissions(law_firm_id);

create index if not exists form_submissions_form_builder_idx
  on public.form_submissions(form_builder_id);

create index if not exists form_submissions_status_idx
  on public.form_submissions(form_builder_id, status);

create index if not exists form_submissions_lead_idx
  on public.form_submissions(lead_id)
  where lead_id is not null;

create index if not exists form_submissions_client_idx
  on public.form_submissions(client_id)
  where client_id is not null;

-- scheduling_professionals
create index if not exists scheduling_professionals_law_firm_idx
  on public.scheduling_professionals(law_firm_id);

-- scheduling_services
create index if not exists scheduling_services_law_firm_idx
  on public.scheduling_services(law_firm_id);

-- scheduling_slots
create index if not exists scheduling_slots_law_firm_idx
  on public.scheduling_slots(law_firm_id);

create index if not exists scheduling_slots_professional_idx
  on public.scheduling_slots(professional_id);

-- scheduling_bookings
create index if not exists scheduling_bookings_law_firm_idx
  on public.scheduling_bookings(law_firm_id);

create index if not exists scheduling_bookings_professional_idx
  on public.scheduling_bookings(professional_id);

create index if not exists scheduling_bookings_date_idx
  on public.scheduling_bookings(booking_date);

create index if not exists scheduling_bookings_professional_date_idx
  on public.scheduling_bookings(professional_id, booking_date);

create index if not exists scheduling_bookings_status_idx
  on public.scheduling_bookings(law_firm_id, status);

create index if not exists scheduling_bookings_client_idx
  on public.scheduling_bookings(client_id)
  where client_id is not null;

-- ──────────────────────────────────────────────
-- 10. Row Level Security
-- ──────────────────────────────────────────────

alter table public.form_builders enable row level security;
alter table public.form_fields enable row level security;
alter table public.form_submissions enable row level security;
alter table public.scheduling_professionals enable row level security;
alter table public.scheduling_services enable row level security;
alter table public.scheduling_slots enable row level security;
alter table public.scheduling_bookings enable row level security;

-- form_builders
create policy form_builders_select on public.form_builders
  for select using (public.has_law_firm_access(law_firm_id));

create policy form_builders_insert on public.form_builders
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy form_builders_update on public.form_builders
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy form_builders_delete on public.form_builders
  for delete using (public.has_law_firm_access(law_firm_id));

-- form_fields
create policy form_fields_select on public.form_fields
  for select using (public.has_law_firm_access(law_firm_id));

create policy form_fields_insert on public.form_fields
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy form_fields_update on public.form_fields
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy form_fields_delete on public.form_fields
  for delete using (public.has_law_firm_access(law_firm_id));

-- form_submissions
create policy form_submissions_select on public.form_submissions
  for select using (public.has_law_firm_access(law_firm_id));

create policy form_submissions_insert on public.form_submissions
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy form_submissions_update on public.form_submissions
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy form_submissions_delete on public.form_submissions
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_professionals
create policy scheduling_professionals_select on public.scheduling_professionals
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_professionals_insert on public.scheduling_professionals
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_professionals_update on public.scheduling_professionals
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_professionals_delete on public.scheduling_professionals
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_services
create policy scheduling_services_select on public.scheduling_services
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_services_insert on public.scheduling_services
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_services_update on public.scheduling_services
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_services_delete on public.scheduling_services
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_slots
create policy scheduling_slots_select on public.scheduling_slots
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_slots_insert on public.scheduling_slots
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_slots_update on public.scheduling_slots
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_slots_delete on public.scheduling_slots
  for delete using (public.has_law_firm_access(law_firm_id));

-- scheduling_bookings
create policy scheduling_bookings_select on public.scheduling_bookings
  for select using (public.has_law_firm_access(law_firm_id));

create policy scheduling_bookings_insert on public.scheduling_bookings
  for insert with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_bookings_update on public.scheduling_bookings
  for update using (public.has_law_firm_access(law_firm_id))
  with check (public.has_law_firm_access(law_firm_id));

create policy scheduling_bookings_delete on public.scheduling_bookings
  for delete using (public.has_law_firm_access(law_firm_id));
