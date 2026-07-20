import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { embedWithOpenRouter, generateWithOpenRouter, getAiSettings } from "@/lib/ai/openrouter";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const settings = await getAiSettings();
  if (!settings.enabled) return NextResponse.json({ error: "A IA está desativada pelo administrador" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { question?: string };
  const question = String(body.question ?? "Faça um resumo objetivo do processo, dos fatos relevantes, dos riscos e dos próximos passos.").slice(0, 2000);
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Supabase indisponível" }, { status: 503 });
  const { data: legalCase, error } = await supabase.from("legal_cases").select("id, title, case_number, action_type, status, court, district, state, strategic_notes").eq("id", id).eq("law_firm_id", context.lawFirm.id).maybeSingle();
  if (error || !legalCase) return NextResponse.json({ error: "Processo não encontrado" }, { status: 404 });
  const { data: movements } = await supabase.from("legal_case_movements").select("title, description, occurred_at").eq("legal_case_id", id).eq("law_firm_id", context.lawFirm.id).order("occurred_at", { ascending: false }).limit(30);
  const source = JSON.stringify({ processo: legalCase, movimentacoes: movements ?? [] });
  const embedding = await embedWithOpenRouter(`${question}\n${source}`, settings.embedding_model);
  if (embedding.length === 1536) await (supabase as any).from("ai_document_chunks").insert({ law_firm_id: context.lawFirm.id, legal_case_id: id, content: source, embedding: `[${embedding.join(",")}]`, metadata: { type: "case_context" } });
  const { data: matches } = embedding.length === 1536 ? await (supabase as any).rpc("match_ai_document_chunks", { query_law_firm_id: context.lawFirm.id, query_embedding: `[${embedding.join(",")}]`, match_count: 6 }) : { data: [] };
  const retrievedContext = (matches ?? []).map((item: { content: string }) => item.content).join("\n\n") || source;
  const result = await generateWithOpenRouter({ model: settings.active_model, system: "Você é um assistente jurídico do Alfenus. Produza apenas rascunhos para revisão humana e preserve confidencialidade.", prompt: `Pergunta: ${question}\n\nTrechos recuperados da base autorizada do processo:\n${retrievedContext}\n\nResponda em português. Não invente fatos. Quando faltar informação, diga explicitamente.`, lawFirmId: context.lawFirm.id, actorId: context.member.id, operation: "case_summary" });
  return NextResponse.json({ answer: result.content });
}
