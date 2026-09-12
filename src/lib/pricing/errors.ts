// ============================================================
// ERROS — Pricing Engine
// Tipos de erro tipados para o calculador de precificação
// ============================================================

// ── Códigos de erro ─────────────────────────────────────────
export const PricingErrorCode = {
  INVALID_MONEY_VALUE: "pricing.invalid_money_value",
  INVALID_PERCENTAGE: "pricing.invalid_percentage",
  INVALID_HOURS: "pricing.invalid_hours",
  INVALID_DISCOUNT: "pricing.invalid_discount",
  INVALID_ENTRY_AMOUNT: "pricing.invalid_entry_amount",
  INVALID_INSTALLMENT_COUNT: "pricing.invalid_installment_count",
  INVALID_INSTALLMENT_DATE: "pricing.invalid_installment_date",
  INVALID_RECURRING_FEE: "pricing.invalid_recurring_fee",
  INVALID_SUCCESS_FEE: "pricing.invalid_success_fee",
  NEGATIVE_RESULT: "pricing.negative_result",
  UNSAFE_INTEGER: "pricing.unsafe_integer",
  INVALID_SCENARIO: "pricing.invalid_scenario",
} as const;

export type PricingErrorCode =
  (typeof PricingErrorCode)[keyof typeof PricingErrorCode];

// ── Base error ──────────────────────────────────────────────
export class PricingEngineError extends Error {
  public readonly code: PricingErrorCode;
  public readonly field?: string;
  public readonly safeMessage: string;
  public readonly metadata?: Record<string, unknown>;

  constructor(params: {
    message: string;
    safeMessage: string;
    code: PricingErrorCode;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = "PricingEngineError";
    this.code = params.code;
    this.safeMessage = params.safeMessage;
    this.field = params.field;
    this.metadata = params.metadata;
  }
}

// ── Erros específicos ───────────────────────────────────────

export class InvalidMoneyValueError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_MONEY_VALUE;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_MONEY_VALUE });
    this.name = "InvalidMoneyValueError";
  }
}

export class InvalidPercentageError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_PERCENTAGE;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_PERCENTAGE });
    this.name = "InvalidPercentageError";
  }
}

export class InvalidHoursError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_HOURS;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_HOURS });
    this.name = "InvalidHoursError";
  }
}

export class InvalidDiscountError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_DISCOUNT;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_DISCOUNT });
    this.name = "InvalidDiscountError";
  }
}

export class InvalidEntryAmountError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_ENTRY_AMOUNT;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_ENTRY_AMOUNT });
    this.name = "InvalidEntryAmountError";
  }
}

export class InvalidInstallmentCountError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_INSTALLMENT_COUNT;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_INSTALLMENT_COUNT });
    this.name = "InvalidInstallmentCountError";
  }
}

export class InvalidInstallmentDateError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_INSTALLMENT_DATE;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_INSTALLMENT_DATE });
    this.name = "InvalidInstallmentDateError";
  }
}

export class InvalidRecurringFeeError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_RECURRING_FEE;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_RECURRING_FEE });
    this.name = "InvalidRecurringFeeError";
  }
}

export class InvalidSuccessFeeError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_SUCCESS_FEE;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_SUCCESS_FEE });
    this.name = "InvalidSuccessFeeError";
  }
}

export class NegativeResultError extends PricingEngineError {
  static readonly code = PricingErrorCode.NEGATIVE_RESULT;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.NEGATIVE_RESULT });
    this.name = "NegativeResultError";
  }
}

export class UnsafeIntegerError extends PricingEngineError {
  static readonly code = PricingErrorCode.UNSAFE_INTEGER;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.UNSAFE_INTEGER });
    this.name = "UnsafeIntegerError";
  }
}

export class InvalidScenarioError extends PricingEngineError {
  static readonly code = PricingErrorCode.INVALID_SCENARIO;

  constructor(params: {
    message: string;
    safeMessage: string;
    field?: string;
    metadata?: Record<string, unknown>;
  }) {
    super({ ...params, code: PricingErrorCode.INVALID_SCENARIO });
    this.name = "InvalidScenarioError";
  }
}