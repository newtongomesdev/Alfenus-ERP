import { describe, expect, it } from "vitest";
import { buildDeliverySnapshot } from "./snapshot";

describe("signature delivery snapshot", () => {
  it("contains only the contractual delivery fields", () => {
    const snapshot = buildDeliverySnapshot({ id: "env", consentVersion: "v1", expiresAt: null } as never, { contractId: "contract", contractDocumentId: "document", contractVersionId: "version", documentHash: "hash", fileSize: 1, pageCount: 1, title: "Title" } as never, [{ signerType: "client", role: "signer", name: "Ana", email: "ana@example.com", signingOrder: 1, requiresIdentityVerification: false } as never]);
    expect(snapshot).toMatchObject({ envelopeId: "env", documentHash: "hash", signers: [{ name: "Ana", email: "ana@example.com" }] });
    expect(JSON.stringify(snapshot)).not.toContain("internalNotes");
  });
});
