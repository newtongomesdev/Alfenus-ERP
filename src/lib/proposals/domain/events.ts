import type { ProposalEventDTO } from "../application/dto";
const sensitiveKeys = new Set(["internal_notes", "pricing_snapshot_json", "payment_terms_json", "email", "phone", "token", "stack", "sqlstate"]);
export function sanitizeProposalEvent(event: ProposalEventDTO): ProposalEventDTO { const metadata = Object.fromEntries(Object.entries(event.metadata).filter(([key]) => !sensitiveKeys.has(key.toLowerCase()))); return { ...event, metadata }; }
