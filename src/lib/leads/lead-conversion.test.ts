import { describe, expect, it } from "vitest";

/**
 * Unit tests for lead-to-client conversion business logic.
 *
 * Mirrors the RPC `convert_lead_to_client` defined in migration 0001.
 * Tests pure logic only — no database access.
 */

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface Lead {
  id: string;
  lawFirmId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  source: string | null;
  interest: string | null;
  responsibleMemberId: string;
  status: "novo" | "contatado" | "convertido" | "descartado";
  convertedClientId: string | null;
  notes: string | null;
}

interface Client {
  id: string;
  lawFirmId: string;
  name: string;
  personType: "fisica" | "juridica";
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  interestArea: string | null;
  responsibleMemberId: string;
  status: "ativo" | "inativo" | "inadimplente";
  notes: string | null;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Pure functions mirroring the RPC logic
// ---------------------------------------------------------------------------

function canAccessLead(lead: Lead, memberFirmId: string): boolean {
  return lead.lawFirmId === memberFirmId;
}

function isAlreadyConverted(lead: Lead): boolean {
  return lead.convertedClientId !== null;
}

function convertLeadToClient(
  lead: Lead,
  newClientId: string,
): { client: Client; updatedLead: Lead } {
  const client: Client = {
    id: newClientId,
    lawFirmId: lead.lawFirmId,
    name: lead.name,
    personType: "fisica",
    whatsapp: lead.whatsapp,
    phone: lead.phone,
    email: lead.email,
    source: lead.source,
    interestArea: lead.interest,
    responsibleMemberId: lead.responsibleMemberId,
    status: "ativo",
    notes: lead.notes,
    tags: ["convertido-de-lead"],
  };

  const updatedLead: Lead = {
    ...lead,
    status: "convertido",
    convertedClientId: newClientId,
  };

  return { client, updatedLead };
}

function buildClientTags(lead: Lead): string[] {
  const tags: string[] = ["convertido-de-lead"];
  if (lead.source) tags.push(`fonte:${lead.source}`);
  return tags;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Lead conversion – tenant access check", () => {
  it("allows access when member belongs to same firm", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };
    expect(canAccessLead(lead, "firm-1")).toBe(true);
  });

  it("denies access when member belongs to different firm", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };
    expect(canAccessLead(lead, "firm-2")).toBe(false);
  });
});

describe("Lead conversion – idempotency", () => {
  it("detects already converted lead", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "convertido",
      convertedClientId: "client-existing",
      notes: null,
    };
    expect(isAlreadyConverted(lead)).toBe(true);
  });

  it("allows conversion of unconverted lead", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };
    expect(isAlreadyConverted(lead)).toBe(false);
  });
});

describe("Lead conversion – client creation", () => {
  it("creates client with lead data", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "Maria Santos",
      phone: "11999998888",
      whatsapp: "11988887777",
      email: "maria@test.com",
      source: "Indicação",
      interest: "Trabalhista",
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: "Cliente urgente",
    };

    const { client, updatedLead } = convertLeadToClient(lead, "client-new");

    expect(client.name).toBe("Maria Santos");
    expect(client.lawFirmId).toBe("firm-1");
    expect(client.personType).toBe("fisica");
    expect(client.whatsapp).toBe("11988887777");
    expect(client.phone).toBe("11999998888");
    expect(client.email).toBe("maria@test.com");
    expect(client.source).toBe("Indicação");
    expect(client.interestArea).toBe("Trabalhista");
    expect(client.responsibleMemberId).toBe("member-1");
    expect(client.status).toBe("ativo");
    expect(client.notes).toBe("Cliente urgente");
    expect(client.tags).toEqual(["convertido-de-lead"]);
  });

  it("updates lead status to convertido", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };

    const { updatedLead } = convertLeadToClient(lead, "client-new");

    expect(updatedLead.status).toBe("convertido");
    expect(updatedLead.convertedClientId).toBe("client-new");
  });

  it("handles lead with null optional fields", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "Simples",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };

    const { client } = convertLeadToClient(lead, "client-new");

    expect(client.phone).toBeNull();
    expect(client.whatsapp).toBeNull();
    expect(client.email).toBeNull();
    expect(client.source).toBeNull();
    expect(client.interestArea).toBeNull();
    expect(client.notes).toBeNull();
  });
});

describe("Lead conversion – tag building", () => {
  it("always includes convertido-de-lead tag", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };
    expect(buildClientTags(lead)).toContain("convertido-de-lead");
  });

  it("includes source tag when source is provided", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: "Google Ads",
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };
    const tags = buildClientTags(lead);
    expect(tags).toContain("fonte:Google Ads");
    expect(tags).toHaveLength(2);
  });

  it("does not include source tag when source is null", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: null,
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };
    const tags = buildClientTags(lead);
    expect(tags).toHaveLength(1);
  });
});

describe("Lead conversion – mutation safety", () => {
  it("does not mutate the original lead", () => {
    const lead: Lead = {
      id: "lead-1",
      lawFirmId: "firm-1",
      name: "João",
      phone: "1199999",
      whatsapp: null,
      email: null,
      source: null,
      interest: null,
      responsibleMemberId: "member-1",
      status: "novo",
      convertedClientId: null,
      notes: null,
    };

    convertLeadToClient(lead, "client-new");

    expect(lead.status).toBe("novo");
    expect(lead.convertedClientId).toBeNull();
  });
});
