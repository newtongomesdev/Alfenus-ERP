import { describe, expect, it } from "vitest";

import { can, permissions, roles, type Role } from "./permissions";

describe("permissions", () => {
  it("contém 33 permissões", () => {
    expect(permissions).toHaveLength(33);
  });

  it("contém 7 roles", () => {
    expect(roles).toHaveLength(7);
  });
});

describe("can - proprietário", () => {
  const role: Role = "proprietario";

  it("possui todas as permissões", () => {
    for (const permission of permissions) {
      expect(can(role, permission)).toBe(true);
    }
  });
});

describe("can - administrador", () => {
  const role: Role = "administrador";

  it("possui todas as permissões exceto resetar MFA de outro usuário", () => {
    for (const permission of permissions) {
      if (permission === "security.mfa.reset_user") {
        expect(can(role, permission)).toBe(false);
      } else {
        expect(can(role, permission)).toBe(true);
      }
    }
  });
});

describe("can - advogado", () => {
  const role: Role = "advogado";

  it("pode visualizar clientes", () => {
    expect(can(role, "clientes.visualizar")).toBe(true);
  });

  it("pode criar clientes", () => {
    expect(can(role, "clientes.criar")).toBe(true);
  });

  it("pode gerenciar tarefas", () => {
    expect(can(role, "tarefas.gerenciar")).toBe(true);
  });

  it("pode criar prazos", () => {
    expect(can(role, "prazos.criar")).toBe(true);
  });

  it("não pode gerenciar equipe", () => {
    expect(can(role, "equipe.gerenciar")).toBe(false);
  });

  it("não pode registrar pagamentos", () => {
    expect(can(role, "pagamentos.registrar")).toBe(false);
  });

  it("não pode administrar configurações", () => {
    expect(can(role, "configuracoes.administrar")).toBe(false);
  });
});

describe("can - assistente", () => {
  const role: Role = "assistente";

  it("pode visualizar clientes", () => {
    expect(can(role, "clientes.visualizar")).toBe(true);
  });

  it("pode gerenciar tarefas", () => {
    expect(can(role, "tarefas.gerenciar")).toBe(true);
  });

  it("não pode editar clientes", () => {
    expect(can(role, "clientes.editar")).toBe(false);
  });

  it("não pode ver financeiro", () => {
    expect(can(role, "financeiro.visualizar")).toBe(false);
  });
});

describe("can - financeiro", () => {
  const role: Role = "financeiro";

  it("pode ver financeiro", () => {
    expect(can(role, "financeiro.visualizar")).toBe(true);
  });

  it("pode gerenciar contratos", () => {
    expect(can(role, "contratos.gerenciar")).toBe(true);
  });

  it("pode registrar pagamentos", () => {
    expect(can(role, "pagamentos.registrar")).toBe(true);
  });

  it("não pode criar processos", () => {
    expect(can(role, "processos.criar")).toBe(false);
  });
});

describe("can - colaborador", () => {
  const role: Role = "colaborador";

  it("pode visualizar clientes", () => {
    expect(can(role, "clientes.visualizar")).toBe(true);
  });

  it("pode gerenciar tarefas", () => {
    expect(can(role, "tarefas.gerenciar")).toBe(true);
  });

  it("não pode criar clientes", () => {
    expect(can(role, "clientes.criar")).toBe(false);
  });

  it("não pode ver relatórios", () => {
    expect(can(role, "relatorios.visualizar")).toBe(false);
  });
});

describe("can - visualizador", () => {
  const role: Role = "visualizador";

  it("pode visualizar clientes", () => {
    expect(can(role, "clientes.visualizar")).toBe(true);
  });

  it("pode ver relatórios", () => {
    expect(can(role, "relatorios.visualizar")).toBe(true);
  });

  it("não pode criar nada", () => {
    expect(can(role, "clientes.criar")).toBe(false);
    expect(can(role, "processos.criar")).toBe(false);
    expect(can(role, "prazos.criar")).toBe(false);
  });

  it("não pode gerenciar equipe", () => {
    expect(can(role, "equipe.gerenciar")).toBe(false);
  });
});
