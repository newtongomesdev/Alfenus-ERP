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

  const { data: allClients } = await supabase
    .from("clients")
    .select("id, name")
    .eq("law_firm_id", context.lawFirm.id)
    .is("archived_at", null)
    .order("name", { ascending: true })
    .range(0, 9999);

  const allClientRows = (allClients ?? []) as Array<{ id: string; name: string }>;
  const summaries: Array<{ clientName: string; totalContracts: number; totalPaidCents: number; totalPendingCents: number; overdueAmountCents: number }> = [];

  for (const client of allClientRows) {
    const { data: clientContracts } = await supabase
      .from("contracts")
      .select("id, total_amount_cents, created_at")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("client_id", client.id);

    const contractRows = (clientContracts ?? []) as Array<{ id: string; total_amount_cents: number; created_at: string }>;
    if (contractRows.length === 0) continue;

    // Apply period filter on contracts
    let filteredContracts = contractRows;
    if (dateFrom) filteredContracts = filteredContracts.filter((c) => c.created_at >= `${dateFrom}T00:00:00`);
    if (dateTo) filteredContracts = filteredContracts.filter((c) => c.created_at <= `${dateTo}T23:59:59`);
    if (filteredContracts.length === 0) continue;

    const contractIdsForClient = filteredContracts.map((c) => c.id);
    const { data: clientInstallments } = await supabase
      .from("installments")
      .select("final_amount_cents, paid_amount_cents, due_date, status")
      .eq("law_firm_id", context.lawFirm.id)
      .in("contract_id", contractIdsForClient)
      .neq("status", "cancelada");

    const instRows = (clientInstallments ?? []) as Array<{ final_amount_cents: number; paid_amount_cents: number; due_date: string; status: string }>;
    let totalPaid = 0;
    let totalPending = 0;
    let overdueAmount = 0;

    for (const inst of instRows) {
      totalPaid += inst.paid_amount_cents;
      const remaining = Math.max(inst.final_amount_cents - inst.paid_amount_cents, 0);
      totalPending += remaining;
      if (remaining > 0 && inst.due_date < today) {
        overdueAmount += remaining;
      }
    }

    if (totalPaid > 0 || totalPending > 0) {
      summaries.push({
        clientName: client.name,
        totalContracts: filteredContracts.length,
        totalPaidCents: totalPaid,
        totalPendingCents: totalPending,
        overdueAmountCents: overdueAmount,
      });
    }
  }

  const lines = [
    ["Cliente", "Contratos", "Pago", "Pendente", "Vencido"].map(escapeCsv).join(";"),
    ...summaries.map((item) => [
      item.clientName,
      String(item.totalContracts),
      (item.totalPaidCents / 100).toFixed(2),
      (item.totalPendingCents / 100).toFixed(2),
      (item.overdueAmountCents / 100).toFixed(2),
    ].map(escapeCsv).join(";")),
  ];

  const periodLabel = dateFrom || dateTo ? `-${dateFrom || "inicio"}_ate-${dateTo || "atual"}` : "";
  const csv = `\ufeff${lines.join("\r\n")}`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alfenus-clientes${periodLabel}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
