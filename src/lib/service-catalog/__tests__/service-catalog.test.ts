import { vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { describe, it, expect } from "vitest";
import type {
  ServiceCatalogRow,
  ServiceOverview,
  ServiceFormInput,
  ServiceStatus,
  ChargingModel,
  DurationUnit,
} from "../types";

// ── Type tests ──────────────────────────────────────────────

describe("service-catalog/types", () => {
  it("creates a valid ServiceCatalogRow", () => {
    const row: ServiceCatalogRow = {
      id: "123",
      law_firm_id: "firm-1",
      name: "Consulta Inicial",
      slug: "consulta-inicial",
      practice_area: "civel",
      category: "servico",
      short_description: "Análise preliminar",
      public_description: "Primeira consulta",
      internal_description: "Descrição interna",
      scope_included: "Análise, parecer",
      scope_excluded: "Ação judicial",
      estimated_duration: 1,
      duration_unit: "dias",
      estimated_hours: 2,
      reference_value_cents: 30000,
      min_value_cents: 20000,
      max_value_cents: 50000,
      currency: "BRL",
      charging_model: "fixo",
      default_upfront_cents: 10000,
      default_installments: 3,
      success_fee_percentage: 10,
      included_expenses: "Nenhum",
      excluded_expenses: "Custas judiciais",
      required_documents: "Identidade, CPF",
      suggested_steps: "1. Consulta; 2. Análise",
      estimated_deadline: 7,
      deadline_unit: "dias",
      proposal_template_id: null,
      contract_template_id: null,
      checklist_template_id: null,
      status: "rascunho",
      sort_order: 1,
      is_favorite: false,
      is_platform_library: false,
      created_by: "user-1",
      created_at: "2026-07-22T00:00:00Z",
      updated_at: "2026-07-22T00:00:00Z",
      archived_at: null,
    };

    expect(row.status).toBe("rascunho");
    expect(row.reference_value_cents).toBe(30000);
    expect(row.is_platform_library).toBe(false);
  });

  it("creates a valid ServiceOverview", () => {
    const overview: ServiceOverview = {
      id: "123",
      name: "Consulta Inicial",
      slug: "consulta-inicial",
      practice_area: "civel",
      short_description: "Análise preliminar",
      reference_value_cents: 30000,
      charging_model: "fixo",
      status: "ativo",
      is_favorite: true,
      is_platform_library: false,
      created_at: "2026-07-22T00:00:00Z",
      updated_at: "2026-07-22T00:00:00Z",
      archived_at: null,
    };

    expect(overview.status).toBe("ativo");
    expect(overview.is_favorite).toBe(true);
  });

  it("creates a valid ServiceFormInput", () => {
    const input: ServiceFormInput = {
      name: "Test Service",
      slug: "test-service",
      practice_area: "trabalhista",
    };

    expect(input.name).toBe("Test Service");
    expect(input.practice_area).toBe("trabalhista");
  });

  it("validates ServiceStatus types", () => {
    const statuses: ServiceStatus[] = ["rascunho", "ativo", "inativo", "arquivado"];
    expect(statuses).toHaveLength(4);
    statuses.forEach((s) => expect(["rascunho", "ativo", "inativo", "arquivado"]).toContain(s));
  });

  it("validates ChargingModel types", () => {
    const models: ChargingModel[] = [
      "consulta",
      "fixo",
      "parcelado",
      "mensalidade",
      "por_hora",
      "por_atividade",
      "exito",
      "hibrido",
      "personalizado",
    ];
    expect(models).toHaveLength(9);
  });

  it("validates DurationUnit types", () => {
    const units: DurationUnit[] = ["horas", "dias", "semanas", "meses"];
    expect(units).toHaveLength(4);
  });
});

// ── Constants tests ──────────────────────────────────────────

describe("service-catalog/constants", () => {
  it("exports SERVICE_STATUS_CONFIG with all statuses", async () => {
    const { SERVICE_STATUS_CONFIG } = await import("../constants");
    expect(Object.keys(SERVICE_STATUS_CONFIG)).toHaveLength(4);
    expect(SERVICE_STATUS_CONFIG.ativo.label).toBe("Ativo");
    expect(SERVICE_STATUS_CONFIG.rascunho.label).toBe("Rascunho");
  });

  it("exports SERVICE_CHARGING_MODELS with all charging types", async () => {
    const { SERVICE_CHARGING_MODELS } = await import("../constants");
    expect(SERVICE_CHARGING_MODELS).toHaveLength(9);
    expect(SERVICE_CHARGING_MODELS.map((m) => m.value)).toContain("fixo");
    expect(SERVICE_CHARGING_MODELS.map((m) => m.value)).toContain("exito");
  });

  it("exports SERVICE_PRACTICE_AREAS with 11 areas", async () => {
    const { SERVICE_PRACTICE_AREAS } = await import("../constants");
    expect(SERVICE_PRACTICE_AREAS).toHaveLength(11);
  });

  it("exports DURATION_UNITS with 4 units", async () => {
    const { DURATION_UNITS } = await import("../constants");
    expect(DURATION_UNITS).toHaveLength(4);
    expect(DURATION_UNITS.map((u) => u.value)).toContain("dias");
    expect(DURATION_UNITS.map((u) => u.value)).toContain("meses");
  });

  it("exports SERVICE_CATEGORIES with 6 categories", async () => {
    const { SERVICE_CATEGORIES } = await import("../constants");
    expect(SERVICE_CATEGORIES).toHaveLength(6);
    expect(SERVICE_CATEGORIES.map((c) => c.value)).toContain("servico");
    expect(SERVICE_CATEGORIES.map((c) => c.value)).toContain("assessoria");
  });

  it("has empty state messages", async () => {
    const { SERVICE_EMPTY_STATE } = await import("../constants");
    expect(SERVICE_EMPTY_STATE.title).toBe("Nenhum serviço cadastrado");
    expect(SERVICE_EMPTY_STATE.action).toBe("Novo Serviço");
    expect(SERVICE_EMPTY_STATE.href).toBe("/servicos/novo");
  });

  it("has platform disclaimer", async () => {
    const { SERVICE_PLATFORM_DISCLAIMER } = await import("../constants");
    expect(SERVICE_PLATFORM_DISCLAIMER).toContain("organização interna");
    expect(SERVICE_PLATFORM_DISCLAIMER).toContain("estratégia profissional");
  });
});

// ── Actions tests (mocked) ──────────────────────────────────

describe("service-catalog/actions", () => {
  it("exports required action functions", async () => {
    const actions = await import("../actions");
    expect(typeof actions.createServiceAction).toBe("function");
    expect(typeof actions.updateServiceAction).toBe("function");
    expect(typeof actions.updateServiceStatusAction).toBe("function");
    expect(typeof actions.archiveServiceAction).toBe("function");
    expect(typeof actions.restoreServiceAction).toBe("function");
    expect(typeof actions.toggleServiceFavoriteAction).toBe("function");
    expect(typeof actions.duplicateServiceAction).toBe("function");
  });
});

// ── Query tests (mocked) ────────────────────────────────────

describe("service-catalog/queries", () => {
  it("exports required query functions", async () => {
    const queries = await import("../queries");
    expect(typeof queries.getServices).toBe("function");
    expect(typeof queries.getServiceDetail).toBe("function");
    expect(typeof queries.getPlatformServices).toBe("function");
    expect(typeof queries.duplicateService).toBe("function");
  });
});