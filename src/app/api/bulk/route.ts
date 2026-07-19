import { NextRequest, NextResponse } from "next/server";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { validateBulkAction, type BulkActionRequest, type EntityType, type BulkActionType } from "@/lib/bulk/actions";

const ENTITY_TABLE_MAP: Record<EntityType, string> = {
  client: "clients",
  lead: "leads",
  legal_case: "legal_cases",
  task: "tasks",
  contract: "contracts",
};

export async function POST(request: NextRequest) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = (await request.json()) as BulkActionRequest & { confirmDelete?: boolean };
  const { entityType, action, ids, params } = body;

  // Build permission list from member role
  const allPerms = [
    "clientes.visualizar", "clientes.criar", "clientes.editar", "clientes.administrar",
    "processos.visualizar", "processos.criar", "processos.editar", "processos.administrar",
    "tarefas.visualizar", "tarefas.criar", "tarefas.editar", "tarefas.administrar",
    "contratos.visualizar", "contratos.criar", "contratos.editar", "contratos.administrar",
  ];

  const validation = validateBulkAction({ entityType, action, ids, params }, allPerms);
  if (!validation.valid) {
    return NextResponse.json({ error: "Ação inválida", details: validation.errors }, { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  }

  const table = ENTITY_TABLE_MAP[entityType];
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; message: string }> = [];

  switch (action) {
    case "delete": {
      const { error } = await supabase
        .from(table)
        .delete()
        .in("id", ids)
        .eq("law_firm_id", context.member.lawFirmId);
      if (error) {
        failed = ids.length;
        errors.push({ id: "*", message: error.message });
      } else {
        success = ids.length;
      }
      break;
    }

    case "update_status": {
      const statusField = entityType === "legal_case" ? "status" : "status";
      const { error } = await (supabase
        .from(table) as any)
        .update({ [statusField]: params?.status })
        .in("id", ids)
        .eq("law_firm_id", context.member.lawFirmId);
      if (error) {
        failed = ids.length;
        errors.push({ id: "*", message: error.message });
      } else {
        success = ids.length;
      }
      break;
    }

    case "assign_responsible": {
      const fieldMap: Record<EntityType, string> = {
        client: "responsible_member_id",
        lead: "responsible_member_id",
        legal_case: "main_responsible_id",
        task: "responsible_member_id",
        contract: "responsible_member_id",
      };
      const { error } = await (supabase
        .from(table) as any)
        .update({ [fieldMap[entityType]]: params?.responsibleId })
        .in("id", ids)
        .eq("law_firm_id", context.member.lawFirmId);
      if (error) {
        failed = ids.length;
        errors.push({ id: "*", message: error.message });
      } else {
        success = ids.length;
      }
      break;
    }

    case "add_tag": {
      // Fetch current tags for each record and append
      const { data: records } = await supabase
        .from(table)
        .select("id, tags")
        .in("id", ids)
        .eq("law_firm_id", context.member.lawFirmId);

      const rawRecords = (records ?? []) as any[];
      if (rawRecords.length > 0) {
        for (const record of rawRecords) {
          const currentTags = (record.tags as string[]) ?? [];
          if (!currentTags.includes(params?.tag ?? "")) {
            await (supabase
                .from(table) as any)
                .update({ tags: [...currentTags, params?.tag] })
              .eq("id", record.id);
          }
        }
        success = rawRecords.length;
      } else {
        failed = ids.length;
      }
      break;
    }

    case "archive": {
      const { error } = await (supabase
        .from(table) as any)
        .update({ status: "arquivado" })
        .in("id", ids)
        .eq("law_firm_id", context.member.lawFirmId);
      if (error) {
        failed = ids.length;
        errors.push({ id: "*", message: error.message });
      } else {
        success = ids.length;
      }
      break;
    }

    default:
      return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  }

  // Log bulk action
  await supabase.from("activity_events").insert({
    law_firm_id: context.member.lawFirmId,
    actor_id: context.member.id,
    actor_name: context.member.name,
    event_type: "bulk_action",
    entity_type: entityType === "legal_case" ? "legal_case" : entityType,
    entity_id: context.member.id,
    entity_title: `Ação em lote: ${action}`,
    description: `${success} registro(s) ${action === "delete" ? "excluído(s)" : "atualizado(s)"}`,
    metadata: { action, ids: ids.slice(0, 10), success, failed },
  } as any);

  return NextResponse.json({ success, failed, errors });
}
