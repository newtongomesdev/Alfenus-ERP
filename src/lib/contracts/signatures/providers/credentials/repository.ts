import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// The provider table is intentionally absent from the generated public Database type until its migration is deployed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = () => { const db = getSupabaseAdminClient(); if (!db) throw new Error("SUPABASE_UNAVAILABLE"); return db as any; };
export async function getProviderConfiguration(lawFirmId: string, id: string) { const result = await client().from("contract_signature_provider_configurations").select("*").eq("law_firm_id", lawFirmId).eq("id", id).maybeSingle(); if (result.error) throw result.error; return result.data; }
export async function listProviderConfigurations(lawFirmId: string) { const result = await client().from("contract_signature_provider_configurations").select("id,law_firm_id,provider,environment,display_name,status,is_default,encrypted_credentials,public_configuration_json,last_connection_test_at,last_connection_test_status,last_connection_error_code,enabled_at,disabled_at,created_at,updated_at,lock_version").eq("law_firm_id", lawFirmId).order("environment").order("display_name"); if (result.error) throw result.error; return result.data ?? []; }
export async function recordConfigurationEvent(lawFirmId: string, _envelopeId: string | null, _actorUserId: string, eventType: string, deduplicationKey: string, metadata: Record<string, unknown> = {}) { const entityId = deduplicationKey.match(/[0-9a-f]{8}-[0-9a-f-]{27,}/i)?.[0] ?? null; const result = await client().from("audit_logs").insert({ law_firm_id: lawFirmId, actor_id: null, action: eventType, entity_type: "contract_signature_provider_configuration", entity_id: entityId, metadata: { ...metadata, deduplicationKey } }); if (result.error) throw result.error; }
export { client as getProviderConfigurationAdminClient };
