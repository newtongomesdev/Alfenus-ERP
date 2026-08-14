/**
 * Serviço de detecção de risco em sessões.
 * Analisa contexto de login e cria flags de risco
 * com classificação de severidade.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskType =
  | "novo_dispositivo"
  | "ip_desconhecido"
  | "user_agent_suspeito"
  | "multiplas_sessoes"
  | "tentativas_falha"
  | "codigo_recuperacao"
  | "reset_mfa_recente"
  | "horario_incomum";

export type RiskLevel = "informativo" | "atencao" | "alto_risco";

export type RiskFlag = {
  id: string;
  lawFirmId: string;
  userId: string;
  sessionId: string | null;
  riskType: RiskType;
  riskLevel: RiskLevel;
  description: string;
  metadata: Record<string, any> | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type RiskDetectionContext = {
  ip?: string;
  userAgent?: string;
  isNewDevice: boolean;
  isUnknownIp: boolean;
  hasMultipleSessions: boolean;
  recentFailedAttempts: number;
  usedRecoveryCode: boolean;
  recentMfaReset: boolean;
};

export type RiskSummary = {
  total: number;
  byLevel: {
    informativo: number;
    atencao: number;
    alto_risco: number;
  };
  unresolved: number;
};

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function analyzeNewDevice(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  if (!ctx.isNewDevice) return null;

  return {
    id: "",
    lawFirmId: "",
    userId: "",
    sessionId,
    riskType: "novo_dispositivo",
    riskLevel: "atencao",
    description: "Acesso realizado a partir de um dispositivo nao reconhecido.",
    metadata: { user_agent: ctx.userAgent ?? null },
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "",
  };
}

function analyzeIpChange(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  if (!ctx.isUnknownIp) return null;

  return {
    id: "",
    lawFirmId: "",
    userId: "",
    sessionId,
    riskType: "ip_desconhecido",
    riskLevel: "atencao",
    description: "Acesso realizado a partir de um endereco IP desconhecido.",
    metadata: { ip_address: ctx.ip ?? null },
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "",
  };
}

function analyzeUserAgentChange(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  // User-agent anômalo: vazio ou muito curto
  if (ctx.userAgent && ctx.userAgent.length < 20) {
    return {
      id: "",
      lawFirmId: "",
      userId: "",
      sessionId,
      riskType: "user_agent_suspeito",
      riskLevel: "atencao",
      description: "User-Agent incomum ou potencialmente adulterado.",
      metadata: { user_agent: ctx.userAgent },
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: "",
    };
  }
  return null;
}

function analyzeMultipleSessions(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  if (!ctx.hasMultipleSessions) return null;

  return {
    id: "",
    lawFirmId: "",
    userId: "",
    sessionId,
    riskType: "multiplas_sessoes",
    riskLevel: "informativo",
    description: "Multiplas sessoes ativas detectadas para este usuario.",
    metadata: null,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "",
  };
}

function analyzeFailedAttempts(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  if (ctx.recentFailedAttempts === 0) return null;

  const riskLevel: RiskLevel =
    ctx.recentFailedAttempts >= 5 ? "alto_risco" : "atencao";

  return {
    id: "",
    lawFirmId: "",
    userId: "",
    sessionId,
    riskType: "tentativas_falha",
    riskLevel,
    description: `${ctx.recentFailedAttempts} tentativa(s) de acesso falharam recentemente.`,
    metadata: { failed_attempts: ctx.recentFailedAttempts },
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "",
  };
}

function analyzeRecoveryCodeUsage(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  if (!ctx.usedRecoveryCode) return null;

  return {
    id: "",
    lawFirmId: "",
    userId: "",
    sessionId,
    riskType: "codigo_recuperacao",
    riskLevel: "atencao",
    description: "Codigo de recuperacao utilizado para autenticacao.",
    metadata: null,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "",
  };
}

function analyzeMfaReset(
  ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  if (!ctx.recentMfaReset) return null;

  return {
    id: "",
    lawFirmId: "",
    userId: "",
    sessionId,
    riskType: "reset_mfa_recente",
    riskLevel: "alto_risco",
    description: "MFA resetado recentemente — possivel comprometimento de conta.",
    metadata: null,
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: "",
  };
}

function analyzeAccessHours(
  _ctx: RiskDetectionContext,
  sessionId: string
): RiskFlag | null {
  const hour = new Date().getHours();
  // Entre 0h e 5h é considerado horário incomum
  if (hour >= 0 && hour < 5) {
    return {
      id: "",
      lawFirmId: "",
      userId: "",
      sessionId,
      riskType: "horario_incomum",
      riskLevel: "informativo",
      description: "Acesso realizado em horario incomum (madrugada).",
      metadata: { hour },
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: "",
    };
  }
  return null;
}

/**
 * Determina o nível de risco mais alto entre um conjunto de flags.
 */
function getHighestRiskLevel(
  flags: RiskFlag[]
): "informativo" | "atencao" | "alto_risco" {
  if (flags.some((f) => f.riskLevel === "alto_risco")) return "alto_risco";
  if (flags.some((f) => f.riskLevel === "atencao")) return "atencao";
  return "informativo";
}

// ---------------------------------------------------------------------------
// Funções públicas
// ---------------------------------------------------------------------------

/**
 * Analisa o contexto de login e cria flags de risco no banco.
 * Retorna as flags geradas e o nível de risco mais alto encontrado.
 */
export async function detectRisk(
  userId: string,
  lawFirmId: string,
  sessionId: string,
  context: RiskDetectionContext
): Promise<{
  flags: RiskFlag[];
  highestRisk: "informativo" | "atencao" | "alto_risco";
}> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return { flags: [], highestRisk: "informativo" };

  // Executa todas as análises
  const candidates = [
    analyzeNewDevice(context, sessionId),
    analyzeIpChange(context, sessionId),
    analyzeUserAgentChange(context, sessionId),
    analyzeMultipleSessions(context, sessionId),
    analyzeFailedAttempts(context, sessionId),
    analyzeRecoveryCodeUsage(context, sessionId),
    analyzeMfaReset(context, sessionId),
    analyzeAccessHours(context, sessionId),
  ].filter(Boolean) as RiskFlag[];

  if (candidates.length === 0) {
    return { flags: [], highestRisk: "informativo" };
  }

  // Insere flags no banco
  const insertedFlags: RiskFlag[] = [];

  for (const flag of candidates) {
    const { data, error } = await client
      .from("risk_flags" as any)
      .insert({
        user_id: userId,
        law_firm_id: lawFirmId,
        session_id: flag.sessionId || null,
        risk_type: flag.riskType,
        risk_level: flag.riskLevel,
        description: flag.description,
        metadata: flag.metadata,
        resolved: false,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) continue;

    insertedFlags.push({
      id: data.id,
      lawFirmId: data.law_firm_id,
      userId: data.user_id,
      sessionId: data.session_id,
      riskType: data.risk_type as RiskType,
      riskLevel: data.risk_level as RiskLevel,
      description: data.description,
      metadata: data.metadata,
      resolved: data.resolved,
      resolvedBy: data.resolved_by,
      resolvedAt: data.resolved_at,
      createdAt: data.created_at,
    });
  }

  const highestRisk = getHighestRiskLevel(insertedFlags);

  // Log de auditoria quando há risco alto
  if (highestRisk === "alto_risco") {
    await client.from("admin_audit_logs" as any).insert({
      admin_user_id: userId,
      action: "risk_detected_alto_risco",
      entity_type: "risk_flag",
      entity_id: userId,
      details: {
        law_firm_id: lawFirmId,
        session_id: sessionId,
        flags: insertedFlags.map((f) => f.riskType),
      },
    });
  }

  return { flags: insertedFlags, highestRisk };
}

/**
 * Lista flags de risco com filtros e paginação.
 */
export async function getRiskFlags(
  userId: string,
  lawFirmId: string,
  options?: {
    resolved?: boolean;
    riskLevel?: RiskLevel;
    limit?: number;
    offset?: number;
  }
): Promise<RiskFlag[]> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return [];

  let query = client
    .from("risk_flags" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId);

  if (options?.resolved !== undefined) {
    query = query.eq("resolved", options.resolved);
  }
  if (options?.riskLevel) {
    query = query.eq("risk_level", options.riskLevel);
  }

  query = query
    .order("created_at", { ascending: false })
    .range(
      options?.offset ?? 0,
      (options?.offset ?? 0) + (options?.limit ?? 50) - 1
    );

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    lawFirmId: row.law_firm_id,
    userId: row.user_id,
    sessionId: row.session_id,
    riskType: row.risk_type as RiskType,
    riskLevel: row.risk_level as RiskLevel,
    description: row.description,
    metadata: row.metadata,
    resolved: row.resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  }));
}

/**
 * Marca uma flag de risco como resolvida.
 */
export async function resolveRiskFlag(
  flagId: string,
  resolvedBy: string
): Promise<void> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return;

  const now = new Date().toISOString();

  const { error } = await client
    .from("risk_flags" as any)
    .update({
      resolved: true,
      resolved_by: resolvedBy,
      resolved_at: now,
    })
    .eq("id", flagId)
    .eq("resolved", false);

  if (error) throw error;

  await client.from("admin_audit_logs" as any).insert({
    admin_user_id: resolvedBy,
    action: "risk_flag_resolved",
    entity_type: "risk_flag",
    entity_id: flagId,
    details: { resolved_at: now },
  });
}

/**
 * Retorna resumo de flags de risco para uma escritoria.
 */
export async function getRiskSummary(
  lawFirmId: string
): Promise<RiskSummary> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return {
      total: 0,
      byLevel: { informativo: 0, atencao: 0, alto_risco: 0 },
      unresolved: 0,
    };
  }

  const { data } = await client
    .from("risk_flags" as any)
    .select("risk_level, resolved")
    .eq("law_firm_id", lawFirmId);

  const flags = data ?? [];
  const byLevel = {
    informativo: 0,
    atencao: 0,
    alto_risco: 0,
  };
  let unresolved = 0;

  for (const flag of flags) {
    const level = flag.risk_level as RiskLevel;
    if (level in byLevel) {
      byLevel[level as keyof typeof byLevel]++;
    }
    if (!flag.resolved) {
      unresolved++;
    }
  }

  return {
    total: flags.length,
    byLevel,
    unresolved,
  };
}
