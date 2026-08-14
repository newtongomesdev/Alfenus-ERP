import { describe, expect, it } from "vitest";
import {
  buildContractDocumentContentHash,
  buildContractDocumentFileName,
  renderContractDocumentHtml,
  sanitizeContractDocumentModel,
  validateContractDocumentReadiness,
  type ContractDocumentModel,
} from "./model";

const model: ContractDocumentModel = {
  contractId: "12345678-aaaa-bbbb-cccc-123456789012",
  contractVersionId: "87654321-aaaa-bbbb-cccc-123456789012",
  versionNumber: 2,
  contractContentHash: "a".repeat(64),
  title: "Contrato de consultoria <teste>", firmName: "Alfenus", firmDocument: null, firmEmail: null, firmPhone: null,
  parties: { contractor: { name: "Escritório" }, client: { name: "Cliente" } },
  clauses: [{ title: "Objeto", content: "Conteúdo da cláusula", type: "service", order: 0 }],
  terms: { totalCents: 10000, internalNotes: "não imprimir", pricingSnapshot: { margin: 5 } },
  generatedAt: "2026-07-31T12:00:00.000Z", locale: "pt-BR", timezone: "America/Sao_Paulo",
};

describe("contract document model", () => {
  it("sanitizes internal commercial fields and escapes rendered HTML", () => {
    const safe = sanitizeContractDocumentModel(model);
    expect(JSON.stringify(safe)).not.toMatch(/internalNotes|pricingSnapshot|margin/);
    expect(renderContractDocumentHtml(model)).toContain("Contrato de consultoria &lt;teste&gt;");
    expect(renderContractDocumentHtml(model)).not.toContain("não imprimir");
  });

  it("creates deterministic content hashes and safe filenames", () => {
    expect(buildContractDocumentContentHash(model)).toHaveLength(64);
    expect(buildContractDocumentContentHash(model)).toBe(buildContractDocumentContentHash(model));
    expect(buildContractDocumentFileName(model)).toBe("contrato-12345678-v2.pdf");
  });

  it("blocks only versions with blocking readiness issues", () => {
    expect(() => validateContractDocumentReadiness([])).not.toThrow();
    expect(() => validateContractDocumentReadiness([{ blocking: false }])).not.toThrow();
    expect(() => validateContractDocumentReadiness([{ blocking: true }])).toThrow("CONTRACT_DOCUMENT_NOT_READY");
  });
});
