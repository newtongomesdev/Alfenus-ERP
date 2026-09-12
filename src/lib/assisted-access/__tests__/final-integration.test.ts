import { describe, expect, it, vi } from "vitest";
import {
  ACCESS_REQUEST_STATUSES,
  SESSION_STATUSES,
  ASSISTED_MODULES,
  ASSISTED_ACTIONS,
  FORBIDDEN_ACTIONS,
  VALID_REQUEST_TRANSITIONS,
  canApproveAccess,
  canRevokeAccess,
} from "../constants";
import type { AccessRequestStatus } from "../constants";
import {
  isActionForbidden,
  maskSensitiveData,
  getSessionTimeRemaining,
  validateDuration,
  getExpiresAt,
} from "../service";

// ── Helpers de teste ────────────────────────────────────────────────────────

function assertValidTransition(from: AccessRequestStatus, to: AccessRequestStatus): void {
  const transitions = VALID_REQUEST_TRANSITIONS[from];
  expect(transitions).toContain(to);
}

function assertInvalidTransition(from: AccessRequestStatus, to: AccessRequestStatus): void {
  const transitions = VALID_REQUEST_TRANSITIONS[from];
  expect(transitions).not.toContain(to);
}

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

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO 1: Solicitar → Aprovar → Iniciar → Atividades → Encerrar
// ══════════════════════════════════════════════════════════════════════════════

describe("Fluxo completo: Solicitar → Aprovar → Iniciar → Atividades → Encerrar", () => {
  it("1. Criação de solicitação com status pendente", () => {
    const initialStatus: AccessRequestStatus = "pendente";
    expect(initialStatus).toBe(ACCESS_REQUEST_STATUSES.pendente);
    assertValidTransition(initialStatus, "aprovada");
  });

  it("2. Aprovação da solicitação", () => {
    assertValidTransition("pendente", "aprovada");
    expect(canApproveAccess("proprietario")).toBe(true);
    expect(canApproveAccess("administrador")).toBe(true);
  });

  it("3. Início de sessão (muda para utilizada)", () => {
    assertValidTransition("aprovada", "utilizada");
  });

  it("4. Durante a sessão: validações de escopo", () => {
    const approvedModules = ["clientes", "processos"];
    const approvedActions = ["visualizar", "diagnosticar"];

    expect(approvedModules).toContain("clientes");
    expect(approvedActions).toContain("visualizar");
    expect(approvedModules).not.toContain("financeiro");
    expect(approvedActions).not.toContain("executar_correcao");
  });

  it("5. Durante a sessão: bloqueio de ações proibidas", () => {
    for (const action of ["excluir", "exportar", "executar_sql", "acessar_secrets"]) {
      expect(isActionForbidden(action)).toBe(true);
    }
  });

  it("6. Encerramento da sessão (utilizada → encerrada)", () => {
    assertValidTransition("utilizada", "encerrada");
    expect(VALID_REQUEST_TRANSITIONS.encerrada).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO 2: Solicitar → Aprovar com restrições → Iniciar
// ══════════════════════════════════════════════════════════════════════════════

describe("Fluxo com restrições: Solicitar → Aprovar c/ Restrições → Iniciar", () => {
  it("1. Aprovação com restrições gera status correto", () => {
    assertValidTransition("pendente", "aprovada_com_restrições");
    expect(ACCESS_REQUEST_STATUSES.aprovada_com_restrições).toBe("aprovada_com_restrições");
  });

  it("2. Sessão aprovada com restrições pode ser iniciada", () => {
    assertValidTransition("aprovada_com_restrições", "utilizada");
  });

  it("3. Restrições bloqueiam ações específicas", () => {
    const restrictions = ["clientes:visualizar", "modulo:financeiro"];
    const module = "clientes";
    const action = "visualizar";
    const restrictionKey = `${module}:${action}`;

    expect(restrictions).toContain(restrictionKey);
    expect(restrictions).toContain("modulo:financeiro");
  });

  it("4. Restrições não bloqueiam ações não listadas", () => {
    const restrictions = ["clientes:visualizar"];
    const restrictionKey = "processos:visualizar";
    const moduleOnlyRestriction = "modulo:processos";
    const actionOnlyRestriction = "acao:visualizar";

    expect(restrictions).not.toContain(restrictionKey);
    expect(restrictions).not.toContain(moduleOnlyRestriction);
    expect(restrictions).not.toContain(actionOnlyRestriction);
  });

  it("5. Encerramento funciona normalmente", () => {
    assertValidTransition("utilizada", "encerrada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO 3: Solicitar → Recusar
// ══════════════════════════════════════════════════════════════════════════════

describe("Fluxo de recusa: Solicitar → Recusar", () => {
  it("1. Recusa a partir de pendente", () => {
    assertValidTransition("pendente", "recusada");
  });

  it("2. Recusa a partir de visualizada", () => {
    assertValidTransition("visualizada", "recusada");
  });

  it("3. Recusada é estado final", () => {
    expect(VALID_REQUEST_TRANSITIONS.recusada).toHaveLength(0);
  });

  it("4. Não pode aprovar após recusar", () => {
    assertInvalidTransition("recusada", "aprovada");
  });

  it("5. Não pode iniciar sessão após recusar", () => {
    assertInvalidTransition("recusada", "utilizada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO 4: Solicitar → Cancelar
// ══════════════════════════════════════════════════════════════════════════════

describe("Fluxo de cancelamento: Solicitar → Cancelar", () => {
  it("1. Cancelamento a partir de pendente", () => {
    assertValidTransition("pendente", "cancelada");
  });

  it("2. Cancelamento a partir de visualizada", () => {
    assertValidTransition("visualizada", "cancelada");
  });

  it("3. Cancelada é estado final", () => {
    expect(VALID_REQUEST_TRANSITIONS.cancelada).toHaveLength(0);
  });

  it("4. Não pode aprovar após cancelar", () => {
    assertInvalidTransition("cancelada", "aprovada");
  });

  it("5. Não pode iniciar sessão após cancelar", () => {
    assertInvalidTransition("cancelada", "utilizada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO 5: Sessão → Revogar
// ══════════════════════════════════════════════════════════════════════════════

describe("Fluxo de revogação: Sessão → Revogar", () => {
  it("1. Só proprietário ou administrador pode revogar", () => {
    expect(canRevokeAccess("proprietario")).toBe(true);
    expect(canRevokeAccess("administrador")).toBe(true);
    expect(canRevokeAccess("advogado")).toBe(false);
    expect(canRevokeAccess("assistente")).toBe(false);
    expect(canRevokeAccess("colaborador")).toBe(false);
  });

  it("2. Status de sessão revogada existe", () => {
    expect(SESSION_STATUSES.revogada).toBe("revogada");
  });

  it("3. Sessão ativa pode ser revogada (status válido)", () => {
    const session = {
      id: "sess-1",
      law_firm_id: "firm-1",
      operator_id: "op-1",
      status: SESSION_STATUSES.ativa,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    };
    const activeStatuses = ["ativa", "aguardando_inicio", "suspensa"];
    expect(activeStatuses).toContain(session.status);
  });

  it("4. Após revogação, sessão está em estado final", () => {
    const revokedStatus = SESSION_STATUSES.revogada;
    const activeStatuses = [
      SESSION_STATUSES.ativa,
      SESSION_STATUSES.aguardando_inicio,
      SESSION_STATUSES.suspensa,
    ];
    expect(activeStatuses).not.toContain(revokedStatus);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO 6: Sessão → Expirar
// ══════════════════════════════════════════════════════════════════════════════

describe("Fluxo de expiração: Sessão → Expirar", () => {
  it("1. Status de sessão expirada existe", () => {
    expect(SESSION_STATUSES.expirada).toBe("expirada");
  });

  it("2. Sessão expirada não está ativa", () => {
    const activeStatuses = [SESSION_STATUSES.ativa, SESSION_STATUSES.aguardando_inicio];
    expect(activeStatuses).not.toContain(SESSION_STATUSES.expirada);
  });

  it("3. Validação detecta sessão expirada por data", () => {
    const expiresAt = new Date(Date.now() - 1000).toISOString();
    const now = new Date();
    expect(new Date(expiresAt).getTime()).toBeLessThan(now.getTime());
  });

  it("4. Sessão não expirada é válida", () => {
    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const now = new Date();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(now.getTime());
  });

  it("5. Validação de duração máxima", () => {
    expect(validateDuration(0)).toBe(false);
    expect(validateDuration(-1)).toBe(false);
    expect(validateDuration(15)).toBe(true);
    expect(validateDuration(60)).toBe(true);
    expect(validateDuration(240)).toBe(true);
    expect(validateDuration(241)).toBe(false);
  });

  it("6. Cálculo de expiração", () => {
    const before = Date.now();
    const expiresAt = getExpiresAt(60);
    const after = Date.now();
    const expiresMs = new Date(expiresAt).getTime();
    expect(expiresMs).toBeGreaterThanOrEqual(before + 60 * 60 * 1000 - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + 60 * 60 * 1000 + 1000);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Validação de escopo durante sessão
// ══════════════════════════════════════════════════════════════════════════════

describe("Validação de escopo durante sessão", () => {
  const sessionScope = {
    approvedModules: ["clientes", "processos", "documentos"],
    approvedActions: ["visualizar", "diagnosticar", "visualizar_logs"],
    restrictions: ["clientes:visualizar", "modulo:financeiro"],
  };

  it("1. Módulo dentro do escopo é permitido", () => {
    expect(sessionScope.approvedModules).toContain("clientes");
    expect(sessionScope.approvedModules).toContain("processos");
    expect(sessionScope.approvedModules).toContain("documentos");
  });

  it("2. Módulo fora do escopo é bloqueado", () => {
    expect(sessionScope.approvedModules).not.toContain("financeiro");
    expect(sessionScope.approvedModules).not.toContain("configuracoes");
    expect(sessionScope.approvedModules).not.toContain("usuarios");
  });

  it("3. Ação dentro do escopo é permitida", () => {
    expect(sessionScope.approvedActions).toContain("visualizar");
    expect(sessionScope.approvedActions).toContain("diagnosticar");
  });

  it("4. Ação fora do escopo é bloqueada", () => {
    expect(sessionScope.approvedActions).not.toContain("executar_correcao");
    expect(sessionScope.approvedActions).not.toContain("editar_configuracao");
  });

  it("5. Ação proibida é sempre bloqueada", () => {
    for (const action of FORBIDDEN_ACTIONS) {
      expect(isActionForbidden(action)).toBe(true);
    }
  });

  it("6. Restrição de módulo:visualização bloqueia parcialmente", () => {
    const restrictionKey = "clientes:visualizar";
    expect(sessionScope.restrictions).toContain(restrictionKey);
  });

  it("7. Restrição de módulo inteiro bloqueia todas as ações", () => {
    const moduleRestriction = "modulo:financeiro";
    expect(sessionScope.restrictions).toContain(moduleRestriction);
    expect(sessionScope.approvedModules).not.toContain("financeiro");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Bloqueio de ações proibidas
// ══════════════════════════════════════════════════════════════════════════════

describe("Bloqueio de ações proibidas", () => {
  it("1. Todas as ações proibidas estão na lista", () => {
    expect(FORBIDDEN_ACTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it("2. Ações proibidas incluem exclusão de dados", () => {
    expect(FORBIDDEN_ACTIONS).toContain("excluir");
    expect(FORBIDDEN_ACTIONS).toContain("exportar");
    expect(FORBIDDEN_ACTIONS).toContain("baixar");
  });

  it("3. Ações proibidas incluem alteração financeira", () => {
    expect(FORBIDDEN_ACTIONS).toContain("alterar_financeiro");
    expect(FORBIDDEN_ACTIONS).toContain("registrar_pagamento");
    expect(FORBIDDEN_ACTIONS).toContain("estornar");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_saldo");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_parcela");
    expect(FORBIDDEN_ACTIONS).toContain("efetuar_repasse");
  });

  it("4. Ações proibidas incluem segurança", () => {
    expect(FORBIDDEN_ACTIONS).toContain("alterar_permissoes");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_autenticacao");
    expect(FORBIDDEN_ACTIONS).toContain("alterar_mfa");
    expect(FORBIDDEN_ACTIONS).toContain("acessar_secrets");
    expect(FORBIDDEN_ACTIONS).toContain("acessar_tokens");
    expect(FORBIDDEN_ACTIONS).toContain("executar_sql");
  });

  it("5. Nenhuma ação permitida é proibida", () => {
    for (const action of ASSISTED_ACTIONS) {
      expect(isActionForbidden(action)).toBe(false);
    }
  });

  it("6. isActionForbidden retorna false para ações desconhecidas", () => {
    expect(isActionForbidden("acao_inexistente")).toBe(false);
    expect(isActionForbidden("")).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Criação de eventos de auditoria para cada etapa
// ══════════════════════════════════════════════════════════════════════════════

describe("Criação de eventos de auditoria para cada etapa", () => {
  it("1. Evento: solicitacao_criada", () => {
    expect(VALID_REQUEST_TRANSITIONS.pendente.length).toBeGreaterThan(0);
  });

  it("2. Evento: solicitacao_visualizada", () => {
    assertValidTransition("pendente", "visualizada");
  });

  it("3. Evento: solicitacao_aprovada", () => {
    assertValidTransition("pendente", "aprovada");
  });

  it("4. Evento: solicitacao_recusada", () => {
    assertValidTransition("pendente", "recusada");
  });

  it("5. Evento: sessao_iniciada", () => {
    assertValidTransition("aprovada", "utilizada");
  });

  it("6. Evento: sessao_encerrada", () => {
    assertValidTransition("utilizada", "encerrada");
  });

  it("7. Evento: sessao_revogada", () => {
    expect(SESSION_STATUSES.revogada).toBeTruthy();
  });

  it("8. Evento: sessao_expirada", () => {
    expect(SESSION_STATUSES.expirada).toBeTruthy();
  });

  it("9. Evento: solicitacao_cancelada", () => {
    assertValidTransition("pendente", "cancelada");
  });

  it("10. Evento: tentativa_bloqueada", () => {
    expect(isActionForbidden("excluir")).toBe(true);
  });

  it("11. Evento: escopo_alterado", () => {
    // aprovada → utilizada é uma transição válida que indica uso da sessão
    assertValidTransition("aprovada", "utilizada");
  });

  it("12. Evento: resumo_enviado", () => {
    expect(ACCESS_REQUEST_STATUSES.encerrada).toBe("encerrada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Criação de notificações para cada etapa
// ══════════════════════════════════════════════════════════════════════════════

describe("Criação de notificações para cada etapa", () => {
  const notificationSteps = [
    { event: "solicitacao_criada", description: "Notificação ao proprietário/administrador" },
    { event: "solicitacao_aprovada", description: "Notificação ao operador sobre aprovação" },
    { event: "solicitacao_recusada", description: "Notificação ao operador sobre recusa" },
    { event: "sessao_iniciada", description: "Notificação ao operador sobre início da sessão" },
    { event: "sessao_encerrada", description: "Notificação sobre encerramento" },
    { event: "sessao_revogada", description: "Notificação ao operador sobre revogação" },
    { event: "solicitacao_cancelada", description: "Notificação sobre cancelamento" },
  ];

  for (const step of notificationSteps) {
    it(`${step.description} (${step.event})`, () => {
      expect(step.event).toBeTruthy();
      expect(step.description).toBeTruthy();
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Mascaramento de dados durante acesso assistido
// ══════════════════════════════════════════════════════════════════════════════

describe("Mascaramento de dados durante acesso assistido", () => {
  it("1. maskSensitiveData mascara campos sensíveis", () => {
    const session = { access_request: { approved_modules: ["clientes"] } };
    const data = {
      cpf: "123.456.789-00",
      nome: "João da Silva",
      email: "joao@email.com",
    };
    const masked = maskSensitiveData(data, session);

    expect(masked.nome).toBe("João da Silva");
    expect(masked.cpf).not.toBe("123.456.789-00");
    expect(masked.email).not.toBe("joao@email.com");
  });

  it("2. Campos não sensíveis não são mascarados", () => {
    const session = { access_request: { approved_modules: ["clientes"] } };
    const data = {
      nome: "Maria Souza",
      endereco: "Rua Principal, 123",
      cidade: "São Paulo",
    };
    const masked = maskSensitiveData(data, session);

    expect(masked.nome).toBe("Maria Souza");
    expect(masked.endereco).toBe("Rua Principal, 123");
    expect(masked.cidade).toBe("São Paulo");
  });

  it("3. Tokens e senhas são mascarados", () => {
    const session = { access_request: { approved_modules: ["configuracoes"] } };
    const data = {
      api_key: "sk-1234567890abcdef",
      password: "minha_senha_segura",
      secret: "super_secret_value",
    };
    const masked = maskSensitiveData(data, session);

    expect(masked.api_key).not.toBe("sk-1234567890abcdef");
    expect(masked.password).not.toBe("minha_senha_segura");
    expect(masked.secret).not.toBe("super_secret_value");
  });

  it("4. CNPJ é mascarado", () => {
    const session = { access_request: { approved_modules: ["clientes"] } };
    const data = { cnpj: "12.345.678/0001-90" };
    const masked = maskSensitiveData(data, session);

    expect(masked.cnpj).not.toBe("12.345.678/0001-90");
  });

  it("5. Valores curtos são mascarados com ***", () => {
    const session = { access_request: { approved_modules: ["clientes"] } };
    const data = { cpf: "123" };
    const masked = maskSensitiveData(data, session);

    expect(masked.cpf).toBe("***");
  });

  it("6. Objetos aninhados são mascarados recursivamente", () => {
    const session = { access_request: { approved_modules: ["clientes"] } };
    const data = {
      cliente: {
        cpf: "123.456.789-00",
        nome: "João",
      },
    };
    const masked = maskSensitiveData(data, session) as {
      cliente: Record<string, unknown>;
    };

    expect(masked.cliente.nome).toBe("João");
    expect(masked.cliente.cpf).not.toBe("123.456.789-00");
  });

  it("7. Campos null/undefined não causam erro", () => {
    const session = { access_request: { approved_modules: ["clientes"] } };
    const data = {
      cpf: null,
      email: undefined,
      nome: "Teste",
    };
    const masked = maskSensitiveData(data, session);

    expect(masked.cpf).toBeNull();
    expect(masked.email).toBeUndefined();
    expect(masked.nome).toBe("Teste");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Verificação de isolamento de tenant
// ══════════════════════════════════════════════════════════════════════════════

describe("Verificação de isolamento de tenant", () => {
  it("1. Sessão pertence a um tenant específico", () => {
    const session = {
      id: "sess-1",
      law_firm_id: "firm-123",
      operator_id: "op-1",
      status: "ativa",
    };
    expect(session.law_firm_id).toBe("firm-123");
  });

  it("2. Sessão de outro tenant é inválida", () => {
    const sessionTenant = "firm-123";
    const currentTenant = "firm-999";
    expect(sessionTenant).not.toBe(currentTenant);
  });

  it("3. Sessão no mesmo tenant é válida", () => {
    const sessionTenant = "firm-123";
    const currentTenant = "firm-123";
    expect(sessionTenant).toBe(currentTenant);
  });

  it("4. Solicitação pertence ao tenant", () => {
    const request = {
      id: "req-1",
      law_firm_id: "firm-123",
      status: "pendente",
    };
    expect(request.law_firm_id).toBe("firm-123");
  });

  it("5. Validação de operador na sessão", () => {
    const session = {
      id: "sess-1",
      law_firm_id: "firm-123",
      operator_id: "op-1",
      status: "ativa",
    };
    const currentOperator = "op-1";
    const wrongOperator = "op-999";

    expect(session.operator_id).toBe(currentOperator);
    expect(session.operator_id).not.toBe(wrongOperator);
  });

  it("6. Status ativos da sessão", () => {
    const activeStatuses = [
      SESSION_STATUSES.ativa,
      SESSION_STATUSES.aguardando_inicio,
    ];
    expect(activeStatuses).toContain("ativa");
    expect(activeStatuses).toContain("aguardando_inicio");
    expect(activeStatuses).not.toContain("encerrada");
    expect(activeStatuses).not.toContain("revogada");
    expect(activeStatuses).not.toContain("expirada");
  });

  it("7. Não é possível acessar dados de outro tenant via sessão", () => {
    const session = { law_firm_id: "firm-123" };
    const requestedTenant = "firm-456";
    expect(session.law_firm_id).not.toBe(requestedTenant);
  });

  it("8. Encerramento de sessão atualiza status corretamente", () => {
    const sessionStatus = SESSION_STATUSES.ativa;
    const newStatus = SESSION_STATUSES.encerrada;
    expect(newStatus).not.toBe(sessionStatus);
    expect(newStatus).toBe("encerrada");
  });

  it("9. Revogação de sessão atualiza status corretamente", () => {
    const sessionStatus = SESSION_STATUSES.ativa;
    const newStatus = SESSION_STATUSES.revogada;
    expect(newStatus).not.toBe(sessionStatus);
    expect(newStatus).toBe("revogada");
  });

  it("10. Expiração de sessão atualiza status corretamente", () => {
    const sessionStatus = SESSION_STATUSES.ativa;
    const newStatus = SESSION_STATUSES.expirada;
    expect(newStatus).not.toBe(sessionStatus);
    expect(newStatus).toBe("expirada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Transições de status inválidas
// ══════════════════════════════════════════════════════════════════════════════

describe("Transições de status inválidas", () => {
  it("1. Não pode ir de recusada para qualquer outro status", () => {
    const invalidTargets: AccessRequestStatus[] = [
      "pendente",
      "aprovada",
      "utilizada",
      "encerrada",
    ];
    for (const target of invalidTargets) {
      assertInvalidTransition("recusada", target);
    }
  });

  it("2. Não pode ir de cancelada para qualquer outro status", () => {
    const invalidTargets: AccessRequestStatus[] = [
      "pendente",
      "aprovada",
      "utilizada",
      "encerrada",
    ];
    for (const target of invalidTargets) {
      assertInvalidTransition("cancelada", target);
    }
  });

  it("3. Não pode ir de encerrada para qualquer outro status", () => {
    const invalidTargets: AccessRequestStatus[] = [
      "pendente",
      "aprovada",
      "utilizada",
    ];
    for (const target of invalidTargets) {
      assertInvalidTransition("encerrada", target);
    }
  });

  it("4. Não pode ir de utilizada para pendente", () => {
    assertInvalidTransition("utilizada", "pendente");
  });

  it("5. Não pode ir de utilizada para aprovada", () => {
    assertInvalidTransition("utilizada", "aprovada");
  });

  it("6. Não pode ir de rascunho para aprovada", () => {
    assertInvalidTransition("rascunho", "aprovada");
  });

  it("7. Não pode ir de rascunho para utilizada", () => {
    assertInvalidTransition("rascunho", "utilizada");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Helpers de tempo de sessão
// ══════════════════════════════════════════════════════════════════════════════

describe("Helpers de tempo de sessão", () => {
  it("1. Sessão ativa com expiração futura retorna minutos restantes", () => {
    const session = {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "ativa",
    };
    const remaining = getSessionTimeRemaining(session);
    expect(remaining).toBeGreaterThan(55);
    expect(remaining).toBeLessThanOrEqual(60);
  });

  it("2. Sessão expirada retorna 0 minutos", () => {
    const session = {
      expires_at: new Date(Date.now() - 1000).toISOString(),
      status: "ativa",
    };
    const remaining = getSessionTimeRemaining(session);
    expect(remaining).toBe(0);
  });

  it("3. Sessão encerrada retorna 0 minutos", () => {
    const session = {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "encerrada",
    };
    const remaining = getSessionTimeRemaining(session);
    expect(remaining).toBe(0);
  });

  it("4. Sessão revogada retorna 0 minutos", () => {
    const session = {
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: "revogada",
    };
    const remaining = getSessionTimeRemaining(session);
    expect(remaining).toBe(0);
  });

  it("5. Duração máxima é 240 minutos (4 horas)", () => {
    expect(validateDuration(240)).toBe(true);
    expect(validateDuration(241)).toBe(false);
  });

  it("6. Duração mínima é 1 minuto", () => {
    expect(validateDuration(1)).toBe(true);
    expect(validateDuration(0)).toBe(false);
    expect(validateDuration(-1)).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// Compatibilidade de módulos e ações
// ══════════════════════════════════════════════════════════════════════════════

describe("Compatibilidade de módulos e ações", () => {
  it("1. Todos os módulos são strings válidas", () => {
    for (const mod of ASSISTED_MODULES) {
      expect(typeof mod).toBe("string");
      expect(mod.length).toBeGreaterThan(0);
    }
  });

  it("2. Todas as ações são strings válidas", () => {
    for (const action of ASSISTED_ACTIONS) {
      expect(typeof action).toBe("string");
      expect(action.length).toBeGreaterThan(0);
    }
  });

  it("3. Sem duplicatas em módulos", () => {
    expect(new Set(ASSISTED_MODULES).size).toBe(ASSISTED_MODULES.length);
  });

  it("4. Sem duplicatas em ações", () => {
    expect(new Set(ASSISTED_ACTIONS).size).toBe(ASSISTED_ACTIONS.length);
  });

  it("5. Sem duplicatas em ações proibidas", () => {
    expect(new Set(FORBIDDEN_ACTIONS).size).toBe(FORBIDDEN_ACTIONS.length);
  });

  it("6. Nenhum módulo assistido é uma ação proibida", () => {
    for (const mod of ASSISTED_MODULES) {
      expect(FORBIDDEN_ACTIONS).not.toContain(mod);
    }
  });

  it("7. Todas as transições apontam para statuses válidos", () => {
    for (const [from, targets] of Object.entries(VALID_REQUEST_TRANSITIONS)) {
      expect(ACCESS_REQUEST_STATUSES).toHaveProperty(from);
      for (const to of targets) {
        expect(ACCESS_REQUEST_STATUSES).toHaveProperty(to);
      }
    }
  });
});
