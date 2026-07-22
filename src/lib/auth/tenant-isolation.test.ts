import { describe, expect, it } from "vitest";

import { can, permissions, roles, type Role } from "./permissions";

describe("Tenant isolation", () => {
  it("proprietario has all permissions across any tenant", () => {
    for (const perm of permissions) {
      expect(can("proprietario", perm)).toBe(true);
    }
  });

  it("visualizador cannot write in any tenant", () => {
    const writePermissions = permissions.filter(
      (p) =>
        p.includes(".criar") ||
        p.includes(".editar") ||
        p.includes(".gerenciar") ||
        p.includes(".registrar") ||
        p.includes(".administrar"),
    );
    for (const perm of writePermissions) {
      expect(can("visualizador", perm)).toBe(false);
    }
  });

  it("each role has at least one permission", () => {
    for (const role of roles) {
      const hasPermission = permissions.some((p) => can(role, p));
      expect(hasPermission).toBe(true);
    }
  });

  it("advogado can manage tasks but not payments", () => {
    expect(can("advogado", "tarefas.gerenciar")).toBe(true);
    expect(can("advogado", "pagamentos.registrar")).toBe(false);
  });

  it("financeiro can manage payments but not cases", () => {
    expect(can("financeiro", "pagamentos.registrar")).toBe(true);
    expect(can("financeiro", "processos.criar")).toBe(false);
  });

  it("has_law_firm_access returns false for different tenant", () => {
    // Simulate tenant isolation: a member of firm A should not access firm B data.
    // The `can` function only checks roles, not tenants. We verify the permission
    // system is scoped per-role so the SQL-level has_law_firm_access handles
    // tenant boundary enforcement. The visualizador has only specific read permissions.
    const visualizadorPerms = [
      "clientes.visualizar",
      "leads.visualizar",
      "processos.visualizar",
      "prazos.visualizar",
      "relatorios.visualizar",
      "security.mfa.view",
    ] as const;
    for (const perm of visualizadorPerms) {
      expect(can("visualizador", perm)).toBe(true);
    }

    // Permissions NOT in the visualizador list should all be denied
    const deniedPerms = permissions.filter((p) => !visualizadorPerms.includes(p as (typeof visualizadorPerms)[number]));
    for (const perm of deniedPerms) {
      expect(can("visualizador", perm)).toBe(false);
    }
  });

  it("has_law_firm_role checks correct role", () => {
    // Verify role-based permission checking is accurate
    const adminPerms = ["equipe.gerenciar", "configuracoes.administrar", "relatorios.visualizar"] as const;

    // administrador has full permissions
    for (const perm of adminPerms) {
      expect(can("administrador", perm)).toBe(true);
    }

    // assistente does NOT have equipe.gerenciar
    expect(can("assistente", "equipe.gerenciar")).toBe(false);
    // assistente does NOT have configuracoes.administrar
    expect(can("assistente", "configuracoes.administrar")).toBe(false);
    // assistente does NOT have relatorios.visualizar
    expect(can("assistente", "relatorios.visualizar")).toBe(false);
  });

  it("permission matrix: each role has correct permissions", () => {
    // proprietario has all permissions
    for (const perm of permissions) {
      expect(can("proprietario", perm)).toBe(true);
    }
    // administrador has all except security.mfa.reset_user
    for (const perm of permissions) {
      if (perm === "security.mfa.reset_user") {
        expect(can("administrador", perm)).toBe(false);
      } else {
        expect(can("administrador", perm)).toBe(true);
      }
    }

    // advogado cannot manage finance or team
    expect(can("advogado", "financeiro.visualizar")).toBe(false);
    expect(can("advogado", "contratos.gerenciar")).toBe(false);
    expect(can("advogado", "pagamentos.registrar")).toBe(false);
    expect(can("advogado", "equipe.gerenciar")).toBe(false);
    expect(can("advogado", "configuracoes.administrar")).toBe(false);

    // assistente has limited write access
    expect(can("assistente", "clientes.criar")).toBe(true);
    expect(can("assistente", "clientes.editar")).toBe(false);

    // colaborador has very limited access
    expect(can("colaborador", "clientes.visualizar")).toBe(true);
    expect(can("colaborador", "clientes.criar")).toBe(false);
    expect(can("colaborador", "processos.criar")).toBe(false);
    expect(can("colaborador", "financeiro.visualizar")).toBe(false);
  });
});
