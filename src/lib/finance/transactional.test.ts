import { describe, expect, it } from "vitest";

/**
 * Unit tests for payment transaction logic.
 *
 * These tests validate the pure calculation logic used in the
 * transactional payment registration and reversal flows.
 * They do NOT hit the database — they verify the business rules.
 */

// ── Helpers that mirror the logic in recebimentos/actions.ts ──────────

function computeNewInstallmentStatus(newPaidAmount: number, finalAmountCents: number) {
  return newPaidAmount >= finalAmountCents ? "paga" : "parcialmente_paga";
}

function computeRemaining(finalAmountCents: number, paidAmountCents: number) {
  return Math.max(finalAmountCents - paidAmountCents, 0);
}

function computeReversalStatus(newPaid: number, finalAmountCents: number) {
  if (newPaid === 0) return "pendente";
  if (newPaid < finalAmountCents) return "parcialmente_paga";
  return "paga";
}

function computeContractBalance(totalAmountCents: number, installmentPaidAmounts: number[]) {
  const totalPaid = installmentPaidAmounts.reduce((sum, paid) => sum + paid, 0);
  return Math.max(totalAmountCents - totalPaid, 0);
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("Payment registration – installment update", () => {
  it("marks installment as paga when fully paid", () => {
    const finalAmountCents = 100_00;
    const paidBefore = 50_00;
    const paymentAmount = 50_00;
    const newPaid = paidBefore + paymentAmount;

    expect(computeNewInstallmentStatus(newPaid, finalAmountCents)).toBe("paga");
  });

  it("marks installment as parcialmente_paga when partially paid", () => {
    const finalAmountCents = 100_00;
    const paidBefore = 30_00;
    const paymentAmount = 20_00;
    const newPaid = paidBefore + paymentAmount;

    expect(computeNewInstallmentStatus(newPaid, finalAmountCents)).toBe("parcialmente_paga");
  });

  it("computes remaining balance correctly", () => {
    expect(computeRemaining(100_00, 30_00)).toBe(70_00);
    expect(computeRemaining(100_00, 100_00)).toBe(0);
    expect(computeRemaining(100_00, 150_00)).toBe(0); // clamp at 0
  });

  it("rejects payment exceeding remaining balance", () => {
    const finalAmountCents = 100_00;
    const paidBefore = 80_00;
    const remaining = computeRemaining(finalAmountCents, paidBefore);
    const paymentAmount = 25_00;

    expect(paymentAmount > remaining).toBe(true);
  });
});

describe("Payment registration – contract balance auto-update", () => {
  it("recalculates contract balance after payment", () => {
    const totalAmountCents = 300_00;
    // Two installments, one fully paid, one partially
    const installmentPaidAmounts = [100_00, 50_00];

    expect(computeContractBalance(totalAmountCents, installmentPaidAmounts)).toBe(150_00);
  });

  it("balance is 0 when all installments are fully paid", () => {
    const totalAmountCents = 200_00;
    const installmentPaidAmounts = [100_00, 100_00];

    expect(computeContractBalance(totalAmountCents, installmentPaidAmounts)).toBe(0);
  });

  it("balance never goes negative", () => {
    const totalAmountCents = 100_00;
    const installmentPaidAmounts = [150_00]; // overpaid edge case

    expect(computeContractBalance(totalAmountCents, installmentPaidAmounts)).toBe(0);
  });

  it("balance equals total when no payments exist", () => {
    const totalAmountCents = 500_00;
    const installmentPaidAmounts: number[] = [];

    expect(computeContractBalance(totalAmountCents, installmentPaidAmounts)).toBe(500_00);
  });
});

describe("Duplicate payment prevention (idempotency)", () => {
  it("detects duplicate by matching installment_id + amount + paid_at", () => {
    const existingPayments = [
      { installment_id: "abc", amount_cents: 50_00, paid_at: "2025-06-15T12:00:00.000Z" },
    ];

    const newPayment = { installment_id: "abc", amount_cents: 50_00, paid_at: "2025-06-15T12:00:00.000Z" };

    const isDuplicate = existingPayments.some(
      (p) =>
        p.installment_id === newPayment.installment_id &&
        p.amount_cents === newPayment.amount_cents &&
        p.paid_at === newPayment.paid_at,
    );

    expect(isDuplicate).toBe(true);
  });

  it("allows same installment with different amount", () => {
    const existingPayments = [
      { installment_id: "abc", amount_cents: 50_00, paid_at: "2025-06-15T12:00:00.000Z" },
    ];

    const newPayment = { installment_id: "abc", amount_cents: 30_00, paid_at: "2025-06-15T12:00:00.000Z" };

    const isDuplicate = existingPayments.some(
      (p) =>
        p.installment_id === newPayment.installment_id &&
        p.amount_cents === newPayment.amount_cents &&
        p.paid_at === newPayment.paid_at,
    );

    expect(isDuplicate).toBe(false);
  });

  it("allows same amount on different installment", () => {
    const existingPayments = [
      { installment_id: "abc", amount_cents: 50_00, paid_at: "2025-06-15T12:00:00.000Z" },
    ];

    const newPayment = { installment_id: "xyz", amount_cents: 50_00, paid_at: "2025-06-15T12:00:00.000Z" };

    const isDuplicate = existingPayments.some(
      (p) =>
        p.installment_id === newPayment.installment_id &&
        p.amount_cents === newPayment.amount_cents &&
        p.paid_at === newPayment.paid_at,
    );

    expect(isDuplicate).toBe(false);
  });
});

describe("Reversal – restores installment status", () => {
  it("reverts to pendente when reversal removes all payments", () => {
    const paidBefore = 100_00;
    const reversalAmount = 100_00;
    const finalAmountCents = 200_00;
    const newPaid = Math.max(paidBefore - reversalAmount, 0);

    expect(computeReversalStatus(newPaid, finalAmountCents)).toBe("pendente");
  });

  it("reverts to parcialmente_paga when partial amount remains", () => {
    const paidBefore = 100_00;
    const reversalAmount = 40_00;
    const finalAmountCents = 200_00;
    const newPaid = Math.max(paidBefore - reversalAmount, 0);

    expect(computeReversalStatus(newPaid, finalAmountCents)).toBe("parcialmente_paga");
  });

  it("contract balance is restored after reversal", () => {
    const totalAmountCents = 200_00;
    // After reversal: installment that had 100_00 paid now has 0
    const installmentPaidAmounts = [0, 0];

    expect(computeContractBalance(totalAmountCents, installmentPaidAmounts)).toBe(200_00);
  });

  it("handles multiple installments correctly on reversal", () => {
    const totalAmountCents = 300_00;
    // Installment 1: had 100_00, reversed to 50_00
    // Installment 2: still has 100_00
    const installmentPaidAmounts = [50_00, 100_00];

    expect(computeContractBalance(totalAmountCents, installmentPaidAmounts)).toBe(150_00);
  });
});
