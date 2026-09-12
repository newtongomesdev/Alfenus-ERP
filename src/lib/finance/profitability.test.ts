import { describe, expect, it } from "vitest";

/**
 * Unit tests for profitability / financial summary calculations.
 *
 * Mirrors the logic in finance/queries.ts: getFinancialSummaryByClient
 * and getFinancialSummaryByContract calculations.
 */

// ---------------------------------------------------------------------------
// Mock types
// ---------------------------------------------------------------------------

interface ContractRow {
  id: string;
  total_amount_cents: number;
}

interface InstallmentRow {
  final_amount_cents: number;
  paid_amount_cents: number;
  due_date: string;
  status: string;
}

interface ClientFinancialSummary {
  clientId: string;
  totalContracts: number;
  totalContractAmountCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  overdueAmountCents: number;
  overdueInstallments: number;
}

// ---------------------------------------------------------------------------
// Pure helpers mirroring finance/queries.ts
// ---------------------------------------------------------------------------

function computeClientSummary(
  clientId: string,
  contracts: ContractRow[],
  installments: InstallmentRow[],
  today: Date,
): ClientFinancialSummary {
  if (contracts.length === 0) {
    return { clientId, totalContracts: 0, totalContractAmountCents: 0, totalPaidCents: 0, totalPendingCents: 0, overdueAmountCents: 0, overdueInstallments: 0 };
  }

  let totalPaid = 0;
  let totalPending = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inst of installments) {
    totalPaid += inst.paid_amount_cents;
    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
    totalPending += remaining;
    if (remaining > 0 && new Date(`${inst.due_date}T00:00:00`) < today) {
      overdueAmount += remaining;
      overdueCount += 1;
    }
  }

  return {
    clientId,
    totalContracts: contracts.length,
    totalContractAmountCents: contracts.reduce((sum, c) => sum + c.total_amount_cents, 0),
    totalPaidCents: totalPaid,
    totalPendingCents: totalPending,
    overdueAmountCents: overdueAmount,
    overdueInstallments: overdueCount,
  };
}

function computeContractSummary(
  totalAmountCents: number,
  installments: Array<{ final_amount_cents: number; paid_amount_cents: number; due_date: string }>,
  today: Date,
): {
  paidAmountCents: number;
  pendingAmountCents: number;
  overdueAmountCents: number;
  overdueInstallments: number;
} {
  let paidAmount = 0;
  let overdueAmount = 0;
  let overdueCount = 0;

  for (const inst of installments) {
    paidAmount += inst.paid_amount_cents;
    const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
    if (remaining > 0 && new Date(`${inst.due_date}T00:00:00`) < today) {
      overdueAmount += remaining;
      overdueCount += 1;
    }
  }

  return {
    paidAmountCents: paidAmount,
    pendingAmountCents: Math.max(totalAmountCents - paidAmount, 0),
    overdueAmountCents: overdueAmount,
    overdueInstallments: overdueCount,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Profitability – client summary", () => {
  const today = new Date("2025-06-15T12:00:00Z");

  it("returns zeros for client with no contracts", () => {
    const summary = computeClientSummary("client-1", [], [], today);
    expect(summary.totalContracts).toBe(0);
    expect(summary.totalPaidCents).toBe(0);
    expect(summary.overdueInstallments).toBe(0);
  });

  it("calculates total contract amount", () => {
    const contracts: ContractRow[] = [
      { id: "c1", total_amount_cents: 100_00 },
      { id: "c2", total_amount_cents: 200_00 },
    ];
    const summary = computeClientSummary("client-1", contracts, [], today);
    expect(summary.totalContractAmountCents).toBe(300_00);
  });

  it("calculates paid and pending amounts", () => {
    const contracts: ContractRow[] = [{ id: "c1", total_amount_cents: 100_00 }];
    const installments: InstallmentRow[] = [
      { final_amount_cents: 50_00, paid_amount_cents: 50_00, due_date: "2025-01-15", status: "paga" },
      { final_amount_cents: 50_00, paid_amount_cents: 20_00, due_date: "2025-02-15", status: "parcialmente_paga" },
    ];

    const summary = computeClientSummary("client-1", contracts, installments, today);
    expect(summary.totalPaidCents).toBe(70_00);
    expect(summary.totalPendingCents).toBe(30_00);
  });

  it("detects overdue installments", () => {
    const contracts: ContractRow[] = [{ id: "c1", total_amount_cents: 100_00 }];
    const installments: InstallmentRow[] = [
      { final_amount_cents: 50_00, paid_amount_cents: 0, due_date: "2025-01-15", status: "pendente" },
      { final_amount_cents: 50_00, paid_amount_cents: 50_00, due_date: "2025-02-15", status: "paga" },
    ];

    const summary = computeClientSummary("client-1", contracts, installments, today);
    expect(summary.overdueInstallments).toBe(1);
    expect(summary.overdueAmountCents).toBe(50_00);
  });

  it("does not count paid installments as overdue", () => {
    const contracts: ContractRow[] = [{ id: "c1", total_amount_cents: 100_00 }];
    const installments: InstallmentRow[] = [
      { final_amount_cents: 50_00, paid_amount_cents: 50_00, due_date: "2025-01-15", status: "paga" },
    ];

    const summary = computeClientSummary("client-1", contracts, installments, today);
    expect(summary.overdueInstallments).toBe(0);
    expect(summary.overdueAmountCents).toBe(0);
  });

  it("does not count future installments as overdue", () => {
    const contracts: ContractRow[] = [{ id: "c1", total_amount_cents: 50_00 }];
    const installments: InstallmentRow[] = [
      { final_amount_cents: 50_00, paid_amount_cents: 0, due_date: "2025-12-15", status: "pendente" },
    ];

    const summary = computeClientSummary("client-1", contracts, installments, today);
    expect(summary.overdueInstallments).toBe(0);
  });

  it("handles multiple contracts with mixed statuses", () => {
    const contracts: ContractRow[] = [
      { id: "c1", total_amount_cents: 200_00 },
      { id: "c2", total_amount_cents: 100_00 },
    ];
    const installments: InstallmentRow[] = [
      { final_amount_cents: 100_00, paid_amount_cents: 100_00, due_date: "2025-01-15", status: "paga" },
      { final_amount_cents: 100_00, paid_amount_cents: 50_00, due_date: "2025-02-15", status: "parcialmente_paga" },
      { final_amount_cents: 100_00, paid_amount_cents: 0, due_date: "2025-03-15", status: "pendente" },
    ];

    const summary = computeClientSummary("client-1", contracts, installments, today);
    expect(summary.totalContracts).toBe(2);
    expect(summary.totalPaidCents).toBe(150_00);
    expect(summary.totalPendingCents).toBe(150_00);
    expect(summary.overdueInstallments).toBe(2); // both unpaid installments are past due
  });
});

describe("Profitability – contract summary", () => {
  const today = new Date("2025-06-15T12:00:00Z");

  it("calculates paid and pending for fully paid contract", () => {
    const result = computeContractSummary(100_00, [
      { final_amount_cents: 50_00, paid_amount_cents: 50_00, due_date: "2025-01-15" },
      { final_amount_cents: 50_00, paid_amount_cents: 50_00, due_date: "2025-02-15" },
    ], today);

    expect(result.paidAmountCents).toBe(100_00);
    expect(result.pendingAmountCents).toBe(0);
  });

  it("calculates partial payment", () => {
    const result = computeContractSummary(100_00, [
      { final_amount_cents: 50_00, paid_amount_cents: 50_00, due_date: "2025-01-15" },
      { final_amount_cents: 50_00, paid_amount_cents: 0, due_date: "2025-02-15" },
    ], today);

    expect(result.paidAmountCents).toBe(50_00);
    expect(result.pendingAmountCents).toBe(50_00);
  });

  it("pending is based on total contract amount minus total paid", () => {
    // Even if one installment is overpaid, pending = max(total - paid, 0)
    // total=100_00, paid=60_00 → pending=40_00
    const result = computeContractSummary(100_00, [
      { final_amount_cents: 50_00, paid_amount_cents: 60_00, due_date: "2025-01-15" },
    ], today);

    expect(result.pendingAmountCents).toBe(40_00);
  });

  it("detects overdue installments in contract", () => {
    const result = computeContractSummary(200_00, [
      { final_amount_cents: 100_00, paid_amount_cents: 0, due_date: "2025-01-15" },
      { final_amount_cents: 100_00, paid_amount_cents: 0, due_date: "2025-12-15" },
    ], today);

    expect(result.overdueInstallments).toBe(1);
    expect(result.overdueAmountCents).toBe(100_00);
  });

  it("handles contract with no installments", () => {
    const result = computeContractSummary(100_00, [], today);
    expect(result.paidAmountCents).toBe(0);
    expect(result.pendingAmountCents).toBe(100_00);
    expect(result.overdueInstallments).toBe(0);
  });
});

describe("Profitability – edge cases", () => {
  const today = new Date("2025-06-15T12:00:00Z");

  it("handles installment due exactly today (due_date < today is true at midnight)", () => {
    // The comparison is: new Date("2025-06-15T00:00:00") < new Date("2025-06-15T12:00:00Z")
    // This is TRUE because midnight < noon on the same day
    const result = computeContractSummary(100_00, [
      { final_amount_cents: 100_00, paid_amount_cents: 0, due_date: "2025-06-15" },
    ], today);

    expect(result.overdueInstallments).toBe(1);
  });

  it("handles installment due yesterday (overdue)", () => {
    const result = computeContractSummary(100_00, [
      { final_amount_cents: 100_00, paid_amount_cents: 0, due_date: "2025-06-14" },
    ], today);

    expect(result.overdueInstallments).toBe(1);
  });

  it("handles partially paid overdue installment", () => {
    const result = computeContractSummary(100_00, [
      { final_amount_cents: 100_00, paid_amount_cents: 30_00, due_date: "2025-01-15" },
    ], today);

    expect(result.overdueAmountCents).toBe(70_00);
    expect(result.overdueInstallments).toBe(1);
  });
});
