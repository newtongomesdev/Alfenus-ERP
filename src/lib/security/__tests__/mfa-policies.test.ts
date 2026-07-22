import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock de dependências
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  isMfaRequired,
  isUserInsideGracePeriod,
  requiresStepUpAuthentication,
  canTrustDevice,
  isRoleInHierarchy,
} from "../mfa-policies";
import type { Role } from "@/lib/auth/permissions";

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockQueryBuilder(data: unknown, error: unknown = null) {
  const qb: Record<string, any> = {};
  const methods = [
    "select",
    "eq",
    "neq",
    "maybeSingle",
    "single",
    "order",
    "limit",
  ];
  for (const method of methods) {
    qb[method] = vi.fn().mockReturnValue(qb);
  }
  qb.then = (
    resolve: (value: { data: unknown; error: unknown }) => unknown,
  ) => {
    resolve({ data, error });
  };
  return qb;
}

const mockFrom = vi.fn();

function mockSecurityPolicy(overrides: Record<string, unknown> = {}) {
  const defaultPolicy = {
    id: "policy-1",
    law_firm_id: "firm-1",
    mfa_enforcement_mode: "desabilitado",
    mfa_required_roles: [],
    mfa_required_user_ids: [],
    mfa_grace_period_days: 0,
    mfa_enforcement_start_at: null,
    mfa_allow_trusted_devices: true,
    mfa_trusted_device_duration_days: 30,
    mfa_require_step_up: true,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };

  const policyQb = createMockQueryBuilder(defaultPolicy);
  mockFrom.mockReturnValueOnce(policyQb);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// isMfaRequired
// ---------------------------------------------------------------------------
describe("isMfaRequired", () => {
  it("retorna false para modo 'desabilitado'", async () => {
    mockSecurityPolicy({ mfa_enforcement_mode: "desabilitado" });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isMfaRequired("user-1", "advogado", "firm-1");
    expect(result).toBe(false);
  });

  it("retorna true para modo 'obrigatorio_todos'", async () => {
    mockSecurityPolicy({ mfa_enforcement_mode: "obrigatorio_todos" });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isMfaRequired("user-1", "advogado", "firm-1");
    expect(result).toBe(true);
  });

  it("verifica papéis no modo 'obrigatorio_roles'", async () => {
    mockSecurityPolicy({
      mfa_enforcement_mode: "obrigatorio_roles",
      mfa_required_roles: ["advogado", "administrador"],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    // Advogado está na lista → true
    const resultAdv = await isMfaRequired("user-1", "advogado", "firm-1");
    expect(resultAdv).toBe(true);
  });

  it("retorna false para papel não listado no modo 'obrigatorio_roles'", async () => {
    mockSecurityPolicy({
      mfa_enforcement_mode: "obrigatorio_roles",
      mfa_required_roles: ["advogado", "administrador"],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    // Colaborador NÃO está na lista → false
    const resultColab = await isMfaRequired(
      "user-1",
      "colaborador",
      "firm-1"
    );
    expect(resultColab).toBe(false);
  });

  it("verifica IDs de usuário no modo 'obrigatorio_usuarios'", async () => {
    mockSecurityPolicy({
      mfa_enforcement_mode: "obrigatorio_usuarios",
      mfa_required_user_ids: ["user-1", "user-2"],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isMfaRequired("user-1", "advogado", "firm-1");
    expect(result).toBe(true);
  });

  it("retorna false para usuário não listado no modo 'obrigatorio_usuarios'", async () => {
    mockSecurityPolicy({
      mfa_enforcement_mode: "obrigatorio_usuarios",
      mfa_required_user_ids: ["user-1", "user-2"],
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isMfaRequired("user-99", "advogado", "firm-1");
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isUserInsideGracePeriod
// ---------------------------------------------------------------------------
describe("isUserInsideGracePeriod", () => {
  it("retorna dias restantes corretos dentro do período de carência", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // 3 dias atrás
    const enforcementStart = startDate.toISOString();

    mockSecurityPolicy({
      mfa_grace_period_days: 7,
      mfa_enforcement_start_at: enforcementStart,
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isUserInsideGracePeriod("user-1", "firm-1");
    expect(result.insideGrace).toBe(true);
    expect(result.daysRemaining).toBeGreaterThanOrEqual(3);
    expect(result.daysRemaining).toBeLessThanOrEqual(5);
  });

  it("retorna false após o prazo de carência", async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 dias atrás

    mockSecurityPolicy({
      mfa_grace_period_days: 7,
      mfa_enforcement_start_at: startDate.toISOString(),
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isUserInsideGracePeriod("user-1", "firm-1");
    expect(result.insideGrace).toBe(false);
    expect(result.daysRemaining).toBe(0);
  });

  it("retorna false quando não há data de início", async () => {
    mockSecurityPolicy({
      mfa_grace_period_days: 7,
      mfa_enforcement_start_at: null,
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isUserInsideGracePeriod("user-1", "firm-1");
    expect(result.insideGrace).toBe(false);
    expect(result.daysRemaining).toBe(0);
  });

  it("retorna false quando período de carência é zero", async () => {
    mockSecurityPolicy({
      mfa_grace_period_days: 0,
      mfa_enforcement_start_at: new Date().toISOString(),
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await isUserInsideGracePeriod("user-1", "firm-1");
    expect(result.insideGrace).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requiresStepUpAuthentication
// ---------------------------------------------------------------------------
describe("requiresStepUpAuthentication", () => {
  it("retorna true para ação financeira quando step-up está habilitado", async () => {
    mockSecurityPolicy({ mfa_require_step_up: true });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await requiresStepUpAuthentication("financial", "firm-1");
    expect(result).toBe(true);
  });

  it("retorna false quando step-up não está configurado", async () => {
    mockSecurityPolicy({ mfa_require_step_up: false });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await requiresStepUpAuthentication("financial", "firm-1");
    expect(result).toBe(false);
  });

  it("retorna true para exportação", async () => {
    mockSecurityPolicy({ mfa_require_step_up: true });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await requiresStepUpAuthentication("export", "firm-1");
    expect(result).toBe(true);
  });

  it("retorna true para alteração de permissão", async () => {
    mockSecurityPolicy({ mfa_require_step_up: true });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await requiresStepUpAuthentication(
      "permission_change",
      "firm-1"
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canTrustDevice
// ---------------------------------------------------------------------------
describe("canTrustDevice", () => {
  it("retorna duração da política de dispositivos confiáveis", async () => {
    mockSecurityPolicy({
      mfa_allow_trusted_devices: true,
      mfa_trusted_device_duration_days: 14,
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await canTrustDevice("firm-1");
    expect(result.allowed).toBe(true);
    expect(result.durationDays).toBe(14);
  });

  it("retorna allowed=false quando dispositivos confiáveis estão desabilitados", async () => {
    mockSecurityPolicy({
      mfa_allow_trusted_devices: false,
      mfa_trusted_device_duration_days: 30,
    });

    (getSupabaseAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const result = await canTrustDevice("firm-1");
    expect(result.allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isRoleInHierarchy
// ---------------------------------------------------------------------------
describe("isRoleInHierarchy", () => {
  it("retorna true quando role1 é igual a role2", () => {
    expect(isRoleInHierarchy("advogado", "advogado")).toBe(true);
  });

  it("retorna true quando role1 está acima de role2", () => {
    expect(isRoleInHierarchy("administrador", "advogado")).toBe(true);
    expect(isRoleInHierarchy("proprietario", "advogado")).toBe(true);
    expect(isRoleInHierarchy("advogado", "colaborador")).toBe(true);
  });

  it("retorna false quando role1 está abaixo de role2", () => {
    expect(isRoleInHierarchy("colaborador", "advogado")).toBe(false);
    expect(isRoleInHierarchy("visualizador", "proprietario")).toBe(false);
    expect(isRoleInHierarchy("assistente", "administrador")).toBe(false);
  });

  it("retorna true para proprietario acima de todos", () => {
    const roles: Role[] = [
      "visualizador",
      "colaborador",
      "assistente",
      "financeiro",
      "advogado",
      "administrador",
    ];
    for (const role of roles) {
      expect(isRoleInHierarchy("proprietario", role)).toBe(true);
    }
  });

  it("retorna true para visualizador igual ou abaixo de visualizador", () => {
    expect(isRoleInHierarchy("visualizador", "visualizador")).toBe(true);
    expect(isRoleInHierarchy("colaborador", "visualizador")).toBe(true);
  });
});
