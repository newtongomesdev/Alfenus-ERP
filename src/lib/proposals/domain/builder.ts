import { validateProposalFinancials } from "./financial";
import { hashProposalVersion } from "./hash";
import type { ProposalVersionDraftDTO } from "../application/dto";
export function buildProposalVersionDraft(input: ProposalVersionDraftDTO, origin: unknown, pricingVersion?: unknown) {
  validateProposalFinancials(input.summary);
  const hash = hashProposalVersion({ schemaVersion: 1, pricingEngineVersion: null, title: input.title, sections: input.sections, items: input.items, commercialSummary: input.summary, paymentTerms: input.paymentTerms, values: input.summary, currency: input.currency, validityDays: input.validityDays, origin, pricingVersion });
  return { ...input, schemaVersion: 1, contentHash: hash };
}
export function isProposalReady(input: ProposalVersionDraftDTO): boolean { return input.sections.some((section) => section.sectionType === "fees") && input.sections.some((section) => section.sectionType === "validity") && input.items.every((item) => item.description.trim().length > 0); }
