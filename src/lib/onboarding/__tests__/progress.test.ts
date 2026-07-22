import { describe, expect, it } from "vitest";

import {
  GROUP_LABELS,
  INVITATION_STATUSES,
  ONBOARDING_STEPS,
  OnboardingStepKey,
  PROFILE_LABELS,
  PROFILE_RECOMMENDED_STEPS,
  REQUIRED_STEPS,
  TOTAL_STEPS,
} from "@/lib/onboarding/constants";

// ── Constantes ────────────────────────────────────────────────────────────────

describe("ONBOARDING_STEPS", () => {
  it("possui exatamente 18 steps", () => {
    expect(ONBOARDING_STEPS).toHaveLength(18);
  });

  it("cada step possui as chaves required, label e group", () => {
    for (const step of ONBOARDING_STEPS) {
      expect(step).toHaveProperty("required");
      expect(step).toHaveProperty("label");
      expect(step).toHaveProperty("group");
      expect(typeof step.required).toBe("boolean");
      expect(typeof step.label).toBe("string");
      expect(step.label.length).toBeGreaterThan(0);
    }
  });

  it("todas as keys são únicas", () => {
    const keys = ONBOARDING_STEPS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// ── TOTAL_STEPS ───────────────────────────────────────────────────────────────

describe("TOTAL_STEPS", () => {
  it("iguala o tamanho de ONBOARDING_STEPS", () => {
    expect(TOTAL_STEPS).toBe(18);
    expect(TOTAL_STEPS).toBe(ONBOARDING_STEPS.length);
  });
});

// ── REQUIRED_STEPS ────────────────────────────────────────────────────────────

describe("REQUIRED_STEPS", () => {
  it("contém exatamente 4 steps obrigatórios", () => {
    expect(REQUIRED_STEPS).toHaveLength(4);
  });

  it("contém os steps corretos", () => {
    expect(REQUIRED_STEPS).toEqual([
      "office_data",
      "practice_areas",
      "professional_oab",
      "process_types",
    ]);
  });

  it("cada step obrigatório está marcado como required no ONBOARDING_STEPS", () => {
    for (const stepKey of REQUIRED_STEPS) {
      const step = ONBOARDING_STEPS.find((s) => s.key === stepKey);
      expect(step).toBeDefined();
      expect(step!.required).toBe(true);
    }
  });

  it("todos os required steps existem no ONBOARDING_STEPS", () => {
    const allKeys = ONBOARDING_STEPS.map((s) => s.key);
    for (const key of REQUIRED_STEPS) {
      expect(allKeys).toContain(key);
    }
  });
});

// ── GROUP_LABELS ──────────────────────────────────────────────────────────────

describe("GROUP_LABELS", () => {
  it("possui labels para os 4 grupos", () => {
    const groupKeys = Object.keys(GROUP_LABELS);
    expect(groupKeys).toHaveLength(4);
    expect(groupKeys).toEqual(
      expect.arrayContaining(["setup", "team", "financial", "usage"]),
    );
  });

  it("cada grupo tem um label não vazio", () => {
    for (const [group, label] of Object.entries(GROUP_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("todos os groups usados nos steps estão cobertos", () => {
    const usedGroups = new Set(ONBOARDING_STEPS.map((s) => s.group));
    for (const group of usedGroups) {
      expect(GROUP_LABELS).toHaveProperty(group);
    }
  });
});

// ── PROFILE_LABELS ────────────────────────────────────────────────────────────

describe("PROFILE_LABELS", () => {
  it("possui labels para os 4 perfis", () => {
    const profileKeys = Object.keys(PROFILE_LABELS);
    expect(profileKeys).toHaveLength(4);
    expect(profileKeys).toEqual(
      expect.arrayContaining(["individual", "small", "team", "department"]),
    );
  });

  it("cada perfil tem um label não vazio", () => {
    for (const [profile, label] of Object.entries(PROFILE_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.length).toBeGreaterThan(0);
    }
  });
});

// ── PROFILE_RECOMMENDED_STEPS ─────────────────────────────────────────────────

describe("PROFILE_RECOMMENDED_STEPS", () => {
  it("possui entries para os 4 perfis", () => {
    const profileKeys = Object.keys(PROFILE_RECOMMENDED_STEPS);
    expect(profileKeys).toHaveLength(4);
    expect(profileKeys).toEqual(
      expect.arrayContaining(["individual", "small", "team", "department"]),
    );
  });

  it("todos os steps recomendados são chaves válidas", () => {
    const validKeys = ONBOARDING_STEPS.map((s) => s.key);
    for (const [profile, steps] of Object.entries(PROFILE_RECOMMENDED_STEPS)) {
      for (const stepKey of steps) {
        expect(validKeys).toContain(stepKey);
      }
    }
  });

  it("individual tem menos steps que team/department", () => {
    expect(PROFILE_RECOMMENDED_STEPS.individual.length).toBeLessThan(
      PROFILE_RECOMMENDED_STEPS.team.length,
    );
  });

  it("individual inclui todos os required steps", () => {
    for (const req of REQUIRED_STEPS) {
      expect(PROFILE_RECOMMENDED_STEPS.individual).toContain(req);
    }
  });
});

// ── INVITATION_STATUSES ──────────────────────────────────────────────────────

describe("INVITATION_STATUSES", () => {
  it("possui exatamente 6 statuses", () => {
    expect(INVITATION_STATUSES).toHaveLength(6);
  });

  it("contém todos os statuses esperados", () => {
    expect(INVITATION_STATUSES).toEqual(
      expect.arrayContaining([
        "pendente",
        "visualizado",
        "aceito",
        "expirado",
        "cancelado",
        "recusado",
      ]),
    );
  });
});

// ── calculateProgress ─────────────────────────────────────────────────────────

describe("calculateProgress", () => {
  it("retorna 0% quando nenhum step foi concluído", async () => {
    const { calculateProgress } = await import("@/lib/onboarding/queries");
    const session = {
      id: "session-1",
      user_id: "user-1",
      organization_id: "org-1",
      current_step: "office_data" as const,
      completed_steps: [],
      profile: "individual",
      started_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
    };

    const progress = await calculateProgress(session);
    expect(progress.percentage).toBe(0);
    expect(progress.completed_count).toBe(0);
    expect(progress.required_completed).toBe(0);
    expect(progress.required_total).toBe(4);
    expect(progress.total_steps).toBe(18);
    expect(progress.next_step).toBe("office_data");
  });

  it("retorna 100% quando todos os steps foram concluídos", async () => {
    const { calculateProgress } = await import("@/lib/onboarding/queries");
    const allSteps = ONBOARDING_STEPS.map((s) => s.key);
    const session = {
      id: "session-2",
      user_id: "user-1",
      organization_id: "org-1",
      current_step: null,
      completed_steps: allSteps,
      profile: "team",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const progress = await calculateProgress(session);
    expect(progress.percentage).toBe(100);
    expect(progress.completed_count).toBe(18);
    expect(progress.required_completed).toBe(4);
    expect(progress.next_step).toBeNull();
  });

  it("calcula porcentagem parcial corretamente", async () => {
    const { calculateProgress } = await import("@/lib/onboarding/queries");
    const session = {
      id: "session-3",
      user_id: "user-1",
      organization_id: "org-1",
      current_step: "branding" as const,
      completed_steps: ["office_data", "practice_areas"] as OnboardingStepKey[],
      profile: "small",
      started_at: new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
    };

    const progress = await calculateProgress(session);
    expect(progress.completed_count).toBe(2);
    expect(progress.percentage).toBe(Math.round((2 / 18) * 100));
    expect(progress.required_completed).toBe(2);
    expect(progress.next_step).toBeDefined();
  });

  it("retorna next_step como null quando tudo está completo", async () => {
    const { calculateProgress } = await import("@/lib/onboarding/queries");
    const session = {
      id: "session-4",
      user_id: "user-1",
      organization_id: "org-1",
      current_step: null,
      completed_steps: ONBOARDING_STEPS.map((s) => s.key),
      profile: "department",
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const progress = await calculateProgress(session);
    expect(progress.next_step).toBeNull();
  });
});
