import { describe, it, expect } from "vitest";

/**
 * Tests for onboarding profile mapping.
 *
 * The onboarding page sends profile keys: individual, small, team, department.
 * The DB expects: advogado_independente, escritorio_pequeno, escritorio_com_equipe, departamento_juridico.
 *
 * These tests verify the mapping logic that should be applied in onboarding/actions.ts.
 * The mapping is tested here as pure logic; the actual action is a server action.
 */

const PROFILE_MAP: Record<string, string> = {
  individual: "advogado_independente",
  small: "escritorio_pequeno",
  team: "escritorio_com_equipe",
  department: "departamento_juridico",
};

function mapProfile(onboardingKey: string): string {
  return PROFILE_MAP[onboardingKey] ?? "escritorio_com_equipe";
}

function shouldUseSimpleMode(mappedProfile: string): boolean {
  return mappedProfile === "advogado_independente";
}

describe("onboarding profile mapping", () => {
  it("maps individual to advogado_independente", () => {
    expect(mapProfile("individual")).toBe("advogado_independente");
  });

  it("maps small to escritorio_pequeno", () => {
    expect(mapProfile("small")).toBe("escritorio_pequeno");
  });

  it("maps team to escritorio_com_equipe", () => {
    expect(mapProfile("team")).toBe("escritorio_com_equipe");
  });

  it("maps department to departamento_juridico", () => {
    expect(mapProfile("department")).toBe("departamento_juridico");
  });

  it("falls back to escritorio_com_equipe for unknown keys", () => {
    expect(mapProfile("unknown")).toBe("escritorio_com_equipe");
    expect(mapProfile("")).toBe("escritorio_com_equipe");
  });

  it("individual profile activates simple mode", () => {
    expect(shouldUseSimpleMode(mapProfile("individual"))).toBe(true);
  });

  it("small profile does NOT activate simple mode", () => {
    expect(shouldUseSimpleMode(mapProfile("small"))).toBe(false);
  });

  it("team profile does NOT activate simple mode", () => {
    expect(shouldUseSimpleMode(mapProfile("team"))).toBe(false);
  });

  it("department profile does NOT activate simple mode", () => {
    expect(shouldUseSimpleMode(mapProfile("department"))).toBe(false);
  });
});

describe("operation_profile values in DB are valid", () => {
  const VALID_PROFILES = [
    "advogado_independente",
    "escritorio_pequeno",
    "escritorio_com_equipe",
    "departamento_juridico",
    "personalizado",
  ];

  it("all mapped profiles are valid", () => {
    for (const [, mapped] of Object.entries(PROFILE_MAP)) {
      expect(VALID_PROFILES).toContain(mapped);
    }
  });
});
