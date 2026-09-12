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
    .replace(/═/g, "—")
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

function isMajorSectionHeader(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return /^(CLÁUSULA|CLAUSULA|\d+\.\s|PODERES|DOS FATOS|DO DIREITO|DA PROVIDÊNCIA|DAS CONSEQUÊNCIAS|DA QUITAÇÃO|RESSALVAS|I\s*—|II\s*—|III\s*—|IV\s*—|V\s*—)/i.test(trimmed);
}

function isHeading(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (isMajorSectionHeader(trimmed)) return true;
  return (
    trimmed.length < 80 &&
    (trimmed === trimmed.toUpperCase() ||
      /^(OUTORGANTE|OUTORGADO|CONTRATANTE|CONTRATADO|NOTIFICANTE|NOTIFICADO|CLIENTE|ADVOGADO|SUBSTABELECENTE|SUBSTABELECIDO|PRIMEIRO|SEGUNDO|EXCELENTÍSSIMO)/i.test(trimmed))
  );
}

function isSignatureLine(line: string) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("____") ||
    /^(OUTORGANTE|OUTORGADO|CONTRATANTE|CONTRATADO|DECLARANTE|NOTIFICANTE|RECEBEDOR|ADVOGADO|SUBSTABELECENTE|TRANSAVENTE)/i.test(trimmed)
  );
}

export async function createGeneratedDocumentPdf({ content, title, firm, logoBytes, logoPath }: CreatePdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(safePdfText(title));
  pdf.setAuthor(safePdfText(firm.name));
  pdf.setCreator("Alfenus ERP Jurídico");
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

  // Visual Theme Colors
  const primaryNavy = rgb(0.07, 0.15, 0.28);
  const bodyInk = rgb(0.12, 0.14, 0.18);
  const mutedText = rgb(0.42, 0.46, 0.52);
  const accentEmerald = rgb(0.04, 0.52, 0.38);
  const lightBorder = rgb(0.85, 0.87, 0.9);
  const sectionBg = rgb(0.96, 0.97, 0.98);

  const pages: PDFPage[] = [];
  let page!: PDFPage;
  let cursorY = 0;

  const addPage = () => {
    page = pdf.addPage([pageWidth, pageHeight]);
    pages.push(page);
    let headerX = margin;
    const headerY = pageHeight - 50;

    if (logo) {
      const scale = Math.min(1, 95 / logo.width, 36 / logo.height);
      page.drawImage(logo, {
        x: margin,
        y: headerY - logo.height * scale + 10,
        width: logo.width * scale,
        height: logo.height * scale,
      });
      headerX += 110;
    }

    page.drawText(safePdfText(firm.name), { x: headerX, y: headerY, size: 12.5, font: bold, color: primaryNavy });
    const contact = [firm.document && `CNPJ/CPF: ${firm.document}`, firm.email, firm.phone].filter(Boolean).join("  •  ");
    if (contact) {
      page.drawText(safePdfText(contact), { x: headerX, y: headerY - 14, size: 8, font: regular, color: mutedText });
    }

    // Top decorative bar
    page.drawLine({
      start: { x: margin, y: headerY - 26 },
      end: { x: pageWidth - margin, y: headerY - 26 },
      thickness: 1,
      color: lightBorder,
    });

    cursorY = headerY - 54;
  };

  const ensureSpace = (height: number) => {
    if (cursorY - height < 64) addPage();
  };

  addPage();

  // Document Title Header Banner
  page.drawRectangle({
    x: margin,
    y: cursorY - 32,
    width: contentWidth,
    height: 40,
    color: sectionBg,
    borderColor: lightBorder,
    borderWidth: 0.8,
  });

  page.drawRectangle({
    x: margin,
    y: cursorY - 32,
    width: 4,
    height: 40,
    color: accentEmerald,
  });

  const formattedTitle = safePdfText(title.toUpperCase());
  const titleFontSize = formattedTitle.length > 50 ? 13 : 15;
  page.drawText(formattedTitle, {
    x: margin + 14,
    y: cursorY - 14,
    size: titleFontSize,
    font: bold,
    color: primaryNavy,
  });

  const dateStr = `Documento emitido em ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}`;
  page.drawText(dateStr, {
    x: margin + 14,
    y: cursorY - 26,
    size: 7.5,
    font: regular,
    color: mutedText,
  });

  cursorY -= 54;

  const rawLines = content.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const line = rawLine.trim();

    if (!line) {
      cursorY -= 7;
      continue;
    }

    // Divider detection (lines with ===== or ----)
    if (/^[=—\-_]{4,}$/.test(line)) {
      ensureSpace(16);
      page.drawLine({
        start: { x: margin, y: cursorY },
        end: { x: pageWidth - margin, y: cursorY },
        thickness: 0.8,
        color: lightBorder,
      });
      cursorY -= 14;
      continue;
    }

    const majorHeader = isMajorSectionHeader(line);
    const heading = isHeading(line);
    const sigLine = isSignatureLine(line);

    if (majorHeader) {
      ensureSpace(28);
      // Accent bar for section header
      page.drawRectangle({
        x: margin,
        y: cursorY - 14,
        width: contentWidth,
        height: 18,
        color: rgb(0.97, 0.98, 0.99),
      });
      page.drawRectangle({
        x: margin,
        y: cursorY - 14,
        width: 3,
        height: 18,
        color: primaryNavy,
      });
      page.drawText(safePdfText(line), {
        x: margin + 8,
        y: cursorY - 10,
        size: 10,
        font: bold,
        color: primaryNavy,
      });
      cursorY -= 26;
      continue;
    }

    const font = heading || sigLine ? bold : regular;
    const size = heading ? 10.5 : sigLine ? 9.5 : 10;
    const lineHeight = heading ? 15 : 14.5;
    const lines = wrapText(line, font, size, contentWidth);

    ensureSpace(lines.length * lineHeight + (heading ? 4 : 0));

    for (const wrappedLine of lines) {
      page.drawText(wrappedLine, {
        x: margin,
        y: cursorY,
        size,
        font,
        color: heading ? primaryNavy : sigLine ? primaryNavy : bodyInk,
      });
      cursorY -= lineHeight;
    }

    if (heading) cursorY -= 2;
  }

  // Footer on all pages
  const totalPages = pages.length;
  pages.forEach((currentPage, index) => {
    const footerY = 36;
    currentPage.drawLine({
      start: { x: margin, y: footerY + 12 },
      end: { x: pageWidth - margin, y: footerY + 12 },
      thickness: 0.6,
      color: lightBorder,
    });

    currentPage.drawText("Documento Gerado via Alfenus ERP Jurídico", {
      x: margin,
      y: footerY,
      size: 7.5,
      font: regular,
      color: mutedText,
    });

    const pageInfo = `Página ${index + 1} de ${totalPages}`;
    currentPage.drawText(pageInfo, {
      x: pageWidth - margin - regular.widthOfTextAtSize(pageInfo, 7.5),
      y: footerY,
      size: 7.5,
      font: regular,
      color: mutedText,
    });
  });

  return pdf.save();
}

