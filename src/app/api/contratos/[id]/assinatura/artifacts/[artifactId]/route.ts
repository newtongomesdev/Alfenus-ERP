import { NextResponse } from "next/server";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string; artifactId: string }> }) {
  const { id, artifactId } = await params; const context = await getAppContext();
  if (context.status !== "ready" || !context.lawFirm || !context.member) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!["proprietario", "administrador", "advogado"].includes(context.member.role)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const admin = getSupabaseAdminClient(); if (!admin) return NextResponse.json({ error: "SERVICE_UNAVAILABLE" }, { status: 503 });
  // The generated database types predate the artifact migration; keep this boundary server-only.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = await (admin as any).from("contract_signature_artifacts").select("storage_bucket,storage_path,file_name,mime_type,file_hash,file_size,status,contract_id").eq("id", artifactId).eq("contract_id", id).eq("law_firm_id", context.lawFirm.id).in("status", ["completed", "archived"]).maybeSingle();
  if (row.error || !row.data) return NextResponse.json({ error: "ARTIFACT_NOT_FOUND" }, { status: 404 });
  const download = await admin.storage.from(row.data.storage_bucket).download(row.data.storage_path); if (download.error || !download.data) return NextResponse.json({ error: "DOWNLOAD_UNAVAILABLE" }, { status: 404 });
  const buffer = Buffer.from(await download.data.arrayBuffer()); if (buffer.length !== Number(row.data.file_size)) return NextResponse.json({ error: "ARTIFACT_INTEGRITY_FAILED" }, { status: 409 });
  const filename = String(row.data.file_name).replace(/[^a-zA-Z0-9._-]/g, "_"); return new NextResponse(buffer, { headers: { "Content-Type": row.data.mime_type, "Content-Length": String(buffer.length), "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store" } });
}
