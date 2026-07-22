/**
 * Serviço de códigos de recuperação.
 * Gera, valida, regenera e revoga códigos para recuperação de conta.
 * Os códigos são armazenados APENAS como hash SHA-256.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RecoveryCode = {
  id: string;
  lawFirmId: string;
  userId: string;
  batchId: string;
  codeHash: string;
  status: "ativo" | "utilizado" | "revogado";
  usedAt: string | null;
  createdAt: string;
};

export type RecoveryCodeEvent = {
  id: string;
  recoveryCodeId: string;
  lawFirmId: string;
  userId: string;
  event: string;
  metadata: Record<string, any> | null;
  createdAt: string;
};

export type RecoveryCodeBatch = {
  batchId: string;
  count: number;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Gera hash SHA-256 de um código de recuperação via Web Crypto API.
 */
export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Gera um código no formato XXXX-XXXX (8 caracteres hex maiúsculos).
 */
export function generateCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * Formata códigos para exibição (já vieram no formato XXXX-XXXX).
 */
export function formatCodesForDisplay(codes: string[]): string[] {
  return codes.map((code) => code.toUpperCase());
}

/**
 * Registra evento de auditoria para códigos de recuperação.
 */
async function logRecoveryCodeEvent(
  client: AnyClient,
  params: {
    recoveryCodeId: string;
    lawFirmId: string;
    userId: string;
    event: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  await client.from("recovery_code_events").insert({
    recovery_code_id: params.recoveryCodeId,
    law_firm_id: params.lawFirmId,
    user_id: params.userId,
    event: params.event,
    metadata: params.metadata ?? null,
  });
}

// ---------------------------------------------------------------------------
// Main functions
// ---------------------------------------------------------------------------

/**
 * Gera N códigos de recuperação (padrão 10).
 * Retorna os códigos em texto plano UMA ÚNICA VEZ.
 * Revoga todos os códigos ativos de lotes anteriores.
 */
export async function generateRecoveryCodes(
  userId: string,
  lawFirmId: string,
  count: number = 10
): Promise<string[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) throw new Error("Supabase admin client não disponível.");

  // Revoga códigos ativos de lotes anteriores
  const { data: existingCodes } = await client
    .from("recovery_codes")
    .select("id, batch_id")
    .eq("user_id", userId)
    .eq("status", "ativo");

  if (existingCodes && existingCodes.length > 0) {
    const oldBatchIds = Array.from(new Set(existingCodes.map((c: any) => c.batch_id)));
    await client
      .from("recovery_codes")
      .update({ status: "revogado" })
      .eq("user_id", userId)
      .in("batch_id", oldBatchIds)
      .eq("status", "ativo");
  }

  // Gera novo batch_id
  const batchId = crypto.randomUUID();

  // Gera códigos e armazena hashes
  const plaintextCodes: string[] = [];
  const rowsToInsert: any[] = [];

  for (let i = 0; i < count; i++) {
    const code = generateCode();
    const codeHash = await hashCode(code);
    plaintextCodes.push(code);

    rowsToInsert.push({
      user_id: userId,
      law_firm_id: lawFirmId,
      batch_id: batchId,
      code_hash: codeHash,
      status: "ativo",
    });
  }

  const { data: inserted, error } = await client
    .from("recovery_codes")
    .insert(rowsToInsert)
    .select("id");

  if (error) throw error;

  // Log evento 'gerado' para cada código inserido
  if (inserted) {
    for (const row of inserted) {
      await logRecoveryCodeEvent(client, {
        recoveryCodeId: row.id,
        lawFirmId,
        userId,
        event: "gerado",
        metadata: { batch_id: batchId },
      });
    }
  }

  return formatCodesForDisplay(plaintextCodes);
}

/**
 * Valida um código de recuperação.
 * Se válido, marca como 'utilizado' e retorna true.
 * Se inválido, retorna false (não revela se o usuário existe).
 */
export async function validateRecoveryCode(
  userId: string,
  lawFirmId: string,
  code: string
): Promise<boolean> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return false;

  const codeHash = await hashCode(code.toUpperCase().trim());

  // Busca código ativo com hash correspondente
  const { data: record } = await client
    .from("recovery_codes")
    .select("id, user_id")
    .eq("user_id", userId)
    .eq("code_hash", codeHash)
    .eq("status", "ativo")
    .maybeSingle();

  if (!record) return false;

  // Marca como utilizado
  await client
    .from("recovery_codes")
    .update({
      status: "utilizado",
      used_at: new Date().toISOString(),
    })
    .eq("id", record.id);

  // Log evento 'utilizado'
  await logRecoveryCodeEvent(client, {
    recoveryCodeId: record.id,
    lawFirmId,
    userId,
    event: "utilizado",
  });

  return true;
}

/**
 * Regenera códigos de recuperação.
 * Requer reautenticação (chamador deve verificar antes).
 * Revoga lote anterior via generateRecoveryCodes.
 */
export async function regenerateRecoveryCodes(
  userId: string,
  lawFirmId: string
): Promise<string[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) throw new Error("Supabase admin client não disponível.");

  // Gera novos códigos (que já revoga os anteriores)
  const newCodes = await generateRecoveryCodes(userId, lawFirmId);

  // Log evento 'regenerado' (evento global do batch)
  // Usamos o primeiro código inserido como referência do lote
  const { data: latestCode } = await client
    .from("recovery_codes")
    .select("id, batch_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestCode) {
    await logRecoveryCodeEvent(client, {
      recoveryCodeId: latestCode.id,
      lawFirmId,
      userId,
      event: "regenerado",
      metadata: { batch_id: latestCode.batch_id },
    });
  }

  return newCodes;
}

/**
 * Retorna quantidade de códigos ativos para um usuário.
 */
export async function getRecoveryCodeCount(userId: string): Promise<number> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return 0;

  const { count } = await client
    .from("recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "ativo");

  return count ?? 0;
}

/**
 * Revoga todos os códigos de recuperação ativos de um usuário.
 */
export async function revokeAllRecoveryCodes(
  userId: string,
  lawFirmId: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  // Busca todos os códigos ativos para logar eventos
  const { data: activeCodes } = await client
    .from("recovery_codes")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo");

  // Atualiza status para 'revogado'
  await client
    .from("recovery_codes")
    .update({ status: "revogado" })
    .eq("user_id", userId)
    .eq("status", "ativo");

  // Log evento 'revogado' para cada código
  if (activeCodes) {
    for (const code of activeCodes) {
      await logRecoveryCodeEvent(client, {
        recoveryCodeId: code.id,
        lawFirmId,
        userId,
        event: "revogado",
      });
    }
  }
}

/**
 * Retorna eventos recentes de códigos de recuperação.
 */
export async function getRecoveryCodeEvents(
  userId: string,
  lawFirmId: string,
  limit: number = 50
): Promise<RecoveryCodeEvent[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  const { data } = await client
    .from("recovery_code_events")
    .select("*")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    recoveryCodeId: row.recovery_code_id,
    lawFirmId: row.law_firm_id,
    userId: row.user_id,
    event: row.event,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}
