import { describe, expect, it } from "vitest";

import { calculateInstallmentPlan } from "./installments";

// ---------------------------------------------------------------------------
// Mock domain types
// ---------------------------------------------------------------------------

type InstallmentStatus = "pendente" | "pago_parcial" | "pago" | "atrasado" | "cancelado";

interface Installment {
  id: string;
  contractId: string;
  number: number;
  amountCents: number;
  paidCents: number;
  status: InstallmentStatus;
}

interface Contract {
  id: string;
  lawFirmId: string;
  totalAmountCents: number;
  upfrontAmountCents: number;
  installmentsCount: number;
  balanceCents: number;
  status: "rascunho" | "ativo" | "quitado" | "inadimplente";
}

// ---------------------------------------------------------------------------
// Pure helper functions (mirroring expected business logic)
// ---------------------------------------------------------------------------

function calculateInstallmentStatus(installment: Installment): InstallmentStatus {
  if (installment.paidCents === 0) return "pendente";
  if (installment.paidCents >= installment.amountCents) return "pago";
  return "pago_parcial";
}

function calculateContractBalance(contract: Contract, installments: Installment[]): number {
  const totalPaid = installments.reduce((sum, inst) => sum + inst.paidCents, 0);
  return contract.totalAmountCents - contract.upfrontAmountCents - totalPaid;
}

function detectDuplicatePayment(installment: Installment, proposedCents: number): boolean {
  return installment.paidCents + proposedCents > installment.amountCents;
}

function reversePayment(installment: Installment): Installment {
  return { ...installment, paidCents: 0, status: "pendente" };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Payment flow – installment status calculation", () => {
  it("pendente when no payment", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 0, status: "pendente" };
    expect(calculateInstallmentStatus(inst)).toBe("pendente");
  });

  it("pago when fully paid", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 5000, status: "pendente" };
    expect(calculateInstallmentStatus(inst)).toBe("pago");
  });

  it("pago_parcial when partially paid", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 2500, status: "pendente" };
    expect(calculateInstallmentStatus(inst)).toBe("pago_parcial");
  });

  it("pago when overpaid", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 6000, status: "pendente" };
    expect(calculateInstallmentStatus(inst)).toBe("pago");
  });
});

describe("Payment flow – contract balance recalculation", () => {
  it("balance equals total minus upfront minus all installment payments", () => {
    const contract: Contract = {
      id: "c1",
      lawFirmId: "firm1",
      totalAmountCents: 10000,
      upfrontAmountCents: 2000,
      installmentsCount: 4,
      balanceCents: 8000,
      status: "ativo",
    };

    const installments: Installment[] = [
      { id: "1", contractId: "c1", number: 1, amountCents: 2000, paidCents: 2000, status: "pago" },
      { id: "2", contractId: "c1", number: 2, amountCents: 2000, paidCents: 1000, status: "pago_parcial" },
      { id: "3", contractId: "c1", number: 3, amountCents: 2000, paidCents: 0, status: "pendente" },
      { id: "4", contractId: "c1", number: 4, amountCents: 2000, paidCents: 0, status: "pendente" },
    ];

    // total = 10000, upfront = 2000, paid = 2000+1000+0+0 = 3000
    // balance = 10000 - 2000 - 3000 = 5000
    expect(calculateContractBalance(contract, installments)).toBe(5000);
  });

  it("balance is zero when fully paid", () => {
    const contract: Contract = {
      id: "c1",
      lawFirmId: "firm1",
      totalAmountCents: 6000,
      upfrontAmountCents: 0,
      installmentsCount: 3,
      balanceCents: 6000,
      status: "ativo",
    };

    const installments: Installment[] = [
      { id: "1", contractId: "c1", number: 1, amountCents: 2000, paidCents: 2000, status: "pago" },
      { id: "2", contractId: "c1", number: 2, amountCents: 2000, paidCents: 2000, status: "pago" },
      { id: "3", contractId: "c1", number: 3, amountCents: 2000, paidCents: 2000, status: "pago" },
    ];

    expect(calculateContractBalance(contract, installments)).toBe(0);
  });

  it("balance accounts for upfront payment", () => {
    const contract: Contract = {
      id: "c1",
      lawFirmId: "firm1",
      totalAmountCents: 10000,
      upfrontAmountCents: 5000,
      installmentsCount: 2,
      balanceCents: 5000,
      status: "ativo",
    };

    const installments: Installment[] = [
      { id: "1", contractId: "c1", number: 1, amountCents: 2500, paidCents: 2500, status: "pago" },
      { id: "2", contractId: "c1", number: 2, amountCents: 2500, paidCents: 0, status: "pendente" },
    ];

    // total = 10000, upfront = 5000, paid = 2500
    // balance = 10000 - 5000 - 2500 = 2500
    expect(calculateContractBalance(contract, installments)).toBe(2500);
  });
});

describe("Payment flow – duplicate payment detection", () => {
  it("detects overpayment when adding payment would exceed installment", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 3000, status: "pago_parcial" };
    expect(detectDuplicatePayment(inst, 3000)).toBe(true); // 3000+3000=6000 > 5000
  });

  it("allows exact remaining payment", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 3000, status: "pago_parcial" };
    expect(detectDuplicatePayment(inst, 2000)).toBe(false); // 3000+2000=5000 == 5000
  });

  it("allows partial payment", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 1000, status: "pago_parcial" };
    expect(detectDuplicatePayment(inst, 1000)).toBe(false); // 1000+1000=2000 < 5000
  });

  it("detects duplicate on fully paid installment", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 5000, status: "pago" };
    expect(detectDuplicatePayment(inst, 1)).toBe(true);
  });
});

describe("Payment flow – reversal status restoration", () => {
  it("reversal resets paidCents to zero and status to pendente", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 5000, status: "pago" };
    const reversed = reversePayment(inst);
    expect(reversed.paidCents).toBe(0);
    expect(reversed.status).toBe("pendente");
  });

  it("reversal does not mutate original installment", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 3000, status: "pago_parcial" };
    const reversed = reversePayment(inst);
    expect(inst.paidCents).toBe(3000);
    expect(inst.status).toBe("pago_parcial");
    expect(reversed.paidCents).toBe(0);
    expect(reversed.status).toBe("pendente");
  });
});

describe("Payment flow – edge cases", () => {
  it("exact payment matches installment amount", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 5000, status: "pendente" };
    expect(calculateInstallmentStatus(inst)).toBe("pago");
    expect(detectDuplicatePayment(inst, 0)).toBe(false);
  });

  it("partial payment results in correct status", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 1, status: "pendente" };
    expect(calculateInstallmentStatus(inst)).toBe("pago_parcial");
  });

  it("overpayment detection with zero remaining", () => {
    const inst: Installment = { id: "1", contractId: "c1", number: 1, amountCents: 5000, paidCents: 5000, status: "pago" };
    expect(detectDuplicatePayment(inst, 1)).toBe(true);
    expect(detectDuplicatePayment(inst, 0)).toBe(false);
  });

  it("contract with zero upfront has full balance in installments", () => {
    const plan = calculateInstallmentPlan({
      totalAmountCents: 9999,
      upfrontAmountCents: 0,
      installments: 7,
    });

    expect(plan).toHaveLength(7);
    const sum = plan.reduce((s, i) => s + i.amountCents, 0);
    expect(sum).toBe(9999);
  });
});
