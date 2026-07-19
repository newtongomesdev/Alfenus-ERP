import { describe, expect, it } from "vitest";

import {
  appointmentSchema,
  caseMovementSchema,
  casePartySchema,
  clientSchema,
  contractSchema,
  deadlineSchema,
  documentSchema,
  expenseSchema,
  lawFirmSchema,
  leadSchema,
  legalCaseSchema,
  memberSchema,
  paymentSchema,
  taskSchema,
  teamInvitationSchema,
} from "./foundation";

// ---------------------------------------------------------------------------
// Valid fixture helpers
// ---------------------------------------------------------------------------

const UUID = "550e8400-e29b-41d4-a716-446655440000";

function validLawFirm() {
  return { name: "Escritorio Teste", slug: "escritorio-teste" };
}

function validMember() {
  return { name: "Joao Silva", email: "joao@test.com", role: "advogado" as const };
}

function validLead() {
  return { name: "Lead Teste", interest: "Trabalhista" };
}

function validClient() {
  return { name: "Cliente Teste", interestArea: "Civil" };
}

function validLegalCase() {
  return { clientId: UUID, title: "Processo Teste", actionType: "Acao Civil", caseNumber: "0001234-56.2024.8.26.0001" };
}

function validContract() {
  return {
    clientId: UUID,
    serviceDescription: "Servico de consultoria juridica completa",
    totalAmountCents: 10000,
    firstDueDate: "2025-01-15",
    paymentMethod: "Pix",
  };
}

function validPayment() {
  return { installmentId: UUID, amountCents: 5000, paidAt: "2025-01-15", paymentMethod: "Pix" };
}

function validDeadline() {
  return { title: "Prazo Teste", type: "Audiencia", dueDate: "2025-01-20" };
}

function validTask() {
  return { title: "Tarefa Teste" };
}

function validExpense() {
  return { description: "Despesa com publicacao", category: "Publicacao", amountCents: 1500 };
}

function validAppointment() {
  return { title: "Audiencia Teste", type: "audiencia" as const, startsAt: "2025-01-20T10:00:00" };
}

function validDocument() {
  return { name: "Procuracao", entityType: "cliente" as const };
}

function validCaseParty() {
  return { name: "Parte Teste", partyRole: "Reu" };
}

function validCaseMovement() {
  return { title: "Citacao realizada", occurredAt: "2025-01-15" };
}

function validTeamInvitation() {
  return { email: "novo@test.com", role: "colaborador" as const };
}

// ---------------------------------------------------------------------------
// Schema validation tests
// ---------------------------------------------------------------------------

describe("lawFirmSchema", () => {
  it("validates correct data", () => {
    expect(lawFirmSchema.safeParse(validLawFirm()).success).toBe(true);
  });

  it("rejects name shorter than 2 chars", () => {
    expect(lawFirmSchema.safeParse({ ...validLawFirm(), name: "A" }).success).toBe(false);
  });

  it("rejects invalid slug format", () => {
    expect(lawFirmSchema.safeParse({ ...validLawFirm(), slug: "Slug Invalido!" }).success).toBe(false);
  });

  it("accepts slug with numbers and hyphens", () => {
    expect(lawFirmSchema.safeParse({ ...validLawFirm(), slug: "escritorio-123" }).success).toBe(true);
  });

  it("defaults plan to starter", () => {
    const result = lawFirmSchema.parse(validLawFirm());
    expect(result.plan).toBe("starter");
  });

  it("accepts optional fields", () => {
    expect(lawFirmSchema.safeParse({ ...validLawFirm(), document: "12345", email: "a@b.com", phone: "1199999" }).success).toBe(true);
  });

  it("rejects empty string name", () => {
    expect(lawFirmSchema.safeParse({ ...validLawFirm(), name: "" }).success).toBe(false);
  });
});

describe("memberSchema", () => {
  it("validates correct data", () => {
    expect(memberSchema.safeParse(validMember()).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(memberSchema.safeParse({ ...validMember(), email: "not-an-email" }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(memberSchema.safeParse({ ...validMember(), role: "invalid_role" }).success).toBe(false);
  });

  it("accepts all valid roles", () => {
    const roles = ["proprietario", "administrador", "advogado", "assistente", "financeiro", "colaborador", "visualizador"] as const;
    for (const role of roles) {
      expect(memberSchema.safeParse({ ...validMember(), role }).success).toBe(true);
    }
  });
});

describe("leadSchema", () => {
  it("validates correct data", () => {
    expect(leadSchema.safeParse(validLead()).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(leadSchema.safeParse({ ...validLead(), name: "" }).success).toBe(false);
  });

  it("defaults funnelStage to novo", () => {
    const result = leadSchema.parse(validLead());
    expect(result.funnelStage).toBe("novo");
  });

  it("defaults probability to 0", () => {
    const result = leadSchema.parse(validLead());
    expect(result.probability).toBe(0);
  });

  it("rejects probability > 100", () => {
    expect(leadSchema.safeParse({ ...validLead(), probability: 101 }).success).toBe(false);
  });

  it("rejects negative estimatedValueCents", () => {
    expect(leadSchema.safeParse({ ...validLead(), estimatedValueCents: -1 }).success).toBe(false);
  });
});

describe("clientSchema", () => {
  it("validates correct data", () => {
    expect(clientSchema.safeParse(validClient()).success).toBe(true);
  });

  it("defaults personType to fisica", () => {
    const result = clientSchema.parse(validClient());
    expect(result.personType).toBe("fisica");
  });

  it("defaults status to ativo", () => {
    const result = clientSchema.parse(validClient());
    expect(result.status).toBe("ativo");
  });

  it("rejects empty interestArea", () => {
    expect(clientSchema.safeParse({ ...validClient(), interestArea: "" }).success).toBe(false);
  });

  it("accepts juridica personType", () => {
    expect(clientSchema.safeParse({ ...validClient(), personType: "juridica" }).success).toBe(true);
  });
});

describe("legalCaseSchema", () => {
  it("validates correct data", () => {
    expect(legalCaseSchema.safeParse(validLegalCase()).success).toBe(true);
  });

  it("rejects missing clientId", () => {
    const { clientId, ...rest } = validLegalCase();
    expect(legalCaseSchema.safeParse({ ...rest, clientId: "" }).success).toBe(false);
  });

  it("rejects invalid UUID for clientId", () => {
    expect(legalCaseSchema.safeParse({ ...validLegalCase(), clientId: "not-a-uuid" }).success).toBe(false);
  });

  it("requires caseNumber for judicial cases", () => {
    const data = { ...validLegalCase(), caseNumber: "" };
    expect(legalCaseSchema.safeParse(data).success).toBe(false);
  });

  it("does not require caseNumber for extrajudicial", () => {
    expect(legalCaseSchema.safeParse({ ...validLegalCase(), caseKind: "extrajudicial", caseNumber: "" }).success).toBe(true);
  });

  it("defaults status to em_analise", () => {
    const result = legalCaseSchema.parse(validLegalCase());
    expect(result.status).toBe("em_analise");
  });
});

describe("contractSchema", () => {
  it("validates correct data", () => {
    expect(contractSchema.safeParse(validContract()).success).toBe(true);
  });

  it("rejects totalAmountCents <= 0", () => {
    expect(contractSchema.safeParse({ ...validContract(), totalAmountCents: 0 }).success).toBe(false);
  });

  it("rejects upfrontAmountCents > totalAmountCents", () => {
    expect(contractSchema.safeParse({ ...validContract(), upfrontAmountCents: 20000, totalAmountCents: 10000 }).success).toBe(false);
  });

  it("accepts upfrontAmountCents equal to total", () => {
    expect(contractSchema.safeParse({ ...validContract(), upfrontAmountCents: 10000, totalAmountCents: 10000 }).success).toBe(true);
  });

  it("defaults installmentsCount to 1", () => {
    const result = contractSchema.parse(validContract());
    expect(result.installmentsCount).toBe(1);
  });

  it("rejects installmentsCount > 60", () => {
    expect(contractSchema.safeParse({ ...validContract(), installmentsCount: 61 }).success).toBe(false);
  });

  it("defaults status to ativo", () => {
    const result = contractSchema.parse(validContract());
    expect(result.status).toBe("ativo");
  });
});

describe("paymentSchema", () => {
  it("validates correct data", () => {
    expect(paymentSchema.safeParse(validPayment()).success).toBe(true);
  });

  it("rejects amountCents <= 0", () => {
    expect(paymentSchema.safeParse({ ...validPayment(), amountCents: 0 }).success).toBe(false);
  });

  it("rejects negative discountCents", () => {
    expect(paymentSchema.safeParse({ ...validPayment(), discountCents: -1 }).success).toBe(false);
  });

  it("defaults discountCents, fineCents, interestCents to 0", () => {
    const result = paymentSchema.parse(validPayment());
    expect(result.discountCents).toBe(0);
    expect(result.fineCents).toBe(0);
    expect(result.interestCents).toBe(0);
  });

  it("rejects empty paymentMethod", () => {
    expect(paymentSchema.safeParse({ ...validPayment(), paymentMethod: "" }).success).toBe(false);
  });
});

describe("deadlineSchema", () => {
  it("validates correct data", () => {
    expect(deadlineSchema.safeParse(validDeadline()).success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    expect(deadlineSchema.safeParse({ ...validDeadline(), title: "AB" }).success).toBe(false);
  });

  it("defaults priority to normal", () => {
    const result = deadlineSchema.parse(validDeadline());
    expect(result.priority).toBe("normal");
  });

  it("accepts optional UUID fields as empty string", () => {
    expect(deadlineSchema.safeParse({ ...validDeadline(), clientId: "", legalCaseId: "" }).success).toBe(true);
  });
});

describe("taskSchema", () => {
  it("validates correct data", () => {
    expect(taskSchema.safeParse(validTask()).success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    expect(taskSchema.safeParse({ ...validTask(), title: "AB" }).success).toBe(false);
  });

  it("defaults priority to normal", () => {
    const result = taskSchema.parse(validTask());
    expect(result.priority).toBe("normal");
  });

  it("accepts all optional UUID fields empty", () => {
    expect(taskSchema.safeParse({ ...validTask(), clientId: "", legalCaseId: "", responsibleMemberId: "" }).success).toBe(true);
  });
});

describe("expenseSchema", () => {
  it("validates correct data", () => {
    expect(expenseSchema.safeParse(validExpense()).success).toBe(true);
  });

  it("rejects amountCents <= 0", () => {
    expect(expenseSchema.safeParse({ ...validExpense(), amountCents: 0 }).success).toBe(false);
  });

  it("rejects description shorter than 3 chars", () => {
    expect(expenseSchema.safeParse({ ...validExpense(), description: "AB" }).success).toBe(false);
  });
});

describe("appointmentSchema", () => {
  it("validates correct data", () => {
    expect(appointmentSchema.safeParse(validAppointment()).success).toBe(true);
  });

  it("rejects invalid type", () => {
    expect(appointmentSchema.safeParse({ ...validAppointment(), type: "invalid" }).success).toBe(false);
  });

  it("accepts all valid types", () => {
    for (const type of ["reuniao", "audiencia", "retorno", "outro"] as const) {
      expect(appointmentSchema.safeParse({ ...validAppointment(), type }).success).toBe(true);
    }
  });

  it("rejects empty startsAt", () => {
    expect(appointmentSchema.safeParse({ ...validAppointment(), startsAt: "" }).success).toBe(false);
  });
});

describe("documentSchema", () => {
  it("validates correct data", () => {
    expect(documentSchema.safeParse(validDocument()).success).toBe(true);
  });

  it("rejects invalid entityType", () => {
    expect(documentSchema.safeParse({ ...validDocument(), entityType: "invalid" }).success).toBe(false);
  });

  it("accepts all valid entityTypes", () => {
    for (const entityType of ["cliente", "processo", "contrato", "prazo", "tarefa", "outro"] as const) {
      expect(documentSchema.safeParse({ ...validDocument(), entityType }).success).toBe(true);
    }
  });

  it("accepts empty entityId", () => {
    expect(documentSchema.safeParse({ ...validDocument(), entityId: "" }).success).toBe(true);
  });
});

describe("casePartySchema", () => {
  it("validates correct data", () => {
    expect(casePartySchema.safeParse(validCaseParty()).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(casePartySchema.safeParse({ ...validCaseParty(), name: "" }).success).toBe(false);
  });
});

describe("caseMovementSchema", () => {
  it("validates correct data", () => {
    expect(caseMovementSchema.safeParse(validCaseMovement()).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(caseMovementSchema.safeParse({ ...validCaseMovement(), title: "" }).success).toBe(false);
  });
});

describe("teamInvitationSchema", () => {
  it("validates correct data", () => {
    expect(teamInvitationSchema.safeParse(validTeamInvitation()).success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(teamInvitationSchema.safeParse({ ...validTeamInvitation(), email: "bad" }).success).toBe(false);
  });

  it("rejects invalid role", () => {
    expect(teamInvitationSchema.safeParse({ ...validTeamInvitation(), role: "superadmin" }).success).toBe(false);
  });
});

describe("Schema edge cases", () => {
  it("all schemas reject completely empty objects", () => {
    const schemas = [
      lawFirmSchema,
      memberSchema,
      leadSchema,
      clientSchema,
      legalCaseSchema,
      contractSchema,
      paymentSchema,
      deadlineSchema,
      taskSchema,
      expenseSchema,
      appointmentSchema,
      documentSchema,
      casePartySchema,
      caseMovementSchema,
      teamInvitationSchema,
    ];

    for (const schema of schemas) {
      expect(schema.safeParse({}).success).toBe(false);
    }
  });
});
