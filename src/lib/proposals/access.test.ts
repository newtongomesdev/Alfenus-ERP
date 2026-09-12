import { describe, expect, it } from "vitest";

import { canCreateCommercialProposal } from "@/lib/proposals/access";
import { createManualProposalService, createPricingProposalService, duplicateProposalService, updateProposalMetadataService } from "@/lib/proposals/application/services";
import { activateProposalVersionService, createProposalVersionService, transitionProposalService, upsertProposalRecipientService } from "@/lib/proposals/application/version-services";

describe("commercial proposal write access", () => {
  it("allows only legal-firm writing roles", () => {
    expect(canCreateCommercialProposal("proprietario")).toBe(true);
    expect(canCreateCommercialProposal("administrador")).toBe(true);
    expect(canCreateCommercialProposal(" advogado ")).toBe(true);
    expect(canCreateCommercialProposal("assistente")).toBe(false);
    expect(canCreateCommercialProposal("colaborador")).toBe(false);
    expect(canCreateCommercialProposal("assistant")).toBe(false);
    expect(canCreateCommercialProposal("desconhecido")).toBe(false);
    expect(canCreateCommercialProposal(null)).toBe(false);
  });

  it("blocks every write service for assistente before repository access", async () => {
    const repository = {} as never;
    const actor = { role: "assistente", assisted: false };
    const calls = [
      createManualProposalService(repository, actor, {} as never),
      createPricingProposalService(repository, actor, {} as never),
      duplicateProposalService(repository, actor, {} as never),
      updateProposalMetadataService(repository, actor, {} as never),
      createProposalVersionService(repository, actor, {} as never),
      activateProposalVersionService(repository, actor, {} as never),
      transitionProposalService(repository, actor, {} as never),
      upsertProposalRecipientService(repository, actor, {} as never),
    ];
    for (const call of calls) await expect(call).rejects.toThrow("PROPOSAL_PERMISSION_DENIED");
  });
});
