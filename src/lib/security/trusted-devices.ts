/**
 * Serviço de dispositivos confiáveis.
 * Gerencia registro, verificação e revogação de dispositivos
 * marcados como confiáveis para pular desafios MFA.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrustedDevice = {
  id: string;
  lawFirmId: string;
  userId: string;
  deviceHash: string;
  browserName: string;
  osName: string;
  deviceType: string;
  ipAddress: string | null;
  trustedUntil: string;
  lastSeenAt: string;
  revokedAt: string | null;
  status: "ativo" | "revogado";
  createdAt: string;
};

export type TrustedDeviceEvent = {
  id: string;
  deviceId: string;
  lawFirmId: string;
  userId: string;
  event: string;
  metadata: Record<string, any> | null;
  createdAt: string;
};

export type DeviceInfo = {
  userAgent: string;
  ipAddress?: string;
};

export type ParsedUserAgent = {
  browser: string;
  os: string;
  device: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Gera hash SHA-256 de uma string via Web Crypto API.
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Registra evento de auditoria para dispositivos confiáveis.
 */
async function logDeviceEvent(
  client: AnyClient,
  params: {
    deviceId: string;
    lawFirmId: string;
    userId: string;
    event: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  await client.from("trusted_device_events").insert({
    device_id: params.deviceId,
    law_firm_id: params.lawFirmId,
    user_id: params.userId,
    event: params.event,
    metadata: params.metadata ?? null,
  });
}

/**
 * Parse simples de User-Agent para extrair nome do navegador, OS e tipo de dispositivo.
 */
export function parseUserAgent(userAgent: string): ParsedUserAgent {
  const ua = userAgent.toLowerCase();

  // --- Browser ---
  let browser = "Desconhecido";
  if (ua.includes("edg/") || ua.includes("edge/")) {
    browser = "Edge";
  } else if (ua.includes("opr/") || ua.includes("opera")) {
    browser = "Opera";
  } else if (ua.includes("chrome") && !ua.includes("edg/")) {
    browser = "Chrome";
  } else if (ua.includes("firefox")) {
    browser = "Firefox";
  } else if (ua.includes("safari") && !ua.includes("chrome")) {
    browser = "Safari";
  }

  // --- OS ---
  let os = "Desconhecido";
  if (ua.includes("windows nt 10")) {
    os = "Windows 10+";
  } else if (ua.includes("windows nt 6.3")) {
    os = "Windows 8.1";
  } else if (ua.includes("windows nt 6.2")) {
    os = "Windows 8";
  } else if (ua.includes("windows")) {
    os = "Windows";
  } else if (ua.includes("mac os x") || ua.includes("macintosh")) {
    os = "macOS";
  } else if (ua.includes("linux") && !ua.includes("android")) {
    os = "Linux";
  } else if (ua.includes("android")) {
    os = "Android";
  } else if (ua.includes("iphone") || ua.includes("ipad")) {
    os = "iOS";
  }

  // --- Device ---
  let device = "Desktop";
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    device = "Mobile";
  } else if (ua.includes("ipad") || ua.includes("tablet")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

// ---------------------------------------------------------------------------
// Main functions
// ---------------------------------------------------------------------------

/**
 * Cria um registro de dispositivo confiável.
 * O deviceHash é gerado a partir do user_agent.
 */
export async function createTrustedDevice(
  userId: string,
  lawFirmId: string,
  deviceInfo: DeviceInfo
): Promise<TrustedDevice | null> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return null;

  const deviceHash = await sha256(deviceInfo.userAgent);
  const parsed = parseUserAgent(deviceInfo.userAgent);

  // Padrão de confiança: 30 dias
  const trustedUntil = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await client
    .from("trusted_devices")
    .insert({
      user_id: userId,
      law_firm_id: lawFirmId,
      device_hash: deviceHash,
      browser_name: parsed.browser,
      os_name: parsed.os,
      device_type: parsed.device,
      ip_address: deviceInfo.ipAddress ?? null,
      trusted_until: trustedUntil,
      last_seen_at: new Date().toISOString(),
      status: "ativo",
    })
    .select()
    .single();

  if (error) throw error;
  if (!data) return null;

  // Log evento 'criado'
  await logDeviceEvent(client, {
    deviceId: data.id,
    lawFirmId,
    userId,
    event: "criado",
    metadata: {
      browser: parsed.browser,
      os: parsed.os,
      device: parsed.device,
    },
  });

  return {
    id: data.id,
    lawFirmId: data.law_firm_id,
    userId: data.user_id,
    deviceHash: data.device_hash,
    browserName: data.browser_name,
    osName: data.os_name,
    deviceType: data.device_type,
    ipAddress: data.ip_address,
    trustedUntil: data.trusted_until,
    lastSeenAt: data.last_seen_at,
    revokedAt: data.revoked_at,
    status: data.status,
    createdAt: data.created_at,
  };
}

/**
 * Verifica se um dispositivo está confiável (status='ativo' E trusted_until > agora).
 * Se confiável, atualiza last_seen_at e registra evento 'acesso'.
 */
export async function verifyTrustedDevice(
  userId: string,
  deviceHash: string
): Promise<boolean> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return false;

  const now = new Date().toISOString();

  const { data: record } = await client
    .from("trusted_devices")
    .select("id, law_firm_id, trusted_until")
    .eq("user_id", userId)
    .eq("device_hash", deviceHash)
    .eq("status", "ativo")
    .gt("trusted_until", now)
    .maybeSingle();

  if (!record) return false;

  // Atualiza last_seen_at
  await client
    .from("trusted_devices")
    .update({ last_seen_at: now })
    .eq("id", record.id);

  // Log evento 'acesso'
  await logDeviceEvent(client, {
    deviceId: record.id,
    lawFirmId: record.law_firm_id,
    userId,
    event: "acesso",
  });

  return true;
}

/**
 * Revoga um dispositivo específico.
 */
export async function revokeTrustedDevice(
  deviceId: string,
  userId: string,
  revokedBy?: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  const { data: device } = await client
    .from("trusted_devices")
    .select("id, law_firm_id, user_id")
    .eq("id", deviceId)
    .maybeSingle();

  if (!device) return;

  await client
    .from("trusted_devices")
    .update({
      status: "revogado",
      revoked_at: now,
    })
    .eq("id", deviceId);

  // Log evento 'revogado'
  await logDeviceEvent(client, {
    deviceId: device.id,
    lawFirmId: device.law_firm_id,
    userId: device.user_id,
    event: "revogado",
    metadata: revokedBy ? { revoked_by: revokedBy } : undefined,
  });
}

/**
 * Revoga todos os dispositivos confiáveis de um usuário.
 * Usado quando a senha é alterada, MFA é resetado ou "encerrar todas as sessões".
 */
export async function revokeAllTrustedDevices(
  userId: string,
  lawFirmId: string,
  revokedBy?: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  // Busca todos os dispositivos ativos para logar eventos
  const { data: activeDevices } = await client
    .from("trusted_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "ativo");

  // Atualiza todos para 'revogado'
  await client
    .from("trusted_devices")
    .update({
      status: "revogado",
      revoked_at: now,
    })
    .eq("user_id", userId)
    .eq("status", "ativo");

  // Log evento 'revogado' para cada dispositivo
  if (activeDevices) {
    for (const device of activeDevices) {
      await logDeviceEvent(client, {
        deviceId: device.id,
        lawFirmId,
        userId,
        event: "revogado",
        metadata: revokedBy
          ? { revoked_by: revokedBy, reason: "revogacao_em_lote" }
          : { reason: "revogacao_em_lote" },
      });
    }
  }
}

/**
 * Lista todos os dispositivos de um usuário (ativos e revogados).
 */
export async function getTrustedDevices(
  userId: string,
  lawFirmId: string
): Promise<TrustedDevice[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  const { data } = await client
    .from("trusted_devices")
    .select("*")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: any) => ({
    id: row.id,
    lawFirmId: row.law_firm_id,
    userId: row.user_id,
    deviceHash: row.device_hash,
    browserName: row.browser_name,
    osName: row.os_name,
    deviceType: row.device_type,
    ipAddress: row.ip_address,
    trustedUntil: row.trusted_until,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    status: row.status,
    createdAt: row.created_at,
  }));
}

/**
 * Retorna eventos de auditoria de um dispositivo específico.
 */
export async function getDeviceEvents(
  deviceId: string,
  limit: number = 50
): Promise<TrustedDeviceEvent[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  const { data } = await client
    .from("trusted_device_events")
    .select("*")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    deviceId: row.device_id,
    lawFirmId: row.law_firm_id,
    userId: row.user_id,
    event: row.event,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));
}
