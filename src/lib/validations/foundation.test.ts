import { describe, expect, it } from "vitest";

import {
  clientSchema,
  contractSchema,
  deadlineSchema,
  expenseSchema,
  lawFirmSchema,
  leadSchema,
  legalCaseSchema,
  taskSchema,
} from "./foundation";

describe("lawFirmSchema", () => {
  it("aceita dados válidos", () => {
    const result = lawFirmSchema.safeParse({
      name: "Escritório Silva",
      slug: "escritorio-silva",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    const result = lawFirmSchema.safeParse({ name: "A", slug: "abc" });
    expect(result.success).toBe(false);
  });

  it("rejeita slug com caracteres inválidos", () => {
    const result = lawFirmSchema.safeParse({ name: "Escritório", slug: "Escritório Silva!" });
    expect(result.success).toBe(false);
  });

  it("aceita slug com números e hífens", () => {
    const result = lawFirmSchema.safeParse({ name: "Escritório", slug: "esc-123-abc" });
    expect(result.success).toBe(true);
  });
});

describe("leadSchema", () => {
  it("aceita dados mínimos", () => {
    const result = leadSchema.safeParse({ name: "João", interest: "Trabalhista" });
    expect(result.success).toBe(true);
  });

  it("define valores padrão", () => {
    const result = leadSchema.safeParse({ name: "João", interest: "Trabalhista" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.funnelStage).toBe("novo");
      expect(result.data.probability).toBe(0);
      expect(result.data.estimatedValueCents).toBe(0);
    }
  });

  it("rejeita interesse vazio", () => {
    const result = leadSchema.safeParse({ name: "João", interest: "" });
    expect(result.success).toBe(false);
  });
});

describe("clientSchema", () => {
  it("aceita dados mínimos", () => {
    const result = clientSchema.safeParse({ name: "Maria", interestArea: "Cível" });
    expect(result.success).toBe(true);
  });

  it("define personType como física por padrão", () => {
    const result = clientSchema.safeParse({ name: "Maria", interestArea: "Cível" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.personType).toBe("fisica");
      expect(result.data.status).toBe("ativo");
    }
  });
});

describe("legalCaseSchema", () => {
  const validCase = {
    clientId: "550e8400-e29b-41d4-a716-446655440000",
    title: "Ação Trabalhista",
    actionType: "Reclamação Trabalhista",
    caseNumber: "0001234-56.2025.5.01.0001",
  };

  it("aceita processo judicial com número", () => {
    const result = legalCaseSchema.safeParse(validCase);
    expect(result.success).toBe(true);
  });

  it("aceita processo extrajudicial sem número", () => {
    const result = legalCaseSchema.safeParse({
      ...validCase,
      caseKind: "extrajudicial",
      caseNumber: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita processo judicial sem número", () => {
    const result = legalCaseSchema.safeParse({
      ...validCase,
      caseNumber: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("contractSchema", () => {
  const validContract = {
    clientId: "550e8400-e29b-41d4-a716-446655440000",
    serviceDescription: "Assessoria jurídica completa",
    totalAmountCents: 10000,
    firstDueDate: "2025-06-01",
    paymentMethod: "pix",
  };

  it("aceita dados válidos", () => {
    const result = contractSchema.safeParse(validContract);
    expect(result.success).toBe(true);
  });

  it("rejeita entrada maior que total", () => {
    const result = contractSchema.safeParse({
      ...validContract,
      upfrontAmountCents: 15000,
    });
    expect(result.success).toBe(false);
  });

  it("aceita entrada igual ao total", () => {
    const result = contractSchema.safeParse({
      ...validContract,
      upfrontAmountCents: 10000,
      installmentsCount: 1,
    });
    expect(result.success).toBe(true);
  });
});

describe("deadlineSchema", () => {
  it("aceita dados válidos", () => {
    const result = deadlineSchema.safeParse({
      title: "Prazo de contestação",
      type: "judicial",
      dueDate: "2025-07-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita título muito curto", () => {
    const result = deadlineSchema.safeParse({
      title: "AB",
      type: "judicial",
      dueDate: "2025-07-01",
    });
    expect(result.success).toBe(false);
  });

  it("define prioridade padrão como normal", () => {
    const result = deadlineSchema.safeParse({
      title: "Prazo qualquer",
      type: "judicial",
      dueDate: "2025-07-01",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("normal");
    }
  });
});

describe("taskSchema", () => {
  it("aceita dados válidos", () => {
    const result = taskSchema.safeParse({ title: "Revisar petição" });
    expect(result.success).toBe(true);
  });

  it("rejeita título muito curto", () => {
    const result = taskSchema.safeParse({ title: "AB" });
    expect(result.success).toBe(false);
  });

  it("aceita dados mínimos sem campos opcionais", () => {
    const result = taskSchema.safeParse({ title: "Tarefa completa" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe("normal");
    }
  });
});

describe("expenseSchema", () => {
  it("aceita dados válidos", () => {
    const result = expenseSchema.safeParse({
      description: "Custas judiciais",
      category: "Judicial",
      amountCents: 5000,
    });
    expect(result.success).toBe(true);
  });

  it("rejeita valor zero ou negativo", () => {
    const result = expenseSchema.safeParse({
      description: "Custas judiciais",
      category: "Judicial",
      amountCents: 0,
    });
    expect(result.success).toBe(false);
  });
});
