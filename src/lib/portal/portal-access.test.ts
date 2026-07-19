import { describe, expect, it } from "vitest";

/**
 * Unit tests for client portal access logic.
 *
 * Mirrors the logic in portal/queries.ts: token validation,
 * expiration checking, and portal data access rules.
 */

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface PortalInvite {
  id: string;
  lawFirmId: string;
  clientId: string;
  email: string | null;
  status: "ativo" | "revogado" | "expirado";
  token: string;
  expiresAt: string | null;
  lastAccessAt: string | null;
  createdAt: string;
}

interface PortalData {
  client: { id: string; name: string; email: string | null } | null;
  lawFirm: { name: string } | null;
  cases: Array<{ id: string; title: string; status: string }>;
  contracts: Array<{ id: string; serviceDescription: string; status: string }>;
  documents: Array<{ id: string; name: string; mimeType: string }>;
  deadlines: Array<{ id: string; title: string; dueDate: string; status: string }>;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring portal/queries.ts logic
// ---------------------------------------------------------------------------

function isTokenValid(invite: PortalInvite): boolean {
  return invite.status === "ativo" && invite.token.length > 0;
}

function isInviteExpired(invite: PortalInvite): boolean {
  if (!invite.expiresAt) return false;
  return new Date(invite.expiresAt).getTime() < Date.now();
}

function canAccessPortal(invite: PortalInvite): boolean {
  if (!isTokenValid(invite)) return false;
  if (isInviteExpired(invite)) return false;
  return true;
}

function buildPortalData(invite: PortalInvite): PortalData | null {
  if (!canAccessPortal(invite)) return null;
  return {
    client: { id: invite.clientId, name: "Cliente Teste", email: invite.email },
    lawFirm: { name: "Escritorio Teste" },
    cases: [],
    contracts: [],
    documents: [],
    deadlines: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Portal access - token validation", () => {
  it("accepts active invite with valid token", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "ativo",
      token: "abc-123-def",
      expiresAt: null,
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isTokenValid(invite)).toBe(true);
  });

  it("rejects revoked invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "revogado",
      token: "abc-123",
      expiresAt: null,
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isTokenValid(invite)).toBe(false);
  });

  it("rejects expired status invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "expirado",
      token: "abc-123",
      expiresAt: null,
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isTokenValid(invite)).toBe(false);
  });

  it("rejects empty token", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "ativo",
      token: "",
      expiresAt: null,
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isTokenValid(invite)).toBe(false);
  });
});

describe("Portal access - expiration check", () => {
  it("is not expired when expiresAt is in the future", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: null,
      status: "ativo",
      token: "abc",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isInviteExpired(invite)).toBe(false);
  });

  it("is expired when expiresAt is in the past", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: null,
      status: "ativo",
      token: "abc",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isInviteExpired(invite)).toBe(true);
  });

  it("is not expired when expiresAt is null (no expiration)", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: null,
      status: "ativo",
      token: "abc",
      expiresAt: null,
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(isInviteExpired(invite)).toBe(false);
  });
});

describe("Portal access - full access check", () => {
  it("allows access for valid, non-expired invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "ativo",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(canAccessPortal(invite)).toBe(true);
  });

  it("denies access for revoked invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "revogado",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(canAccessPortal(invite)).toBe(false);
  });

  it("denies access for expired invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "ativo",
      token: "valid-token",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(canAccessPortal(invite)).toBe(false);
  });
});

describe("Portal access - data construction", () => {
  it("returns portal data for valid invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "ativo",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    const data = buildPortalData(invite);
    expect(data).not.toBeNull();
    expect(data?.client?.id).toBe("client-1");
    expect(data?.client?.name).toBe("Cliente Teste");
  });

  it("returns null for invalid invite", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: "client@test.com",
      status: "revogado",
      token: "valid-token",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    expect(buildPortalData(invite)).toBeNull();
  });

  it("returns empty arrays for new client", () => {
    const invite: PortalInvite = {
      id: "inv-1",
      lawFirmId: "firm-1",
      clientId: "client-1",
      email: null,
      status: "ativo",
      token: "valid-token",
      expiresAt: null,
      lastAccessAt: null,
      createdAt: "2025-06-15",
    };
    const data = buildPortalData(invite);
    expect(data?.cases).toHaveLength(0);
    expect(data?.contracts).toHaveLength(0);
    expect(data?.documents).toHaveLength(0);
    expect(data?.deadlines).toHaveLength(0);
  });
});
