import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

type PdfFirm = {
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
};

type CreatePdfInput = {
  title: string;
  content: string;
  firm: PdfFirm;
  logoBytes?: Uint8Array;
  logoPath?: string | null;
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 54;
const contentWidth = pageWidth - margin * 2;

function safePdfText(value: string) {
  return value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\t/g, "  ");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safePdfText(text).trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function isHeading(line: string) {
  const trimmed = line.trim();
  return trimmed.length > 0 && (trimmed === trimmed.toUpperCase() || /^(CLAUSULA|\d+\.|PODERES|REFERENCIA)/i.test(trimmed));
}

export async function createGeneratedDocumentPdf({ content, title, firm, logoBytes, logoPath }: CreatePdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safePdfText(title));
  pdf.setAuthor(safePdfText(firm.name));
  pdf.setCreator("Alfenus");
  pdf.setCreationDate(new Date());

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  if (logoBytes && logoPath) {
    try {
      logo = logoPath.toLowerCase().endsWith(".png") ? await pdf.embedPng(logoBytes) : await pdf.embedJpg(logoBytes);
    } catch {
      logo = null;
    }
  }

  const ink = rgb(0.08, 0.1, 0.14);
  const muted = rgb(0.36, 0.4, 0.46);
  const accent = rgb(0.06, 0.5, 0.34);
  const border = rgb(0.82, 0.84, 0.87);
  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let cursorY = 0;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    let headerX = margin;
    const headerY = pageHeight - 54;
    if (logo) {
      const scale = Math.min(1, 92 / logo.width, 34 / logo.height);
      page.drawImage(logo, { x: margin, y: headerY - logo.height * scale + 8, width: logo.width * scale, height: logo.height * scale });
      headerX += 108;
    }
    page.drawText(safePdfText(firm.name), { x: headerX, y: headerY, size: 13, font: bold, color: ink });
    const contact = [firm.document && `CPF/CNPJ: ${firm.document}`, firm.email, firm.phone].filter(Boolean).join("  |  ");
    if (contact) page.drawText(safePdfText(contact), { x: headerX, y: headerY - 14, size: 8, font: regular, color: muted });
    page.drawLine({ start: { x: margin, y: headerY - 28 }, end: { x: pageWidth - margin, y: headerY - 28 }, thickness: 0.8, color: border });
    cursorY = headerY - 58;
  };

  const ensureSpace = (height: number) => {
    if (cursorY - height < 66) addPage();
  };

  addPage();
  page.drawText(safePdfText(title.toUpperCase()), { x: margin, y: cursorY, size: 18, font: bold, color: ink });
  cursorY -= 25;
  page.drawText(`Emitido em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}`, { x: margin, y: cursorY, size: 8.5, font: regular, color: muted });
  cursorY -= 26;
  page.drawLine({ start: { x: margin, y: cursorY }, end: { x: pageWidth - margin, y: cursorY }, thickness: 1.2, color: accent });
  cursorY -= 24;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      cursorY -= 8;
      continue;
    }
    const heading = isHeading(line);
    const font = heading ? bold : regular;
    const size = heading ? 10.5 : 10.25;
    const lineHeight = heading ? 16 : 15;
    const lines = wrapText(line, font, size, contentWidth);
    ensureSpace(lines.length * lineHeight + (heading ? 5 : 0));
    for (const wrappedLine of lines) {
      page.drawText(wrappedLine, { x: margin, y: cursorY, size, font, color: heading ? ink : rgb(0.13, 0.15, 0.19) });
      cursorY -= lineHeight;
    }
    if (heading) cursorY -= 3;
  }

  pages.forEach((currentPage, index) => {
    const footerY = 38;
    currentPage.drawLine({ start: { x: margin, y: footerY + 12 }, end: { x: pageWidth - margin, y: footerY + 12 }, thickness: 0.6, color: border });
    currentPage.drawText("Documento gerado pelo Alfenus", { x: margin, y: footerY, size: 7.5, font: regular, color: muted });
    const pageNumber = `${index + 1} / ${pages.length}`;
    currentPage.drawText(pageNumber, { x: pageWidth - margin - regular.widthOfTextAtSize(pageNumber, 7.5), y: footerY, size: 7.5, font: regular, color: muted });
  });

  return pdf.save();
}
