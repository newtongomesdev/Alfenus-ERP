import { PDFDocument } from "pdf-lib";
import { createGeneratedDocumentPdf } from "@/lib/documents/document-pdf";
import { buildContractDocumentContentHash, renderContractDocumentHtml, sanitizeContractDocumentModel, type ContractDocumentModel } from "./model";

export async function generateContractPdf(model: ContractDocumentModel, logoBytes?: Uint8Array) {
  const safe = sanitizeContractDocumentModel(model);
  const html = renderContractDocumentHtml(safe);
  const text = html.replace(/<style[\s\S]*?<\/style>|<[^>]+>/g, "").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"');
  const bytes = await createGeneratedDocumentPdf({ title: safe.title, content: text, firm: { name: safe.firmName, document: safe.firmDocument, email: safe.firmEmail, phone: safe.firmPhone }, logoBytes, logoPath: logoBytes ? "logo.png" : null });
  const pdf = await PDFDocument.load(bytes);
  return { bytes, pageCount: pdf.getPageCount(), fileHash: buildContractDocumentContentHash({ ...safe, contractContentHash: buildContractDocumentContentHash(safe) }) };
}
