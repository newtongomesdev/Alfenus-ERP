import { describe, expect, it, vi } from "vitest";
import { persistCalculatedVersionIdempotent } from "../persistence";

describe("pricing/persistence persistCalculatedVersionIdempotent", () => {
  it("mapeia p_items para o formato persistido pela RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        idempotent: false,
        version_id: "version-1",
      },
      error: null,
    });

    const result = await persistCalculatedVersionIdempotent(
      { rpc } as never,
      {
        scenarioId: "scenario-1",
        scenarioType: "main",
        parameters: { feeType: "fixed" },
        calculationResult: { totalAmountCents: 3000 } as never,
        calculationMemory: {},
        items: [
          {
            serviceName: "Servico A",
            quantityCents: 2,
            unitPriceCents: 1500,
            notes: "Observacao",
          },
        ],
        activate: false,
      },
      {
        idempotencyKey: "create_version:123:abc",
        inputHash: "hash-1",
      },
    );

    expect(result).toEqual({
      success: true,
      idempotent: false,
      versionId: "version-1",
    });

    expect(rpc).toHaveBeenCalledWith(
      "create_pricing_scenario_version_idempotent",
      expect.objectContaining({
        p_items: [
          {
            item_type: "fee",
            description: "Servico A",
            quantity: 2,
            unit_amount_cents: 1500,
            total_amount_cents: 3000,
            order_index: 0,
            metadata: { notes: "Observacao" },
          },
        ],
      }),
    );
  });

  it("retorna completed idempotente quando a RPC sinaliza idempotent=true", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: true,
        idempotent: true,
        version_id: "version-previous",
      },
      error: null,
    });

    const result = await persistCalculatedVersionIdempotent(
      { rpc } as never,
      {
        scenarioId: "scenario-1",
        scenarioType: "main",
        parameters: {},
        calculationResult: {} as never,
        calculationMemory: {},
        items: [],
        activate: false,
      },
      {
        idempotencyKey: "create_version:123:abc",
        inputHash: "hash-1",
      },
    );

    expect(result).toEqual({
      success: true,
      idempotent: true,
      versionId: "version-previous",
    });
  });

  it("propaga erro processing retornado pela RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        ok: false,
        error: "operation_in_progress",
      },
      error: null,
    });

    await expect(
      persistCalculatedVersionIdempotent(
        { rpc } as never,
        {
          scenarioId: "scenario-1",
          scenarioType: "main",
          parameters: {},
          calculationResult: {} as never,
          calculationMemory: {},
          items: [],
          activate: false,
        },
        {
          idempotencyKey: "create_version:123:abc",
          inputHash: "hash-1",
        },
      ),
    ).rejects.toThrow("RPC retornou erro: operation_in_progress");
  });
});
