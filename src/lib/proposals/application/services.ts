import { proposalDuplicateInputSchema, proposalManualInputSchema, proposalMetadataInputSchema, proposalPricingInputSchema, type ProposalDuplicateInput, type ProposalManualInput, type ProposalMetadataInput, type ProposalPricingInput } from "./schemas";
import type { ProposalOperationRepository } from "../persistence/repositories";
import { ProposalAssistedAccessBlockedError } from "../errors";
export interface ProposalActor { role: string; assisted: boolean; }
function assertCanWrite(actor: ProposalActor) { if (actor.assisted) throw new ProposalAssistedAccessBlockedError(); if (!["proprietario", "administrador", "advogado"].includes(actor.role)) throw new Error("PROPOSAL_PERMISSION_DENIED"); }
export async function createManualProposalService(repository: ProposalOperationRepository, actor: ProposalActor, input: ProposalManualInput) { assertCanWrite(actor); return repository.createManual(proposalManualInputSchema.parse(input)); }
export async function createPricingProposalService(repository: ProposalOperationRepository, actor: ProposalActor, input: ProposalPricingInput) { assertCanWrite(actor); return repository.createFromPricing(proposalPricingInputSchema.parse(input)); }
export async function duplicateProposalService(repository: ProposalOperationRepository, actor: ProposalActor, input: ProposalDuplicateInput) { assertCanWrite(actor); return repository.duplicate(proposalDuplicateInputSchema.parse(input)); }
export async function updateProposalMetadataService(repository: ProposalOperationRepository, actor: ProposalActor, input: ProposalMetadataInput) { assertCanWrite(actor); return repository.updateMetadata(proposalMetadataInputSchema.parse(input)); }
