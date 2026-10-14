import { describe, expect, it } from "vitest";
import { parseBrazilianCurrencyToCents } from "./money";

describe("Brazilian currency input", () => {
  it.each([
    ["12,50", 1250],
    ["1.234,56", 123456],
    ["1250", 125000],
    ["", 0],
  ])("parses %s to cents", (input, expected) => {
    expect(parseBrazilianCurrencyToCents(input)).toBe(expected);
  });
});
