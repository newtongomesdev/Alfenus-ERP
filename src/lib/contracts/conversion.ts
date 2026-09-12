import { createHash } from "node:crypto";

export type ContractConversionResult = { contractId: string; contractVersionId: string; idempotent: boolean };

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> };

export function contractConversionInputHash(proposalId: string, idempotencyKey: string) {
  return createHash("sha256").update(JSON.stringify({ proposalId, idempotencyKey }), "utf8").digest("hex");
}

export async function convertAcceptedProposalService(client: unknown, proposalId: string, idempotencyKey: string): Promise<ContractConversionResult> {
  const inputHash = contractConversionInputHash(proposalId, idempotencyKey);
  const result = await (client as RpcClient).rpc("convert_accepted_commercial_proposal_to_contract", { p_proposal_id: proposalId, p_idempotency_key: idempotencyKey, p_input_hash: inputHash });
  if (result.error) throw new Error(result.error.message);
  const row = result.data?.[0];
  if (!row?.contract_id || !row.contract_version_id) throw new Error("CONTRACT_CONVERSION_PERSISTENCE_ERROR");
  return { contractId: String(row.contract_id), contractVersionId: String(row.contract_version_id), idempotent: Boolean(row.idempotent) };
}
