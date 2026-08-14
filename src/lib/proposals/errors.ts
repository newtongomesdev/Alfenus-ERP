export class ProposalError extends Error { constructor(message: string, readonly code: string) { super(message); this.name = new.target.name; } }
export class ProposalNotFoundError extends ProposalError { constructor() { super("Proposta nao encontrada.", "PROPOSAL_NOT_FOUND"); } }
export class ProposalVersionNotFoundError extends ProposalError { constructor() { super("Versao da proposta nao encontrada.", "PROPOSAL_VERSION_NOT_FOUND"); } }
export class ProposalPermissionDeniedError extends ProposalError { constructor() { super("Permissao insuficiente para esta proposta.", "PROPOSAL_PERMISSION_DENIED"); } }
export class ProposalAssistedAccessBlockedError extends ProposalError { constructor() { super("Acesso assistido bloqueado para propostas.", "PROPOSAL_ASSISTED_ACCESS_BLOCKED"); } }
export class ProposalValidationError extends ProposalError { constructor() { super("Dados da proposta invalidos.", "PROPOSAL_VALIDATION_ERROR"); } }
export class ProposalOptimisticLockError extends ProposalError { constructor() { super("A proposta foi alterada por outra sessao.", "PROPOSAL_OPTIMISTIC_LOCK_CONFLICT"); } }
export class ProposalIdempotencyConflictError extends ProposalError { constructor() { super("A chave de idempotencia ja foi usada com outros dados.", "PROPOSAL_IDEMPOTENCY_CONFLICT"); } }
export class ProposalSourcePricingNotFoundError extends ProposalError { constructor() { super("Versao de precificacao nao encontrada.", "PROPOSAL_SOURCE_PRICING_NOT_FOUND"); } }
export class ProposalSourcePricingInvalidError extends ProposalError { constructor() { super("A origem de precificacao nao e valida.", "PROPOSAL_SOURCE_PRICING_INVALID"); } }
export class ProposalPersistenceError extends ProposalError { constructor() { super("Nao foi possivel persistir a proposta.", "PROPOSAL_PERSISTENCE_ERROR"); } }
export class ProposalInvalidTransitionError extends ProposalError { constructor() { super("A transicao da proposta nao e permitida.", "PROPOSAL_INVALID_TRANSITION"); } }
export class ProposalNotReadyError extends ProposalError { constructor() { super("A proposta ainda nao esta pronta.", "PROPOSAL_NOT_READY"); } }
export class ProposalOperationInProgressError extends ProposalError { constructor() { super("Ja existe uma operacao em andamento.", "PROPOSAL_OPERATION_IN_PROGRESS"); } }
export class ProposalDecisionUnavailableError extends ProposalError { constructor() { super("Esta proposta nao esta disponivel para decisao.", "PROPOSAL_DECISION_UNAVAILABLE"); } }
export class ProposalAlreadyDecidedError extends ProposalError { constructor() { super("Esta proposta ja possui uma decisao.", "PROPOSAL_ALREADY_DECIDED"); } }
export class ProposalDecisionConflictError extends ProposalError { constructor() { super("A tentativa de decisao conflita com outra tentativa.", "PROPOSAL_DECISION_CONFLICT"); } }
export class ProposalDecisionValidationError extends ProposalError { constructor() { super("Revise os dados e o consentimento informados.", "PROPOSAL_DECISION_VALIDATION_ERROR"); } }
export class ProposalDecisionPermissionError extends ProposalError { constructor() { super("Nao foi possivel registrar esta decisao.", "PROPOSAL_DECISION_PERMISSION_DENIED"); } }
export class ProposalDecisionPersistenceError extends ProposalError { constructor() { super("Nao foi possivel registrar a decisao.", "PROPOSAL_DECISION_PERSISTENCE_ERROR"); } }
