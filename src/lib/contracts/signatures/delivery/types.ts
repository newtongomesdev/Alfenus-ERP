import type { SignatureSigner, SignatureSource } from "../types";

export type SignatureProvider = "internal_sandbox" | "reserved_external";
export type DeliveryStatus = "pending" | "sending" | "sent" | "viewed" | "partially_signed" | "signed" | "refused" | "expired" | "cancelled" | "failed";
export type ProviderEventType = "sent" | "viewed" | "partially_signed" | "signed" | "refused" | "expired" | "cancelled";

export type ProviderCreateEnvelopeInput = {
  provider: SignatureProvider;
  envelopeId: string;
  source: SignatureSource;
  signers: SignatureSigner[];
  consentVersion: string;
  expiresAt: string | null;
  callbackReference: string;
};

export type ProviderEnvelopeReference = { provider: SignatureProvider; providerEnvelopeId: string };
export type ProviderCreateEnvelopeResult = { providerEnvelopeId: string; status: "sent"; responseSnapshot: Record<string, unknown> };
export type ProviderEnvelopeStatusResult = { providerEnvelopeId: string; status: DeliveryStatus; responseSnapshot: Record<string, unknown> };
export type ProviderCancelEnvelopeResult = { providerEnvelopeId: string; status: "cancelled"; responseSnapshot: Record<string, unknown> };
export type ProviderWebhookInput = { rawBody: string; headers: Headers };
export type ProviderCompletedArtifactType = "signed_document" | "completion_certificate" | "evidence_report";
export type ProviderCompletedArtifactFile = { type: ProviderCompletedArtifactType; fileName: string; mimeType: "application/pdf" | "application/json"; bytes: Uint8Array; providerHash?: string; fileSize: number; pageCount?: number };
export type ProviderCompletedArtifactsResult = { providerEnvelopeId: string; completedAt: string; signedDocument: ProviderCompletedArtifactFile; completionCertificate: ProviderCompletedArtifactFile; signersEvidence: ProviderCompletedArtifactFile; providerMetadata: Record<string, unknown> };
export type ValidatedProviderWebhook = { provider: SignatureProvider; providerEventId: string; providerEnvelopeId: string; eventType: ProviderEventType; payloadHash: string; payload: Record<string, unknown> };
export type NormalizedSignatureEvent = { provider: SignatureProvider; providerEventId: string; providerEnvelopeId: string; eventType: ProviderEventType; payloadHash: string; signerEmails?: string[] };

export interface SignatureProviderAdapter {
  provider: SignatureProvider;
  createEnvelope(input: ProviderCreateEnvelopeInput): Promise<ProviderCreateEnvelopeResult>;
  getEnvelopeStatus(input: ProviderEnvelopeReference): Promise<ProviderEnvelopeStatusResult>;
  cancelEnvelope(input: ProviderEnvelopeReference): Promise<ProviderCancelEnvelopeResult>;
  validateWebhook(input: ProviderWebhookInput): Promise<ValidatedProviderWebhook>;
  normalizeWebhook(input: ValidatedProviderWebhook): Promise<NormalizedSignatureEvent>;
  getCompletedArtifacts(input: ProviderEnvelopeReference & { source: ProviderCreateEnvelopeInput["source"]; signers: SignatureSigner[] }): Promise<ProviderCompletedArtifactsResult>;
}
export type SignatureProviderRegistryContext = { provider: SignatureProvider; configurationReference?: { lawFirmId: string; configurationId?: string; environment: "sandbox" | "production" } };
