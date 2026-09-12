import { NextResponse } from "next/server";
import { processSignatureWebhook } from "@/lib/contracts/signatures/delivery/webhook";

export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params; const body = await request.text();
  const result = await processSignatureWebhook(provider, body, request.headers);
  return NextResponse.json(result.ok ? { ok: true, duplicate: result.duplicate } : { ok: false, error: result.error }, { status: result.status });
}
