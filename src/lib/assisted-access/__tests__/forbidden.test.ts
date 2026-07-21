import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  isRouteBlocked,
  isEndpointBlocked,
  getBlockedActionsForModule,
  validateAssistedAccess,
  FORBIDDEN_ROUTES,
  FORBIDDEN_ENDPOINTS,
  FORBIDDEN_ACTIONS_BY_MODULE,
} from "../forbidden-actions";
import { FORBIDDEN_ACTIONS, ASSISTED_ACTIONS, SESSION_STATUSES } from "../constants";

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("../audit", () => ({
  recordAccessEvent: vi.fn().mockResolvedValue("event-id"),
  recordAccessAttempt: vi.fn().mockResolvedValue("event-id"),
}));

// ── isRouteBlocked ──────────────────────────────────────────────────────────

describe("isRouteBlocked", () => {
  it("bloqueia /configuracoes", () => {
    const result = isRouteBlocked("/configuracoes");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/configuracoes");
  });

  it("bloqueia /configuracoes com sub-rotas via wildcard", () => {
    const result = isRouteBlocked("/configuracoes/billing");
    expect(result).not.toBeNull();
  });

  it("bloqueia /recebimentos", () => {
    const result = isRouteBlocked("/recebimentos");
    expect(result).not.toBeNull();
    expect(result!.route).toBe("/recebimentos");
  });

  it("bloqueia /recebimentos com sub-rotas", () => {
    const result = isRouteBlocked("/recebimentos/123");
    expect(result).not.toBeNull();
  });

  it("bloqueia /financeiro", () => {
    const result = isRouteBlocked("/financeiro");
    expect(result).not.toBeNull();
  });

  it("bloqueia /financeiro com sub-rotas", () => {
    const result = isRouteBlocked("/financeiro/relatorio");
    expect(result).not.toBeNull();
  });

  it("bloqueia /admin", () => {
    const result = isRouteBlocked("/admin");
    expect(result).not.toBeNull();
  });

  it("bloqueia /configuracoes/api-keys", () => {
    const result = isRouteBlocked("/configuracoes/api-keys");
    expect(result).not.toBeNull();
  });

  it("bloqueia /usuarios/novo", () => {
    const result = isRouteBlocked("/usuarios/novo");
    expect(result).not.toBeNull();
  });

  it("NÃO bloqueia /clientes", () => {
    expect(isRouteBlocked("/clientes")).toBeNull();
  });

  it("NÃO bloqueia /processos", () => {
    expect(isRouteBlocked("/processos")).toBeNull();
  });

  it("NÃO bloqueia /dashboard", () => {
    expect(isRouteBlocked("/dashboard")).toBeNull();
  });

  it("NÃO bloqueia rota inexistente", () => {
    expect(isRouteBlocked("/rota-qualquer")).toBeNull();
  });
});

// ── isEndpointBlocked ───────────────────────────────────────────────────────

describe("isEndpointBlocked", () => {
  it("bloqueia POST em /api/financeiro/*", () => {
    const result = isEndpointBlocked("POST", "/api/financeiro/pagamentos");
    expect(result).not.toBeNull();
    expect(result!.method).toBe("POST");
  });

  it("bloqueia PUT em /api/financeiro/*", () => {
    const result = isEndpointBlocked("PUT", "/api/financeiro/pagamentos/123");
    expect(result).not.toBeNull();
  });

  it("bloqueia DELETE em /api/financeiro/*", () => {
    const result = isEndpointBlocked("DELETE", "/api/financeiro/pagamentos/123");
    expect(result).not.toBeNull();
  });

  it("bloqueia POST em /api/configuracoes/*", () => {
    const result = isEndpointBlocked("POST", "/api/configuracoes/settings");
    expect(result).not.toBeNull();
  });

  it("bloqueia DELETE em /api/usuarios/*", () => {
    const result = isEndpointBlocked("DELETE", "/api/usuarios/123");
    expect(result).not.toBeNull();
  });

  it("bloqueia POST em /api/auth/*", () => {
    const result = isEndpointBlocked("POST", "/api/auth/login");
    expect(result).not.toBeNull();
  });

  it("bloqueia POST em /api/admin/*", () => {
    const result = isEndpointBlocked("POST", "/api/admin/seed");
    expect(result).not.toBeNull();
  });

  it("bloqueia POST em /api/billing/*", () => {
    const result = isEndpointBlocked("POST", "/api/billing/checkout");
    expect(result).not.toBeNull();
  });

  it("bloqueia POST em /api/storage/*", () => {
    const result = isEndpointBlocked("POST", "/api/storage/upload");
    expect(result).not.toBeNull();
  });

  it("NÃO bloqueia GET em /api/financeiro/*", () => {
    // Apenas POST/PUT/DELETE financeiro são bloqueados por padrão
    const result = isEndpointBlocked("GET", "/api/financeiro/pagamentos");
    // GET não está na lista de endpoints bloqueados para financeiro
    expect(result).toBeNull();
  });

  it("NÃO bloqueia endpoints de clientes", () => {
    expect(isEndpointBlocked("GET", "/api/clientes")).toBeNull();
    expect(isEndpointBlocked("POST", "/api/clientes")).toBeNull();
  });

  it("NÃO bloqueia endpoints de processos", () => {
    expect(isEndpointBlocked("GET", "/api/processos")).toBeNull();
  });

  it("é case-insensitive para o método", () => {
    const result = isEndpointBlocked("post", "/api/financeiro/test");
    expect(result).not.toBeNull();
  });
});

// ── getBlockedActionsForModule ──────────────────────────────────────────────

describe("getBlockedActionsForModule", () => {
  it("retorna ações bloqueadas para financeiro", () => {
    const blocked = getBlockedActionsForModule("financeiro");
    expect(blocked.length).toBeGreaterThan(0);
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("registrar_pagamento");
    expect(actions).toContain("estornar");
    expect(actions).toContain("alterar_saldo");
    expect(actions).toContain("alterar_parcela");
    expect(actions).toContain("efetuar_repasse");
  });

  it("retorna ações bloqueadas para configuracoes", () => {
    const blocked = getBlockedActionsForModule("configuracoes");
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("alterar_permissoes");
    expect(actions).toContain("alterar_autenticacao");
    expect(actions).toContain("alterar_mfa");
    expect(actions).toContain("alterar_plano");
  });

  it("retorna ações bloqueadas para usuarios", () => {
    const blocked = getBlockedActionsForModule("usuarios");
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("excluir");
    expect(actions).toContain("alterar_proprietario");
    expect(actions).toContain("alterar_permissoes");
  });

  it("retorna ações bloqueadas para documentos", () => {
    const blocked = getBlockedActionsForModule("documentos");
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("excluir");
    expect(actions).toContain("baixar");
    expect(actions).toContain("exportar");
  });

  it("retorna ações bloqueadas para processos", () => {
    const blocked = getBlockedActionsForModule("processos");
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("excluir");
    expect(actions).toContain("exportar");
  });

  it("retorna ações bloqueadas para contratos", () => {
    const blocked = getBlockedActionsForModule("contratos");
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("excluir");
    expect(actions).toContain("exportar");
  });

  it("retorna ações bloqueadas para integracoes", () => {
    const blocked = getBlockedActionsForModule("integracoes");
    const actions = blocked.map((b) => b.action);
    expect(actions).toContain("acessar_secrets");
    expect(actions).toContain("acessar_tokens");
    expect(actions).toContain("executar_sql");
  });

  it("retorna array vazio para módulo sem restrições", () => {
    const blocked = getBlockedActionsForModule("dashboard");
    expect(blocked).toEqual([]);
  });

  it("retorna array vazio para módulo inexistente", () => {
    const blocked = getBlockedActionsForModule("modulo_inexistente");
    expect(blocked).toEqual([]);
  });
});

// ── FORBIDDEN_ACTIONS da constants ──────────────────────────────────────────

describe("FORBIDDEN_ACTIONS (constant)", () => {
  it("todas as ações proibidas globais estão na lista", () => {
    const expectedForbidden = [
      "excluir",
      "exportar",
      "baixar",
      "alterar_financeiro",
      "alterar_permissoes",
      "alterar_proprietario",
      "visualizar_docs_confidenciais",
      "acessar_dados_altamente_confidenciais",
      "alterar_autenticacao",
      "alterar_mfa",
      "alterar_plano",
      "acessar_secrets",
      "acessar_tokens",
      "executar_sql",
      "acessar_storage_direto",
      "registrar_pagamento",
      "estornar",
      "alterar_saldo",
      "alterar_parcela",
      "efetuar_repasse",
    ];
    for (const action of expectedForbidden) {
      expect(FORBIDDEN_ACTIONS).toContain(action);
    }
  });

  it("nenhuma ação permitida está na lista de proibidas", () => {
    for (const action of ASSISTED_ACTIONS) {
      expect(FORBIDDEN_ACTIONS).not.toContain(action);
    }
  });
});

// ── validateAssistedAccess ──────────────────────────────────────────────────

describe("validateAssistedAccess", () => {
  const baseSession = {
    id: "session-1",
    law_firm_id: "firm-123",
    status: SESSION_STATUSES.ativa,
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    access_request: {
      approved_modules: ["dashboard", "clientes", "processos"],
      approved_actions: ["visualizar", "diagnosticar"],
      restrictions: [],
    },
  };

  it("bloqueia sessão com status revogada", async () => {
    const session = { ...baseSession, status: SESSION_STATUSES.revogada };
    const result = await validateAssistedAccess(session, "/dashboard", "visualizar");
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("session");
  });

  it("bloqueia sessão com status encerrada", async () => {
    const session = { ...baseSession, status: SESSION_STATUSES.encerrada };
    const result = await validateAssistedAccess(session);
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("session");
  });

  it("bloqueia sessão expirada", async () => {
    const session = {
      ...baseSession,
      expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    };
    const result = await validateAssistedAccess(session, "/dashboard", "visualizar");
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("session");
  });

  it("bloqueia rota /configuracoes mesmo com sessão ativa", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/configuracoes",
      "visualizar",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("route");
  });

  it("bloqueia rota /recebimentos", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/recebimentos",
      "visualizar",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("route");
  });

  it("bloqueia rota /financeiro", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/financeiro",
      "visualizar",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("route");
  });

  it("bloqueia ação globalmente proibida", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/clientes",
      "excluir",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("action");
  });

  it("bloqueia ação 'alterar_financeiro' mesmo com sessão ativa", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/clientes",
      "alterar_financeiro",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("action");
  });

  it("bloqueia ação 'acessar_secrets'", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/integracoes",
      "acessar_secrets",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("action");
  });

  it("bloqueia ação fora do escopo aprovado", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/clientes",
      "executar_correcao",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("scope");
  });

  it("permite rota e ação dentro do escopo aprovado", async () => {
    const result = await validateAssistedAccess(
      baseSession,
      "/clientes",
      "visualizar",
    );
    expect(result.allowed).toBe(true);
  });

  it("permite rota /dashboard sem ação específica", async () => {
    const result = await validateAssistedAccess(baseSession, "/dashboard");
    expect(result.allowed).toBe(true);
  });

  it("permite quando não há rota nem ação (validação mínima)", async () => {
    const result = await validateAssistedAccess(baseSession);
    expect(result.allowed).toBe(true);
  });

  it("sem access_request, permite rota não-bloqueada sem ação proibida", async () => {
    const session = { ...baseSession, access_request: null };
    const result = await validateAssistedAccess(session, "/clientes");
    expect(result.allowed).toBe(true);
  });

  it("com access_request, bloqueia ação fora da lista aprovada", async () => {
    const session = {
      ...baseSession,
      access_request: {
        approved_modules: ["clientes"],
        approved_actions: ["visualizar"],
        restrictions: [],
      },
    };
    const result = await validateAssistedAccess(
      session,
      "/clientes",
      "criar_registro_tecnico",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("scope");
  });
});

// ── Sem bypass possível ─────────────────────────────────────────────────────

describe("Sem bypass possível", () => {
  it("FORBIDDEN_ACTIONS é consultado em validateAssistedAccess", async () => {
    // Todas as ações da lista FORBIDDEN_ACTIONS devem ser bloqueadas
    const session = {
      id: "session-1",
      law_firm_id: "firm-123",
      status: SESSION_STATUSES.ativa,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      access_request: {
        approved_modules: ["financeiro", "configuracoes", "usuarios", "documentos", "integracoes", "processos", "contratos"],
        approved_actions: [...ASSISTED_ACTIONS, ...FORBIDDEN_ACTIONS],
        restrictions: [],
      },
    };

    for (const action of FORBIDDEN_ACTIONS) {
      const result = await validateAssistedAccess(session, "/test", action);
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toBe("action");
    }
  });

  it("FORBIDDEN_ROUTES bloqueia mesmo com escopo aprovado", async () => {
    const session = {
      id: "session-1",
      law_firm_id: "firm-123",
      status: SESSION_STATUSES.ativa,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      access_request: {
        approved_modules: ["configuracoes"],
        approved_actions: [...ASSISTED_ACTIONS],
        restrictions: [],
      },
    };

    // Mesmo tendo "configuracoes" aprovado, a rota /configuracoes é bloqueada
    const result = await validateAssistedAccess(
      session,
      "/configuracoes",
      "visualizar",
    );
    expect(result.allowed).toBe(false);
    expect(result.blockedBy).toBe("route");
  });
});
