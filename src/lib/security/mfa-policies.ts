/**
 * Serviço de políticas MFA avançadas.
 * Determina requisitos de MFA por modo de enforcement,
 * verifica períodos de carência e valida step-up authentication.
 */

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/permissions";

type AnyClient = { from(table: string): any };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnforcementMode =
  | "desabilitado"
  | "obrigatorio_todos"
  | "obrigatorio_roles"
  | "obrigatorio_usuarios";

export type MfaPolicy = {
  id: string;
  lawFirmId: string;
  enforcementMode: EnforcementMode;
  requiredRoles: string[];
  requiredUserIds: string[];
  gracePeriodDays: number;
  enforcementStartAt: string | null;
  allowTrustedDevices: boolean;
  trustedDeviceDurationDays: number;
  requireStepUpForSensitiveActions: boolean;
  createdAt: string;
  updatedAt: string;
};

export type GracePeriodInfo = {
  insideGrace: boolean;
  daysRemaining: number;
  deadline: Date;
};

export type StepUpAction =
  | "financial"
  | "export"
  | "permission_change"
  | "sensitive_document"
  | "support_access";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hierarquia de papéis (menor → maior). */
const ROLE_HIERARCHY: Role[] = [
  "visualizador",
  "colaborador",
  "assistente",
  "financeiro",
  "advogado",
  "administrador",
  "proprietario",
];

/** Ações que exigem step-up authentication por padrão. */
const DEFAULT_STEP_UP_ACTIONS: StepUpAction[] = [
  "financial",
  "export",
  "permission_change",
  "sensitive_document",
  "support_access",
];

/** Políticas padrão quando não há configuração no banco. */
const DEFAULT_MFA_POLICY: Omit<MfaPolicy, "id" | "lawFirmId" | "createdAt" | "updatedAt"> = {
  enforcementMode: "desabilitado",
  requiredRoles: [],
  requiredUserIds: [],
  gracePeriodDays: 0,
  enforcementStartAt: null,
  allowTrustedDevices: true,
  trustedDeviceDurationDays: 30,
  requireStepUpForSensitiveActions: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Busca a política MFA de segurança da escritório.
 */
async function fetchSecurityPolicyRaw(
  client: AnyClient,
  lawFirmId: string
): Promise<Record<string, any> | null> {
  const { data } = await client
    .from("security_policies")
    .select("*")
    .eq("law_firm_id", lawFirmId)
    .maybeSingle();

  return data ?? null;
}

/**
 * Verifica se um usuário tem MFA verificado habilitado.
 */
async function userHasVerifiedMfa(
  client: AnyClient,
  userId: string,
  lawFirmId: string
): Promise<boolean> {
  const { data } = await client
    .from("mfa_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("law_firm_id", lawFirmId)
    .eq("verified", true)
    .eq("enabled", true)
    .limit(1)
    .maybeSingle();

  return !!data;
}

// ---------------------------------------------------------------------------
// Main functions
// ---------------------------------------------------------------------------

/**
 * Busca a política MFA configurada para o escritório.
 * Retorna os campos MFA relevantes da security_policy.
 */
export async function getMfaPolicy(lawFirmId: string): Promise<MfaPolicy> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) {
    return {
      ...DEFAULT_MFA_POLICY,
      id: "",
      lawFirmId,
      createdAt: "",
      updatedAt: "",
    };
  }

  const raw = await fetchSecurityPolicyRaw(client, lawFirmId);

  if (!raw) {
    return {
      ...DEFAULT_MFA_POLICY,
      id: "",
      lawFirmId,
      createdAt: "",
      updatedAt: "",
    };
  }

  return {
    id: raw.id,
    lawFirmId: raw.law_firm_id,
    enforcementMode: (raw.mfa_enforcement_mode as EnforcementMode) ?? DEFAULT_MFA_POLICY.enforcementMode,
    requiredRoles: raw.mfa_required_roles ?? DEFAULT_MFA_POLICY.requiredRoles,
    requiredUserIds: raw.mfa_required_user_ids ?? DEFAULT_MFA_POLICY.requiredUserIds,
    gracePeriodDays: raw.mfa_grace_period_days ?? DEFAULT_MFA_POLICY.gracePeriodDays,
    enforcementStartAt: raw.mfa_enforcement_start_at ?? DEFAULT_MFA_POLICY.enforcementStartAt,
    allowTrustedDevices: raw.mfa_allow_trusted_devices ?? DEFAULT_MFA_POLICY.allowTrustedDevices,
    trustedDeviceDurationDays: raw.mfa_trusted_device_duration_days ?? DEFAULT_MFA_POLICY.trustedDeviceDurationDays,
    requireStepUpForSensitiveActions: raw.mfa_require_step_up ?? DEFAULT_MFA_POLICY.requireStepUpForSensitiveActions,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

/**
 * Verifica se MFA é obrigatório para um usuário específico.
 *
 * - 'desabilitado' → nunca
 * - 'obrigatorio_todos' → todos os usuários
 * - 'obrigatorio_roles' → apenas papéis listados em requiredRoles
 * - 'obrigatorio_usuarios' → apenas usuários listados em requiredUserIds
 */
export async function isMfaRequired(
  userId: string,
  userRole: Role,
  lawFirmId: string
): Promise<boolean> {
  const policy = await getMfaPolicy(lawFirmId);

  switch (policy.enforcementMode) {
    case "desabilitado":
      return false;

    case "obrigatorio_todos":
      return true;

    case "obrigatorio_roles":
      return policy.requiredRoles.includes(userRole);

    case "obrigatorio_usuarios":
      return policy.requiredUserIds.includes(userId);

    default:
      return false;
  }
}

/**
 * Verifica se o usuário está dentro do período de carência.
 * Retorna info sobre os dias restantes e o prazo final.
 */
export async function isUserInsideGracePeriod(
  userId: string,
  lawFirmId: string
): Promise<GracePeriodInfo> {
  const policy = await getMfaPolicy(lawFirmId);

  // Sem data de início ou sem período de carência → fora do período
  if (!policy.enforcementStartAt || policy.gracePeriodDays <= 0) {
    return {
      insideGrace: false,
      daysRemaining: 0,
      deadline: new Date(),
    };
  }

  const startDate = new Date(policy.enforcementStartAt);
  const deadline = new Date(
    startDate.getTime() + policy.gracePeriodDays * 24 * 60 * 60 * 1000
  );
  const now = new Date();

  if (now < deadline) {
    const daysRemaining = Math.ceil(
      (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );
    return {
      insideGrace: true,
      daysRemaining,
      deadline,
    };
  }

  return {
    insideGrace: false,
    daysRemaining: 0,
    deadline,
  };
}

/**
 * Verifica se o usuário precisa fazer enrollment de MFA.
 * Combina verificação de obrigatoriedade com existência de MFA verificado.
 */
export async function requiresMfaEnrollment(
  userRole: Role,
  lawFirmId: string,
  userId?: string
): Promise<boolean> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return false;

  // Sem userId, não podemos verificar enrollment → assume que precisa
  if (!userId) return true;

  const required = await isMfaRequired(userId, userRole, lawFirmId);
  if (!required) return false;

  const hasEnrollment = await userHasVerifiedMfa(client, userId, lawFirmId);
  return !hasEnrollment;
}

/**
 * Determina se um desafio MFA TOTP é necessário no login.
 *
 * Regras:
 * 1. Se MFA não é obrigatório → false
 * 2. Se dispositivo é confiável E política permite → false
 * 3. Caso contrário → true
 */
export async function requiresMfaChallenge(
  userRole: Role,
  lawFirmId: string,
  deviceTrusted: boolean
): Promise<boolean> {
  const client = getSupabaseAdminClient() as unknown as AnyClient | null;
  if (!client) return false;

  const policy = await getMfaPolicy(lawFirmId);

  // MFA desabilitado na política
  if (policy.enforcementMode === "desabilitado") return false;

  // Se dispositivo é confiável e política permite dispositivos confiáveis
  if (deviceTrusted && policy.allowTrustedDevices) return false;

  // Para 'obrigatorio_roles' e 'obrigatorio_usuarios', precisamos verificar
  // se o usuário específico está no escopo. Como não temos userId aqui,
  // retornamos true (caller deve passar deviceTrusted=false ou chamar isMfaRequired antes).
  return true;
}

/**
 * Verifica se uma ação específica requer step-up authentication (MFA adicional).
 *
 * Ações suportadas: financial, export, permission_change,
 * sensitive_document, support_access.
 */
export async function requiresStepUpAuthentication(
  action: StepUpAction,
  lawFirmId: string
): Promise<boolean> {
  const policy = await getMfaPolicy(lawFirmId);

  // Se step-up não está habilitado na política
  if (!policy.requireStepUpForSensitiveActions) return false;

  // Se a ação está na lista de ações que exigem step-up
  return DEFAULT_STEP_UP_ACTIONS.includes(action);
}

/**
 * Retorna se dispositivos confiáveis estão habilitados e por quantos dias.
 */
export async function canTrustDevice(
  lawFirmId: string
): Promise<{ allowed: boolean; durationDays: number }> {
  const policy = await getMfaPolicy(lawFirmId);

  return {
    allowed: policy.allowTrustedDevices,
    durationDays: policy.trustedDeviceDurationDays,
  };
}

/**
 * Verifica se role1 está acima ou igual a role2 na hierarquia.
 *
 * Hierarquia (menor → maior):
 * visualizador < colaborador < assistente < financeiro < advogado < administrador < proprietario
 */
export function isRoleInHierarchy(role1: Role, role2: Role): boolean {
  const index1 = ROLE_HIERARCHY.indexOf(role1);
  const index2 = ROLE_HIERARCHY.indexOf(role2);

  if (index1 === -1 || index2 === -1) return false;

  return index1 >= index2;
}
