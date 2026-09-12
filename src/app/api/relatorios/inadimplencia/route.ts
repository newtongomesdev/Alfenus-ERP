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

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data: overdueData } = await supabase
    .from("installments")
    .select("id, client_id, contract_id, number, final_amount_cents, paid_amount_cents, due_date, status")
    .eq("law_firm_id", context.lawFirm.id)
    .neq("status", "cancelada")
    .order("due_date", { ascending: true })
    .range(0, 9999);

  const overdueRows = (overdueData ?? []) as Array<{ id: string; client_id: string; contract_id: string; number: number; final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }>;

  // Filter overdue: remaining > 0 and due_date < today
  let overdueFiltered = overdueRows.filter((row) => {
    const remaining = Math.max(row.final_amount_cents - row.paid_amount_cents, 0);
    return remaining > 0 && row.due_date < today;
  });

  // Apply period filter on due_date
  if (dateFrom) overdueFiltered = overdueFiltered.filter((r) => r.due_date >= dateFrom);
  if (dateTo) overdueFiltered = overdueFiltered.filter((r) => r.due_date <= dateTo);

  // Get client and contract names
  const clientIds = Array.from(new Set(overdueFiltered.map((r) => r.client_id)));
  const contractIds = Array.from(new Set(overdueFiltered.map((r) => r.contract_id)));
  const [clientsResult, contractsResult] = await Promise.all([
    clientIds.length > 0 ? supabase.from("clients").select("id, name").eq("law_firm_id", context.lawFirm.id).in("id", clientIds) : Promise.resolve({ data: [], error: null }),
    contractIds.length > 0 ? supabase.from("contracts").select("id, service_description").eq("law_firm_id", context.lawFirm.id).in("id", contractIds) : Promise.resolve({ data: [], error: null }),
  ]);

  const clientNameMap = new Map(((clientsResult.data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, c.name]));
  const contractDescMap = new Map(((contractsResult.data ?? []) as Array<{ id: string; service_description: string }>).map((c) => [c.id, c.service_description]));

  const lines = [
    ["Cliente", "Contrato", "Parcela", "Vencimento", "Valor", "Pago", "Saldo"].map(escapeCsv).join(";"),
    ...overdueFiltered.map((row) => {
      const saldo = Math.max(row.final_amount_cents - row.paid_amount_cents, 0);
      return [
        clientNameMap.get(row.client_id) ?? "Cliente",
        contractDescMap.get(row.contract_id) ?? "Contrato",
        `#${row.number}`,
        row.due_date,
        (row.final_amount_cents / 100).toFixed(2),
        (row.paid_amount_cents / 100).toFixed(2),
        (saldo / 100).toFixed(2),
      ].map(escapeCsv).join(";");
    }),
  ];

  const periodLabel = dateFrom || dateTo ? `-${dateFrom || "inicio"}_ate-${dateTo || "atual"}` : "";
  const csv = `\ufeff${lines.join("\r\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alfenus-inadimplencia${periodLabel}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
