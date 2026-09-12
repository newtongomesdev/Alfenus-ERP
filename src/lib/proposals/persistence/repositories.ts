import type { ProposalDetailDTO, ProposalEventDTO, ProposalListDTO } from "../application/dto";
import type { ProposalActivationInput, ProposalDuplicateInput, ProposalManualInput, ProposalMetadataInput, ProposalPricingInput, ProposalRecipientInput, ProposalTransitionInput, ProposalVersionInput } from "../application/schemas";

export interface ProposalRepository {
  list(status?: string): Promise<ProposalListDTO[]>;
  detail(proposalId: string, versionId?: string): Promise<ProposalDetailDTO | null>;
  events(proposalId: string): Promise<ProposalEventDTO[]>;
}
export interface ProposalOperationRepository {
  createManual(input: ProposalManualInput): Promise<{ proposalId: string; versionId: string }>;
  createFromPricing(input: ProposalPricingInput): Promise<{ proposalId: string; versionId: string }>;
  duplicate(input: ProposalDuplicateInput): Promise<{ proposalId: string; versionId: string; idempotent: boolean }>;
  updateMetadata(input: ProposalMetadataInput): Promise<{ proposalId: string; updatedAt: string }>;
}
export interface ProposalVersionRepository {
  createVersion(input: ProposalVersionInput): Promise<{ versionId: string; versionNumber: number; updatedAt: string }>;
  activateVersion(input: ProposalActivationInput): Promise<{ updatedAt: string }>;
  transition(input: ProposalTransitionInput): Promise<{ updatedAt: string }>;
  createRecipient(input: ProposalRecipientInput): Promise<{ recipientId: string }>;
}
