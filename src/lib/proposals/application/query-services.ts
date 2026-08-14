import { z } from "zod";
import type { ProposalRepository } from "../persistence/repositories";
const proposalIdSchema = z.string().uuid();
export function listProposalsService(repository: ProposalRepository, status?: string) { return repository.list(status); }
export function getProposalDetailService(repository: ProposalRepository, proposalId: string) { return repository.detail(proposalIdSchema.parse(proposalId)); }
export function listProposalEventsService(repository: ProposalRepository, proposalId: string) { return repository.events(proposalIdSchema.parse(proposalId)); }
