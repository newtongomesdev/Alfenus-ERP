import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { ProposalOperationRepository, ProposalVersionRepository } from "./repositories";
import { mapProposalError } from "../application/errors";
import type { ProposalActivationInput, ProposalDuplicateInput, ProposalManualInput, ProposalMetadataInput, ProposalPricingInput, ProposalRecipientInput, ProposalTransitionInput, ProposalVersionInput } from "../application/schemas";

type RpcResponse = { proposal_id: string; version_id: string; idempotent?: boolean };
type ProposalRpc = (name: string, args: Record<string, unknown>) => Promise<{ data: RpcResponse[] | null; error: { message: string } | null }>;
function proposalRpc(client: SupabaseClient<Database>): ProposalRpc { return async (name, args) => { const call = client.rpc as unknown as (rpcName: string, parameters: Record<string, unknown>) => Promise<{ data: RpcResponse[] | null; error: { message: string } | null }>; const result = await call.call(client, name, args); if (result.error) console.error(JSON.stringify({ event: "proposal_rpc_failed", rpc: name, argumentKeys: Object.keys(args).sort(), message: result.error.message })); return result; }; }
export class SupabaseProposalOperationRepository implements ProposalOperationRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}
  private async invoke(name: string, args: Record<string, unknown>) { const result = await proposalRpc(this.client)(name, args); console.info(JSON.stringify({ event: "proposal_rpc_shape", rpc: name, hasError: Boolean(result.error), dataIsArray: Array.isArray(result.data), dataLength: Array.isArray(result.data) ? result.data.length : null })); if (result.error) throw mapProposalError(result.error); const row = result.data?.[0]; if (!row) throw mapProposalError(new Error("PROPOSAL_PERSISTENCE_ERROR")); return row; }
  async createManual(input: ProposalManualInput) { const row = await this.invoke("create_commercial_proposal_manual", { p_title: input.title, p_currency: input.currency, p_validity_days: input.validityDays ?? null, p_idempotency_key: input.idempotencyKey }); return { proposalId: row.proposal_id, versionId: row.version_id }; }
  async createFromPricing(input: ProposalPricingInput) { const row = await this.invoke("create_commercial_proposal_from_pricing_version", { p_pricing_scenario_id: input.pricingScenarioId, p_pricing_version_id: input.pricingVersionId, p_title: input.title, p_client_id: input.clientId ?? null, p_contact_id: input.contactId ?? null, p_validity_days: input.validityDays ?? null, p_idempotency_key: input.idempotencyKey, p_input_hash: input.inputHash }); return { proposalId: row.proposal_id, versionId: row.version_id }; }
  async duplicate(input: ProposalDuplicateInput) { const row = await this.invoke("duplicate_commercial_proposal", { p_source_proposal_id: input.sourceProposalId, p_title: input.title ?? null, p_copy_recipients: input.copyRecipients, p_idempotency_key: input.idempotencyKey, p_input_hash: input.inputHash }); return { proposalId: row.proposal_id, versionId: row.version_id, idempotent: row.idempotent ?? false }; }
  async updateMetadata(input: ProposalMetadataInput) { const result = await this.client.rpc("update_commercial_proposal_metadata" as never, { p_proposal_id: input.proposalId, p_expected_updated_at: input.expectedUpdatedAt, p_title: input.title ?? null, p_internal_reference: input.internalReference ?? null, p_valid_until: input.validUntil ?? null, p_internal_notes: input.internalNotes ?? null } as never) as unknown as { data: Array<{ proposal_id: string; updated_at: string }> | null; error: { message: string } | null }; if (result.error) throw mapProposalError(result.error); const row = result.data?.[0]; if (!row) throw mapProposalError(new Error("PROPOSAL_PERSISTENCE_ERROR")); return { proposalId: row.proposal_id, updatedAt: row.updated_at }; }
}

type OperationRpcResult<T> = { data: T[] | null; error: { message: string } | null };
async function callOperation<T>(client: SupabaseClient<Database>, name: string, args: Record<string, unknown>): Promise<T> {
  const call = client.rpc as unknown as (rpcName: string, parameters: Record<string, unknown>) => Promise<OperationRpcResult<T>>;
  const result = await call.call(client, name, args);
  if (result.error) console.error(JSON.stringify({ event: "proposal_rpc_failed", rpc: name, argumentKeys: Object.keys(args).sort(), message: result.error.message }));
  if (result.error) throw mapProposalError(result.error);
  const row = result.data?.[0];
  if (!row) throw mapProposalError(new Error("PROPOSAL_PERSISTENCE_ERROR"));
  return row;
}
export class SupabaseProposalVersionRepository implements ProposalVersionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}
  async createVersion(input: ProposalVersionInput) { const row = await callOperation<{ version_id: string; version_number: number; updated_at: string }>(this.client, "create_commercial_proposal_version", { p_proposal_id: input.proposalId, p_expected_updated_at: input.expectedUpdatedAt, p_draft: input.draft }); return { versionId: row.version_id, versionNumber: row.version_number, updatedAt: row.updated_at }; }
  async activateVersion(input: ProposalActivationInput) { const row = await callOperation<{ updated_at: string }>(this.client, "activate_commercial_proposal_version", { p_proposal_id: input.proposalId, p_version_id: input.versionId, p_expected_updated_at: input.expectedUpdatedAt }); return { updatedAt: row.updated_at }; }
  async transition(input: ProposalTransitionInput) { const row = await callOperation<{ updated_at: string }>(this.client, "transition_commercial_proposal", { p_proposal_id: input.proposalId, p_to: input.to, p_expected_updated_at: input.expectedUpdatedAt }); return { updatedAt: row.updated_at }; }
  async createRecipient(input: ProposalRecipientInput) { const row = await callOperation<{ recipient_id: string }>(this.client, "upsert_commercial_proposal_recipient", { p_proposal_id: input.proposalId, p_recipient: input }); return { recipientId: row.recipient_id }; }
}
