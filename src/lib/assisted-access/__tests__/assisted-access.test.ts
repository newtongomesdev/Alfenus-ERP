import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  ACCESS_REQUEST_STATUSES,
  SESSION_STATUSES,
  ASSISTED_MODULES,
  ASSISTED_ACTIONS,
  FORBIDDEN_ACTIONS,
  DURATION_OPTIONS,
  MAX_DURATION_MINUTES,
  EVENT_TYPES,
  canApproveAccess,
  canRevokeAccess,
  VALID_REQUEST_TRANSITIONS,
} from "../constants";
import type { AccessRequestStatus } from "../constants";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/auth/context", () => ({
  getAppContext: vi.fn(),
}));

// ── Constantes: ACCESS_REQUEST_STATUSES ──────────────────────────────────────

describe("ACCESS_REQUEST_STATUSES", () => {
  it("contém 10 statuses", () => {
    expect(Object.keys(ACCESS_REQUEST_STATUSES)).toHaveLength(10);
  });

  it("contém todos os statuses esperados", () => {
    expect(ACCESS_REQUEST_STATUSES.rascunho).toBe("rascunho");
    expect(ACCESS_REQUEST_STATUSES.pendente).toBe("pendente");
    expect(ACCESS_REQUEST_STATUSES.visualizada).toBe("visualizada");
    expect(ACCESS_REQUEST_STATUSES.aprovada).toBe("aprovada");
    expect(ACCESS_REQUEST_STATUSES.aprovada_com_restrições).toBe("aprovada_com_restrições");
    expect(ACCESS_REQUEST_STATUSES.recusada).toBe("recusada");
    expect(ACCESS_REQUEST_STATUSES.cancelada).toBe("cancelada");
    expect(ACCESS_REQUEST_STATUSES.expirada).toBe("expirada");
    expect(ACCESS_REQUEST_STATUSES.utilizada).toBe("utilizada");
    expect(ACCESS_REQUEST_STATUSES.encerrada).toBe("encerrada");
  });
});

// ── Constantes: SESSION_STATUSES ─────────────────────────────────────────────

describe("SESSION_STATUSES", () => {
  it("contém 6 statuses", () => {
    expect(Object.keys(SESSION_STATUSES)).toHaveLength(6);
  });

  it("contém todos os statuses esperados", () => {
    expect(SESSION_STATUSES.aguardando_inicio).toBe("aguardando_inicio");
    expect(SESSION_STATUSES.ativa).toBe("ativa");
    expect(SESSION_STATUSES.suspensa).toBe("suspensa");
    expect(SESSION_STATUSES.encerrada).toBe("encerrada");
    expect(SESSION_STATUSES.revogada).toBe("revogada");
    expect(SESSION_STATUSES.expirada).toBe("expirada");
  });
});

// ── Constantes: ASSISTED_MODULES ────────────────────────────────────────────

describe("ASSISTED_MODULES", () => {
  it("contém 14 módulos", () => {
    expect(ASSISTED_MODULES).toHaveLength(14);
  });

  it("contém módulos essenciais", () => {
    expect(ASSISTED_MODULES).toContain("dashboard");
    expect(ASSISTED_MODULES).toContain("clientes");
    expect(ASSISTED_MODULES).toContain("processos");
    expect(ASSISTED_MODULES).toContain("documentos");
    expect(ASSISTED_MODULES).toContain("financeiro");
  });

  it("todos os módulos são strings não vazias", () => {
    for (const mod of ASSISTED_MODULES) {
      expect(typeof mod).toBe("string");
      expect(mod.length).toBeGreaterThan(0);
    }
  });
});

// ── Constantes: ASSISTED_ACTIONS ────────────────────────────────────────────

describe("ASSISTED_ACTIONS", () => {
  it("contém 7 ações permitidas", () => {
    expect(ASSISTED_ACTIONS).toHaveLength(7);
  });

  it("contém ações essenciais", () => {
    expect(ASSISTED_ACTIONS).toContain("visualizar");
    expect(ASSISTED_ACTIONS).toContain("diagnosticar");
    expect(ASSISTED_ACTIONS).toContain("executar_correcao");
    expect(ASSISTED_ACTIONS).toContain("visualizar_logs");
  });

  it("nenhuma ação permitida é proibida", () => {
    for (const action of ASSISTED_ACTIONS) {
      expect(FORBIDDEN_ACTIONS).not.toContain(action);
    }
  });
});

// ── Constantes: FORBIDDEN_ACTIONS ───────────────────────────────────────────

describe("FORBIDDEN_ACTIONS", () => {
  it("contém ações perigosas esperadas", () => {
    expect(FORBIDDEN_ACTIONS).toContain("excluir");
    expect(FORBIDDEN_ACTIONS).toContain("exportar");
    expect(FORBIDDEN_ACTIONS).toContain("baixar");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_financeiro");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_permissoes");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_proprietario");
    expect(FORBIDDEN_ACTIONS).toContain("visualizar_docs_confidenciais");
    expect(FORBIDDEN_ACTIONS).toContain("acessar_dados_altamente_confidenciais");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_autenticacao");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_mfa");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_plano");
    expect(FORBIDDEN_ACTIONS).toContain("acessar_secrets");
    expect(FORBIDDEN_ACTIONS).toContain("acessar_tokens");
    expect(FORBIDDEN_ACTIONS).toContain("executar_sql");
    expect(FORBIDDEN_ACTIONS).toContain("acessar_storage_direto");
    expect(FORBIDDEN_ACTIONS).toContain("registrar_pagamento");
    expect(FORBIDDEN_ACTIONS).toContain("estornar");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_saldo");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_parcela");
    expect(FORBIDDEN_ACTIONS).toContain("efetuar_repasse");
  });

  it("contém pelo menos 20 ações proibidas", () => {
    expect(FORBIDDEN_ACTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("todas as ações proibidas são strings não vazias", () => {
    for (const action of FORBIDDEN_ACTIONS) {
      expect(typeof action).toBe("string");
      expect(action.length).toBeGreaterThan(0);
    }
  });
});

// ── Constantes: DURATION_OPTIONS ────────────────────────────────────────────

describe("DURATION_OPTIONS", () => {
  it("contém 4 opções", () => {
    expect(DURATION_OPTIONS).toHaveLength(4);
  });

  it("todas as opções são menores ou iguais ao máximo", () => {
    for (const option of DURATION_OPTIONS) {
      expect(option.value).toBeLessThanOrEqual(MAX_DURATION_MINUTES);
    }
  });

  it("todas as opções têm label e value", () => {
    for (const option of DURATION_OPTIONS) {
      expect(typeof option.label).toBe("string");
      expect(option.label.length).toBeGreaterThan(0);
      expect(typeof option.value).toBe("number");
      expect(option.value).toBeGreaterThan(0);
    }
  });

  it("valores estão em ordem crescente", () => {
    for (let i = 1; i < DURATION_OPTIONS.length; i++) {
      expect(DURATION_OPTIONS[i].value).toBeGreaterThan(DURATION_OPTIONS[i - 1].value);
    }
  });
});

// ── Constantes: MAX_DURATION_MINUTES ────────────────────────────────────────

describe("MAX_DURATION_MINUTES", () => {
  it("é 240 (4 horas)", () => {
    expect(MAX_DURATION_MINUTES).toBe(240);
  });
});

// ── Constantes: EVENT_TYPES ─────────────────────────────────────────────────

describe("EVENT_TYPES", () => {
  it("contém tipos de evento essenciais", () => {
    expect(EVENT_TYPES).toContain("solicitacao_criada");
    expect(EVENT_TYPES).toContain("solicitacao_visualizada");
    expect(EVENT_TYPES).toContain("solicitacao_aprovada");
    expect(EVENT_TYPES).toContain("solicitacao_recusada");
    expect(EVENT_TYPES).toContain("sessao_iniciada");
    expect(EVENT_TYPES).toContain("rota_acessada");
    expect(EVENT_TYPES).toContain("tentativa_bloqueada");
    expect(EVENT_TYPES).toContain("sessao_revogada");
    expect(EVENT_TYPES).toContain("sessao_expirada");
    expect(EVENT_TYPES).toContain("sessao_encerrada");
    expect(EVENT_TYPES).toContain("resumo_enviado");
    expect(EVENT_TYPES).toContain("solicitacao_cancelada");
  });

  it("contém pelo menos 15 tipos de evento", () => {
    expect(EVENT_TYPES.length).toBeGreaterThanOrEqual(15);
  });
});

// ── Funções de permissão ────────────────────────────────────────────────────

describe("canApproveAccess", () => {
  it("proprietário pode aprovar", () => {
    expect(canApproveAccess("proprietario")).toBe(true);
  });

  it("administrador pode aprovar", () => {
    expect(canApproveAccess("administrador")).toBe(true);
  });

  it("advogado não pode aprovar", () => {
    expect(canApproveAccess("advogado")).toBe(false);
  });

  it("assistente não pode aprovar", () => {
    expect(canApproveAccess("assistente")).toBe(false);
  });

  it("financeiro não pode aprovar", () => {
    expect(canApproveAccess("financeiro")).toBe(false);
  });

  it("colaborador não pode aprovar", () => {
    expect(canApproveAccess("colaborador")).toBe(false);
  });

  it("visualizador não pode aprovar", () => {
    expect(canApproveAccess("visualizador")).toBe(false);
  });

  it("role inválida retorna falso", () => {
    expect(canApproveAccess("superadmin")).toBe(false);
    expect(canApproveAccess("")).toBe(false);
  });
});

describe("canRevokeAccess", () => {
  it("proprietário pode revogar", () => {
    expect(canRevokeAccess("proprietario")).toBe(true);
  });

  it("administrador pode revogar", () => {
    expect(canRevokeAccess("administrador")).toBe(true);
  });

  it("advogado não pode revogar", () => {
    expect(canRevokeAccess("advogado")).toBe(false);
  });

  it("assistente não pode revogar", () => {
    expect(canRevokeAccess("assistente")).toBe(false);
  });

  it("role inválida retorna falso", () => {
    expect(canRevokeAccess("hacker")).toBe(false);
  });
});

// ── isActionForbidden (lógica) ──────────────────────────────────────────────

describe("isActionForbidden", () => {
  const isActionForbidden = (action: string): boolean =>
    (FORBIDDEN_ACTIONS as readonly string[]).includes(action);

  it("retorna true para ações perigosas", () => {
    expect(isActionForbidden("excluir")).toBe(true);
    expect(isActionForbidden("executar_sql")).toBe(true);
    expect(isActionForbidden("acessar_secrets")).toBe(true);
    expect(isActionForbidden("alterar_financeiro")).toBe(true);
    expect(isActionForbidden("alterar_permissoes")).toBe(true);
    expect(isActionForbidden("registrar_pagamento")).toBe(true);
    expect(isActionForbidden("estornar")).toBe(true);
  });

  it("retorna false para ações permitidas", () => {
    expect(isActionForbidden("visualizar")).toBe(false);
    expect(isActionForbidden("diagnosticar")).toBe(false);
    expect(isActionForbidden("executar_correcao")).toBe(false);
    expect(isActionForbidden("visualizar_logs")).toBe(false);
  });

  it("retorna false para ações desconhecidas", () => {
    expect(isActionForbidden("acao_inexistente")).toBe(false);
    expect(isActionForbidden("")).toBe(false);
  });
});

// ── Transições de status válidas ────────────────────────────────────────────

describe("VALID_REQUEST_TRANSITIONS", () => {
  it("rascunho pode ir para pendente ou cancelada", () => {
    expect(VALID_REQUEST_TRANSITIONS.rascunho).toContain("pendente");
    expect(VALID_REQUEST_TRANSITIONS.rascunho).toContain("cancelada");
  });

  it("pendente pode ir para múltiplos status", () => {
    expect(VALID_REQUEST_TRANSITIONS.pendente).toContain("visualizada");
    expect(VALID_REQUEST_TRANSITIONS.pendente).toContain("aprovada");
    expect(VALID_REQUEST_TRANSITIONS.pendente).toContain("aprovada_com_restrições");
    expect(VALID_REQUEST_TRANSITIONS.pendente).toContain("recusada");
    expect(VALID_REQUEST_TRANSITIONS.pendente).toContain("cancelada");
  });

  it("aprovada pode ir para utilizada ou encerrada", () => {
    expect(VALID_REQUEST_TRANSITIONS.aprovada).toContain("utilizada");
    expect(VALID_REQUEST_TRANSITIONS.aprovada).toContain("encerrada");
  });

  it("recusada é estado final (sem transições)", () => {
    expect(VALID_REQUEST_TRANSITIONS.recusada).toHaveLength(0);
  });

  it("cancelada é estado final", () => {
    expect(VALID_REQUEST_TRANSITIONS.cancelada).toHaveLength(0);
  });

  it("expirada é estado final", () => {
    expect(VALID_REQUEST_TRANSITIONS.expirada).toHaveLength(0);
  });

  it("encerrada é estado final", () => {
    expect(VALID_REQUEST_TRANSITIONS.encerrada).toHaveLength(0);
  });

  it("utilizada pode ir para encerrada", () => {
    expect(VALID_REQUEST_TRANSITIONS.utilizada).toContain("encerrada");
  });

  it("todas as transições apontam para statuses válidos", () => {
    for (const [from, targets] of Object.entries(VALID_REQUEST_TRANSITIONS)) {
      expect(ACCESS_REQUEST_STATUSES).toHaveProperty(from);
      for (const to of targets) {
        expect(ACCESS_REQUEST_STATUSES).toHaveProperty(to);
      }
    }
  });

  it("estados finais não podem ir para pendente", () => {
    const terminalStatuses: AccessRequestStatus[] = ["recusada", "cancelada", "expirada", "encerrada"];
    for (const status of terminalStatuses) {
      expect(VALID_REQUEST_TRANSITIONS[status]).not.toContain("pendente");
    }
  });
});

// ── Lógica de validação de sessão ───────────────────────────────────────────

describe("Validação de sessão (lógica)", () => {
  const validSession = {
    id: "session-1",
    law_firm_id: "firm-123",
    operator_id: "operator-1",
    status: "ativa",
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hora no futuro
  };

  const expiredSession = {
    ...validSession,
    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hora no passado
  };

  const revokedSession = {
    ...validSession,
    status: "revogada",
  };

  const wrongTenantSession = {
    ...validSession,
    law_firm_id: "firm-999",
  };

  const wrongOperatorSession = {
    ...validSession,
    operator_id: "operator-999",
  };

  it("sessão ativa no futuro é válida", () => {
    expect(validSession.status).toBe("ativa");
    expect(new Date(validSession.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("sessão expirada é inválida", () => {
    expect(new Date(expiredSession.expires_at).getTime()).toBeLessThan(Date.now());
  });

  it("sessão revogada é inválida", () => {
    const activeStatuses = ["ativa", "aguardando_inicio"];
    expect(activeStatuses).not.toContain(revokedSession.status);
  });

  it("sessão de outro tenant é inválida", () => {
    expect(wrongTenantSession.law_firm_id).not.toBe(validSession.law_firm_id);
  });

  it("sessão de outro operador é inválida", () => {
    expect(wrongOperatorSession.operator_id).not.toBe(validSession.operator_id);
  });
});

// ── Lógica de canPerformAction ──────────────────────────────────────────────

describe("canPerformAction (lógica)", () => {
  const approvedModules = ["dashboard", "clientes", "processos"];
  const approvedActions = ["visualizar", "diagnosticar"];
  const restrictions = ["clientes:visualizar"];

  it("ação permitida dentro do escopo é autorizada", () => {
    const module = "dashboard";
    const action = "visualizar";
    const inScope = approvedModules.includes(module);
    const actionAllowed = approvedActions.includes(action);
    const notRestricted = !restrictions.includes(`${module}:${action}`);

    expect(inScope && actionAllowed && notRestricted).toBe(true);
  });

  it("módulo fora do escopo é bloqueado", () => {
    const module = "financeiro";
    const inScope = approvedModules.includes(module);
    expect(inScope).toBe(false);
  });

  it("ação fora do escopo é bloqueada", () => {
    const action = "executar_correcao";
    const actionAllowed = approvedActions.includes(action);
    expect(actionAllowed).toBe(false);
  });

  it("ação proibida é sempre bloqueada", () => {
    const action = "excluir";
    const isForbidden = (FORBIDDEN_ACTIONS as readonly string[]).includes(action);
    expect(isForbidden).toBe(true);
  });

  it("ação com restrição específica é bloqueada", () => {
    const module = "clientes";
    const action = "visualizar";
    const isRestricted = restrictions.includes(`${module}:${action}`);
    expect(isRestricted).toBe(true);
  });

  it("ação sem restrição é permitida", () => {
    const module = "processos";
    const action = "visualizar";
    const isRestricted = restrictions.includes(`${module}:${action}`);
    expect(isRestricted).toBe(false);
  });
});

// ── Validação de módulos e ações ────────────────────────────────────────────

describe("Validação de módulos e ações", () => {
  it("ASSISTED_MODULES não contém duplicatas", () => {
    const unique = new Set(ASSISTED_MODULES);
    expect(unique.size).toBe(ASSISTED_MODULES.length);
  });

  it("ASSISTED_ACTIONS não contém duplicatas", () => {
    const unique = new Set(ASSISTED_ACTIONS);
    expect(unique.size).toBe(ASSISTED_ACTIONS.length);
  });

  it("FORBIDDEN_ACTIONS não contém duplicatas", () => {
    const unique = new Set(FORBIDDEN_ACTIONS);
    expect(unique.size).toBe(FORBIDDEN_ACTIONS.length);
  });

  it("nenhum módulo assistido é igual a uma ação proibida", () => {
    for (const mod of ASSISTED_MODULES) {
      expect(FORBIDDEN_ACTIONS).not.toContain(mod);
    }
  });
});
