type PaymentAmount = { amount_cents: number; reversed_at: string | null };

export function calculateSoloCashFlow(input: {
  payments: PaymentAmount[];
  paidExpensesCents: number;
  expectedInstallmentsCents: number;
  expectedExpensesCents: number;
}) {
  const received = input.payments
    .filter((payment) => payment.reversed_at === null)
    .reduce((total, payment) => total + payment.amount_cents, 0);
  const cashFlow = received - input.paidExpensesCents;
  return {
    received,
    cashFlow,
    projectedCashFlow: cashFlow + input.expectedInstallmentsCents - input.expectedExpensesCents,
  };
}
