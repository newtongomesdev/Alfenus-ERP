import { PDFParse } from "pdf-parse";

export async function extractContractPdfContent(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return { text: result.text, pageCount: result.total, metadata: {} };
  } finally {
    await parser.destroy();
  }
}
