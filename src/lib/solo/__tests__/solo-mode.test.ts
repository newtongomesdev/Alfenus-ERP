import { describe, it, expect } from "vitest";

import { getVisibleModules, getRecommendedModules } from "@/lib/solo/service";
import { SOLO_DEFAULT_MODULES, SOLO_HIDDEN_MODULES, MODULE_INFO } from "@/lib/solo/constants";
import { soloNavigationSections } from "@/components/layout/navigation-solo";
import { DEFAULT_PLAN_FEATURES } from "@/lib/admin/billing";
import type { InterfaceMode, ModuleKey, OperationProfile } from "@/lib/solo/types";

// ─── getVisibleModules ─────────────────────────────────────────────

describe("getVisibleModules", () => {
  it("returns all modules in completa mode except hidden ones", () => {
    const result = getVisibleModules("completa", [], []);
    expect(result.length).toBe(Object.keys(MODULE_INFO).length);
  });

  it("excludes hidden modules in completa mode", () => {
    const hidden: ModuleKey[] = ["admin", "equipe"];
    const result = getVisibleModules("completa", [], hidden);
    expect(result).not.toContain("admin");
    expect(result).not.toContain("equipe");
    expect(result).toContain("clientes");
  });

  it("returns only default solo modules in simples mode", () => {
    const result = getVisibleModules("simples", [], []);
    expect(result.length).toBe(SOLO_DEFAULT_MODULES.length);
    for (const mod of SOLO_DEFAULT_MODULES) {
      expect(result).toContain(mod);
    }
  });

  it("adds explicitly enabled modules in simples mode", () => {
    const enabled: ModuleKey[] = ["equipe", "horas"];
    const result = getVisibleModules("simples", enabled, []);
    expect(result).toContain("equipe");
    expect(result).toContain("horas");
  });

  it("removes explicitly hidden modules in simples mode", () => {
    const hidden: ModuleKey[] = ["documentos", "modelos"];
    const result = getVisibleModules("simples", [], hidden);
    expect(result).not.toContain("documentos");
    expect(result).not.toContain("modelos");
  });

  it("uses enabled_modules in personalizada mode", () => {
    const enabled: ModuleKey[] = ["clientes", "processos", "prazos"];
    const result = getVisibleModules("personalizada", enabled, []);
    expect(result).toEqual(["clientes", "processos", "prazos"]);
  });

  it("excludes hidden from enabled in personalizada mode", () => {
    const enabled: ModuleKey[] = ["clientes", "processos", "prazos"];
    const hidden: ModuleKey[] = ["prazos"];
    const result = getVisibleModules("personalizada", enabled, hidden);
    expect(result).toContain("clientes");
    expect(result).toContain("processos");
    expect(result).not.toContain("prazos");
  });

  it("falls back to all modules in personalizada when no enabled set", () => {
    const result = getVisibleModules("personalizada", [], []);
    expect(result.length).toBe(Object.keys(MODULE_INFO).length);
  });

  it("never includes hidden_modules in any mode", () => {
    const hidden: ModuleKey[] = SOLO_HIDDEN_MODULES.slice(0, 5);
    for (const mode of ["simples", "completa", "personalizada"] as InterfaceMode[]) {
      const result = getVisibleModules(mode, [], hidden);
      for (const h of hidden) {
        expect(result).not.toContain(h);
      }
    }
  });
});

// ─── getRecommendedModules ─────────────────────────────────────────

describe("getRecommendedModules", () => {
  it("returns limited set for advogado_independente", () => {
    const result = getRecommendedModules("advogado_independente");
    expect(result).toContain("meu_dia");
    expect(result).toContain("clientes");
    expect(result).toContain("processos");
    expect(result).toContain("recibos");
    expect(result).toContain("propostas");
    expect(result).toContain("retornos");
    expect(result).not.toContain("controladoria");
    expect(result).not.toContain("clm");
  });

  it("returns broader set for escritorio_pequeno", () => {
    const result = getRecommendedModules("escritorio_pequeno");
    expect(result).toContain("equipe");
    expect(result).toContain("despesas");
    expect(result).toContain("horas");
  });

  it("returns all modules for escritorio_com_equipe", () => {
    const result = getRecommendedModules("escritorio_com_equipe");
    expect(result.length).toBe(Object.keys(MODULE_INFO).length);
  });

  it("returns all modules for departamento_juridico", () => {
    const result = getRecommendedModules("departamento_juridico");
    expect(result.length).toBe(Object.keys(MODULE_INFO).length);
  });

  it("returns all modules for personalizado", () => {
    const result = getRecommendedModules("personalizado");
    expect(result.length).toBe(Object.keys(MODULE_INFO).length);
  });
});

// ─── Navigation structure ──────────────────────────────────────────

describe("solo navigation", () => {
  it("has exactly 4 sections", () => {
    expect(soloNavigationSections.length).toBe(4);
  });

  it("has 'Principal' as first section with core items", () => {
    const principal = soloNavigationSections[0];
    expect(principal.label).toBe("Principal");
    const hrefs = principal.items.map((i) => i.href);
    expect(hrefs).toContain("/meu-dia");
    expect(hrefs).toContain("/clientes");
    expect(hrefs).toContain("/processos");
    expect(hrefs).toContain("/agenda");
  });

  it("does not contain enterprise-only modules", () => {
    const allHrefs = soloNavigationSections
      .flatMap((s) => s.items)
      .map((i) => i.href);
    expect(allHrefs).not.toContain("/controladoria");
    expect(allHrefs).not.toContain("/clm");
    expect(allHrefs).not.toContain("/valores-clientes");
    expect(allHrefs).not.toContain("/correspondentes");
    expect(allHrefs).not.toContain("/workflows");
    expect(allHrefs).not.toContain("/risco");
  });

  it("has all solo default modules represented", () => {
    const allHrefs = soloNavigationSections
      .flatMap((s) => s.items)
      .map((i) => i.href);

    // Map module keys to expected hrefs
    const expectedHrefs: Record<string, string> = {
      meu_dia: "/meu-dia",
      clientes: "/clientes",
      processos: "/processos",
      agenda: "/agenda",
      financeiro: "/recebimentos",
      documentos: "/documentos",
      tarefas: "/tarefas",
      modelos: "/documentos/modelos",
      relatorios: "/relatorios",
      configuracoes: "/configuracoes",
      notificacoes: "/notificacoes",
      propostas: "/propostas",
      recibos: "/recibos",
      retornos: "/retornos",
      fichas_atendimento: "/atendimentos",
      despesas: "/despesas",
    };

    for (const [key, href] of Object.entries(expectedHrefs)) {
      expect(allHrefs, `Module ${key} should have href ${href}`).toContain(href);
    }
  });
});

// ─── Solo plan features ────────────────────────────────────────────

describe("solo plan features", () => {
  it("has solo in DEFAULT_PLAN_FEATURES", () => {
    expect(DEFAULT_PLAN_FEATURES.solo).toBeDefined();
  });

  it("solo plan limits to 1 member", () => {
    expect(DEFAULT_PLAN_FEATURES.solo.maxMembers).toBe(1);
  });

  it("solo plan has essential features enabled", () => {
    expect(DEFAULT_PLAN_FEATURES.solo.hasPdfTools).toBe(true);
  });

  it("solo plan has enterprise features disabled", () => {
    expect(DEFAULT_PLAN_FEATURES.solo.hasAiFeatures).toBe(false);
    expect(DEFAULT_PLAN_FEATURES.solo.hasClm).toBe(false);
    expect(DEFAULT_PLAN_FEATURES.solo.hasRiskManagement).toBe(false);
    expect(DEFAULT_PLAN_FEATURES.solo.hasLegalRequests).toBe(false);
    expect(DEFAULT_PLAN_FEATURES.solo.hasTicketing).toBe(false);
  });
});

// ─── Module constants integrity ────────────────────────────────────

describe("solo module constants", () => {
  it("SOLO_DEFAULT_MODULES does not overlap with SOLO_HIDDEN_MODULES", () => {
    const overlap = SOLO_DEFAULT_MODULES.filter((m) => SOLO_HIDDEN_MODULES.includes(m));
    expect(overlap).toEqual([]);
  });

  it("all SOLO_DEFAULT_MODULES exist in MODULE_INFO", () => {
    for (const mod of SOLO_DEFAULT_MODULES) {
      expect(MODULE_INFO[mod]).toBeDefined();
    }
  });

  it("all SOLO_HIDDEN_MODULES exist in MODULE_INFO", () => {
    for (const mod of SOLO_HIDDEN_MODULES) {
      expect(MODULE_INFO[mod]).toBeDefined();
    }
  });

  it("MODULE_INFO entries have valid structure", () => {
    for (const [key, info] of Object.entries(MODULE_INFO)) {
      expect(info.name.length).toBeGreaterThan(0);
      expect(info.description.length).toBeGreaterThan(0);
      expect(info.icon.length).toBeGreaterThan(0);
    }
  });
});
