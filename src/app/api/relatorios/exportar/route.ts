import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getModuleOverview } from "@/lib/modules/queries";

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const overview = await getModuleOverview(context.lawFirm.id, "relatorios", context.member.id);
  const lines = [
    ["Indicador", "Valor", "Detalhe"].map(escapeCsv).join(";"),
    ...overview.metrics.map((metric) => [metric.label, String(metric.value), metric.detail].map(escapeCsv).join(";")),
  ];
  const csv = `\ufeff${lines.join("\r\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alfenus-relatorio.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
