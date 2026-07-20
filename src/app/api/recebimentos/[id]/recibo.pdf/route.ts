import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  pix_recorrente: "Pix recorrente",
  boleto: "Boleto",
  cartao: "Cartão",
  link_pagamento: "Link de pagamento",
  transferencia: "Transferência",
  deposito: "Depósito",
  dinheiro: "Dinheiro",
  cheque: "Cheque",
  outro: "Outro",
};

function currency(valueCents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valueCents / 100);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function pdfText(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
}

function linesFor(text: string, font: { widthOfTextAtSize(value: string, size: number): number }, size: number, maxWidth: number) {
  const words = pdfText(text).split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : ["-"];
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const appContext = await getAppContext();

  if (appContext.status !== "ready" || !appContext.member || !appContext.lawFirm) {
    return new Response("Não autenticado", { status: 401 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return new Response("Configuração indisponível", { status: 503 });

  const { data: installment, error } = await supabase
    .from("installments")
    .select("id, number, final_amount_cents, paid_amount_cents, paid_at, payment_method, notes, client_id, contract_id")
    .eq("law_firm_id", appContext.lawFirm.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !installment) return new Response("Recibo não encontrado", { status: 404 });

  const row = installment as {
    id: string;
    number: number;
    final_amount_cents: number;
    paid_amount_cents: number;
    paid_at: string | null;
    payment_method: string | null;
    notes: string | null;
    client_id: string;
    contract_id: string;
  };

  if (!row.paid_at || row.paid_amount_cents <= 0) {
    return new Response("O recibo em PDF fica disponível após o recebimento.", { status: 409 });
  }

  const [{ data: client }, { data: contract }] = await Promise.all([
    supabase.from("clients").select("name, document").eq("law_firm_id", appContext.lawFirm.id).eq("id", row.client_id).maybeSingle(),
    supabase.from("contracts").select("service_description").eq("law_firm_id", appContext.lawFirm.id).eq("id", row.contract_id).maybeSingle(),
  ]);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let logoImage: Awaited<ReturnType<typeof pdf.embedPng>> | Awaited<ReturnType<typeof pdf.embedJpg>> | null = null;
  if (appContext.lawFirm.logoPath) {
    const { data: logoFile } = await supabase.storage.from("branding").download(appContext.lawFirm.logoPath);
    if (logoFile) {
      const logoBytes = new Uint8Array(await logoFile.arrayBuffer());
      logoImage = appContext.lawFirm.logoPath.endsWith(".png") ? await pdf.embedPng(logoBytes) : await pdf.embedJpg(logoBytes);
    }
  }
  const dark = rgb(0.09, 0.11, 0.15);
  const muted = rgb(0.38, 0.42, 0.48);
  const accent = rgb(0.06, 0.55, 0.38);
  const border = rgb(0.84, 0.86, 0.89);
  const margin = 52;
  const contentWidth = page.getWidth() - margin * 2;
  let cursorY = page.getHeight() - 62;

  const text = (value: string, x: number, y: number, size = 10, isBold = false, color = dark) => {
    page.drawText(pdfText(value), { x, y, size, font: isBold ? bold : regular, color });
  };
  const rule = () => {
    page.drawLine({ start: { x: margin, y: cursorY }, end: { x: margin + contentWidth, y: cursorY }, thickness: 0.8, color: border });
    cursorY -= 22;
  };
  const labelValue = (label: string, value: string, x: number, width: number) => {
    text(label.toUpperCase(), x, cursorY, 8, true, muted);
    let y = cursorY - 17;
    for (const line of linesFor(value, regular, 10.5, width)) {
      text(line, x, y, 10.5);
      y -= 14;
    }
  };

  if (logoImage) {
    const scale = Math.min(1, 110 / logoImage.width, 42 / logoImage.height);
    page.drawImage(logoImage, { x: margin, y: cursorY - logoImage.height * scale + 8, width: logoImage.width * scale, height: logoImage.height * scale });
  }
  const firmTextX = logoImage ? margin + 126 : margin;
  text(appContext.lawFirm.name, firmTextX, cursorY, 16, true);
  cursorY -= 19;
  if (appContext.lawFirm.document) {
    text(`CNPJ/CPF: ${appContext.lawFirm.document}`, firmTextX, cursorY, 9, false, muted);
    cursorY -= 15;
  }
  text("RECIBO DE PAGAMENTO", margin, cursorY - 14, 20, true, dark);
  text(`RECIBO #${row.id.slice(0, 8).toUpperCase()}`, margin, cursorY - 31, 9, false, muted);
  cursorY -= 52;
  rule();

  labelValue("Recebido de", (client as { name?: string } | null)?.name ?? "Cliente", margin, contentWidth * 0.62);
  labelValue("CPF/CNPJ", (client as { document?: string | null } | null)?.document ?? "Não informado", margin + contentWidth * 0.67, contentWidth * 0.33);
  cursorY -= 44;
  rule();

  labelValue("Referente a", (contract as { service_description?: string } | null)?.service_description ?? "Honorários advocatícios", margin, contentWidth);
  cursorY -= 44;
  rule();

  page.drawRectangle({ x: margin, y: cursorY - 76, width: contentWidth, height: 76, color: rgb(0.94, 0.98, 0.96), borderColor: rgb(0.73, 0.88, 0.8), borderWidth: 0.8 });
  text("VALOR RECEBIDO", margin + 16, cursorY - 23, 8, true, muted);
  text(currency(row.paid_amount_cents), margin + 16, cursorY - 54, 23, true, accent);
  text("FORMA DE PAGAMENTO", margin + contentWidth * 0.57, cursorY - 23, 8, true, muted);
  text(PAYMENT_METHOD_LABELS[row.payment_method ?? ""] ?? row.payment_method ?? "Não informado", margin + contentWidth * 0.57, cursorY - 45, 11, true);
  cursorY -= 99;
  rule();

  labelValue("Parcela", `#${row.number} - valor original ${currency(row.final_amount_cents)}`, margin, contentWidth * 0.48);
  labelValue("Data do recebimento", dateTime(row.paid_at), margin + contentWidth * 0.55, contentWidth * 0.45);
  cursorY -= 45;
  if (row.notes) {
    rule();
    labelValue("Observações", row.notes, margin, contentWidth);
    cursorY -= 38;
  }
  rule();

  const statement = `Declaramos o recebimento de ${currency(row.paid_amount_cents)} referente ao serviço acima descrito.`;
  for (const line of linesFor(statement, regular, 10, contentWidth)) {
    text(line, margin, cursorY, 10, false, dark);
    cursorY -= 15;
  }

  text(`Documento emitido pelo Alfenus em ${dateTime(new Date().toISOString())}.`, margin, 60, 8, false, muted);
  text("Este recibo é gerado a partir do registro financeiro do escritório.", margin, 46, 8, false, muted);

  const filename = `recibo-${row.id.slice(0, 8)}.pdf`;
  const bytes = await pdf.save();
  return new Response(bytes as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
