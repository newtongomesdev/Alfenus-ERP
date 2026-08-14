import type { SignatureEnvelope, SignatureSigner, SignatureSource } from "./types";
import { SignatureEnvelopeError } from "./errors";

// The generated database types predate the signature migration. This adapter is the only boundary that uses the ungenerated table shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = { from: (table: string) => any };
type RpcClient = { rpc: (name: string, args: Record<string, string>) => Promise<{ data: unknown; error: Error | null }> };

const mapSigner = (row: Record<string, unknown>): SignatureSigner => ({
  id: String(row.id), signerType: row.signer_type as SignatureSigner["signerType"], role: String(row.role), name: String(row.name), email: String(row.email),
  phone: row.phone as string | null, taxIdentifier: row.tax_identifier as string | null, organizationName: row.organization_name as string | null,
  signingOrder: Number(row.signing_order), requiresIdentityVerification: Boolean(row.requires_identity_verification), status: row.status as SignatureSigner["status"],
});

const parseJson = (value: unknown): unknown => typeof value === "string" ? JSON.parse(value) as unknown : value;

export async function getSignatureSource(client: Db, lawFirmId: string, documentId: string): Promise<SignatureSource | null> {
  const result = await client.from("contract_documents").select("id,contract_id,contract_version_id,status,file_hash,file_size,page_count,generated_at,renderer_version,template_version,contract_content_hash").eq("id", documentId).eq("law_firm_id", lawFirmId).maybeSingle();
  if (result.error) { console.error("[signature-source]", { stage: "document", code: result.error.code ?? null, message: result.error.message ?? "unknown" }); throw new SignatureEnvelopeError("SIGNATURE_SOURCE_READ_FAILED"); }
  if (!result.data) return null;
  const rpcClient = client as unknown as RpcClient;
  const editor = await rpcClient.rpc("get_contract_editor_secure", { p_contract_id: String(result.data.contract_id) });
  const editorPayload = parseJson(editor.data) as { versions?: Array<Record<string, unknown>> } | null;
  let version = editorPayload?.versions?.find((item) => String(item.id) === String(result.data.contract_version_id));
  if (!version && editor.error) {
    const fallback = await client.from("contract_conversion_versions").select("id,title,parties_json,is_active,created_at").eq("id", result.data.contract_version_id).eq("law_firm_id", lawFirmId).maybeSingle();
    if (fallback.error) { console.error("[signature-source]", { stage: "version_fallback", code: fallback.error.code ?? null, message: fallback.error.message ?? "unknown" }); throw new SignatureEnvelopeError("SIGNATURE_SOURCE_READ_FAILED"); }
    version = fallback.data ? fallback.data as Record<string, unknown> : undefined;
  }
  if (!version) throw new SignatureEnvelopeError("SIGNATURE_SOURCE_VERSION_MISSING");
  const contract = await client.from("contracts").select("status,service_description").eq("id", result.data.contract_id).eq("law_firm_id", lawFirmId).maybeSingle();
  if (contract.error) { console.error("[signature-source]", { stage: "contract", code: contract.error.code ?? null, message: contract.error.message ?? "unknown" }); throw new SignatureEnvelopeError("SIGNATURE_SOURCE_READ_FAILED"); }
  if (!contract.data) return null;
  return {
    contractId: result.data.contract_id, contractDocumentId: result.data.id, contractVersionId: result.data.contract_version_id, status: result.data.status,
    documentHash: result.data.file_hash ?? result.data.contract_content_hash, fileSize: Number(result.data.file_size), pageCount: Number(result.data.page_count),
    title: String(version.title ?? contract.data.service_description ?? ""), parties: (version.parties ?? version.parties_json ?? {}) as Record<string, unknown>, createdAt: result.data.generated_at,
    rendererVersion: result.data.renderer_version, templateVersion: result.data.template_version, stale: version.isActive === false || version.is_active === false,
    archived: ["arquivado", "archived"].includes(String(contract.data.status)),
  };
}

export async function getEnvelope(client: Db, lawFirmId: string, id: string): Promise<SignatureEnvelope | null> {
  const envelope = await client.from("contract_signature_envelopes").select("id,law_firm_id,contract_id,contract_document_id,contract_version_id,status,title,consent_version,signing_order_enabled,expires_at,prepared_at,cancelled_at,document_hash,document_file_size,document_page_count,lock_version,document_snapshot_json").eq("id", id).eq("law_firm_id", lawFirmId).maybeSingle();
  if (envelope.error || !envelope.data) return null;
  const signers = await client.from("contract_signature_signers").select("*").eq("envelope_id", id).eq("law_firm_id", lawFirmId).neq("status", "removed").order("signing_order");
  if (signers.error) throw new SignatureEnvelopeError("SIGNATURE_READ_FAILED");
  return { id: envelope.data.id, lawFirmId: envelope.data.law_firm_id, contractId: envelope.data.contract_id, contractDocumentId: envelope.data.contract_document_id, contractVersionId: envelope.data.contract_version_id, status: envelope.data.status, title: envelope.data.title, consentVersion: envelope.data.consent_version, signingOrderEnabled: envelope.data.signing_order_enabled, expiresAt: envelope.data.expires_at, preparedAt: envelope.data.prepared_at, cancelledAt: envelope.data.cancelled_at, documentHash: envelope.data.document_hash, documentFileSize: Number(envelope.data.document_file_size), documentPageCount: Number(envelope.data.document_page_count), lockVersion: Number(envelope.data.lock_version), signers: (signers.data ?? []).map(mapSigner), snapshot: envelope.data.document_snapshot_json ?? {} };
}

export async function listEnvelopes(client: Db, lawFirmId: string, contractId: string) {
  const result = await client.from("contract_signature_envelopes").select("id,contract_id,status,title,consent_version,document_hash,document_file_size,document_page_count,lock_version,created_at,prepared_at,cancelled_at").eq("law_firm_id", lawFirmId).eq("contract_id", contractId).order("created_at", { ascending: false });
  if (result.error) throw new SignatureEnvelopeError("SIGNATURE_LIST_FAILED");
  return result.data ?? [];
}

export const getSignatureEnvelope = getEnvelope;
export const listContractSignatureEnvelopes = listEnvelopes;
