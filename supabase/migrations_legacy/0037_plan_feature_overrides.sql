-- 0037_plan_feature_overrides.sql
-- Esta migration pode ser aplicada isoladamente no SQL Editor.
-- A tabela também existe na 0021, mas é criada aqui caso a sequência anterior
-- ainda não tenha sido executada.

create table if not exists public.plan_settings (
  id text primary key,
  name text not null,
  description text not null default '',
  price_cents integer not null default 0 check (price_cents >= 0),
  billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  stripe_price_id text,
  features jsonb not null default '[]'::jsonb,
  feature_overrides jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.plan_settings (id, name, description, price_cents, features)
values
  ('starter', 'Starter', 'Para escritórios que querem organizar a operação desde o primeiro dia.', 0, '["Clientes e leads", "Processos e prazos", "Agenda e tarefas", "Documentos seguros"]'::jsonb),
  ('professional', 'Professional', 'Para equipes que precisam conectar operação, financeiro e produtividade.', 0, '["Tudo do Starter", "Contratos e recebimentos", "Relatórios gerenciais", "Gestão de equipe e permissões"]'::jsonb),
  ('business', 'Business', 'Para operações jurídicas maiores, com mais controle e escala.', 0, '["Tudo do Professional", "Múltiplos escritórios", "Governança e auditoria", "Atendimento prioritário"]'::jsonb)
on conflict (id) do nothing;

alter table public.plan_settings
  add column if not exists feature_overrides jsonb not null default '{}'::jsonb;

alter table public.plan_settings enable row level security;

drop policy if exists "public can view active plan settings" on public.plan_settings;
create policy "public can view active plan settings" on public.plan_settings
  for select using (active = true);
