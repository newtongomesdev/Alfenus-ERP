import { describe, expect, it } from "vitest";
import { buildSignatureSnapshot, signatureSnapshotHash } from "./snapshots";

describe("signature snapshots", () => {
  it("contains only the immutable public document data", () => {
    const snapshot = buildSignatureSnapshot({ contractId: "c", contractDocumentId: "d", contractVersionId: "v", status: "completed", documentHash: "a".repeat(64), fileSize: 10, pageCount: 1, title: "Contrato", parties: { client: "Pessoa" } }, "v1");
    expect(snapshot).toEqual(expect.objectContaining({ contractId: "c", contractDocumentId: "d", contractVersionId: "v", documentHash: "a".repeat(64), consentVersion: "v1" }));
    expect(snapshot).not.toHaveProperty("storagePath");
    expect(snapshot).not.toHaveProperty("internalNotes");
    expect(snapshot).not.toHaveProperty("idempotencyKey");
    expect(signatureSnapshotHash(snapshot)).toMatch(/^[0-9a-f]{64}$/);
  });
});
