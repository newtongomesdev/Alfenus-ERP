import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { createGeneratedDocumentPdf } from "./document-pdf";

describe("generated document PDF", () => {
  it("creates a paginated PDF with the firm header and document content", async () => {
    const bytes = await createGeneratedDocumentPdf({
      title: "Contrato de Honorarios",
      content: "CONTRATO DE PRESTACAO DE SERVICOS\n\nCLAUSULA 1 - OBJETO\n".concat("Texto juridico de teste. ".repeat(800)),
      firm: { name: "Alfenus Advocacia", document: "00.000.000/0001-00", email: "contato@alfenus.com", phone: "(11) 99999-9999" },
    });

    const document = await PDFDocument.load(bytes);
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    expect(document.getPageCount()).toBeGreaterThan(1);
  });
});
