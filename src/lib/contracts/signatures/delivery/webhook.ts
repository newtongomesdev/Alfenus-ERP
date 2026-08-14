import { createHash } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSignatureProviderAdapter } from "./registry";
import { applyNormalizedSignatureEvent } from "./service";
import type { Db } from "../repository";

const safe = (error: unknown) => String((error as { code?: string })?.code ?? "SIGNATURE_WEBHOOK_REJECTED").replace(/[^A-Z0-9_.:-]/gi, "_").slice(0, 120);
export async function processSignatureWebhook(provider: string, rawBody: string, headers: Headers) {
  const admin = getSupabaseAdminClient(); if (!admin) return { ok: false as const, status: 503, error: "WEBHOOK_UNAVAILABLE" }; const db = admin as unknown as Db;
  if (provider !== "internal_sandbox") return { ok: false as const, status: 404, error: "WEBHOOK_PROVIDER_UNKNOWN" };
  const adapter = getSignatureProviderAdapter(provider); const payloadHash = createHash("sha256").update(rawBody, "utf8").digest("hex");
  let validated;
  try { validated = await adapter.validateWebhook({ rawBody, headers }); } catch (error) { return { ok: false as const, status: 400, error: safe(error) }; }
  const existing = await db.from("contract_signature_webhook_receipts").select("id,payload_hash,processing_status").eq("provider", provider).eq("provider_event_id", validated.providerEventId).maybeSingle();
  if (existing.data) { if (existing.data.payload_hash !== payloadHash) return { ok: false as const, status: 409, error: "WEBHOOK_EVENT_CONFLICT" }; return { ok: true as const, status: 200, duplicate: true }; }
  const receipt = await db.from("contract_signature_webhook_receipts").insert({ provider, provider_event_id: validated.providerEventId, provider_envelope_id: validated.providerEnvelopeId, payload_hash: payloadHash, signature_valid: true, normalized_event_type: validated.eventType, processing_status: "received" }).select("id").single();
  if (receipt.error) return { ok: false as const, status: 409, error: "WEBHOOK_RECEIPT_CONFLICT" };
  try { const normalized = await adapter.normalizeWebhook(validated); const delivery = await db.from("contract_signature_provider_deliveries").select("law_firm_id,envelope_id").eq("provider", provider).eq("provider_envelope_id", validated.providerEnvelopeId).maybeSingle(); if (delivery.error || !delivery.data) throw new Error("SIGNATURE_WEBHOOK_ENVELOPE_NOT_FOUND"); const envelope = await db.from("contract_signature_envelopes").select("created_by").eq("id", delivery.data.envelope_id).single(); if (envelope.error || !envelope.data) throw new Error("SIGNATURE_WEBHOOK_ENVELOPE_NOT_FOUND"); await applyNormalizedSignatureEvent(db, normalized, envelope.data.created_by); await db.from("contract_signature_webhook_receipts").update({ processing_status: "processed", processed_at: new Date().toISOString(), envelope_id: delivery.data.envelope_id, law_firm_id: delivery.data.law_firm_id }).eq("id", receipt.data.id); return { ok: true as const, status: 200, duplicate: false }; } catch (error) { await db.from("contract_signature_webhook_receipts").update({ processing_status: "failed", safe_error_code: safe(error), processed_at: new Date().toISOString() }).eq("id", receipt.data.id); return { ok: false as const, status: 422, error: safe(error) }; }
}
