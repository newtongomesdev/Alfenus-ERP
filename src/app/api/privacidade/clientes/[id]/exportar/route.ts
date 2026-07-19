import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type Query = { select(columns: string): Query; eq(column: string, value: string): Query; order(column: string, options: { ascending: boolean }): Query; maybeSingle(): Promise<{ data: unknown; error: Error | null }>; then<TResult1 = { data: unknown[] | null; error: Error | null }, TResult2 = never>(onfulfilled?: ((value: { data: unknown[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null, onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null): PromiseLike<TResult1 | TResult2> };
type ExportClient = { from(table: string): Query };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  if (!can(context.member.role, "clientes.visualizar")) return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  const { id } = await params; const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Ambiente indisponível" }, { status: 503 });
  const client = supabase as unknown as ExportClient;
  const { data: subject, error } = await client.from("clients").select("id, name, person_type, document, birth_date, profession, marital_status, whatsapp, phone, email, address, source, interest_area, status, notes, tags, created_at, updated_at, archived_at").eq("law_firm_id", context.lawFirm.id).eq("id", id).maybeSingle();
  if (error || !subject) return NextResponse.json({ error: "Titular não encontrado" }, { status: 404 });
  const related = await Promise.all([
    client.from("legal_cases").select("id, title, case_number, action_type, status, created_at").eq("law_firm_id", context.lawFirm.id).eq("client_id", id).order("created_at", { ascending: false }),
    client.from("contracts").select("id, service_description, total_amount_cents, balance_cents, status, created_at").eq("law_firm_id", context.lawFirm.id).eq("client_id", id).order("created_at", { ascending: false }),
    client.from("documents").select("id, name, mime_type, size_bytes, entity_type, entity_id, created_at").eq("law_firm_id", context.lawFirm.id).eq("entity_id", id).order("created_at", { ascending: false }),
  ]);
  const payload = {
    exportedAt: new Date().toISOString(),
    policy: "Exportação de dados para atendimento de direito do titular; documentos binários não são incluídos.",
    subject,
    legalCases: related[0].data ?? [],
    contracts: related[1].data ?? [],
    documents: related[2].data ?? [],
  };
  return new NextResponse(JSON.stringify(payload, null, 2), { status: 200, headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="alfenus-dados-${id}.json"` } });
}
