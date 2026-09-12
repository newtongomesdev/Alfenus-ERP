import { createHash } from "node:crypto";

import { buildContractVersionPayload, type ContractDraft, type ReadinessIssue } from "@/lib/contracts/editor";

type RpcResult = { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult> };

function rpcError(result: RpcResult) { if (result.error) throw new Error(result.error.message); return result.data?.[0] ?? {}; }
export function editorInputHash(contractId: string, key: string, contentHash: string) { return createHash("sha256").update(JSON.stringify({ contractId, key, contentHash }), "utf8").digest("hex"); }
export async function createContractVersionService(client: unknown, input: { contractId: string; expectedUpdatedAt: string; draft: ContractDraft; idempotencyKey: string; activate: boolean }) { const payload=buildContractVersionPayload(input.draft); const row=rpcError(await (client as RpcClient).rpc("create_contract_version", { p_contract_id: input.contractId, p_expected_updated_at: input.expectedUpdatedAt, p_title: payload.title, p_content: payload.content, p_parties: payload.parties, p_clauses: payload.clauses, p_terms: payload.terms, p_metadata: payload.metadata, p_content_hash: payload.contentHash, p_idempotency_key: input.idempotencyKey, p_input_hash: editorInputHash(input.contractId,input.idempotencyKey,payload.contentHash), p_activate: input.activate })); return { versionId:String(row.contract_version_id), versionNumber:Number(row.version_number), idempotent:Boolean(row.idempotent), updatedAt:String(row.updated_at), readiness:payload.readiness }; }
export async function activateContractVersionService(client: unknown, contractId:string, versionId:string, expectedUpdatedAt:string) { return rpcError(await (client as RpcClient).rpc("activate_contract_version",{p_contract_id:contractId,p_version_id:versionId,p_expected_updated_at:expectedUpdatedAt})); }
export async function transitionContractService(client: unknown, contractId:string, transition:"ready"|"draft"|"archive"|"restore", expectedUpdatedAt:string, readiness:ReadinessIssue[]=[]){ return rpcError(await (client as RpcClient).rpc("transition_contract_editor_state",{p_contract_id:contractId,p_transition:transition,p_expected_updated_at:expectedUpdatedAt,p_readiness:readiness})); }
