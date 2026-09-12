import { describe, expect, it } from "vitest";

import { can } from "./permissions";
import { teamInvitationSchema } from "../validations/foundation";

// ---------------------------------------------------------------------------
// Mock types and helpers (mirror the invitation domain without DB)
// ---------------------------------------------------------------------------

interface Invitation {
  id: string;
  lawFirmId: string;
  email: string;
  role: string;
  status: "pendente" | "aceito" | "expirado";
  token: string;
  expiresAt: Date;
  invitedBy: string;
  createdAt: Date;
}

interface LawFirmMember {
  id: string;
  lawFirmId: string;
  userId: string;
  email: string;
  role: string;
  status: "ativo" | "inativo";
}

function createInvitation(overrides: Partial<Invitation> = {}): Invitation {
  return {
    id: "inv-1",
    lawFirmId: "firm-1",
    email: "novo@test.com",
    role: "colaborador",
    status: "pendente",
    token: "valid-token-abc",
    expiresAt: new Date(Date.now() + 7 * 86_400_000), // 7 days from now
    invitedBy: "member-1",
    createdAt: new Date(),
    ...overrides,
  };
}

function isTokenValid(invitation: Invitation): boolean {
  return invitation.status === "pendente" && invitation.token.length > 0;
}

function isInvitationExpired(invitation: Invitation): boolean {
  return new Date() > invitation.expiresAt;
}

function doesEmailMatch(invitationEmail: string, userEmail: string): boolean {
  return invitationEmail.toLowerCase() === userEmail.toLowerCase();
}

function isAlreadyMember(invitation: Invitation, members: LawFirmMember[]): boolean {
  return members.some(
    (m) => m.lawFirmId === invitation.lawFirmId && m.email.toLowerCase() === invitation.email.toLowerCase(),
  );
}

function assignRole(invitation: Invitation): string {
  return invitation.role;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Invitation flow – token validation", () => {
  it("accepts valid pending token", () => {
    const inv = createInvitation({ status: "pendente", token: "abc-123" });
    expect(isTokenValid(inv)).toBe(true);
  });

  it("rejects already-accepted invitation", () => {
    const inv = createInvitation({ status: "aceito" });
    expect(isTokenValid(inv)).toBe(false);
  });

  it("rejects empty token", () => {
    const inv = createInvitation({ token: "" });
    expect(isTokenValid(inv)).toBe(false);
  });

  it("rejects expired status", () => {
    const inv = createInvitation({ status: "expirado" });
    expect(isTokenValid(inv)).toBe(false);
  });
});

describe("Invitation flow – expiration check", () => {
  it("is not expired when expiresAt is in the future", () => {
    const inv = createInvitation({ expiresAt: new Date(Date.now() + 86_400_000) });
    expect(isInvitationExpired(inv)).toBe(false);
  });

  it("is expired when expiresAt is in the past", () => {
    const inv = createInvitation({ expiresAt: new Date(Date.now() - 1000) });
    expect(isInvitationExpired(inv)).toBe(true);
  });

  it("is expired when expiresAt is exactly now", () => {
    const inv = createInvitation({ expiresAt: new Date(Date.now() - 1) });
    expect(isInvitationExpired(inv)).toBe(true);
  });
});

describe("Invitation flow – email matching", () => {
  it("matches emails case-insensitively", () => {
    expect(doesEmailMatch("User@Test.COM", "user@test.com")).toBe(true);
  });

  it("does not match different emails", () => {
    expect(doesEmailMatch("user1@test.com", "user2@test.com")).toBe(false);
  });

  it("matches exact same email", () => {
    expect(doesEmailMatch("user@test.com", "user@test.com")).toBe(true);
  });
});

describe("Invitation flow – role assignment", () => {
  it("assigns role from invitation", () => {
    const inv = createInvitation({ role: "advogado" });
    expect(assignRole(inv)).toBe("advogado");
  });

  it("assigns financeiro role", () => {
    const inv = createInvitation({ role: "financeiro" });
    expect(assignRole(inv)).toBe("financeiro");
  });

  it("assigns visualizador role", () => {
    const inv = createInvitation({ role: "visualizador" });
    expect(assignRole(inv)).toBe("visualizador");
  });

  it("role must be a valid permission role", () => {
    const inv = createInvitation({ role: "assistente" });
    expect(assignRole(inv)).toBe("assistente");
    // The assigned role should grant at least one permission
    const hasPermission = ["clientes.visualizar", "processos.visualizar", "prazos.visualizar", "tarefas.gerenciar", "agenda.editar"].some(
      (p) => can("assistente", p as Parameters<typeof can>[1]),
    );
    expect(hasPermission).toBe(true);
  });
});

describe("Invitation flow – duplicate member prevention", () => {
  it("detects existing member with same email in same firm", () => {
    const inv = createInvitation({ lawFirmId: "firm-1", email: "existing@test.com" });
    const members: LawFirmMember[] = [
      { id: "m1", lawFirmId: "firm-1", userId: "u1", email: "existing@test.com", role: "advogado", status: "ativo" },
    ];
    expect(isAlreadyMember(inv, members)).toBe(true);
  });

  it("does not flag different firm as duplicate", () => {
    const inv = createInvitation({ lawFirmId: "firm-1", email: "user@test.com" });
    const members: LawFirmMember[] = [
      { id: "m1", lawFirmId: "firm-2", userId: "u1", email: "user@test.com", role: "advogado", status: "ativo" },
    ];
    expect(isAlreadyMember(inv, members)).toBe(false);
  });

  it("does not flag when no members exist", () => {
    const inv = createInvitation({ email: "new@test.com" });
    expect(isAlreadyMember(inv, [])).toBe(false);
  });

  it("matches case-insensitively for duplicate check", () => {
    const inv = createInvitation({ lawFirmId: "firm-1", email: "User@Test.COM" });
    const members: LawFirmMember[] = [
      { id: "m1", lawFirmId: "firm-1", userId: "u1", email: "user@test.com", role: "advogado", status: "ativo" },
    ];
    expect(isAlreadyMember(inv, members)).toBe(true);
  });
});

describe("Invitation flow – schema validation", () => {
  it("valid team invitation data passes", () => {
    expect(teamInvitationSchema.safeParse({ email: "novo@test.com", role: "colaborador" }).success).toBe(true);
  });

  it("invalid email is rejected", () => {
    expect(teamInvitationSchema.safeParse({ email: "not-email", role: "colaborador" }).success).toBe(false);
  });

  it("invalid role is rejected", () => {
    expect(teamInvitationSchema.safeParse({ email: "novo@test.com", role: "superadmin" }).success).toBe(false);
  });

  it("all valid roles are accepted", () => {
    const roles = ["proprietario", "administrador", "advogado", "assistente", "financeiro", "colaborador", "visualizador"] as const;
    for (const role of roles) {
      expect(teamInvitationSchema.safeParse({ email: "test@test.com", role }).success).toBe(true);
    }
  });
});
