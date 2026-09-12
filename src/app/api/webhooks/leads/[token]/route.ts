import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapLeadCapturePayload } from "@/lib/crm/lead-capture";
import { runLeadAutomations } from "@/lib/crm/automation";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const admin = getSupabaseAdminClient() as any;
  if (!admin) return NextResponse.json({ error: "Integração indisponível" }, { status: 503 });

  const { token } = await params;
  const { data: source, error: sourceError } = await admin.from("crm_capture_sources").select("id, law_firm_id, name, secret, default_funnel_stage, field_map").eq("path_token", token).eq("is_active", true).maybeSingle();
  if (sourceError || !source) return NextResponse.json({ error: "Fonte não encontrada" }, { status: 404 });

  if (source.secret) {
    const provided = request.headers.get("x-alfenus-signature") ?? request.headers.get("x-webhook-secret");
    if (provided !== source.secret) return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await request.json() : Object.fromEntries((await request.formData()).entries());
  const lead = mapLeadCapturePayload(payload as Record<string, unknown>, (source.field_map ?? {}) as Record<string, unknown>);
  if (lead.name.length < 2) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 422 });

  let query = admin.from("leads").select("id, name").eq("law_firm_id", source.law_firm_id);
  if (lead.externalId) query = query.eq("external_id", lead.externalId);
  const { data: existing } = lead.externalId ? await query.maybeSingle() : { data: null };
  if (existing) return NextResponse.json({ ok: true, id: existing.id, duplicate: true });

  const { data: created, error } = await admin.from("leads").insert({ law_firm_id: source.law_firm_id, name: lead.name, email: lead.email, phone: lead.phone, whatsapp: lead.whatsapp, source: lead.source ?? source.name, interest: lead.interest, notes: lead.notes, estimated_value_cents: lead.estimatedValueCents, funnel_stage: source.default_funnel_stage, status: "novo", external_id: lead.externalId, source_metadata: lead.sourceMetadata }).select("id, name").single();
  if (error) return NextResponse.json({ error: "Não foi possível criar o lead" }, { status: 500 });

  await Promise.all([
    admin.from("crm_capture_sources").update({ last_received_at: new Date().toISOString() }).eq("id", source.id),
    admin.from("audit_logs").insert({ law_firm_id: source.law_firm_id, action: "capturou_lead_externo", entity_type: "lead", entity_id: created.id, metadata: { source_id: source.id, source_name: source.name } }),
    admin.from("activity_events").insert({ law_firm_id: source.law_firm_id, actor_id: null, actor_name: "Integração externa", event_type: "created", entity_type: "lead", entity_id: created.id, entity_title: created.name, description: "Lead recebido por fonte externa", metadata: { source_id: source.id } }),
  ]);
  await runLeadAutomations(admin, { lawFirmId: source.law_firm_id, leadId: created.id, triggerEvent: "lead.created", lead: { ...lead, id: created.id, funnel_stage: source.default_funnel_stage } });

  return NextResponse.json({ ok: true, id: created.id, duplicate: false }, { status: 201 });
}
