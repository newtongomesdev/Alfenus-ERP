import { describe, expect, it } from "vitest";
import { internalSandboxAdapter, sandboxWebhook } from "./sandbox";

describe("internal sandbox signature provider", () => {
  it("creates deterministic provider envelopes and validates signed webhooks", async () => {
    const input = { provider: "internal_sandbox" as const, envelopeId: "env-1", source: { title: "Contrato", contractId: "c", contractDocumentId: "d", contractVersionId: "v", status: "completed", documentHash: "h", fileSize: 1, pageCount: 1 }, signers: [], consentVersion: "v1", expiresAt: null, callbackReference: "internal://signature/env-1" };
    const first = await internalSandboxAdapter.createEnvelope(input);
    const second = await internalSandboxAdapter.createEnvelope(input);
    expect(first.providerEnvelopeId).toBe(second.providerEnvelopeId);
    const event = sandboxWebhook(first.providerEnvelopeId, "viewed");
    const validated = await internalSandboxAdapter.validateWebhook({ rawBody: event.body, headers: new Headers({ "x-alfenus-sandbox-signature": event.signature }) });
    expect(validated.eventType).toBe("viewed");
  });

  it("rejects tampered webhook signatures and models controlled failures", async () => {
    await expect(internalSandboxAdapter.validateWebhook({ rawBody: "{}", headers: new Headers({ "x-alfenus-sandbox-signature": "bad" }) })).rejects.toThrow("WEBHOOK_SIGNATURE_INVALID");
    await expect(internalSandboxAdapter.createEnvelope({ ...inputForFailure, envelopeId: "env-2", source: { ...inputForFailure.source, title: "[permanent-failure]" } })).rejects.toThrow("SANDBOX_PERMANENT_FAILURE");
  });

  it("fails a temporary envelope once and accepts the retry", async () => {
    const input = { ...inputForFailure, envelopeId: "env-temporary", source: { ...inputForFailure.source, title: "[temporary-failure]" } };
    await expect(internalSandboxAdapter.createEnvelope(input)).rejects.toThrow("SANDBOX_TEMPORARY_FAILURE");
    await expect(internalSandboxAdapter.createEnvelope(input)).resolves.toMatchObject({ status: "sent" });
  });

  it("returns deterministic completed PDFs only after signed", async () => {
    const input = { ...inputForFailure, envelopeId: "env-artifacts", signers: [{ name: "Pessoa Teste", email: "teste@example.com", role: "contratante", signerType: "person" as const, signingOrder: 1, requiresIdentityVerification: false }] };
    const created = await internalSandboxAdapter.createEnvelope(input);
    await expect(internalSandboxAdapter.getCompletedArtifacts({ provider: "internal_sandbox", providerEnvelopeId: created.providerEnvelopeId, source: input.source, signers: input.signers })).rejects.toThrow("SANDBOX_ARTIFACTS_REQUIRE_SIGNED");
    const { simulateSandboxEvent } = await import("./sandbox");
    simulateSandboxEvent(created.providerEnvelopeId, "signed", ["teste@example.com"]);
    const artifacts = await internalSandboxAdapter.getCompletedArtifacts({ provider: "internal_sandbox", providerEnvelopeId: created.providerEnvelopeId, source: input.source, signers: input.signers });
    expect(artifacts.signedDocument.bytes.slice(0, 5)).toEqual(new TextEncoder().encode("%PDF-"));
    expect(artifacts.signedDocument.providerHash).toHaveLength(64);
    expect(artifacts.completionCertificate.pageCount).toBe(1);
  });
});

const inputForFailure = { provider: "internal_sandbox" as const, envelopeId: "env-failure", source: { title: "Contrato", contractId: "c", contractDocumentId: "d", contractVersionId: "v", status: "completed", documentHash: "h", fileSize: 1, pageCount: 1 }, signers: [], consentVersion: "v1", expiresAt: null, callbackReference: "internal://signature/env-failure" };
