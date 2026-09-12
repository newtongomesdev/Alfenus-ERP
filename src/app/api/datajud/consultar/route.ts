import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/auth/context";

const aliasPattern = /^[a-z0-9-]{2,24}$/;

export async function POST(request: Request) {
  const context = await getAppContext();
  if (context.status !== "ready") return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const apiKey = process.env.DATAJUD_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DATAJUD_API_KEY não configurada" }, { status: 503 });

  const body = await request.json().catch(() => null) as { tribunal?: string; numeroProcesso?: string } | null;
  const tribunal = String(body?.tribunal ?? "").trim().toLowerCase();
  const numeroProcesso = String(body?.numeroProcesso ?? "").replace(/[^0-9]/g, "");
  if (!aliasPattern.test(tribunal) || numeroProcesso.length < 15) return NextResponse.json({ error: "Informe tribunal e número de processo válidos" }, { status: 422 });

  const response = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`, {
    method: "POST",
    headers: { Authorization: `APIKey ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { match: { numeroProcesso } }, size: 10 }),
    cache: "no-store",
  });
  if (!response.ok) {
    console.error("[datajud] consulta falhou", { status: response.status, tribunal });
    return NextResponse.json({ error: "O DataJud não respondeu à consulta" }, { status: 502 });
  }
  const payload = await response.json() as { hits?: { hits?: Array<{ _source?: Record<string, unknown> }> } };
  const results = (payload.hits?.hits ?? []).map((item) => item._source ?? {});
  return NextResponse.json({ results });
}
