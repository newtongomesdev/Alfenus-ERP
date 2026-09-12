import { proposalActivationSchema, proposalRecipientSchema, proposalTransitionSchema, proposalVersionInputSchema, type ProposalActivationInput, type ProposalRecipientInput, type ProposalTransitionInput, type ProposalVersionInput } from "./schemas";
import { ProposalAssistedAccessBlockedError } from "../errors";
import type { ProposalVersionRepository } from "../persistence/repositories";
import { buildProposalVersionDraft, isProposalReady } from "../domain/builder";
import type { ProposalVersionDraftDTO } from "./dto";

export interface ProposalWriteActor { role: string; assisted: boolean; }
function assertVersionWrite(actor: ProposalWriteActor) { if (actor.assisted) throw new ProposalAssistedAccessBlockedError(); if (!["proprietario", "administrador", "advogado"].includes(actor.role)) throw new Error("PROPOSAL_PERMISSION_DENIED"); }
export async function createProposalVersionService(repository: ProposalVersionRepository, actor: ProposalWriteActor, input: ProposalVersionInput) { assertVersionWrite(actor); const parsed = proposalVersionInputSchema.parse(input); const draft = parsed.draft as unknown as ProposalVersionDraftDTO; const built = buildProposalVersionDraft(draft, "manual"); return repository.createVersion({ proposalId: parsed.proposalId, expectedUpdatedAt: parsed.expectedUpdatedAt, draft: { ...built, items: built.items.map((item) => ({ ...item, metadata: item.metadata ?? {} })) } as ProposalVersionInput["draft"] }); }
export async function activateProposalVersionService(repository: ProposalVersionRepository, actor: ProposalWriteActor, input: ProposalActivationInput) { assertVersionWrite(actor); return repository.activateVersion(proposalActivationSchema.parse(input)); }
export async function transitionProposalService(repository: ProposalVersionRepository, actor: ProposalWriteActor, input: ProposalTransitionInput) { assertVersionWrite(actor); return repository.transition(proposalTransitionSchema.parse(input)); }
export async function archiveProposalService(repository: ProposalVersionRepository, actor: ProposalWriteActor, input: Omit<ProposalTransitionInput, "to">) { return transitionProposalService(repository, actor, { ...input, to: "archived" }); }
export async function restoreProposalService(repository: ProposalVersionRepository, actor: ProposalWriteActor, input: Omit<ProposalTransitionInput, "to">) { return transitionProposalService(repository, actor, { ...input, to: "draft" }); }
export async function upsertProposalRecipientService(repository: ProposalVersionRepository, actor: ProposalWriteActor, input: ProposalRecipientInput) { assertVersionWrite(actor); return repository.createRecipient(proposalRecipientSchema.parse(input)); }
export function proposalReadiness(draft: ProposalVersionDraftDTO) { return isProposalReady(draft); }
