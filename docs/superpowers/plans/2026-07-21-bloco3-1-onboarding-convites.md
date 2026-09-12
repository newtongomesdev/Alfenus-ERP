# Sub-bloco 3.1 — Onboarding Guiado e Convites Aprimorados

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar onboarding guiado persistente para novos escritórios e aprimorar o fluxo de convites da equipe com status, validade, cancelamento, reenvio e limites de plano.

**Architecture:** Migration SQL com tabelas `onboarding_sessions` e `onboarding_progress` isoladas por tenant via RLS. Server actions para progresso. UI com checklist visual, percentual, etapas obrigatórias/opcionais. Convites aprimorados com status estendido, ações de cancelar/reenviar/recusar e verificação de limite de plano.

**Tech Stack:** Next.js 16 App Router, React 19, Supabase PostgreSQL, shadcn/ui, Vitest, Tailwind CSS v4.

---

## Arquitetura

### Tabelas existentes reutilizadas:
- `law_firms` — colunas `completed_steps`, `skipped_steps`, `completed_optional_steps`, `onboarding_completed_at`
- `team_invitations` — já tem `token`, `status`, `expires_at`, `invited_by`
- `law_firm_members` — verificação de duplicidade
- `plan_limits` — verificação de limite de membros
- `audit_logs` — registro de eventos

### Tabelas novas:
- `onboarding_sessions` — sessão de onboarding por escritório (profile, started_at, completed_at)
- `onboarding_progress` — progresso detalhado por etapa (step_key, status, data)

### Arquivos criados:
- `supabase/migrations/0038_onboarding_invites.sql` — schema + RLS
- `src/lib/onboarding/constants.ts` — etapas, templates, labels
- `src/lib/onboarding/queries.ts` — queries de sessão e progresso
- `src/lib/onboarding/actions.ts` — server actions do onboarding
- `src/lib/onboarding/profiles.ts` — perfis adaptativos
- `src/app/onboarding/layout.tsx` — layout do onboarding
- `src/app/onboarding/[profile]/page.tsx` — página com checklist
- `src/app/onboarding/[profile]/actions.ts` — actions do profile
- `src/lib/invitations/actions.ts` — ações de convite (cancelar, reenviar, recusar)
- `src/lib/invitations/queries.ts` — queries de convite
- `src/lib/onboarding/__tests__/progress.test.ts` — testes de progresso
- `src/lib/invitations/__tests__/invitations.test.ts` — testes de convite

### Arquivos modificados:
- `src/app/onboarding/page.tsx` — redireciona para profile
- `src/app/equipe/actions.ts` — adiciona cancelar, reenviar, recusar
- `src/app/equipe/page.tsx` — exibe status de convites, ações de convite
- `src/lib/supabase/types.ts` — tipos das novas tabelas
- `src/components/layout/admin-sidebar.tsx` — item "Onboarding" se incompleto

---

### Task 1: Migration 0038 — Tabelas onboarding_sessions, onboarding_progress + colunas em team_invitations

**Files:**
- Create: `supabase/migrations/0038_onboarding_invites.sql`

- [ ] **Step 1: Criar migration SQL**

```sql
-- Sub-bloco 3.1: Onboarding guiado e convites aprimorados

-- ──────────────────────────────────────────────
-- 1. onboarding_sessions — Sessão de onboarding por escritório
-- ──────────────────────────────────────────────

create table if not exists public.onboarding_sessions (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade unique,
  profile text not null check (profile in ('individual', 'small', 'team', 'department')),
  current_step integer not null default 1,
  total_steps integer not null default 18,
  completed_steps integer[] not null default '{}',
  skipped_steps integer[] not null default '{}',
  completed_optional_steps integer[] not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- 2. onboarding_progress — Progresso por etapa
-- ──────────────────────────────────────────────

create table if not exists public.onboarding_progress (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.onboarding_sessions(id) on delete cascade,
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  step_key text not null,
  step_number integer not null,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed', 'skipped')),
  data jsonb not null default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, step_key)
);

-- ──────────────────────────────────────────────
-- 3. Colunas adicionais em team_invitations
-- ──────────────────────────────────────────────

alter table public.team_invitations
  add column if not exists status text not null default 'pendente'
    check (status in ('pendente', 'visualizado', 'aceito', 'expirado', 'cancelado', 'recusado')),
  add column if not exists viewed_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists resend_count integer not null default 0,
  add column if not exists last_resent_at timestamptz,
  add column if not exists notes text;

-- Atualizar status existente baseado em dados atuais
update public.team_invitations
  set status = case
    when status = 'aceito' then 'aceito'
    when expires_at < now() then 'expirado'
    else 'pendente'
  end
  where status not in ('aceito', 'expirado');

-- ──────────────────────────────────────────────
-- 4. Índices
-- ──────────────────────────────────────────────

create index if not exists onboarding_sessions_law_firm_idx
  on public.onboarding_sessions(law_firm_id);

create index if not exists onboarding_progress_session_idx
  on public.onboarding_progress(session_id, step_number);

create index if not exists onboarding_progress_law_firm_idx
  on public.onboarding_progress(law_firm_id);

create index if not exists team_invitations_status_idx
  on public.team_invitations(law_firm_id, status);

create index if not exists team_invitations_email_idx
  on public.team_invitations(email, law_firm_id);

-- ──────────────────────────────────────────────
-- 5. RLS
-- ──────────────────────────────────────────────

alter table public.onboarding_sessions enable row level security;
alter table public.onboarding_progress enable row level security;

-- onboarding_sessions
create policy "Members can view own onboarding session"
  on public.onboarding_sessions for select
  using (law_firm_id in (
    select law_firm_id from public.law_firm_members
    where user_id = auth.uid() and status = 'ativo'
  ));

create policy "Members can insert own onboarding session"
  on public.onboarding_sessions for insert
  with check (law_firm_id in (
    select law_firm_id from public.law_firm_members
    where user_id = auth.uid() and status = 'ativo'
  ));

create policy "Members can update own onboarding session"
  on public.onboarding_sessions for update
  using (law_firm_id in (
    select law_firm_id from public.law_firm_members
    where user_id = auth.uid() and status = 'ativo'
  ));

-- onboarding_progress
create policy "Members can view own onboarding progress"
  on public.onboarding_progress for select
  using (law_firm_id in (
    select law_firm_id from public.law_firm_members
    where user_id = auth.uid() and status = 'ativo'
  ));

create policy "Members can insert own onboarding progress"
  on public.onboarding_progress for insert
  with check (law_firm_id in (
    select law_firm_id from public.law_firm_members
    where user_id = auth.uid() and status = 'ativo'
  ));

create policy "Members can update own onboarding progress"
  on public.onboarding_progress for update
  using (law_firm_id in (
    select law_firm_id from public.law_firm_members
    where user_id = auth.uid() and status = 'ativo'
  ));

-- Superadmin bypass
create policy "Superadmin full access onboarding_sessions"
  on public.onboarding_sessions for all
  using (is_superadmin());

create policy "Superadmin full access onboarding_progress"
  on public.onboarding_progress for all
  using (is_superadmin());
```

- [ ] **Step 2: Verificar migration**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx supabase db push --db-url "postgresql://postgres.lmfjntuofpdjojcuybkl:041052.11setembB@aws-1-us-west-2.pooler.supabase.com:5432/postgres" 2>&1 | Select-Object -Last 10`

Expected: Migration 0038 aplicada com sucesso.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0038_onboarding_invites.sql
git commit -m "feat(migration): onboarding_sessions, onboarding_progress, team_invitations status"
```

---

### Task 2: Constantes e tipos do onboarding

**Files:**
- Create: `src/lib/onboarding/constants.ts`

- [ ] **Step 1: Criar constants.ts**

```typescript
// ──────────────────────────────────────────────
// Etapas do onboarding
// ──────────────────────────────────────────────

export const ONBOARDING_STEPS = [
  { key: "office_data", label: "Dados do escritório", required: true, group: "setup" },
  { key: "branding", label: "Identidade visual", required: false, group: "setup" },
  { key: "practice_areas", label: "Áreas de atuação", required: true, group: "setup" },
  { key: "professional_oab", label: "Dados profissionais e OAB", required: true, group: "setup" },
  { key: "team_setup", label: "Configuração da equipe", required: false, group: "team" },
  { key: "invite_users", label: "Convite de usuários", required: false, group: "team" },
  { key: "roles_permissions", label: "Papéis e permissões", required: false, group: "team" },
  { key: "financial_config", label: "Configuração financeira", required: false, group: "financial" },
  { key: "process_types", label: "Tipos de processo", required: true, group: "setup" },
  { key: "deadline_types", label: "Tipos de prazo", required: false, group: "setup" },
  { key: "payment_methods", label: "Formas de pagamento", required: false, group: "financial" },
  { key: "data_import", label: "Importação de dados", required: false, group: "setup" },
  { key: "first_client", label: "Primeiro cliente", required: false, group: "usage" },
  { key: "first_process", label: "Primeiro processo", required: false, group: "usage" },
  { key: "first_contract", label: "Primeiro contrato", required: false, group: "usage" },
  { key: "first_deadline", label: "Primeiro prazo", required: false, group: "usage" },
  { key: "client_portal", label: "Portal do cliente", required: false, group: "setup" },
  { key: "security_config", label: "Configurações de segurança", required: false, group: "setup" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];
export type OnboardingStepGroup = (typeof ONBOARDING_STEPS)[number]["group"];
export type OnboardingProfile = "individual" | "small" | "team" | "department";

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

// ──────────────────────────────────────────────
// Perfis e etapas recomendadas
// ──────────────────────────────────────────────

export const PROFILE_LABELS: Record<OnboardingProfile, string> = {
  individual: "Advogado individual",
  small: "Pequeno escritório",
  team: "Escritório com equipe",
  department: "Departamento jurídico",
};

export const PROFILE_DESCRIPTIONS: Record<OnboardingProfile, string> = {
  individual: "Atendimento personalizado para um único advogado",
  small: "Até 5 membros, foco em produtividade",
  team: "Equipe colaborativa com papéis definidos",
  department: "Integração com departamentos e processos complexos",
};

// Etapas recomendadas por perfil (as demais ficam opcionais)
export const PROFILE_RECOMMENDED_STEPS: Record<OnboardingProfile, OnboardingStepKey[]> = {
  individual: [
    "office_data", "branding", "practice_areas", "professional_oab",
    "process_types", "first_client", "first_process", "first_contract",
    "first_deadline", "security_config",
  ],
  small: [
    "office_data", "branding", "practice_areas", "professional_oab",
    "team_setup", "invite_users", "process_types", "deadline_types",
    "first_client", "first_process", "first_contract", "first_deadline",
    "security_config",
  ],
  team: [
    "office_data", "branding", "practice_areas", "professional_oab",
    "team_setup", "invite_users", "roles_permissions",
    "financial_config", "process_types", "deadline_types", "payment_methods",
    "first_client", "first_process", "first_contract", "first_deadline",
    "client_portal", "security_config",
  ],
  department: [
    "office_data", "branding", "practice_areas", "professional_oab",
    "team_setup", "invite_users", "roles_permissions",
    "financial_config", "process_types", "deadline_types", "payment_methods",
    "data_import", "first_client", "first_process", "first_contract",
    "first_deadline", "client_portal", "security_config",
  ],
};

// Etapas obrigatórias (sempre required regardless of profile)
export const REQUIRED_STEPS: OnboardingStepKey[] = ONBOARDING_STEPS
  .filter((s) => s.required)
  .map((s) => s.key);

// ──────────────────────────────────────────────
// Labels de grupos
// ──────────────────────────────────────────────

export const GROUP_LABELS: Record<OnboardingStepGroup, string> = {
  setup: "Configuração básica",
  team: "Equipe e permissões",
  financial: "Financeiro",
  usage: "Primeiros registros",
};

// ──────────────────────────────────────────────
// Status de convites
// ──────────────────────────────────────────────

export const INVITATION_STATUSES = [
  "pendente",
  "visualizado",
  "aceito",
  "expirado",
  "cancelado",
  "recusado",
] as const;

export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pendente: "Pendente",
  visualizado: "Visualizado",
  aceito: "Aceito",
  expirado: "Expirado",
  cancelado: "Cancelado",
  recusado: "Recusado",
};

export const INVITATION_STATUS_COLORS: Record<InvitationStatus, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  visualizado: "bg-blue-100 text-blue-800",
  aceito: "bg-green-100 text-green-800",
  expirado: "bg-gray-100 text-gray-800",
  cancelado: "bg-red-100 text-red-800",
  recusado: "bg-orange-100 text-orange-800",
};
```

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

Expected: Sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/onboarding/constants.ts
git commit -m "feat(onboarding): constantes, etapas, perfis e labels de convite"
```

---

### Task 3: Queries de onboarding

**Files:**
- Create: `src/lib/onboarding/queries.ts`

- [ ] **Step 1: Criar queries.ts**

```typescript
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { TOTAL_STEPS, type OnboardingStepKey } from "./constants";

// ──────────────────────────────────────────────
// Tipos
// ──────────────────────────────────────────────

export type OnboardingSession = {
  id: string;
  law_firm_id: string;
  profile: string;
  current_step: number;
  total_steps: number;
  completed_steps: number[];
  skipped_steps: number[];
  completed_optional_steps: number[];
  started_at: string;
  completed_at: string | null;
};

export type OnboardingProgress = {
  id: string;
  session_id: string;
  law_firm_id: string;
  step_key: string;
  step_number: number;
  status: "pending" | "in_progress" | "completed" | "skipped";
  data: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
};

type QueryClient = {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          order(column: string, opts?: { ascending: boolean }): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
            single(): Promise<{ data: unknown; error: unknown }>;
          };
          single(): Promise<{ data: unknown; error: unknown }>;
          limit(count: number): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          };
        };
        single(): Promise<{ data: unknown; error: unknown }>;
        order(column: string, opts?: { ascending: boolean }): {
          limit(count: number): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          };
        };
        limit(count: number): {
          maybeSingle(): Promise<{ data: unknown; error: unknown }>;
        };
      };
      single(): Promise<{ data: unknown; error: unknown }>;
      maybeSingle(): Promise<{ data: unknown; error: unknown }>;
    };
    insert(values: Record<string, unknown>): {
      select(columns?: string): {
        single(): Promise<{ data: unknown; error: unknown }>;
      };
    } & PromiseLike<{ data: unknown; error: unknown }>;
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): PromiseLike<{ data: unknown; error: unknown }>;
      };
    };
    upsert(values: Record<string, unknown>, opts?: { onConflict?: string }): PromiseLike<{ data: unknown; error: unknown }>;
  };
};

// ──────────────────────────────────────────────
// Obter ou criar sessão de onboarding
// ──────────────────────────────────────────────

export async function getOrCreateOnboardingSession(
  lawFirmId: string,
  profile?: string,
): Promise<OnboardingSession | null> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const client = supabase as unknown as QueryClient;

  // Buscar sessão existente
  const { data: existing } = await client
    .from("onboarding_sessions")
    .select("*")
    .eq("law_firm_id", lawFirmId)
    .maybeSingle();

  if (existing) return existing as OnboardingSession;

  // Criar nova sessão
  const { data: created } = await client
    .from("onboarding_sessions")
    .insert({
      law_firm_id: lawFirmId,
      profile: profile ?? "small",
      total_steps: TOTAL_STEPS,
      current_step: 1,
    })
    .select("*")
    .single();

  return (created as OnboardingSession) ?? null;
}

// ──────────────────────────────────────────────
// Obter progresso de todas as etapas
// ──────────────────────────────────────────────

export async function getOnboardingProgress(
  sessionId: string,
): Promise<OnboardingProgress[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const client = supabase as unknown as QueryClient;
  const { data } = await client
    .from("onboarding_progress")
    .select("*")
    .eq("session_id", sessionId)
    .order("step_number", { ascending: true });

  return (data as OnboardingProgress[]) ?? [];
}

// ──────────────────────────────────────────────
// Calcular percentual concluído
// ──────────────────────────────────────────────

export function calculateProgress(
  session: OnboardingSession,
  progress: OnboardingProgress[],
): { percent: number; completed: number; total: number; requiredCompleted: number; requiredTotal: number } {
  const completed = progress.filter((p) => p.status === "completed").length;
  const total = session.total_steps;

  // Etapas obrigatórias
  const { REQUIRED_STEPS } = require("./constants") as { REQUIRED_STEPS: OnboardingStepKey[] };
  const requiredSteps = progress.filter((p) => REQUIRED_STEPS.includes(p.step_key as OnboardingStepKey));
  const requiredCompleted = requiredSteps.filter((p) => p.status === "completed").length;

  return {
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    completed,
    total,
    requiredCompleted,
    requiredTotal: REQUIRED_STEPS.length,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 10`

Expected: Sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/onboarding/queries.ts
git commit -m "feat(onboarding): queries de sessão, progresso e cálculo percentual"
```

---

### Task 4: Server actions do onboarding

**Files:**
- Create: `src/lib/onboarding/actions.ts`

- [ ] **Step 1: Criar actions.ts**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { ONBOARDING_STEPS, type OnboardingStepKey, TOTAL_STEPS } from "./constants";
import { getOrCreateOnboardingSession } from "./queries";

type ActionClient = {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          single(): Promise<{ data: unknown; error: unknown }>;
        };
        single(): Promise<{ data: unknown; error: unknown }>;
      };
      maybeSingle(): Promise<{ data: unknown; error: unknown }>;
      single(): Promise<{ data: unknown; error: unknown }>;
    };
    insert(values: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): PromiseLike<{ data: unknown; error: unknown }>;
        eq(column: string, value: unknown): {
          eq(column: string, value: unknown): PromiseLike<{ data: unknown; error: unknown }>;
        };
      };
    };
    upsert(values: Record<string, unknown>, opts?: { onConflict?: string }): PromiseLike<{ data: unknown; error: unknown }>;
  };
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
};

// ──────────────────────────────────────────────
// Criar sessão de onboarding
// ──────────────────────────────────────────────

export async function createOnboardingSessionAction(profile: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/onboarding?erro=ambiente");

  const client = supabase as unknown as ActionClient;

  const session = await getOrCreateOnboardingSession(context.lawFirm.id, profile);
  if (!session) redirect("/onboarding?erro=criar");

  // Atualizar profile se diferente
  if (session.profile !== profile) {
    await client
      .from("onboarding_sessions")
      .update({ profile, updated_at: new Date().toISOString() })
      .eq("id", session.id)
      .eq("law_firm_id", context.lawFirm.id);
  }

  revalidatePath("/onboarding");
  redirect(`/onboarding/${profile}`);
}

// ──────────────────────────────────────────────
// Avançar etapa
// ──────────────────────────────────────────────

export async function advanceOnboardingStepAction(
  profile: string,
  stepKey: string,
  data?: Record<string, unknown>,
) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/onboarding/${profile}?erro=ambiente`);

  const client = supabase as unknown as ActionClient;
  const session = await getOrCreateOnboardingSession(context.lawFirm.id, profile);
  if (!session) redirect(`/onboarding/${profile}?erro=criar`);

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.key === stepKey);
  if (stepIndex === -1) redirect(`/onboarding/${profile}`);

  const stepNumber = stepIndex + 1;

  // Marcar etapa como concluída
  await client
    .from("onboarding_progress")
    .upsert({
      session_id: session.id,
      law_firm_id: context.lawFirm.id,
      step_key: stepKey,
      step_number: stepNumber,
      status: "completed",
      data: data ?? {},
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "session_id,step_key" });

  // Atualizar sessão
  const newCompleted = [...new Set([...session.completed_steps, stepNumber])];
  const newSkipped = session.skipped_steps.filter((s) => s !== stepNumber);
  const nextStep = stepNumber + 1;

  await client
    .from("onboarding_sessions")
    .update({
      current_step: nextStep > TOTAL_STEPS ? TOTAL_STEPS : nextStep,
      completed_steps: newCompleted,
      skipped_steps: newSkipped,
      completed_at: newCompleted.length === TOTAL_STEPS ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("law_firm_id", context.lawFirm.id);

  // Registrar na auditoria
  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "onboarding_etapa_concluida",
    entity_type: "onboarding_session",
    entity_id: session.id,
    metadata: { step: stepKey, step_number: stepNumber },
  });

  revalidatePath(`/onboarding/${profile}`);
}

// ──────────────────────────────────────────────
// Pular etapa
// ──────────────────────────────────────────────

export async function skipOnboardingStepAction(profile: string, stepKey: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/onboarding/${profile}?erro=ambiente`);

  const client = supabase as unknown as ActionClient;
  const session = await getOrCreateOnboardingSession(context.lawFirm.id, profile);
  if (!session) redirect(`/onboarding/${profile}?erro=criar`);

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.key === stepKey);
  if (stepIndex === -1) redirect(`/onboarding/${profile}`);

  const step = ONBOARDING_STEPS[stepIndex];
  if (step.required) {
    // Não pode pular obrigatória
    redirect(`/onboarding/${profile}?erro=obrigatoria`);
  }

  const stepNumber = stepIndex + 1;

  await client
    .from("onboarding_progress")
    .upsert({
      session_id: session.id,
      law_firm_id: context.lawFirm.id,
      step_key: stepKey,
      step_number: stepNumber,
      status: "skipped",
      data: {},
      updated_at: new Date().toISOString(),
    }, { onConflict: "session_id,step_key" });

  const newSkipped = [...new Set([...session.skipped_steps, stepNumber])];
  const nextStep = stepNumber + 1;

  await client
    .from("onboarding_sessions")
    .update({
      current_step: nextStep > TOTAL_STEPS ? TOTAL_STEPS : nextStep,
      skipped_steps: newSkipped,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("law_firm_id", context.lawFirm.id);

  revalidatePath(`/onboarding/${profile}`);
}

// ──────────────────────────────────────────────
// Ir para etapa específica (voltar/avançar)
// ──────────────────────────────────────────────

export async function goToOnboardingStepAction(profile: string, stepKey: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/onboarding/${profile}?erro=ambiente`);

  const client = supabase as unknown as ActionClient;
  const session = await getOrCreateOnboardingSession(context.lawFirm.id, profile);
  if (!session) redirect(`/onboarding/${profile}?erro=criar`);

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.key === stepKey);
  if (stepIndex === -1) redirect(`/onboarding/${profile}`);

  await client
    .from("onboarding_sessions")
    .update({
      current_step: stepIndex + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("law_firm_id", context.lawFirm.id);

  revalidatePath(`/onboarding/${profile}`);
}

// ──────────────────────────────────────────────
// Reabrir onboarding
// ──────────────────────────────────────────────

export async function reopenOnboardingAction(profile: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (context.member.role !== "proprietario") redirect("/dashboard?erro=permissao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/onboarding?erro=ambiente");

  const client = supabase as unknown as ActionClient;
  const session = await getOrCreateOnboardingSession(context.lawFirm.id, profile);
  if (!session) redirect("/onboarding?erro=criar");

  await client
    .from("onboarding_sessions")
    .update({
      completed_at: null,
      current_step: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("law_firm_id", context.lawFirm.id);

  // Limpar progresso
  // Não deletar — apenas resetar status para manter histórico

  revalidatePath("/onboarding");
  redirect(`/onboarding/${profile}`);
}

// ──────────────────────────────────────────────
// Concluir onboarding
// ──────────────────────────────────────────────

export async function completeOnboardingAction(profile: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/onboarding/${profile}?erro=ambiente`);

  const client = supabase as unknown as ActionClient;
  const session = await getOrCreateOnboardingSession(context.lawFirm.id, profile);
  if (!session) redirect(`/onboarding/${profile}?erro=criar");

  await client
    .from("onboarding_sessions")
    .update({
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("law_firm_id", context.lawFirm.id);

  // Atualizar law_firms
  await client
    .from("law_firms")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", context.lawFirm.id);

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "onboarding_concluido",
    entity_type: "onboarding_session",
    entity_id: session.id,
    metadata: { profile },
  });

  revalidatePath("/onboarding");
  redirect("/dashboard");
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

Expected: Sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/lib/onboarding/actions.ts
git commit -m "feat(onboarding): server actions (criar, avançar, pular, concluir, reabrir)"
```

---

### Task 5: UI — Página de seleção de perfil

**Files:**
- Modify: `src/app/onboarding/page.tsx` (substituir conteúdo existente)

- [ ] **Step 1: Substituir onboarding/page.tsx**

Substituir o conteúdo existente para mostrar seleção de perfil com 4 cards. A página deve:
- Usar `getOrCreateOnboardingSession` para verificar se já existe sessão
- Se existir e tiver `completed_at`, redirecionar para dashboard
- Se existir sem `completed_at`, redirecionar para `/onboarding/[profile]`
- Se não existir, mostrar seleção de perfil

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat(onboarding): página de seleção de perfil"
```

---

### Task 6: UI — Página do onboarding com checklist

**Files:**
- Create: `src/app/onboarding/[profile]/page.tsx`
- Create: `src/app/onboarding/[profile]/onboarding-checklist.tsx` (client component)

- [ ] **Step 1: Criar server page**

A page server carrega a sessão e progresso, e renderiza o `OnboardingChecklist` client component com:
- Sidebar com lista de etapas agrupadas por grupo
- Barra de progresso no topo
- Percentual concluído
- Indicador de etapa atual, concluída, pendente, pulada
- Botões de ação por etapa

- [ ] **Step 2: Criar client component**

O `OnboardingChecklist` deve:
- Receber session, progress, profile como props
- Mostrar sidebar com etapas
- Mostrar conteúdo da etapa atual (placeholder por enquanto — cada etapa terá seu formulário futuro)
- Botões "Próximo", "Pular", "Voltar"
- Marcar obrigatórias com asterisco
- Mostrar ajuda contextual por etapa
- Desabilitar "Pular" para etapas obrigatórias
- Usar `advanceOnboardingStepAction`, `skipOnboardingStepAction`, `goToOnboardingStepAction`

- [ ] **Step 3: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/\[profile\]/
git commit -m "feat(onboarding): checklist visual com progresso e navegação"
```

---

### Task 7: Ações de convite aprimoradas

**Files:**
- Create: `src/lib/invitations/actions.ts`

- [ ] **Step 1: Criar actions.ts com cancelar, reenviar, recusar**

```typescript
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type InviteClient = {
  from(table: string): {
    select(columns?: string): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          eq(column: string, value: unknown): {
            maybeSingle(): Promise<{ data: unknown; error: unknown }>;
          };
        };
        single(): Promise<{ data: unknown; error: unknown }>;
      };
      single(): Promise<{ data: unknown; error: unknown }>;
    };
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): PromiseLike<{ data: unknown; error: unknown }>;
        eq(column: string, value: unknown): {
          eq(column: string, value: unknown): PromiseLike<{ data: unknown; error: unknown }>;
        };
      };
    };
    insert(values: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
    count(): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          eq(column: string, value: unknown): PromiseLike<{ count: number | null; error: unknown }>;
        };
      };
    };
  };
};

// ──────────────────────────────────────────────
// Cancelar convite
// ──────────────────────────────────────────────

export async function cancelInvitationAction(invitationId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "equipe.gerenciar")) redirect("/equipe?erro=permissao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/equipe?erro=ambiente");

  const client = supabase as unknown as InviteClient;

  // Verificar que o convite pertence ao escritório
  const { data: invite } = await client
    .from("team_invitations")
    .select("id, status")
    .eq("id", invitationId)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!invite || (invite as { status: string }).status !== "pendente") {
    redirect("/equipe?erro=convite");
  }

  await client
    .from("team_invitations")
    .update({
      status: "cancelado",
      cancelled_at: new Date().toISOString(),
      cancelled_by: context.member.id,
    })
    .eq("id", invitationId)
    .eq("law_firm_id", context.lawFirm.id);

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "cancelou_convite",
    entity_type: "team_invitation",
    entity_id: invitationId,
  });

  revalidatePath("/equipe");
  redirect("/equipe?cancelado=1");
}

// ──────────────────────────────────────────────
// Reenviar convite
// ──────────────────────────────────────────────

export async function resendInvitationAction(invitationId: string) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) redirect("/entrar");
  if (!can(context.member.role, "equipe.gerenciar")) redirect("/equipe?erro=permissao");

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/equipe?erro=ambiente");

  const client = supabase as unknown as InviteClient;

  const { data: invite } = await client
    .from("team_invitations")
    .select("id, status, resend_count")
    .eq("id", invitationId)
    .eq("law_firm_id", context.lawFirm.id)
    .maybeSingle();

  if (!invite) redirect("/equipe?erro=convite");

  const inv = invite as { status: string; resend_count: number };
  if (inv.status === "aceito" || inv.status === "cancelado") {
    redirect("/equipe?erro=convite");
  }

  if (inv.resend_count >= 5) {
    redirect("/equipe?erro=limite_reenvio");
  }

  await client
    .from("team_invitations")
    .update({
      status: "pendente",
      token: randomUUID(),
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      resend_count: inv.resend_count + 1,
      last_resent_at: new Date().toISOString(),
    })
    .eq("id", invitationId)
    .eq("law_firm_id", context.lawFirm.id);

  await client.from("audit_logs").insert({
    law_firm_id: context.lawFirm.id,
    actor_id: context.member.id,
    action: "reenviou_convite",
    entity_type: "team_invitation",
    entity_id: invitationId,
    metadata: { resend_count: inv.resend_count + 1 },
  });

  revalidatePath("/equipe");
  redirect("/equipe?reenviado=1");
}

// ──────────────────────────────────────────────
// Recusar convite
// ──────────────────────────────────────────────

export async function declineInvitationAction(token: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect("/convite/" + token + "?erro=ambiente");

  const client = supabase as unknown as InviteClient;

  const { data: invite } = await client
    .from("team_invitations")
    .select("id, status")
    .eq("token", token)
    .eq("status", "pendente")
    .maybeSingle();

  if (!invite) redirect("/convite/" + token + "?erro=invalido");

  await client
    .from("team_invitations")
    .update({
      status: "recusado",
      declined_at: new Date().toISOString(),
    })
    .eq("id", (invite as { id: string }).id);

  redirect("/convite/" + token + "?recusado=1");
}

// ──────────────────────────────────────────────
// Verificar limite de plano antes de convidar
// ──────────────────────────────────────────────

export async function checkInviteLimitAction(): Promise<{ allowed: boolean; current: number; limit: number }> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.lawFirm) return { allowed: false, current: 0, limit: 0 };

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { allowed: false, current: 0, limit: 0 };

  const client = supabase as unknown as InviteClient;

  // Contar membros ativos
  const { count: memberCount } = await client
    .from("law_firm_members")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("status", "ativo");

  // Contar convites pendentes
  const { count: pendingCount } = await client
    .from("team_invitations")
    .select("id", { count: "exact", head: true })
    .eq("law_firm_id", context.lawFirm.id)
    .eq("status", "pendente");

  // Buscar limite do plano
  const { data: limitData } = await client
    .from("plan_limits")
    .select("limit_value")
    .eq("plan_id", context.lawFirm.plan ?? "starter")
    .eq("limit_key", "max_members")
    .maybeSingle();

  const limit = (limitData as { limit_value: number } | null)?.limit_value ?? 5;
  const current = (memberCount ?? 0) + (pendingCount ?? 0);

  return { allowed: limit === -1 || current < limit, current, limit };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

- [ ] **Step 3: Commit**

```bash
git add src/lib/invitations/actions.ts
git commit -m "feat(invitations): cancelar, reenviar, recusar e verificar limite"
```

---

### Task 8: Atualizar equipe/page.tsx com status e ações de convite

**Files:**
- Modify: `src/app/equipe/page.tsx`

- [ ] **Step 1: Adicionar badge de status e botões de ação**

Na página de equipe, adicionar:
- Badge de status ao lado de cada convite pendente
- Botão "Cancelar" para convites pendentes
- Botão "Reenviar" para convites pendentes/expirados
- Link "Copiar link" para convites pendentes
- Exibir contagem de membros vs limite do plano

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

- [ ] **Step 3: Commit**

```bash
git add src/app/equipe/page.tsx
git commit -m "feat(equipe): status de convites, cancelar, reenviar, copiar link"
```

---

### Task 9: Adicionar colunas onboarding em law_firms (types)

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Adicionar onboarding_completed_at em law_firms**

Verificar se a coluna `onboarding_completed_at` já existe nos tipos. Se não, adicionar:

```typescript
onboarding_completed_at?: string | null;
```

Também adicionar tipos para `onboarding_sessions` e `onboarding_progress` na seção Tables.

- [ ] **Step 2: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 5`

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat(types): adiciona tipos onboarding_sessions e onboarding_progress"
```

---

### Task 10: Testes de onboarding

**Files:**
- Create: `src/lib/onboarding/__tests__/progress.test.ts`

- [ ] **Step 1: Criar testes**

Testes para:
- Cálculo de percentual com diferentes progressos
- Verificação de etapas obrigatórias
- Profile推荐 steps corretas
- Sessão não pode ser concluída sem obrigatórias
- Isolamento por tenant (via mock)

- [ ] **Step 2: Rodar testes**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx vitest run src/lib/onboarding/ 2>&1 | Select-Object -Last 15`

- [ ] **Step 3: Commit**

```bash
git add src/lib/onboarding/__tests__/
git commit -m "test(onboarding): testes de progresso, profiles e constants"
```

---

### Task 11: Testes de convites

**Files:**
- Create: `src/lib/invitations/__tests__/invitations.test.ts`

- [ ] **Step 1: Criar testes**

Testes para:
- Verificar limite de plano (dentro do limite)
- Verificar limite de plano (acima do limite)
- Verificar limite ilimitado (-1)
- Cancelamento de convite
- Reenvio com limite de tentativas
- Recusa de convite
- Duplicidade de membro

- [ ] **Step 2: Rodar testes**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx vitest run src/lib/invitations/ 2>&1 | Select-Object -Last 15`

- [ ] **Step 3: Commit**

```bash
git add src/lib/invitations/__tests__/
git commit -m "test(invitations): testes de limite, cancelamento, reenvio, recusa"
```

---

### Task 12: Typecheck, build e testes finais

- [ ] **Step 1: Typecheck**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx tsc --noEmit 2>&1 | Select-Object -First 10`

Expected: Sem erros.

- [ ] **Step 2: Build**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx next build 2>&1 | Select-Object -Last 20`

Expected: Build OK.

- [ ] **Step 3: Testes completos**

Run: `cd "e:\Vibecode apps\ERP Juridico" && npx vitest run 2>&1 | Select-Object -Last 10`

Expected: Todos passando.

- [ ] **Step 4: Corrigir qualquer erro**

- [ ] **Step 5: Push**

```bash
git add -A && git commit -m "feat(bloco3.1): onboarding guiado e convites aprimorados" && git push
```

---

## Resumo de entidades

| Entidade | Tabela | Ação |
|----------|--------|------|
| Sessão onboarding | `onboarding_sessions` | CRIAR |
| Progresso etapa | `onboarding_progress` | CRIAR |
| Status convite | `team_invitations` | ALTERAR (adicionar colunas) |

## RLS Policies

| Tabela | Policy | Ação |
|--------|--------|------|
| onboarding_sessions | Members view own | CRIAR |
| onboarding_sessions | Members insert own | CRIAR |
| onboarding_sessions | Members update own | CRIAR |
| onboarding_sessions | Superadmin full | CRIAR |
| onboarding_progress | Members view own | CRIAR |
| onboarding_progress | Members insert own | CRIAR |
| onboarding_progress | Members update own | CRIAR |
| onboarding_progress | Superadmin full | CRIAR |

## Permissões

- `equipe.gerenciar` — convidar, cancelar, reenviar
- `proprietario` — reabrir onboarding

## Riscos

1. **Coluna `onboarding_completed_at`** pode não existir na tabela `law_firms` — verificar na migration
2. **Status existentes em `team_invitations`** — pode haver dados com status antigo que precisam de migração
3. **RLS policies** — garantir que o `is_superadmin()` está disponível (já existe na migration 0007)

## Pendências para Sub-bloco 3.2

- Formulários reais para cada etapa do onboarding (dados do escritório, OAB, etc.)
- Envio de e-mail de convite (atualmente apenas link manual)
- Notificações de convite recebido
