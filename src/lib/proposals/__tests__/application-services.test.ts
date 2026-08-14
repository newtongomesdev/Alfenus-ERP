import { describe, expect, it, vi } from "vitest";
import { buildProposalVersionDraft, isProposalReady } from "../domain/builder";
import { compareProposalVersions } from "../domain/comparison";
import { validateProposalFinancials } from "../domain/financial";
import { createProposalVersionService, transitionProposalService } from "../application/version-services";
import { ProposalValidationError } from "../errors";
import type { ProposalVersionRepository } from "../persistence/repositories";

const summary = { currency: "BRL", subtotalCents: 10000, discountCents: 1000, totalCents: 9000, entryAmountCents: 1000, installmentCount: 4, installmentAmountCents: 2000, recurringAmountCents: 0, recurringMonths: 0, successFeeBps: 0 } as const;
const draft = { title: "Proposta", currency: "BRL", validityDays: 30, summary, paymentTerms: {}, sections: [{ sectionType: "fees", title: "Honorarios", bodyMarkdown: "", orderIndex: 0, isRequired: true }, { sectionType: "validity", title: "Validade", bodyMarkdown: "", orderIndex: 1, isRequired: true }], items: [{ itemType: "service", description: "Consultoria", quantity: 1, unitAmountCents: 9000, totalAmountCents: 9000, isOptional: false, isIncluded: true, orderIndex: 0, metadata: {} }] };
describe("proposal application layer", () => {
  it("validates finances and produces a stable immutable hash", () => { validateProposalFinancials(summary); const built = buildProposalVersionDraft(draft, "manual"); expect(built.contentHash).toMatch(/^[0-9a-f]{64}$/); expect(buildProposalVersionDraft(draft, "manual").contentHash).toBe(built.contentHash); });
  it("reports readiness from required content", () => { expect(isProposalReady(draft)).toBe(true); expect(isProposalReady({ ...draft, sections: [] })).toBe(false); });
  it("rejects inconsistent totals", () => { expect(() => validateProposalFinancials({ ...summary, totalCents: 1 })).toThrow(ProposalValidationError); });
  it("creates a version through the repository contract", async () => { const repository = { createVersion: vi.fn().mockResolvedValue({ versionId: "v1", versionNumber: 2, updatedAt: "2026-07-27T00:00:00.000Z" }) } as unknown as ProposalVersionRepository; await expect(createProposalVersionService(repository, { role: "advogado", assisted: false }, { proposalId: "00000000-0000-4000-8000-000000000001", expectedUpdatedAt: "2026-07-27T00:00:00.000Z", draft })).resolves.toMatchObject({ versionId: "v1" }); expect(repository.createVersion).toHaveBeenCalledOnce(); });
  it("uses a guarded transition repository", async () => { const repository = { transition: vi.fn().mockResolvedValue({ updatedAt: "2026-07-27T00:00:01.000Z" }) } as unknown as ProposalVersionRepository; await expect(transitionProposalService(repository, { role: "advogado", assisted: false }, { proposalId: "00000000-0000-4000-8000-000000000001", to: "archived", expectedUpdatedAt: "2026-07-27T00:00:00.000Z" })).resolves.toBeTruthy(); });
  it("compares versions structurally", () => { const left = { currency: "BRL", commercialSummary: summary } as never; const right = { currency: "BRL", commercialSummary: { ...summary, totalCents: 9500 } } as never; expect(compareProposalVersions(left, right).changedFields).toContain("totalCents"); });
});
