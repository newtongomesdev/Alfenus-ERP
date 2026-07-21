import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_ASSISTED_ACCESS_STATE,
  calculateTimeRemaining,
  isSessionActive,
  isReadOnlyScope,
  isModuleAuthorized,
  isActionAuthorized,
  type AssistedAccessState,
} from "../context";

// ── Estado padrão do contexto ───────────────────────────────────────────────

describe("DEFAULT_ASSISTED_ACCESS_STATE", () => {
  it("session é null por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.session).toBeNull();
  });

  it("operator é null por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.operator).toBeNull();
  });

  it("tenant é null por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.tenant).toBeNull();
  });

  it("ticket é null por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.ticket).toBeNull();
  });

  it("scopes tem arrays vazios por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.scopes.modules).toEqual([]);
    expect(DEFAULT_ASSISTED_ACCESS_STATE.scopes.actions).toEqual([]);
    expect(DEFAULT_ASSISTED_ACCESS_STATE.scopes.restrictions).toEqual([]);
  });

  it("timeRemaining é 0 por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.timeRemaining).toBe(0);
  });

  it("isActive é false por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.isActive).toBe(false);
  });

  it("readOnly é true por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.readOnly).toBe(true);
  });

  it("allowedModules é array vazio por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.allowedModules).toEqual([]);
  });

  it("allowedActions é array vazio por padrão", () => {
    expect(DEFAULT_ASSISTED_ACCESS_STATE.allowedActions).toEqual([]);
  });

  it("possui todas as 10 propriedades esperadas", () => {
    const keys = Object.keys(DEFAULT_ASSISTED_ACCESS_STATE);
    expect(keys).toHaveLength(10);
    expect(keys).toContain("session");
    expect(keys).toContain("operator");
    expect(keys).toContain("tenant");
    expect(keys).toContain("ticket");
    expect(keys).toContain("scopes");
    expect(keys).toContain("timeRemaining");
    expect(keys).toContain("isActive");
    expect(keys).toContain("readOnly");
    expect(keys).toContain("allowedModules");
    expect(keys).toContain("allowedActions");
  });
});

// ── Cálculo de tempo restante ────────────────────────────────────────────────

describe("calculateTimeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna minutos restantes para expiração futura", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T11:00:00Z").toISOString(); // +60min
    expect(calculateTimeRemaining(expiresAt)).toBe(60);
  });

  it("retorna 0 quando a sessão já expirou", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const expiresAt = new Date("2025-01-01T11:00:00Z").toISOString(); // -60min
    expect(calculateTimeRemaining(expiresAt)).toBe(0);
  });

  it("retorna 1 minuto para expiração em 30 segundos (arredonda para cima)", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T10:00:30Z").toISOString(); // +30s
    expect(calculateTimeRemaining(expiresAt)).toBe(1);
  });

  it("retorna minutos exatos para expiração em múltiplos de 60s", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T10:05:00Z").toISOString(); // +5min
    expect(calculateTimeRemaining(expiresAt)).toBe(5);
  });

  it("retorna 0 para expiração exata no momento atual", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T10:00:00Z").toISOString();
    expect(calculateTimeRemaining(expiresAt)).toBe(0);
  });

  it("retorna tempo correto para 15 minutos", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T10:15:00Z").toISOString();
    expect(calculateTimeRemaining(expiresAt)).toBe(15);
  });

  it("retorna tempo correto para 2 horas (120 minutos)", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T12:00:00Z").toISOString();
    expect(calculateTimeRemaining(expiresAt)).toBe(120);
  });

  it("arredonda para cima em caso de segundos fracionários", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const expiresAt = new Date("2025-01-01T10:02:31Z").toISOString(); // +2min31s
    expect(calculateTimeRemaining(expiresAt)).toBe(3);
  });
});

// ── Detecção de sessão ativa ────────────────────────────────────────────────

describe("isSessionActive", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retorna true para sessão ativa com expiração futura", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const session = {
      status: "ativa",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(true);
  });

  it("retorna true para sessão aguardando início com expiração futura", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const session = {
      status: "aguardando_inicio",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(true);
  });

  it("retorna false para sessão expirada (tempo)", () => {
    vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
    const session = {
      status: "ativa",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(false);
  });

  it("retorna false para sessão revogada", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const session = {
      status: "revogada",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(false);
  });

  it("retorna false para sessão encerrada", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const session = {
      status: "encerrada",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(false);
  });

  it("retorna false para sessão suspensa", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const session = {
      status: "suspensa",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(false);
  });

  it("retorna false para sessão expirada (status)", () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    const session = {
      status: "expirada",
      expires_at: new Date("2025-01-01T11:00:00Z").toISOString(),
    };
    expect(isSessionActive(session)).toBe(false);
  });

  it("retorna false para null", () => {
    expect(isSessionActive(null)).toBe(false);
  });
});

// ── Lógica de escopo read-only ──────────────────────────────────────────────

describe("isReadOnlyScope", () => {
  it("retorna true quando só tem ação visualizar", () => {
    expect(isReadOnlyScope(["visualizar"])).toBe(true);
  });

  it("retorna false quando tem visualizar e outras ações", () => {
    expect(isReadOnlyScope(["visualizar", "diagnosticar"])).toBe(false);
  });

  it("retorna false quando tem apenas ações não-visuais", () => {
    expect(isReadOnlyScope(["diagnosticar", "executar_correcao"])).toBe(false);
  });

  it("retorna false para array vazio", () => {
    expect(isReadOnlyScope([])).toBe(false);
  });

  it("retorna false quando visualizar não é a primeira", () => {
    expect(isReadOnlyScope(["diagnosticar", "visualizar"])).toBe(false);
  });
});

// ── Autorização de módulos ──────────────────────────────────────────────────

describe("isModuleAuthorized", () => {
  const allowedModules = ["dashboard", "clientes", "processos"];

  it("retorna true para módulo dentro do escopo", () => {
    expect(isModuleAuthorized("dashboard", allowedModules)).toBe(true);
    expect(isModuleAuthorized("clientes", allowedModules)).toBe(true);
    expect(isModuleAuthorized("processos", allowedModules)).toBe(true);
  });

  it("retorna false para módulo fora do escopo", () => {
    expect(isModuleAuthorized("financeiro", allowedModules)).toBe(false);
    expect(isModuleAuthorized("documentos", allowedModules)).toBe(false);
    expect(isModuleAuthorized("configuracoes", allowedModules)).toBe(false);
  });

  it("retorna false para módulo vazio", () => {
    expect(isModuleAuthorized("", allowedModules)).toBe(false);
  });

  it("retorna false quando não há módulos permitidos", () => {
    expect(isModuleAuthorized("dashboard", [])).toBe(false);
  });

  it("é case-sensitive", () => {
    expect(isModuleAuthorized("Dashboard", allowedModules)).toBe(false);
    expect(isModuleAuthorized("DASHBOARD", allowedModules)).toBe(false);
  });
});

// ── Autorização de ações ────────────────────────────────────────────────────

describe("isActionAuthorized", () => {
  const allowedActions = ["visualizar", "diagnosticar"];

  it("retorna true para ação dentro do escopo", () => {
    expect(isActionAuthorized("visualizar", allowedActions)).toBe(true);
    expect(isActionAuthorized("diagnosticar", allowedActions)).toBe(true);
  });

  it("retorna false para ação fora do escopo", () => {
    expect(isActionAuthorized("executar_correcao", allowedActions)).toBe(false);
    expect(isActionAuthorized("editar_configuracao", allowedActions)).toBe(false);
  });

  it("retorna false para ação proibida", () => {
    expect(isActionAuthorized("excluir", allowedActions)).toBe(false);
    expect(isActionAuthorized("executar_sql", allowedActions)).toBe(false);
    expect(isActionAuthorized("acessar_secrets", allowedActions)).toBe(false);
  });

  it("retorna false para ação vazia", () => {
    expect(isActionAuthorized("", allowedActions)).toBe(false);
  });

  it("retorna false quando não há ações permitidas", () => {
    expect(isActionAuthorized("visualizar", [])).toBe(false);
  });

  it("é case-sensitive", () => {
    expect(isActionAuthorized("Visualizar", allowedActions)).toBe(false);
    expect(isActionAuthorized("VISUALIZAR", allowedActions)).toBe(false);
  });
});

// ── Estado derivado do contexto ─────────────────────────────────────────────

describe("Estado derivado do contexto (lógica)", () => {
  it("readOnly é true quando actions contém apenas visualizar", () => {
    const actions = ["visualizar"];
    const readOnly = actions.length === 1 && actions[0] === "visualizar";
    expect(readOnly).toBe(true);
  });

  it("readOnly é false quando actions contém mais de uma ação", () => {
    const actions = ["visualizar", "diagnosticar"];
    const readOnly = actions.length === 1 && actions[0] === "visualizar";
    expect(readOnly).toBe(false);
  });

  it("readOnly é false quando actions não contém visualizar", () => {
    const actions = ["diagnosticar"];
    const readOnly = actions.length === 1 && actions[0] === "visualizar";
    expect(readOnly).toBe(false);
  });

  it("isActive é true quando status é ativa e expires_at é futuro", () => {
    const now = new Date();
    const session = {
      status: "ativa",
      expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    };
    const activeStatuses = ["ativa", "aguardando_inicio"];
    const isActive =
      activeStatuses.includes(session.status) &&
      new Date(session.expires_at).getTime() > Date.now();
    expect(isActive).toBe(true);
  });

  it("isActive é false quando expires_at é passado", () => {
    const now = new Date();
    const session = {
      status: "ativa",
      expires_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    };
    const activeStatuses = ["ativa", "aguardando_inicio"];
    const isActive =
      activeStatuses.includes(session.status) &&
      new Date(session.expires_at).getTime() > Date.now();
    expect(isActive).toBe(false);
  });

  it("isActive é false quando status não é ativo", () => {
    const now = new Date();
    const session = {
      status: "revogada",
      expires_at: new Date(now.getTime() + 60 * 60 * 1000).toISOString(),
    };
    const activeStatuses = ["ativa", "aguardando_inicio"];
    const isActive = activeStatuses.includes(session.status);
    expect(isActive).toBe(false);
  });
});
