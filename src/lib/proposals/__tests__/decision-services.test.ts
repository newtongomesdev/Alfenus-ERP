import { describe, expect, it, vi } from "vitest";
import { decidePublicProposalService, getProposalDecisionService } from "../application/decision-services";
import { proposalDecisionConsentText, proposalDecisionConsentVersion } from "../application/schemas";

const token = "a".repeat(43);
const input = { token, decisionType: "accepted" as const, signerName: "Ana Silva", signerEmail: "ana@example.com", signerDocumentLast4: "1234", signerRole: "Diretora", companyName: "Empresa", rejectionReason: "", consentTextVersion: proposalDecisionConsentVersion, consentTextSnapshot: proposalDecisionConsentText.accepted, idempotencyKey: "decision-test-key" };

describe("commercial proposal decisions", () => {
  it("validates consent before calling the public RPC", async () => {
    const rpc = vi.fn();
    await expect(decidePublicProposalService({ rpc }, { ...input, consentTextSnapshot: "texto diferente" })).rejects.toMatchObject({ code: "PROPOSAL_DECISION_VALIDATION_ERROR" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("maps an idempotent public decision result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ decision_type: "accepted", decided_at: "2026-07-31T12:00:00Z", signer_name: "Ana Silva", message: "Proposta aceita.", idempotent: true, already_decided: true }], error: null });
    const result = await decidePublicProposalService({ rpc }, input);
    expect(result).toMatchObject({ decisionType: "accepted", idempotent: true, alreadyDecided: true });
    expect(rpc).toHaveBeenCalledWith("decide_public_commercial_proposal", expect.objectContaining({ p_decision_type: "accepted", p_idempotency_key_hash: expect.any(String), p_input_hash: expect.any(String) }));
  });

  it("reduces personal fields for restricted internal roles", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ decision_id: "d", proposal_id: "p", proposal_version_id: "v", public_link_id: "l", decision_type: "accepted", signer_name: "Ana", signer_email: "ana@example.com", signer_document_last4: "1234", signer_role: "Diretora", company_name: "Empresa", rejection_reason: "motivo", consent_text_version: "2026-07-31.v1", consent_text_snapshot: "texto", proposal_content_hash: "a", public_payload_hash: "b", decision_payload_hash: "c", decided_at: "2026-07-31", created_at: "2026-07-31", metadata: { internal: true }, member_role: "assistente" }], error: null });
    const result = await getProposalDecisionService({ rpc }, "p", "assistente");
    expect(result).toMatchObject({ signerName: "Ana", signerEmail: null, signerDocumentLast4: null, signerRole: null, companyName: null, rejectionReason: null });
  });
});
