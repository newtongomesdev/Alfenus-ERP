import { createHash } from "crypto";
export type ProposalHashInput = { schemaVersion: number; pricingEngineVersion?: string | null; title?: string | null; sections: unknown[]; items: unknown[]; commercialSummary: unknown; paymentTerms: unknown; values: unknown; currency: string; validityDays?: number | null; origin: unknown; pricingVersion?: unknown };
function canonicalize(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    if (["id", "created_at", "updated_at"].includes(key)) continue;
    result[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return result;
}
export function canonicalizeProposal(value: unknown): unknown { return canonicalize(value); }
export function hashProposalVersion(input: ProposalHashInput): string { return createHash("sha256").update(JSON.stringify(canonicalize(input))).digest("hex"); }
