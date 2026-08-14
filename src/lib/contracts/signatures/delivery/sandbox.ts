import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SignatureProviderAdapter, ProviderCreateEnvelopeInput, ProviderEnvelopeReference, ProviderWebhookInput, ValidatedProviderWebhook } from "./types";
import type { DeliveryStatus } from "./types";
import type { SignatureSigner } from "../types";

type SandboxState = { status: DeliveryStatus; eventNumber: number };
const states = new Map<string, SandboxState>();
const temporaryFailures = new Set<string>();
const secret = () => process.env.SIGNATURE_SANDBOX_WEBHOOK_SECRET ?? "alfenus-internal-sandbox";
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const externalId = (envelopeId: string) => `sandbox-${hash(envelopeId).slice(0, 24)}`;
const temporary = (input: ProviderCreateEnvelopeInput) => input.source.title.includes("[temporary-failure]");
const permanent = (input: ProviderCreateEnvelopeInput) => input.source.title.includes("[permanent-failure]");
const pdf = async (lines: string[]) => { const document = await PDFDocument.create(); const page = document.addPage([595, 842]); const font = await document.embedFont(StandardFonts.Helvetica); lines.forEach((line, index) => page.drawText(line.slice(0, 110), { x: 42, y: 790 - index * 22, size: 10, font, color: rgb(0.1, 0.1, 0.1) })); return document.save(); };
const artifact = async (type: "signed_document" | "completion_certificate" | "evidence_report", providerEnvelopeId: string, source: ProviderCreateEnvelopeInput["source"], signers: SignatureSigner[], completedAt: string) => {
  const lines = type === "signed_document" ? ["Alfenus - Documento contratual", "AMBIENTE INTERNO DE TESTES - NAO REPRESENTA ASSINATURA COMERCIAL REAL", `Envelope sandbox: ${providerEnvelopeId}`, `Contrato: ${source.contractId}`, `Titulo: ${source.title}`, `Hash de origem: ${source.documentHash ?? "indisponivel"}`, "Conteudo preservado para validacao do fluxo interno."] : type === "completion_certificate" ? ["Alfenus - Certificado de conclusao", "AMBIENTE INTERNO DE TESTES", `Envelope: ${providerEnvelopeId}`, `Provider: internal_sandbox`, `Concluido em: ${completedAt}`, `Signatarios: ${signers.map((s) => s.name).join(", ")}`] : ["Alfenus - Relatorio de evidencias", "AMBIENTE INTERNO DE TESTES", `Envelope: ${providerEnvelopeId}`, `Provider: internal_sandbox`, `Concluido em: ${completedAt}`, ...signers.map((s) => `Signatario: ${s.name} (${s.email}) - ordem ${s.signingOrder}`)];
  const bytes = await pdf(lines); return { type, fileName: `${type}-${providerEnvelopeId}.pdf`, mimeType: "application/pdf" as const, bytes, providerHash: createHash("sha256").update(bytes).digest("hex"), fileSize: bytes.length, pageCount: 1 };
};

export const sandboxWebhook = (providerEnvelopeId: string, eventType: Exclude<keyof typeof statusFor, "created">, signerEmails: string[] = []) => {
  const eventId = `sandbox-event-${providerEnvelopeId}-${eventType}`;
  const payload = JSON.stringify({ providerEventId: eventId, providerEnvelopeId, eventType, signerEmails });
  return { body: payload, signature: createHmac("sha256", secret()).update(payload).digest("hex") };
};

const statusFor = { sent: "sent", viewed: "viewed", partially_signed: "partially_signed", signed: "signed", refused: "refused", expired: "expired", cancelled: "cancelled" } as const;

export function simulateSandboxEvent(providerEnvelopeId: string, eventType: keyof typeof statusFor, signerEmails: string[] = []) {
  const state = states.get(providerEnvelopeId) ?? { status: "sent" as DeliveryStatus, eventNumber: 0 };
  state.status = statusFor[eventType]; state.eventNumber += 1; states.set(providerEnvelopeId, state);
  return sandboxWebhook(providerEnvelopeId, eventType, signerEmails);
}

export const internalSandboxAdapter: SignatureProviderAdapter = {
  provider: "internal_sandbox",
  async createEnvelope(input) {
    if (temporary(input) && !temporaryFailures.has(input.envelopeId)) { temporaryFailures.add(input.envelopeId); throw Object.assign(new Error("SANDBOX_TEMPORARY_FAILURE"), { code: "SANDBOX_TEMPORARY_FAILURE", temporary: true }); }
    if (permanent(input)) throw Object.assign(new Error("SANDBOX_PERMANENT_FAILURE"), { code: "SANDBOX_PERMANENT_FAILURE", temporary: false });
    const id = externalId(input.envelopeId); states.set(id, { status: "sent", eventNumber: 0 });
    return { providerEnvelopeId: id, status: "sent", responseSnapshot: { provider: "internal_sandbox", status: "sent", deterministic: true } };
  },
  async getEnvelopeStatus(input: ProviderEnvelopeReference) {
    const state = states.get(input.providerEnvelopeId); if (!state) throw new Error("SANDBOX_PROVIDER_ENVELOPE_NOT_FOUND");
    return { providerEnvelopeId: input.providerEnvelopeId, status: state.status, responseSnapshot: { provider: "internal_sandbox", status: state.status, eventNumber: state.eventNumber } };
  },
  async getCompletedArtifacts(input) {
    const state = states.get(input.providerEnvelopeId); if (state && state.status !== "signed") throw new Error("SANDBOX_ARTIFACTS_REQUIRE_SIGNED");
    const completedAt = "2026-08-02T00:00:00.000Z";
    return { providerEnvelopeId: input.providerEnvelopeId, completedAt, signedDocument: await artifact("signed_document", input.providerEnvelopeId, input.source, input.signers, completedAt), completionCertificate: await artifact("completion_certificate", input.providerEnvelopeId, input.source, input.signers, completedAt), signersEvidence: await artifact("evidence_report", input.providerEnvelopeId, input.source, input.signers, completedAt), providerMetadata: { provider: "internal_sandbox", deterministic: true, environment: "test" } };
  },
  async cancelEnvelope(input) {
    const state = states.get(input.providerEnvelopeId); if (!state) throw new Error("SANDBOX_PROVIDER_ENVELOPE_NOT_FOUND");
    if (["signed", "refused", "expired", "cancelled"].includes(state.status)) return { providerEnvelopeId: input.providerEnvelopeId, status: "cancelled", responseSnapshot: { provider: "internal_sandbox", idempotent: true } };
    state.status = "cancelled"; state.eventNumber += 1; states.set(input.providerEnvelopeId, state);
    return { providerEnvelopeId: input.providerEnvelopeId, status: "cancelled", responseSnapshot: { provider: "internal_sandbox", status: "cancelled" } };
  },
  async validateWebhook(input: ProviderWebhookInput): Promise<ValidatedProviderWebhook> {
    const raw = input.rawBody; if (raw.length > 64 * 1024) throw new Error("WEBHOOK_BODY_TOO_LARGE");
    const signature = input.headers.get("x-alfenus-sandbox-signature") ?? ""; const expected = createHmac("sha256", secret()).update(raw).digest("hex");
    if (!signature) throw new Error("WEBHOOK_SIGNATURE_INVALID");
    const actual = Buffer.from(signature, "utf8");
    const expectedBytes = Buffer.from(expected, "utf8");
    if (actual.length !== expectedBytes.length || !timingSafeEqual(actual, expectedBytes)) throw new Error("WEBHOOK_SIGNATURE_INVALID");
    const parsed = JSON.parse(raw) as Record<string, unknown>; const providerEventId = String(parsed.providerEventId ?? ""); const providerEnvelopeId = String(parsed.providerEnvelopeId ?? ""); const eventType = String(parsed.eventType ?? "") as keyof typeof statusFor;
    if (!providerEventId || !providerEnvelopeId || !statusFor[eventType]) throw new Error("WEBHOOK_PAYLOAD_INVALID");
    return { provider: "internal_sandbox", providerEventId, providerEnvelopeId, eventType, payloadHash: hash(raw), payload: { providerEventId, providerEnvelopeId, eventType, signerEmails: Array.isArray(parsed.signerEmails) ? parsed.signerEmails : [] } };
  },
  async normalizeWebhook(input) { return { provider: input.provider, providerEventId: input.providerEventId, providerEnvelopeId: input.providerEnvelopeId, eventType: input.eventType, payloadHash: input.payloadHash, signerEmails: Array.isArray(input.payload.signerEmails) ? input.payload.signerEmails.map(String) : [] }; },
};
