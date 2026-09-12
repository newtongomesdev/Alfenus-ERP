import { ProposalValidationError } from "../errors";
import type { ProposalCommercialSummary } from "./types";
export function validateProposalFinancials(summary: ProposalCommercialSummary): void {
  const values = [summary.subtotalCents, summary.discountCents, summary.totalCents, summary.entryAmountCents, summary.installmentAmountCents, summary.recurringAmountCents, summary.recurringMonths, summary.installmentCount, summary.successFeeBps];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new ProposalValidationError();
  if (summary.discountCents > summary.subtotalCents || summary.totalCents !== summary.subtotalCents - summary.discountCents) throw new ProposalValidationError();
  if (summary.entryAmountCents > summary.totalCents || summary.successFeeBps > 10000) throw new ProposalValidationError();
  if (summary.installmentCount === 0 && summary.installmentAmountCents !== 0) throw new ProposalValidationError();
}
