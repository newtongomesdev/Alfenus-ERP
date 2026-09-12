import { createHash } from "node:crypto";
import type { ProposalDecisionInput } from "./schemas";
import { proposalDecisionConsentText, proposalDecisionInputSchema } from "./schemas";
import type { InternalProposalDecisionDTO, ProposalDecisionReceiptDTO, PublicProposalDecisionDTO, RestrictedProposalDecisionDTO } from "./dto";
import { ProposalDecisionConflictError, ProposalDecisionPersistenceError, ProposalDecisionUnavailableError, ProposalDecisionValidationError } from "../errors";

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> };
const hash = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");
const emptyToNull = (value: string | undefined) => value?.trim() ? value.trim() : null;

function canonicalInput(input: ProposalDecisionInput) {
  return JSON.stringify({ decisionType: input.decisionType, signerName: input.signerName.trim(), signerEmail: emptyToNull(input.signerEmail), signerDocumentLast4: emptyToNull(input.signerDocumentLast4), signerRole: emptyToNull(input.signerRole), companyName: emptyToNull(input.companyName), rejectionReason: emptyToNull(input.rejectionReason), consentTextVersion: input.consentTextVersion, consentTextSnapshot: input.consentTextSnapshot });
}

function mapRpcError(message: string): never {
  const upper = message.toUpperCase();
  if (upper.includes("PROPOSAL_DECISION_CONFLICT") || upper.includes("23505")) throw new ProposalDecisionConflictError();
  if (upper.includes("PROPOSAL_DECISION_VALIDATION")) throw new ProposalDecisionValidationError();
  if (upper.includes("PROPOSAL_DECISION_UNAVAILABLE") || upper.includes("P0002")) throw new ProposalDecisionUnavailableError();
  throw new ProposalDecisionPersistenceError();
}

export function proposalDecisionInputHash(input: ProposalDecisionInput) { return hash(canonicalInput(input)); }
export function proposalDecisionIdempotencyHash(idempotencyKey: string) { return hash(idempotencyKey); }

export async function decidePublicProposalService(client: unknown, rawInput: ProposalDecisionInput): Promise<PublicProposalDecisionDTO> {
  const input = proposalDecisionInputSchema.parse(rawInput);
  if (input.consentTextSnapshot !== proposalDecisionConsentText[input.decisionType]) throw new ProposalDecisionValidationError();
  const result = await (client as RpcClient).rpc("decide_public_commercial_proposal", {
    p_token_hash: hash(input.token),
    p_decision_type: input.decisionType,
    p_signer_name: input.signerName.trim(),
    p_signer_email: emptyToNull(input.signerEmail),
    p_signer_document_last4: emptyToNull(input.signerDocumentLast4),
    p_signer_role: emptyToNull(input.signerRole),
    p_company_name: emptyToNull(input.companyName),
    p_rejection_reason: emptyToNull(input.rejectionReason),
    p_consent_text_version: input.consentTextVersion,
    p_consent_text_snapshot: input.consentTextSnapshot,
    p_idempotency_key_hash: proposalDecisionIdempotencyHash(input.idempotencyKey),
    p_input_hash: proposalDecisionInputHash(input),
  });
  if (result.error) {
    console.error(JSON.stringify({ event: "proposal_decision_rpc_failed", rpc: "decide_public_commercial_proposal", code: result.error.message.match(/PROPOSAL_[A-Z_]+/)?.[0] ?? "UNMAPPED", detail: result.error.message }));
    mapRpcError(result.error.message);
  }
  const row = result.data?.[0];
  if (!row) throw new ProposalDecisionPersistenceError();
  return { decisionType: String(row.decision_type) as PublicProposalDecisionDTO["decisionType"], decidedAt: String(row.decided_at), signerName: String(row.signer_name), message: String(row.message), idempotent: Boolean(row.idempotent), alreadyDecided: Boolean(row.already_decided) };
}

function mapInternal(row: Record<string, unknown>): InternalProposalDecisionDTO {
  return { decisionId: String(row.decision_id), proposalId: String(row.proposal_id), proposalVersionId: String(row.proposal_version_id), publicLinkId: String(row.public_link_id), decisionType: String(row.decision_type) as InternalProposalDecisionDTO["decisionType"], signerName: String(row.signer_name), signerEmail: row.signer_email ? String(row.signer_email) : null, signerDocumentLast4: row.signer_document_last4 ? String(row.signer_document_last4) : null, signerRole: row.signer_role ? String(row.signer_role) : null, companyName: row.company_name ? String(row.company_name) : null, rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null, consentTextVersion: String(row.consent_text_version), consentTextSnapshot: String(row.consent_text_snapshot), proposalContentHash: String(row.proposal_content_hash), publicPayloadHash: String(row.public_payload_hash), decisionPayloadHash: String(row.decision_payload_hash), decidedAt: String(row.decided_at), createdAt: String(row.created_at), metadata: (row.metadata ?? {}) as Record<string, unknown>, memberRole: String(row.member_role) };
}

export async function getProposalDecisionService(client: unknown, proposalId: string, role: string): Promise<InternalProposalDecisionDTO | RestrictedProposalDecisionDTO | null> {
  const result = await (client as RpcClient).rpc("get_commercial_proposal_decision_secure", { p_proposal_id: proposalId });
  if (result.error) throw new ProposalDecisionPersistenceError();
  const row = result.data?.[0];
  if (!row) return null;
  const mapped = mapInternal(row);
  if (["assistente", "colaborador", "secretaria"].includes(role)) return { ...mapped, signerEmail: null, signerDocumentLast4: null, signerRole: null, companyName: null, rejectionReason: null };
  return mapped;
}

export async function getProposalDecisionReceiptService(client: unknown, decisionId: string, role: string): Promise<ProposalDecisionReceiptDTO | null> {
  const result = await (client as RpcClient).rpc("get_commercial_proposal_decision_receipt_secure", { p_decision_id: decisionId });
  if (result.error) throw new ProposalDecisionPersistenceError();
  const row = result.data?.[0];
  if (!row) return null;
  const restricted = ["assistente", "colaborador", "secretaria"].includes(role);
  return { decisionId: String(row.decision_id), proposalId: String(row.proposal_id), proposalVersionId: String(row.proposal_version_id), publicLinkId: String(row.public_link_id), decisionType: String(row.decision_type) as ProposalDecisionReceiptDTO["decisionType"], proposalTitle: String(row.proposal_title), currency: String(row.proposal_currency), totalCents: Number(row.total_cents ?? 0), entryAmountCents: Number(row.entry_amount_cents ?? 0), installmentCount: Number(row.installment_count ?? 0), installmentAmountCents: Number(row.installment_amount_cents ?? 0), recurringAmountCents: Number(row.recurring_amount_cents ?? 0), recurringMonths: Number(row.recurring_months ?? 0), successFeeBps: Number(row.success_fee_bps ?? 0), validUntil: row.valid_until ? String(row.valid_until) : null, signerName: String(row.signer_name), signerEmail: restricted ? null : row.signer_email ? String(row.signer_email) : null, signerDocumentLast4: restricted ? null : row.signer_document_last4 ? String(row.signer_document_last4) : null, signerRole: restricted ? null : row.signer_role ? String(row.signer_role) : null, companyName: restricted ? null : row.company_name ? String(row.company_name) : null, rejectionReason: restricted ? null : row.rejection_reason ? String(row.rejection_reason) : null, consentTextVersion: String(row.consent_text_version), consentTextSnapshot: String(row.consent_text_snapshot), proposalContentHash: String(row.proposal_content_hash), publicPayloadHash: String(row.public_payload_hash), decisionPayloadHash: String(row.decision_payload_hash), decidedAt: String(row.decided_at), linkStatus: String(row.link_status) };
}

export async function canProposalReceiveDecisionService(client: unknown, proposalId: string) {
  const result = await (client as RpcClient).rpc("can_commercial_proposal_receive_decision", { p_proposal_id: proposalId });
  if (result.error) throw new ProposalDecisionPersistenceError();
  return Boolean(result.data?.[0]?.can_commercial_proposal_receive_decision ?? result.data?.[0]?.can_commercial_proposal_receive_decision);
}

export async function assertProposalDecisionAllowedService(client: unknown, proposalId: string) {
  const result = await (client as RpcClient).rpc("assert_commercial_proposal_decision_allowed", { p_proposal_id: proposalId });
  if (result.error) mapRpcError(result.error.message);
}
