import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateInputHash } from "../idempotency";
import {
  PRICING_CALCULATION_ENGINE_VERSION,
  PRICING_SCHEMA_VERSION,
} from "../calculation-types";

vi.mock("@/lib/auth/context", () => ({
  getAppContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServerClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../service", () => ({
  calculateAndCreateVersion: vi.fn(),
  recalculatePricingScenario: vi.fn(),
  activatePricingVersion: vi.fn(),
  duplicatePricingScenario: vi.fn(),
  archivePricingScenario: vi.fn(),
  restorePricingScenario: vi.fn(),
  updatePricingScenarioMetadata: vi.fn(),
  comparePricingVersionsService: vi.fn(),
}));

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { calculateAndCreateVersion } from "../service";
import { calculateAndCreatePricingVersionAction } from "../actions";

describe("pricing/actions calculateAndCreatePricingVersionAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getAppContext).mockResolvedValue({
      status: "ready",
      lawFirm: { id: "law-firm-1" },
      member: { id: "member-1", role: "proprietario" },
    } as never);

    vi.mocked(getSupabaseServerClient).mockResolvedValue({} as never);

    vi.mocked(calculateAndCreateVersion).mockResolvedValue({
      versionId: "version-1",
      versionNumber: 1,
      isDuplicate: false,
      isIdempotent: false,
      activated: true,
    });
  });

  it("rejeita requisição sem idempotency_key", async () => {
    const result = await calculateAndCreatePricingVersionAction({
      scenario_id: "scenario-1",
      scenario_type: "main",
      fee_type: "fixed",
      fee_value_cents: 100000,
      currency: "BRL",
      payment_method: "single",
      installments: 1,
    });

    expect(result).toEqual({
      ok: false,
      error: "Chave de idempotência (idempotency_key) é obrigatória.",
    });
    expect(calculateAndCreateVersion).not.toHaveBeenCalled();
  });

  it("gera inputHash com scenarioType, engineVersion e schemaVersion", async () => {
    const result = await calculateAndCreatePricingVersionAction({
      scenario_id: "scenario-1",
      scenario_type: "custom",
      fee_type: "fixed",
      fee_value_cents: 100000,
      currency: "BRL",
      payment_method: "single",
      installments: 2,
      success_fee_rate_bps: 250,
      recurring_months: 6,
      billing_frequency: "monthly",
      idempotency_key: "create_version:123:abc",
      expected_updated_at: "2026-01-01T00:00:00.000Z",
    });

    expect(result.ok).toBe(true);

    const expectedHash = generateInputHash({
      scenarioType: "custom",
      feeType: "fixed",
      feeValueCents: 100000,
      currency: "BRL",
      paymentMethod: "single",
      installments: 2,
      successFeeRateBps: 250,
      recurringMonths: 6,
      billingFrequency: "monthly",
      engineVersion: PRICING_CALCULATION_ENGINE_VERSION,
      schemaVersion: PRICING_SCHEMA_VERSION,
    });

    expect(calculateAndCreateVersion).toHaveBeenCalledWith(
      {},
      "law-firm-1",
      "member-1",
      expect.objectContaining({
        scenarioId: "scenario-1",
        scenarioType: "custom",
        idempotencyKey: "create_version:123:abc",
        inputHash: expectedHash,
        expectedUpdatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
  });
});
