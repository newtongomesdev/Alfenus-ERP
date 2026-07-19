export type InstallmentPlanInput = {
  totalAmountCents: number;
  upfrontAmountCents: number;
  installments: number;
};

export function calculateInstallmentPlan(input: InstallmentPlanInput) {
  if (input.totalAmountCents < 0 || input.upfrontAmountCents < 0) {
    throw new Error("Valores financeiros não podem ser negativos.");
  }

  if (input.upfrontAmountCents > input.totalAmountCents) {
    throw new Error("A entrada não pode ser maior que o valor total.");
  }

  if (!Number.isInteger(input.installments) || input.installments < 1) {
    throw new Error("A quantidade de parcelas deve ser maior que zero.");
  }

  const balance = input.totalAmountCents - input.upfrontAmountCents;
  const baseAmount = Math.floor(balance / input.installments);
  const remainder = balance % input.installments;

  return Array.from({ length: input.installments }, (_, index) => ({
    number: index + 1,
    amountCents: baseAmount + (index < remainder ? 1 : 0),
  }));
}
