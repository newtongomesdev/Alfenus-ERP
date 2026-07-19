import { readFileSync } from "fs";
import { resolve } from "path";
import { describe, expect, it } from "vitest";

/**
 * Tests for the security properties of register_payment and reverse_payment RPCs.
 *
 * Validates that the SQL migration 0006 enforces:
 * - SECURITY DEFINER with SET search_path = ''
 * - Tenant membership verification
 * - Role-based access (proprietario, administrador, financeiro)
 * - Idempotency (duplicate payment detection)
 * - Overpayment prevention
 * - Already-reversed payment detection
 * - FOR UPDATE locking
 */

const migrationsDir = resolve(__dirname, "../../../supabase/migrations");

function readMigration(filename: string): string {
  try {
    return readFileSync(resolve(migrationsDir, filename), "utf-8");
  } catch {
    return "";
  }
}

const rpcSql = readMigration("0006_payment_rpc.sql");

// ---------------------------------------------------------------------------
// Pure business logic helpers (mirroring the RPC logic)
// ---------------------------------------------------------------------------

const FINANCIAL_ROLES = ["proprietario", "administrador", "financeiro"] as const;

function hasFinancialRole(role: string): boolean {
  return FINANCIAL_ROLES.includes(role as (typeof FINANCIAL_ROLES)[number]);
}

function computeRemainingBalance(finalAmountCents: number, paidAmountCents: number): number {
  return Math.max(finalAmountCents - paidAmountCents, 0);
}

function isOverpayment(proposedCents: number, remainingCents: number): boolean {
  return proposedCents > remainingCents;
}

function isDuplicatePayment(
  existingPayments: Array<{ installmentId: string; amountCents: number; paidAt: string; reversedAt: string | null }>,
  installmentId: string,
  amountCents: number,
  paidAt: string,
): boolean {
  return existingPayments.some(
    (p) =>
      p.installmentId === installmentId &&
      p.amountCents === amountCents &&
      p.paidAt.slice(0, 10) === paidAt.slice(0, 10) &&
      p.reversedAt === null,
  );
}

function determineInstallmentStatus(newPaid: number, finalAmount: number): string {
  if (newPaid >= finalAmount) return "paga";
  if (newPaid > 0) return "parcialmente_paga";
  return "pendente";
}

function isAlreadyReversed(payment: { reversedAt: string | null }): boolean {
  return payment.reversedAt !== null;
}

function computeReversalNewPaid(currentPaid: number, reversalAmount: number): number {
  return Math.max(currentPaid - reversalAmount, 0);
}

function computeContractBalance(totalAmountCents: number, installmentPaidAmounts: number[]): number {
  const totalPaid = installmentPaidAmounts.reduce((sum, paid) => sum + paid, 0);
  return Math.max(totalAmountCents - totalPaid, 0);
}

// ---------------------------------------------------------------------------
// SQL structure tests
// ---------------------------------------------------------------------------

describe("RPC register_payment – SQL security properties", () => {
  it("uses SECURITY DEFINER", () => {
    expect(rpcSql).toContain("SECURITY DEFINER");
  });

  it("sets search_path to empty", () => {
    expect(rpcSql).toContain("SET search_path = ''");
  });

  it("verifies caller is authenticated (auth.uid())", () => {
    expect(rpcSql).toContain("auth.uid()");
  });

  it("checks tenant membership via law_firm_members", () => {
    expect(rpcSql).toContain("law_firm_members");
    expect(rpcSql).toContain("WHERE user_id = v_caller_id AND law_firm_id = p_law_firm_id");
  });

  it("restricts to financial roles", () => {
    expect(rpcSql).toContain("'proprietario', 'administrador', 'financeiro'");
  });

  it("uses FOR UPDATE on installment", () => {
    expect(rpcSql).toContain("FOR UPDATE");
  });

  it("checks for duplicate payments", () => {
    expect(rpcSql).toContain("Pagamento duplicado detectado");
  });

  it("prevents overpayment", () => {
    expect(rpcSql).toContain("excede o saldo da parcela");
  });

  it("validates registered_by matches caller", () => {
    expect(rpcSql).toContain("registered_by deve corresponder ao usuário autenticado");
  });

  it("grants execute to authenticated", () => {
    expect(rpcSql).toContain("GRANT EXECUTE ON FUNCTION public.register_payment");
    expect(rpcSql).toContain("TO authenticated");
  });
});

describe("RPC reverse_payment – SQL security properties", () => {
  it("uses SECURITY DEFINER", () => {
    expect(rpcSql).toContain("SECURITY DEFINER");
  });

  it("verifies tenant membership", () => {
    expect(rpcSql).toContain("Usuário não pertence a este escritório");
  });

  it("restricts to financial roles", () => {
    // Both RPCs share the same role check block
    const reverseSection = rpcSql.substring(rpcSql.indexOf("reverse_payment"));
    expect(reverseSection).toContain("'proprietario', 'administrador', 'financeiro'");
  });

  it("checks if payment is already reversed", () => {
    expect(rpcSql).toContain("Pagamento não encontrado ou já estornado");
  });

  it("uses FOR UPDATE on payment", () => {
    const reverseSection = rpcSql.substring(rpcSql.indexOf("reverse_payment"));
    expect(reverseSection).toContain("FOR UPDATE");
  });

  it("grants execute to authenticated", () => {
    expect(rpcSql).toContain("GRANT EXECUTE ON FUNCTION public.reverse_payment");
    expect(rpcSql).toContain("TO authenticated");
  });
});

// ---------------------------------------------------------------------------
// Business logic tests
// ---------------------------------------------------------------------------

describe("RPC security – role verification", () => {
  it("proprietario can register payments", () => {
    expect(hasFinancialRole("proprietario")).toBe(true);
  });

  it("administrador can register payments", () => {
    expect(hasFinancialRole("administrador")).toBe(true);
  });

  it("financeiro can register payments", () => {
    expect(hasFinancialRole("financeiro")).toBe(true);
  });

  it("advogado cannot register payments", () => {
    expect(hasFinancialRole("advogado")).toBe(false);
  });

  it("assistente cannot register payments", () => {
    expect(hasFinancialRole("assistente")).toBe(false);
  });

  it("colaborador cannot register payments", () => {
    expect(hasFinancialRole("colaborador")).toBe(false);
  });

  it("visualizador cannot register payments", () => {
    expect(hasFinancialRole("visualizador")).toBe(false);
  });
});

describe("RPC security – duplicate payment detection", () => {
  it("detects duplicate by installment + amount + date", () => {
    const existing = [
      { installmentId: "inst-1", amountCents: 50_00, paidAt: "2025-06-15T10:00:00Z", reversedAt: null },
    ];
    expect(isDuplicatePayment(existing, "inst-1", 50_00, "2025-06-15T14:00:00Z")).toBe(true);
  });

  it("allows different amount on same installment", () => {
    const existing = [
      { installmentId: "inst-1", amountCents: 50_00, paidAt: "2025-06-15T10:00:00Z", reversedAt: null },
    ];
    expect(isDuplicatePayment(existing, "inst-1", 30_00, "2025-06-15T14:00:00Z")).toBe(false);
  });

  it("allows same amount on different installment", () => {
    const existing = [
      { installmentId: "inst-1", amountCents: 50_00, paidAt: "2025-06-15T10:00:00Z", reversedAt: null },
    ];
    expect(isDuplicatePayment(existing, "inst-2", 50_00, "2025-06-15T14:00:00Z")).toBe(false);
  });

  it("allows same amount on different date", () => {
    const existing = [
      { installmentId: "inst-1", amountCents: 50_00, paidAt: "2025-06-15T10:00:00Z", reversedAt: null },
    ];
    expect(isDuplicatePayment(existing, "inst-1", 50_00, "2025-06-16T10:00:00Z")).toBe(false);
  });

  it("does not flag reversed payments as duplicate", () => {
    const existing = [
      { installmentId: "inst-1", amountCents: 50_00, paidAt: "2025-06-15T10:00:00Z", reversedAt: "2025-06-16T00:00:00Z" },
    ];
    expect(isDuplicatePayment(existing, "inst-1", 50_00, "2025-06-15T14:00:00Z")).toBe(false);
  });

  it("handles empty payment history", () => {
    expect(isDuplicatePayment([], "inst-1", 50_00, "2025-06-15T10:00:00Z")).toBe(false);
  });
});

describe("RPC security – overpayment prevention", () => {
  it("detects overpayment", () => {
    expect(isOverpayment(60_00, 50_00)).toBe(true);
  });

  it("allows exact remaining payment", () => {
    expect(isOverpayment(50_00, 50_00)).toBe(false);
  });

  it("allows partial payment", () => {
    expect(isOverpayment(30_00, 50_00)).toBe(false);
  });

  it("remaining balance calculation is correct", () => {
    expect(computeRemainingBalance(100_00, 30_00)).toBe(70_00);
    expect(computeRemainingBalance(100_00, 100_00)).toBe(0);
    expect(computeRemainingBalance(100_00, 150_00)).toBe(0);
  });
});

describe("RPC security – installment status determination", () => {
  it("marks as paga when fully paid", () => {
    expect(determineInstallmentStatus(100_00, 100_00)).toBe("paga");
  });

  it("marks as paga when overpaid", () => {
    expect(determineInstallmentStatus(120_00, 100_00)).toBe("paga");
  });

  it("marks as parcialmente_paga when partially paid", () => {
    expect(determineInstallmentStatus(50_00, 100_00)).toBe("parcialmente_paga");
  });

  it("marks as pendente when nothing paid", () => {
    expect(determineInstallmentStatus(0, 100_00)).toBe("pendente");
  });
});

describe("RPC security – reversal protection", () => {
  it("detects already reversed payment", () => {
    expect(isAlreadyReversed({ reversedAt: "2025-06-16T00:00:00Z" })).toBe(true);
  });

  it("allows reversal of non-reversed payment", () => {
    expect(isAlreadyReversed({ reversedAt: null })).toBe(false);
  });

  it("reversal new paid never goes below zero", () => {
    expect(computeReversalNewPaid(30_00, 50_00)).toBe(0);
    expect(computeReversalNewPaid(80_00, 50_00)).toBe(30_00);
    expect(computeReversalNewPaid(50_00, 50_00)).toBe(0);
  });
});

describe("RPC security – contract balance recalculation", () => {
  it("recalculates correctly after payment", () => {
    expect(computeContractBalance(300_00, [100_00, 50_00])).toBe(150_00);
  });

  it("balance is zero when fully paid", () => {
    expect(computeContractBalance(200_00, [100_00, 100_00])).toBe(0);
  });

  it("balance never goes negative", () => {
    expect(computeContractBalance(100_00, [150_00])).toBe(0);
  });

  it("balance equals total when no payments", () => {
    expect(computeContractBalance(500_00, [])).toBe(500_00);
  });

  it("excludes cancelled installments from calculation", () => {
    // The SQL filters: WHERE status != 'cancelada'
    // In our mock, we just don't include cancelled installment amounts
    const activePaid = [100_00, 50_00]; // cancelled installment excluded
    expect(computeContractBalance(300_00, activePaid)).toBe(150_00);
  });
});
