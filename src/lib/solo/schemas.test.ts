import { describe, expect, it } from "vitest";
import { soloCaseDraftSchema, soloCaseInputSchema } from "./schemas";

describe("Solo case schemas", () => {
  it("allows an incomplete draft while keeping full case validation strict", () => {
    expect(soloCaseDraftSchema.safeParse({ clientName: "" }).success).toBe(true);
    expect(soloCaseInputSchema.safeParse({ clientName: "" }).success).toBe(false);
  });
});
