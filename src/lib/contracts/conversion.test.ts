import { describe, expect, it, vi } from "vitest";
import { contractConversionInputHash, convertAcceptedProposalService } from "./conversion";

describe("commercial proposal contract conversion", () => {
  it("creates a stable input hash", () => {
    expect(contractConversionInputHash("proposal", "key")).toBe(contractConversionInputHash("proposal", "key"));
    expect(contractConversionInputHash("proposal", "key")).not.toBe(contractConversionInputHash("proposal", "other"));
  });

  it("maps the transactional RPC result", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ contract_id: "contract", contract_version_id: "version", idempotent: true }], error: null });
    await expect(convertAcceptedProposalService({ rpc }, "proposal", "key")).resolves.toEqual({ contractId: "contract", contractVersionId: "version", idempotent: true });
    expect(rpc).toHaveBeenCalledWith("convert_accepted_commercial_proposal_to_contract", expect.objectContaining({ p_proposal_id: "proposal", p_idempotency_key: "key", p_input_hash: expect.any(String) }));
  });

  it("does not hide conversion RPC failures", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: "CONTRACT_CONVERSION_PERMISSION_DENIED" } });
    await expect(convertAcceptedProposalService({ rpc }, "proposal", "key")).rejects.toThrow("CONTRACT_CONVERSION_PERMISSION_DENIED");
  });
});
