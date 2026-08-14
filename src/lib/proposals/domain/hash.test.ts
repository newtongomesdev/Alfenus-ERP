import { describe, expect, it } from "vitest";
import { canonicalizeProposal, hashProposalVersion } from "./hash";
const base = { schemaVersion: 1, pricingEngineVersion: "pricing-v1", title: "Consulta", validityDays: 15, sections: [{ id: "a", section_type: "fees", body_markdown: "R$ 100" }], items: [{ id: "b", description: "Consulta", total: 100 }], commercialSummary: { totalCents: 100 }, paymentTerms: {}, values: { total: 100 }, currency: "BRL", origin: "manual" };
describe("proposal canonical hash", () => {
  it("is deterministic and ignores operational ids/timestamps", () => { const first = hashProposalVersion(base); const second = hashProposalVersion({ ...base, sections: [{ ...base.sections[0], id: "different", created_at: "later" }] }); expect(first).toBe(second); expect(first).toMatch(/^[0-9a-f]{64}$/); });
  it("changes when commercial content changes", () => { expect(hashProposalVersion(base)).not.toBe(hashProposalVersion({ ...base, commercialSummary: { totalCents: 101 } })); });
  it.each(["title", "currency", "validityDays", "pricingEngineVersion", "schemaVersion"])("changes when %s changes", (field) => {
    const changed = { ...base, [field]: field === "schemaVersion" ? 2 : field === "validityDays" ? 30 : `${String(base[field as keyof typeof base] ?? "")}-changed` };
    expect(hashProposalVersion(base)).not.toBe(hashProposalVersion(changed));
  });
  it("sorts object keys recursively", () => { expect(canonicalizeProposal({ b: 1, a: { z: 2, y: 1 } })).toEqual({ a: { y: 1, z: 2 }, b: 1 }); });
});
