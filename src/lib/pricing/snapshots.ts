/**
 * ETAPA 5.2.2.5.1 — Snapshots de serviço, lead e cliente.
 *
 * Captura o estado das referências no momento da criação
 * para garantir imutabilidade da versão.
 *
 * Princípio: o snapshot é o "retrato" dos dados de referência.
 * Alterações futuras nos dados de origem não afetam versões já criadas.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

type SupabaseDB = SupabaseClient<Database>;

// ─── Snapshot Types ────────────────────────────────────

export interface ServiceSnapshot {
  serviceId: string;
  name: string;
  category: string | null;
  description: string | null;
  basePriceCents: number;
  currency: string;
  isActive: boolean;
  snapshotAt: string;
}

export interface ClientSnapshot {
  clientId: string;
  name: string;
  snapshotAt: string;
}

export interface LeadSnapshot {
  leadId: string;
  name: string;
  email: string | null;
  phone: string | null;
  snapshotAt: string;
}

// ─── Snapshots ─────────────────────────────────────────

/**
 * Captura snapshot de um serviço.
 */
export async function captureServiceSnapshot(
  supabase: SupabaseDB,
  tenantId: string,
  serviceId: string,
): Promise<ServiceSnapshot> {
  const { data, error } = await supabase
    .from("service_catalog")
    .select("id, name, category, short_description, reference_value_cents, currency, status")
    .eq("id", serviceId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !data) {
    throw new Error(`Serviço não encontrado: ${serviceId}`);
  }

  return {
    serviceId: data.id,
    name: data.name,
    category: data.category,
    description: data.short_description,
    basePriceCents: data.reference_value_cents ?? 0,
    currency: data.currency,
    isActive: data.status === "ativo",
    snapshotAt: new Date().toISOString(),
  };
}

/**
 * Captura snapshot de um cliente (se fornecido).
 */
export async function captureClientSnapshot(
  supabase: SupabaseDB,
  tenantId: string,
  clientId: string,
): Promise<ClientSnapshot> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name")
    .eq("id", clientId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !data) {
    throw new Error(`Cliente não encontrado: ${clientId}`);
  }

  return {
    clientId: data.id,
    name: data.name,
    snapshotAt: new Date().toISOString(),
  };
}

/**
 * Captura snapshot de um lead (se fornecido).
 */
export async function captureLeadSnapshot(
  supabase: SupabaseDB,
  tenantId: string,
  leadId: string,
): Promise<LeadSnapshot> {
  const { data, error } = await supabase
    .from("leads")
    .select("id, name, email, phone")
    .eq("id", leadId)
    .eq("law_firm_id", tenantId)
    .single();

  if (error || !data) {
    throw new Error(`Lead não encontrado: ${leadId}`);
  }

  return {
    leadId: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    snapshotAt: new Date().toISOString(),
  };
}

// ─── Serialização ──────────────────────────────────────

/**
 * Serializa snapshot para JSONB (persistência no banco).
 */
export function serializeSnapshot(
  snapshot: ServiceSnapshot | ClientSnapshot | LeadSnapshot,
): Record<string, unknown> {
  return { ...snapshot };
}