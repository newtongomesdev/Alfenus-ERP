import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditAction = {
  adminUserId: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
};

export async function logAdminAction(data: AuditAction) {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) return;
  await adminClient.from("admin_audit_logs").insert({
    admin_user_id: data.adminUserId,
    admin_email: data.adminEmail,
    action: data.action,
    entity_type: data.entityType,
    entity_id: data.entityId ?? null,
    entity_name: data.entityName ?? null,
    details: data.details ?? {},
    ip_address: data.ipAddress ?? null,
  });
}
