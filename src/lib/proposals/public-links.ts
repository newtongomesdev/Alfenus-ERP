import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { ProposalError } from "./errors";

export class ProposalPublicLinkNotFoundError extends ProposalError { constructor() { super("Esta proposta não está disponível.", "PROPOSAL_PUBLIC_LINK_NOT_FOUND"); } }
export class ProposalPublicLinkExpiredError extends ProposalError { constructor() { super("Esta proposta não está disponível.", "PROPOSAL_PUBLIC_LINK_EXPIRED"); } }
export class ProposalPublicLinkRevokedError extends ProposalError { constructor() { super("Esta proposta não está disponível.", "PROPOSAL_PUBLIC_LINK_REVOKED"); } }
export class ProposalPublicLinkPermissionError extends ProposalError { constructor() { super("Permissão insuficiente para compartilhar propostas.", "PROPOSAL_PUBLIC_LINK_PERMISSION_DENIED"); } }
export class ProposalPublicLinkValidationError extends ProposalError { constructor() { super("Dados do compartilhamento inválidos.", "PROPOSAL_PUBLIC_LINK_VALIDATION_ERROR"); } }
export class ProposalPublicLinkPersistenceError extends ProposalError { constructor() { super("Não foi possível processar o compartilhamento.", "PROPOSAL_PUBLIC_LINK_PERSISTENCE_ERROR"); } }

export const proposalPublicLinkInputSchema = z.object({
  proposalId: z.string().uuid(),
  proposalVersionId: z.string().uuid().nullable().optional(),
  expiresAt: z.string().datetime({ offset: true }).nullable().optional(),
  idempotencyKey: z.string().trim().min(1).max(256).regex(/^[A-Za-z0-9:_-]+$/),
});
export const proposalPublicLinkTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43,}$/);
export const proposalPublicLinkIdSchema = z.string().uuid();
export type ProposalPublicLinkInput = z.infer<typeof proposalPublicLinkInputSchema>;

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }> };

export function generateProposalPublicLinkToken() {
  return randomBytes(32).toString("base64url");
}

export function hashProposalPublicLinkToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function buildProposalPublicLinkUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return `${base.replace(/\/$/, "")}/p/${encodeURIComponent(token)}`;
}

function inputHash(input: ProposalPublicLinkInput) {
  return createHash("sha256").update(JSON.stringify({ proposalId: input.proposalId, proposalVersionId: input.proposalVersionId ?? null, expiresAt: input.expiresAt ?? null }), "utf8").digest("hex");
}

function mapPublicLinkError(error: { message: string } | null): never {
  const message = error?.message?.toLowerCase() ?? "";
  if (message.includes("permission_denied")) throw new ProposalPublicLinkPermissionError();
  if (message.includes("not_found")) throw new ProposalPublicLinkNotFoundError();
  if (message.includes("expired")) throw new ProposalPublicLinkExpiredError();
  if (message.includes("revoked")) throw new ProposalPublicLinkRevokedError();
  if (message.includes("validation") || message.includes("not_ready") || message.includes("version_invalid") || message.includes("idempotency_conflict")) throw new ProposalPublicLinkValidationError();
  throw new ProposalPublicLinkPersistenceError();
}

async function call(client: unknown, name: string, args: Record<string, unknown>) {
  const result = await (client as RpcClient).rpc(name, args);
  if (result.error) { console.error(JSON.stringify({ event: "proposal_public_link_rpc_failed", rpc: name, code: result.error.message.match(/PGRST[0-9]+|[A-Z_]+/)?.[0] ?? "UNMAPPED", detail: result.error.message })); mapPublicLinkError(result.error); }
  const row = result.data?.[0];
  if (!row) throw new ProposalPublicLinkPersistenceError();
  return row;
}

export async function createProposalPublicLink(client: unknown, rawInput: ProposalPublicLinkInput) {
  const input = proposalPublicLinkInputSchema.parse(rawInput);
  const token = generateProposalPublicLinkToken();
  const row = await call(client, "create_commercial_proposal_public_link", { p_proposal_id: input.proposalId, p_proposal_version_id: input.proposalVersionId ?? null, p_expires_at: input.expiresAt ?? null, p_token_hash: hashProposalPublicLinkToken(token), p_token_prefix: token.slice(0, 12), p_idempotency_key: input.idempotencyKey, p_input_hash: inputHash(input) });
  const idempotent = Boolean(row.idempotent);
  return { linkId: String(row.link_id), proposalId: String(row.proposal_id), proposalVersionId: String(row.proposal_version_id), expiresAt: row.expires_at ? String(row.expires_at) : null, idempotent, url: idempotent ? null : buildProposalPublicLinkUrl(token) };
}

export async function revokeProposalPublicLink(client: unknown, linkId: string) {
  const row = await call(client, "revoke_commercial_proposal_public_link", { p_link_id: proposalPublicLinkIdSchema.parse(linkId) });
  return { linkId: String(row.link_id), status: String(row.status) };
}

export async function rotateProposalPublicLink(client: unknown, rawInput: ProposalPublicLinkInput) {
  const input = proposalPublicLinkInputSchema.parse(rawInput);
  const token = generateProposalPublicLinkToken();
  const row = await call(client, "rotate_commercial_proposal_public_link", { p_proposal_id: input.proposalId, p_proposal_version_id: input.proposalVersionId ?? null, p_expires_at: input.expiresAt ?? null, p_token_hash: hashProposalPublicLinkToken(token), p_token_prefix: token.slice(0, 12), p_idempotency_key: input.idempotencyKey, p_input_hash: inputHash(input) });
  const idempotent = Boolean(row.idempotent);
  return { linkId: String(row.link_id), proposalId: String(row.proposal_id), proposalVersionId: String(row.proposal_version_id), expiresAt: row.expires_at ? String(row.expires_at) : null, idempotent, url: idempotent ? null : buildProposalPublicLinkUrl(token) };
}

export async function getProposalPublicLinkStatus(client: unknown, proposalId: string) {
  const id = proposalPublicLinkIdSchema.parse(proposalId);
  const result = await (client as RpcClient).rpc("get_commercial_proposal_public_link_status", { p_proposal_id: id });
  if (result.error) mapPublicLinkError(result.error);
  const row = result.data?.[0];
  return row ? { linkId: String(row.link_id), proposalId: String(row.proposal_id), proposalVersionId: String(row.proposal_version_id), status: String(row.status), expiresAt: row.expires_at ? String(row.expires_at) : null, activatedAt: String(row.activated_at), revokedAt: row.revoked_at ? String(row.revoked_at) : null, createdAt: String(row.created_at), firstViewedAt: row.first_viewed_at ? String(row.first_viewed_at) : null, lastViewedAt: row.last_viewed_at ? String(row.last_viewed_at) : null, viewCount: Number(row.view_count ?? 0) } : null;
}

export async function resolvePublicProposal(client: unknown, token: string) {
  const parsed = proposalPublicLinkTokenSchema.safeParse(token);
  if (!parsed.success) throw new ProposalPublicLinkNotFoundError();
  const result = await (client as RpcClient).rpc("get_public_commercial_proposal", { p_token_hash: hashProposalPublicLinkToken(parsed.data) });
  if (result.error) console.error(JSON.stringify({ event: "proposal_public_link_resolve_failed", detail: result.error.message }));
  if (result.error || !result.data?.[0]?.public_payload) throw new ProposalPublicLinkNotFoundError();
  return result.data[0].public_payload as Record<string, unknown>;
}

export async function registerPublicProposalView(client: unknown, token: string) {
  const parsed = proposalPublicLinkTokenSchema.safeParse(token);
  if (!parsed.success) throw new ProposalPublicLinkNotFoundError();
  const row = await call(client, "register_public_commercial_proposal_view", { p_token_hash: hashProposalPublicLinkToken(parsed.data) });
  return { viewCount: Number(row.view_count ?? 0), firstView: Boolean(row.first_view) };
}
