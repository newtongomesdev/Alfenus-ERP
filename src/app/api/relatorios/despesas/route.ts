import { NextRequest, NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function escapeCsv(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateFrom = searchParams.get("de") || "";
  const dateTo = searchParams.get("ate") || "";
  const filterFrom = dateFrom ? `${dateFrom}T00:00:00` : null;
  const filterTo = dateTo ? `${dateTo}T23:59:59` : null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  let expensesQuery = supabase
    .from("expenses")
    .select("id, category, amount_cents, status")
    .eq("law_firm_id", context.lawFirm.id);
  if (filterFrom) expensesQuery = expensesQuery.gte("created_at", filterFrom);
  if (filterTo) expensesQuery = expensesQuery.lte("created_at", filterTo);

  const { data: expensesData } = await expensesQuery;
  const expenseRows = (expensesData ?? []) as Array<{ id: string; category: string | null; amount_cents: number; status: string }>;

  const catMap = new Map<string, { count: number; totalCents: number }>();
  let totalPaidCents = 0;
  let totalPendingCents = 0;

  for (const e of expenseRows) {
    const cat = e.category || "Sem categoria";
    const existing = catMap.get(cat) ?? { count: 0, totalCents: 0 };
    existing.count += 1;
    existing.totalCents += e.amount_cents;
    catMap.set(cat, existing);
    if (e.status === "paga") totalPaidCents += e.amount_cents;
    else totalPendingCents += e.amount_cents;
  }

  const categories = Array.from(catMap.entries())
    .map(([category, data]) => ({ category, count: data.count, totalCents: data.totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const totalExpensesCents = totalPaidCents + totalPendingCents;

  const lines = [
    ["Métrica", "Valor"].map(escapeCsv).join(";"),
    ["Total de despesas", (totalExpensesCents / 100).toFixed(2)].map(escapeCsv).join(";"),
    ["Despesas pagas", (totalPaidCents / 100).toFixed(2)].map(escapeCsv).join(";"),
    ["Despesas pendentes", (totalPendingCents / 100).toFixed(2)].map(escapeCsv).join(";"),
    [""].map(escapeCsv).join(";"),
    ["Categoria", "Quantidade", "Total"].map(escapeCsv).join(";"),
    ...categories.map((item) => [
      item.category,
      String(item.count),
      (item.totalCents / 100).toFixed(2),
    ].map(escapeCsv).join(";")),
  ];

  const periodLabel = dateFrom || dateTo ? `-${dateFrom || "inicio"}_ate-${dateTo || "atual"}` : "";
  const csv = `\ufeff${lines.join("\r\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alfenus-despesas${periodLabel}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
