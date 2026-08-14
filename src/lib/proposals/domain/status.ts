export const proposalStatuses = ["draft", "ready", "sent", "viewed", "accepted", "rejected", "expired", "cancelled", "superseded", "archived"] as const;
export type ProposalStatus = (typeof proposalStatuses)[number];
export const proposalOrigins = ["pricing_scenario", "manual", "duplicated", "template"] as const;
export type ProposalOriginType = (typeof proposalOrigins)[number];
export const proposalEvents = ["proposal_created", "proposal_updated", "proposal_version_created", "proposal_version_activated", "proposal_duplicated", "proposal_marked_ready", "proposal_sent", "proposal_viewed", "proposal_accepted", "proposal_rejected", "proposal_expired", "proposal_cancelled", "proposal_superseded", "proposal_archived", "proposal_restored", "proposal_conversion_started", "proposal_conversion_completed", "proposal_conversion_failed"] as const;
export type ProposalEventType = (typeof proposalEvents)[number];

const transitions: Record<ProposalStatus, readonly ProposalStatus[]> = {
  draft: ["ready", "cancelled", "archived"], ready: ["draft", "sent", "cancelled", "archived"],
  sent: ["viewed", "accepted", "rejected", "expired", "cancelled", "superseded"],
  viewed: ["accepted", "rejected", "expired", "cancelled", "superseded"], accepted: ["archived"],
  rejected: ["archived"], expired: ["archived"], cancelled: ["archived"], superseded: ["archived"], archived: ["draft"],
};
export function getAllowedProposalTransitions(status: ProposalStatus): readonly ProposalStatus[] { return transitions[status]; }
export function canTransitionProposalStatus(from: ProposalStatus, to: ProposalStatus): boolean { return transitions[from].includes(to); }
export function assertProposalTransition(from: ProposalStatus, to: ProposalStatus): void { if (!canTransitionProposalStatus(from, to)) throw new ProposalInvalidTransitionError(from, to); }
export function isProposalEditable(status: ProposalStatus): boolean { return status === "draft" || status === "ready"; }
export function isProposalSendable(status: ProposalStatus): boolean { return status === "ready"; }
export function isProposalTerminal(status: ProposalStatus): boolean { return ["accepted", "rejected", "expired", "cancelled", "superseded", "archived"].includes(status); }
export function isProposalExpired(validUntil: string | Date | null | undefined, now = new Date()): boolean { return validUntil ? new Date(validUntil).getTime() < now.getTime() : false; }
export class ProposalInvalidTransitionError extends Error { readonly code = "PROPOSAL_INVALID_TRANSITION"; constructor(readonly from: ProposalStatus, readonly to: ProposalStatus) { super(`Transicao de proposta nao permitida: ${from} -> ${to}`); this.name = "ProposalInvalidTransitionError"; } }
