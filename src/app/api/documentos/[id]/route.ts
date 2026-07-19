import { NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.lawFirm) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;
  const supabase = await getSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Ambiente indisponível" }, { status: 503 });
  const { data: document, error } = await supabase.from("documents").select("storage_path").eq("law_firm_id", context.lawFirm.id).eq("id", id).maybeSingle();
  if (error || !document) return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
  const { data: signed, error: signedError } = await supabase.storage.from("documents").createSignedUrl((document as { storage_path: string }).storage_path, 300);
  if (signedError || !signed?.signedUrl) return NextResponse.json({ error: "Não foi possível abrir o documento" }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
