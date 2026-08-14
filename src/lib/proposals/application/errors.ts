import { ProposalAlreadyDecidedError, ProposalAssistedAccessBlockedError, ProposalDecisionConflictError, ProposalDecisionPersistenceError, ProposalDecisionUnavailableError, ProposalDecisionValidationError, ProposalError, ProposalIdempotencyConflictError, ProposalInvalidTransitionError, ProposalNotFoundError, ProposalNotReadyError, ProposalOperationInProgressError, ProposalOptimisticLockError, ProposalPermissionDeniedError, ProposalPersistenceError, ProposalSourcePricingInvalidError, ProposalSourcePricingNotFoundError, ProposalValidationError, ProposalVersionNotFoundError } from "../errors";
export function mapProposalError(error: unknown): ProposalError {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.toUpperCase().match(/PROPOSAL_[A-Z_]+/)?.[0] ?? "PROPOSAL_PERSISTENCE_ERROR";
  switch (code) {
    case "PROPOSAL_NOT_FOUND": return new ProposalNotFoundError();
    case "PROPOSAL_VERSION_NOT_FOUND": return new ProposalVersionNotFoundError();
    case "PROPOSAL_PERMISSION_DENIED": return new ProposalPermissionDeniedError();
    case "PROPOSAL_ASSISTED_ACCESS_BLOCKED": return new ProposalAssistedAccessBlockedError();
    case "PROPOSAL_OPTIMISTIC_LOCK_CONFLICT": return new ProposalOptimisticLockError();
    case "PROPOSAL_IDEMPOTENCY_CONFLICT": return new ProposalIdempotencyConflictError();
    case "PROPOSAL_SOURCE_PRICING_NOT_FOUND": return new ProposalSourcePricingNotFoundError();
    case "PROPOSAL_SOURCE_PRICING_INVALID": return new ProposalSourcePricingInvalidError();
    case "PROPOSAL_VALIDATION_ERROR": return new ProposalValidationError();
    case "PROPOSAL_INVALID_TRANSITION": return new ProposalInvalidTransitionError();
    case "PROPOSAL_NOT_READY": return new ProposalNotReadyError();
    case "PROPOSAL_OPERATION_IN_PROGRESS": return new ProposalOperationInProgressError();
    case "PROPOSAL_DECISION_UNAVAILABLE": return new ProposalDecisionUnavailableError();
    case "PROPOSAL_ALREADY_DECIDED": return new ProposalAlreadyDecidedError();
    case "PROPOSAL_DECISION_CONFLICT": return new ProposalDecisionConflictError();
    case "PROPOSAL_DECISION_VALIDATION_ERROR": return new ProposalDecisionValidationError();
    case "PROPOSAL_DECISION_PERMISSION_DENIED": return new ProposalPermissionDeniedError();
    case "PROPOSAL_DECISION_PERSISTENCE_ERROR": return new ProposalDecisionPersistenceError();
    default: return new ProposalPersistenceError();
  }
}
export function toSafeProposalError(error: unknown): { code: string; message: string } { const mapped = mapProposalError(error); return { code: mapped.code, message: mapped.message }; }
