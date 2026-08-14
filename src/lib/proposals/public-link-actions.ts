"use server";

import { revalidatePath } from "next/cache";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toSafeProposalError } from "./application/errors";
import { createProposalPublicLink, getProposalPublicLinkStatus, revokeProposalPublicLink, rotateProposalPublicLink, type ProposalPublicLinkInput } from "./public-links";

const writeRoles = new Set(["proprietario", "administrador", "advogado"]);

async function internalClient() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm || !writeRoles.has(String(context.member.role).trim().toLowerCase())) return { error: { code: "PROPOSAL_PUBLIC_LINK_PERMISSION_DENIED", message: "Permissão insuficiente para compartilhar propostas." } } as const;
  const client = await getSupabaseServerClient();
  if (!client) return { error: { code: "PROPOSAL_PUBLIC_LINK_PERSISTENCE_ERROR", message: "Serviço indisponível." } } as const;
  return { client, context } as const;
}

export async function createProposalPublicLinkAction(input: ProposalPublicLinkInput) {
  try { const ctx = await internalClient(); if ("error" in ctx) return ctx; const data = await createProposalPublicLink(ctx.client, input); revalidatePath(`/propostas/${input.proposalId}`); return { data }; } catch (error) { const safe = toSafeProposalError(error); console.error(JSON.stringify({ event: "proposal_public_link_action_failed", action: "create", code: safe.code, detail: error instanceof Error ? error.message : String(error) })); return { error: safe }; }
}

export async function revokeProposalPublicLinkAction(input: { linkId: string; proposalId: string }) {
  try { const ctx = await internalClient(); if ("error" in ctx) return ctx; const data = await revokeProposalPublicLink(ctx.client, input.linkId); revalidatePath(`/propostas/${input.proposalId}`); return { data }; } catch (error) { const safe = toSafeProposalError(error); console.error(JSON.stringify({ event: "proposal_public_link_action_failed", action: "revoke", code: safe.code })); return { error: safe }; }
}

export async function rotateProposalPublicLinkAction(input: ProposalPublicLinkInput) {
  try { const ctx = await internalClient(); if ("error" in ctx) return ctx; const data = await rotateProposalPublicLink(ctx.client, input); revalidatePath(`/propostas/${input.proposalId}`); return { data }; } catch (error) { const safe = toSafeProposalError(error); console.error(JSON.stringify({ event: "proposal_public_link_action_failed", action: "rotate", code: safe.code })); return { error: safe }; }
}

export async function getProposalPublicLinkStatusAction(proposalId: string) {
  try { const ctx = await internalClient(); if ("error" in ctx) return ctx; return { data: await getProposalPublicLinkStatus(ctx.client, proposalId) }; } catch (error) { return { error: toSafeProposalError(error) }; }
}
