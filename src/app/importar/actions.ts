"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { processImport, type EntityType, type CsvColumnMapping } from "@/lib/import/csv-parser";

export type ImportActionError =
  | "ambiente"
  | "permissao"
  | "importacao";

export async function importCsvAction(
  entityType: EntityType,
  csvContent: string,
  mapping: CsvColumnMapping[],
): Promise<{
  success: boolean;
  error?: ImportActionError;
  result?: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    errors: Array<{ lineNumber: number; message: string }>;
    importedCount: number;
  };
}> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return { success: false, error: "ambiente" };
  }

  const permissionMap: Record<EntityType, string> = {
    client: "clientes.criar",
    lead: "leads.criar",
  };

  if (!can(context.member.role, permissionMap[entityType] as any)) {
    return { success: false, error: "permissao" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { success: false, error: "ambiente" };
  }

  // Fetch existing records for duplicate detection
  const table = entityType === "client" ? "clients" : "leads";
  const { data: existing } = await supabase
    .from(table)
    .select("name, document, email")
    .eq("law_firm_id", context.member.lawFirmId);

  const existingRecords = ((existing ?? []) as any) as Array<{
    name: string;
    document: string | null;
    email: string | null;
  }>;

  // Process CSV
  const importResult = processImport(csvContent, entityType, mapping, existingRecords);

  if (importResult.validRows === 0) {
    return {
      success: true,
      result: {
        ...importResult,
        importedCount: 0,
      },
    };
  }

  // Parse and insert valid, non-duplicate rows
  const { parseCsvContent, mapRowToFields, findDuplicates } = await import("@/lib/import/csv-parser");
  const rows = parseCsvContent(csvContent);
  const headers = rows[0]?.values ?? [];
  const dataRows = rows.slice(1);

  const parsedData = dataRows
    .map((row) => mapRowToFields(row.values, headers, mapping))
    .filter((data) => data.name && data.name.trim().length > 0);

  const duplicateIndices = findDuplicates(parsedData, existingRecords);
  const toInsert = parsedData
    .filter((_, i) => !duplicateIndices.has(i))
    .map((data) => ({
      law_firm_id: context.member!.lawFirmId,
      name: data.name,
      person_type: data.personType || "fisica",
      document: data.document || null,
      email: data.email || null,
      phone: data.phone || null,
      whatsapp: data.whatsapp || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      notes: data.notes || null,
      tags: data.tags ? data.tags.split(",").map((t: string) => t.trim()) : [],
      interest_area: data.interestArea || null,
      source: data.source || null,
      status: entityType === "client" ? "ativo" : "novo",
      responsible_member_id: context.member!.id,
    }));

  let importedCount = 0;
  if (toInsert.length > 0) {
    const { error } = await supabase.from(table).insert(toInsert as any);
    if (!error) {
      importedCount = toInsert.length;
    }
  }

  // Log activity
  await supabase.from("activity_events").insert({
    law_firm_id: context.member.lawFirmId,
    actor_id: context.member.id,
    actor_name: context.member.name,
    event_type: "import",
    entity_type: entityType === "client" ? "client" : "lead",
    entity_id: context.member.id,
    entity_title: `Importação de ${importedCount} ${entityType === "client" ? "clientes" : "leads"}`,
    description: `Importação via CSV: ${importedCount} registros importados`,
    metadata: {
      totalRows: importResult.totalRows,
      validRows: importResult.validRows,
      duplicateRows: importResult.duplicateRows,
      invalidRows: importResult.invalidRows,
    },
  } as any);

  revalidatePath(entityType === "client" ? "/clientes" : "/leads");

  return {
    success: true,
    result: {
      ...importResult,
      importedCount,
    },
  };
}
