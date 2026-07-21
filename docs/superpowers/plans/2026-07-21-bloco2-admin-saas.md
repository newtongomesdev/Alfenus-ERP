# Bloco 2 — Administração do SaaS: Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the SaaS administration panel with plan limits UI, feature flag per-tenant overrides, trial period management, usage metrics collection, manual limit adjustments, and comprehensive audit logging.

**Architecture:** The admin panel already exists at `/admin` with 10 pages, a sidebar, and server-side auth via `getAdminContext()`. The lib layer (`src/lib/admin/`) already has feature flags, plan limits, and query functions. This plan fills the gaps: UI for plan limits, per-tenant feature flag overrides, trial periods, automated usage collection, and admin tests.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL), Tailwind CSS v4, shadcn/ui, Vitest

---

## Existing Structures Being Reused

| Structure | Path | Reused For |
|-----------|------|-----------|
| `getAdminContext()` | `src/lib/admin/auth.ts` | All admin pages (superadmin check) |
| `AdminShell` | `src/components/layout/admin-shell.tsx` | Admin layout |
| `AdminSidebar` | `src/components/layout/admin-sidebar.tsx` | Navigation |
| `getAllFeatureFlags()` | `src/lib/admin/feature-flags.ts` | Feature flag CRUD |
| `isFeatureEnabled()` | `src/lib/admin/feature-flags.ts` | Feature flag check |
| `getPlanLimits()` | `src/lib/admin/plan-limits.ts` | Plan limits CRUD |
| `checkPlanLimit()` | `src/lib/admin/plan-limits.ts` | Limit check |
| `getAdminTenants()` | `src/lib/admin/queries.ts` | Tenant listing |
| `getAdminAuditLogs()` | `src/lib/admin/queries.ts` | Audit log listing |
| `getAdminPlatformMetrics()` | `src/lib/admin/queries.ts` | Platform metrics |
| `SuspendTenantButton` | `src/components/admin/tenant-actions.tsx` | Suspend/reactivate |
| `PageHeader` | `src/components/page-header.tsx` | Page headers |
| `StatusBadge` | `src/components/status-badge.tsx` | Status display |
| `MetricCard` | `src/components/metric-card.tsx` | Metric cards |
| `Pagination` | `src/components/pagination.tsx` | Pagination |
| `ConfirmDialog` | `src/components/confirm-dialog.tsx` | Confirm actions |

---

## Task 1: Add trial period columns to law_firms + limit override table

**Files:**
- Create: `supabase/migrations/0036_admin_trial_and_overrides.sql`

- [ ] **Step 1: Create migration**

```sql
-- 0036_admin_trial_and_overrides.sql

-- Add trial columns to law_firms
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_starts_at timestamptz;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;
ALTER TABLE law_firms ADD COLUMN IF NOT EXISTS trial_used boolean NOT NULL DEFAULT false;

-- Per-tenant limit overrides (allows superadmin to override plan limits for specific tenants)
CREATE TABLE IF NOT EXISTS tenant_limit_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  law_firm_id uuid NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  limit_key text NOT NULL,
  override_value integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (law_firm_id, limit_key)
);

-- Admin audit log for platform-level actions (separate from tenant audit_logs)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  entity_name text,
  details jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: only superadmin can access
ALTER TABLE tenant_limit_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "superadmin all tenant_limit_overrides" ON tenant_limit_overrides
    FOR ALL USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "superadmin all admin_audit_logs" ON admin_audit_logs
    FOR ALL USING (is_superadmin());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Extend platform_usage_metrics with more fields
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS active_members_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS legal_cases_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS payments_count integer DEFAULT 0;
ALTER TABLE platform_usage_metrics ADD COLUMN IF NOT EXISTS payments_value_cents bigint DEFAULT 0;
```

- [ ] **Step 2: Apply migration to database**

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0036_admin_trial_and_overrides.sql
git commit -m "feat(admin): add trial period columns, limit overrides, admin audit logs"
```

---

## Task 2: Add types for new tables to Supabase types

**Files:**
- Modify: `src/lib/supabase/types.ts`

- [ ] **Step 1: Add TenantLimitOverride and AdminAuditLog types**

Add to the Database type's Table definitions:

```typescript
tenant_limit_overrides: {
  Row: {
    id: string; law_firm_id: string; limit_key: string;
    override_value: number; reason: string | null;
    created_by: string | null; created_at: string; updated_at: string;
  };
  Insert: { ... same with optional id/created_at/updated_at };
  Update: { ... partial };
};
admin_audit_logs: {
  Row: {
    id: string; admin_user_id: string; admin_email: string;
    action: string; entity_type: string; entity_id: string | null;
    entity_name: string | null; details: Record<string, unknown>;
    ip_address: string | null; created_at: string;
  };
  Insert: { ... };
  Update: { ... };
};
```

Also add `trial_starts_at`, `trial_ends_at`, `trial_used` to `law_firms` Row type.

- [ ] **Step 2: Commit**

```bash
git add src/lib/supabase/types.ts
git commit -m "feat(admin): add types for tenant_limit_overrides, admin_audit_logs, trial columns"
```

---

## Task 3: Create centralized billing/plan service

**Files:**
- Create: `src/lib/admin/billing.ts`

- [ ] **Step 1: Create billing service with hasFeature, checkLimit, getUsage**

```typescript
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getLimitsForPlan } from "@/lib/admin/plan-limits";
import type { Database } from "@/lib/supabase/types";

type PlanFeatures = {
  maxMembers: number;
  maxClients: number;
  maxDocumentsStorageMb: number;
  maxContracts: number;
  maxCases: number;
  hasAiFeatures: boolean;
  hasPwa: boolean;
  hasLgpd: boolean;
  hasClm: boolean;
  hasRiskManagement: boolean;
  hasLegalRequests: boolean;
  hasPublicForms: boolean;
  hasPdfTools: boolean;
  hasTicketing: boolean;
};

const DEFAULT_PLAN_FEATURES: Record<string, Partial<PlanFeatures>> = {
  starter: {
    maxMembers: 5,
    maxClients: 50,
    maxDocumentsStorageMb: 500,
    maxContracts: 100,
    maxCases: 100,
    hasAiFeatures: false,
    hasPwa: false,
    hasLgpd: false,
    hasClm: false,
    hasRiskManagement: false,
    hasLegalRequests: false,
    hasPublicForms: false,
    hasPdfTools: true,
    hasTicketing: false,
  },
  professional: {
    maxMembers: 15,
    maxClients: 500,
    maxDocumentsStorageMb: 5000,
    maxContracts: -1,
    maxCases: -1,
    hasAiFeatures: true,
    hasPwa: true,
    hasLgpd: true,
    hasClm: true,
    hasRiskManagement: true,
    hasLegalRequests: true,
    hasPublicForms: true,
    hasPdfTools: true,
    hasTicketing: false,
  },
  business: {
    maxMembers: -1,
    maxClients: -1,
    maxDocumentsStorageMb: -1,
    maxContracts: -1,
    maxCases: -1,
    hasAiFeatures: true,
    hasPwa: true,
    hasLgpd: true,
    hasClm: true,
    hasRiskManagement: true,
    hasLegalRequests: true,
    hasPublicForms: true,
    hasPdfTools: true,
    hasTicketing: true,
  },
};

export async function getPlanFeatures(lawFirmId: string): Promise<PlanFeatures> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return DEFAULT_PLAN_FEATURES.starter as PlanFeatures;

  const { data: firm } = await supabase
    .from("law_firms")
    .select("plan")
    .eq("id", lawFirmId)
    .single();

  const plan = firm?.plan ?? "starter";
  const planLimits = await getLimitsForPlan(plan);

  return {
    ...DEFAULT_PLAN_FEATURES[plan],
    maxMembers: planLimits.max_members ?? DEFAULT_PLAN_FEATURES[plan]?.maxMembers ?? 5,
    maxClients: planLimits.max_clients ?? DEFAULT_PLAN_FEATURES[plan]?.maxClients ?? 50,
    maxDocumentsStorageMb: planLimits.max_documents_storage_mb ?? DEFAULT_PLAN_FEATURES[plan]?.maxDocumentsStorageMb ?? 500,
    maxContracts: planLimits.max_contracts ?? DEFAULT_PLAN_FEATURES[plan]?.maxContracts ?? 100,
  } as PlanFeatures;
}

export async function hasFeature(lawFirmId: string, featureKey: string): Promise<boolean> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return false;

  const { data: flag } = await supabase
    .from("feature_flags")
    .select("id, enabled_by_default")
    .eq("key", featureKey)
    .single();

  if (!flag) return false;

  const { data: override } = await supabase
    .from("feature_flag_overrides")
    .select("enabled")
    .eq("flag_id", flag.id)
    .eq("law_firm_id", lawFirmId)
    .single();

  return override ? override.enabled : flag.enabled_by_default;
}

export async function checkLimit(
  lawFirmId: string,
  limitKey: string,
  currentValue: number
): Promise<{ allowed: boolean; limit: number; current: number }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { allowed: false, limit: 0, current: currentValue };

  const { data: firm } = await supabase
    .from("law_firms")
    .select("plan, id")
    .eq("id", lawFirmId)
    .single();

  if (!firm) return { allowed: false, limit: 0, current: currentValue };

  // Check per-tenant override first
  const adminClient = getSupabaseAdminClient();
  const { data: override } = await adminClient
    .from("tenant_limit_overrides")
    .select("override_value")
    .eq("law_firm_id", lawFirmId)
    .eq("limit_key", limitKey)
    .single();

  const limit = override?.override_value ?? (await getLimitsForPlan(firm.plan))[limitKey] ?? 0;
  if (limit === -1) return { allowed: true, limit: -1, current: currentValue };

  return { allowed: currentValue < limit, limit, current: currentValue };
}

export async function getUsage(lawFirmId: string) {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const [members, clients, contracts, cases] = await Promise.all([
    supabase.from("law_firm_members").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    supabase.from("contracts").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
    supabase.from("legal_cases").select("id", { count: "exact", head: true }).eq("law_firm_id", lawFirmId),
  ]);

  return {
    members: members.count ?? 0,
    clients: clients.count ?? 0,
    contracts: contracts.count ?? 0,
    cases: cases.count ?? 0,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/billing.ts
git commit -m "feat(admin): add centralized billing service with hasFeature, checkLimit, getUsage"
```

---

## Task 4: Add audit logging helper

**Files:**
- Create: `src/lib/admin/audit.ts`

- [ ] **Step 1: Create audit logging helper**

```typescript
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditAction = {
  adminUserId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
};

export async function logAdminAction(data: AuditAction) {
  const adminClient = getSupabaseAdminClient();
  await adminClient.from("admin_audit_logs").insert({
    admin_user_id: data.adminUserId,
    admin_email: data.adminEmail,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId ?? null,
    entity_name: data.entityName ?? null,
    details: data.details ?? {},
    ip_address: data.ipAddress ?? null,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/admin/audit.ts
git commit -m "feat(admin): add admin audit logging helper"
```

---

## Task 5: Add plan limits management UI

**Files:**
- Create: `src/app/admin/planos/limites/page.tsx`
- Modify: `src/components/layout/admin-sidebar.tsx` (add link)

- [ ] **Step 1: Create plan limits page**

Server component that shows a table of all plan limits (starter, professional, business) with inline editing.

- [ ] **Step 2: Add "Limites" link under Planos in sidebar**

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/planos/limites/page.tsx src/components/layout/admin-sidebar.tsx
git commit -m "feat(admin): add plan limits management UI"
```

---

## Task 6: Add features-per-plan management UI

**Files:**
- Create: `src/app/admin/planos/recursos/page.tsx`

- [ ] **Step 1: Create features per plan page**

Shows which feature flags are enabled/disabled for each plan tier. Uses `getFeatureFlagsForTenant` pattern but at plan level.

- [ ] **Step 2: Commit**

```bash
git add src/app/admin/planos/recursos/page.tsx
git commit -m "feat(admin): add features-per-plan management UI"
```

---

## Task 7: Enhance feature flags page with per-tenant overrides

**Files:**
- Modify: `src/app/admin/feature-flags/page.tsx`
- Create: `src/app/admin/feature-flags/actions.ts` (extend existing)

- [ ] **Step 1: Add per-tenant override section to feature flags page**

Below each flag row, show a section where you can search for a tenant and set an override.

- [ ] **Step 2: Add server action for setting overrides**

Already exists in lib (`setFeatureFlagOverride`), just wire it up.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/feature-flags/page.tsx src/app/admin/feature-flags/actions.ts
git commit -m "feat(admin): add per-tenant feature flag overrides"
```

---

## Task 8: Add trial period management to tenant detail

**Files:**
- Modify: `src/app/admin/escritorios/[id]/page.tsx`
- Create: `src/app/admin/escritorios/actions.ts` (extend)

- [ ] **Step 1: Add trial period section to tenant detail page**

Show trial status (active, expired, not started) with buttons to start/extend/end trial.

- [ ] **Step 2: Add server actions for trial management**

```typescript
export async function startTrialAction(tenantId: string, days: number) { ... }
export async function extendTrialAction(tenantId: string, days: number) { ... }
export async function endTrialAction(tenantId: string) { ... }
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/escritorios/\[id\]/page.tsx src/app/admin/escritorios/actions.ts
git commit -m "feat(admin): add trial period management to tenant detail"
```

---

## Task 9: Add per-tenant limit overrides UI

**Files:**
- Create: `src/app/admin/escritorios/[id]/limites/page.tsx`
- Create: `src/app/admin/escritorios/limites-actions.ts`

- [ ] **Step 1: Create limit overrides page**

Shows current plan limits for the tenant, with ability to override specific limits. Shows current usage vs limit.

- [ ] **Step 2: Create server action for setting/removing overrides**

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/escritorios/\[id\]/limites/ src/app/admin/escritorios/limites-actions.ts
git commit -m "feat(admin): add per-tenant limit overrides UI"
```

---

## Task 10: Enhance admin audit log page

**Files:**
- Modify: `src/app/admin/logs/page.tsx`

- [ ] **Step 1: Add admin_audit_logs tab alongside existing tenant audit logs**

Show platform-level admin actions (suspensions, plan changes, flag toggles, etc.) in addition to tenant-level logs.

- [ ] **Step 2: Add audit logging to existing server actions**

Add `logAdminAction()` calls to: suspendTenantAction, reactivateTenantAction, toggleFeatureFlagAction, changeTenantPlan, savePlanSettings.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/logs/page.tsx src/app/admin/escritorios/actions.ts src/app/admin/feature-flags/actions.ts src/app/admin/planos/actions.ts
git commit -m "feat(admin): enhance audit logging across all admin actions"
```

---

## Task 11: Create billing/plan tests

**Files:**
- Create: `src/lib/admin/billing.test.ts`
- Create: `src/lib/admin/feature-flags.test.ts`
- Create: `src/lib/admin/plan-limits.test.ts`

- [ ] **Step 1: Write billing service tests**

Test: hasFeature returns correct values, checkLimit respects overrides, getUsage returns counts.

- [ ] **Step 2: Write feature flags tests**

Test: isFeatureEnabled with/without overrides, upsert, override CRUD.

- [ ] **Step 3: Write plan limits tests**

Test: getLimitsForPlan, checkPlanLimit, upsert/delete.

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/billing.test.ts src/lib/admin/feature-flags.test.ts src/lib/admin/plan-limits.test.ts
git commit -m "test(admin): add tests for billing, feature flags, and plan limits"
```

---

## Task 12: Typecheck, lint, build

- [ ] **Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Run build**

```bash
npm run build
```

- [ ] **Step 3: Fix any errors**

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```

- [ ] **Step 5: Final commit if needed**

---

## Summary

### Files Created (7)
1. `supabase/migrations/0036_admin_trial_and_overrides.sql`
2. `src/lib/admin/billing.ts`
3. `src/lib/admin/audit.ts`
4. `src/app/admin/planos/limites/page.tsx`
5. `src/app/admin/planos/recursos/page.tsx`
6. `src/app/admin/escritorios/[id]/limites/page.tsx`
7. `src/app/admin/escritorios/limites-actions.ts`

### Files Modified (6)
1. `src/lib/supabase/types.ts`
2. `src/components/layout/admin-sidebar.tsx`
3. `src/app/admin/feature-flags/page.tsx`
4. `src/app/admin/escritorios/[id]/page.tsx`
5. `src/app/admin/escritorios/actions.ts`
6. `src/app/admin/logs/page.tsx`

### Tests Created (3)
1. `src/lib/admin/billing.test.ts`
2. `src/lib/admin/feature-flags.test.ts`
3. `src/lib/admin/plan-limits.test.ts`

### Migration (1)
- `0036_admin_trial_and_overrides.sql`: trial columns, tenant_limit_overrides, admin_audit_logs

### RLS Policies (2)
- `superadmin all tenant_limit_overrides` — full access via `is_superadmin()`
- `superadmin all admin_audit_logs` — full access via `is_superadmin()`

### Functionalities
- Centralized billing service (hasFeature, checkLimit, getUsage)
- Plan limits management UI
- Features-per-plan management UI
- Per-tenant feature flag overrides
- Trial period management (start, extend, end)
- Per-tenant limit overrides
- Enhanced audit logging across all admin actions
- Admin tests for billing, feature flags, plan limits

### Risks
- Trial period doesn't auto-expire (needs a cron or check at login)
- Usage metrics collection is manual (no automated cron yet)
- Assisted access (impersonation) is not fully implemented (session cookie)
- No billing/stripe integration yet (by design — "não implementar cobrança real ainda")

### Pendências
- Automated usage metrics collection (cron job)
- Trial expiration cron/check at login
- Real Stripe integration (deferred to later phase)
- Admin tests for server actions (require Supabase test client)

### Próximo Bloco Recomendado
**Bloco 3** — Integrações e Automações (webhooks, emails transacionais, cron jobs de métricas)
