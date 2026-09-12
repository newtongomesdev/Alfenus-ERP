"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  findMatches,
  mergeRecords,
  type DedupCandidate,
  type DedupMatch,
} from "@/lib/dedup/deduplication";

export type DedupActionError = "ambiente" | "permissao" | "nenhum_candidato";

type EntityType = "client" | "lead";

export async function detectDuplicatesAction(
  entityType: EntityType,
): Promise<{
  success: boolean;
  error?: DedupActionError;
  matches?: DedupMatch[];
  candidates?: DedupCandidate[];
}> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return { success: false, error: "ambiente" };
  }

  if (!can(context.member.role, `${entityType === "client" ? "clientes" : "leads"}.visualizar` as any)) {
    return { success: false, error: "permissao" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "ambiente" };

  const table = entityType === "client" ? "clients" : "leads";
  const { data: records } = await supabase
    .from(table)
    .select("id, name, document, email, phone, whatsapp")
    .eq("law_firm_id", context.member.lawFirmId)
    .order("created_at", { ascending: true });

  if (!records || records.length === 0) {
    return { success: false, error: "nenhum_candidato" };
  }

  const rawRecords = records as any[];
  const candidates: DedupCandidate[] = rawRecords.map((r) => ({
    id: r.id,
    name: r.name,
    document: r.document,
    email: r.email,
    phone: r.phone,
    whatsapp: r.whatsapp,
  }));

  const allMatches: DedupMatch[] = [];
  for (let i = 0; i < candidates.length; i++) {
    const matches = findMatches(candidates[i], candidates.slice(i + 1), 0.8);
    allMatches.push(...matches);
  }

  // Deduplicate matches by pair
  const seenPairs = new Set<string>();
  const uniqueMatches = allMatches.filter((m) => {
    const pair = [m.sourceId, m.targetId].sort().join(":");
    if (seenPairs.has(pair)) return false;
    seenPairs.add(pair);
    return true;
  });

  return {
    success: true,
    matches: uniqueMatches.sort((a, b) => b.confidence - a.confidence),
    candidates,
  };
}

export async function mergeDuplicatesAction(
  entityType: EntityType,
  sourceId: string,
  targetId: string,
): Promise<{ success: boolean; error?: DedupActionError }> {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return { success: false, error: "ambiente" };
  }

  const perm = `${entityType === "client" ? "clientes" : "leads"}.editar`;
  if (!can(context.member.role, perm as any)) {
    return { success: false, error: "permissao" };
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return { success: false, error: "ambiente" };

  const table = entityType === "client" ? "clients" : "leads";

  const { data: sourceRecord } = await supabase
    .from(table)
    .select("id, name, document, email, phone, whatsapp")
    .eq("id", sourceId)
    .single();

  const { data: targetRecord } = await supabase
    .from(table)
    .select("id, name, document, email, phone, whatsapp")
    .eq("id", targetId)
    .single();

  if (!sourceRecord || !targetRecord) {
    return { success: false, error: "nenhum_candidato" };
  }

  const sr = sourceRecord as any;
  const tr = targetRecord as any;

  const source: DedupCandidate = {
    id: sr.id,
    name: sr.name,
    document: sr.document,
    email: sr.email,
    phone: sr.phone,
    whatsapp: sr.whatsapp,
  };

  const target: DedupCandidate = {
    id: tr.id,
    name: tr.name,
    document: tr.document,
    email: tr.email,
    phone: tr.phone,
    whatsapp: tr.whatsapp,
  };

  const merged = mergeRecords(source, target);

  // Update target with merged data
  await supabase
    .from(table)
    .update({
      name: merged.name,
      document: merged.document,
      email: merged.email,
      phone: merged.phone,
      whatsapp: merged.whatsapp,
    } as any)
    .eq("id", targetId);

  // Delete source record
  await supabase.from(table).delete().eq("id", sourceId);

  // Log activity
  await supabase.from("activity_events").insert({
    law_firm_id: context.member.lawFirmId,
    actor_id: context.member.id,
    actor_name: context.member.name,
    event_type: "updated",
    entity_type: entityType === "client" ? "client" : "lead",
    entity_id: targetId,
    entity_title: `Deduplicação: merge de registros`,
    description: `Registro ${sourceId} mesclado em ${targetId}`,
  });

  revalidatePath(entityType === "client" ? "/clientes" : "/leads");
  return { success: true };
}
