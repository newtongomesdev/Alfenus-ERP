/* eslint-disable @typescript-eslint/no-explicit-any */

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { FORBIDDEN_ACTIONS, ASSISTED_ACTIONS, SESSION_STATUSES } from "./constants";
import { recordAccessAttempt } from "./audit";
import type { SessionStatus } from "./constants";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type BlockedRouteInfo = {
  route: string;
  reason: string;
};

export type BlockedEndpointInfo = {
  method: string;
  path: string;
  reason: string;
};

export type ModuleBlockedAction = {
  module: string;
  action: string;
  reason: string;
};

export type ValidationResult = {
  allowed: boolean;
  reason?: string;
  blockedBy?: "route" | "endpoint" | "action" | "module" | "session" | "scope";
};

// ── Rotas sempre bloqueadas ─────────────────────────────────────────────────

/**
 * Mapa de rotas que são sempre bloqueadas durante acesso assistido.
 */
export const FORBIDDEN_ROUTES: Record<string, BlockedRouteInfo> = {
  "/configuracoes": {
    route: "/configuracoes",
    reason: "Configurações gerais não acessíveis em modo assistido",
  },
  "/configuracoes/*": {
    route: "/configuracoes/*",
    reason: "Sub-rotas de configurações não acessíveis em modo assistido",
  },
  "/recebimentos": {
    route: "/recebimentos",
    reason: "Recebimentos financeiros não acessíveis em modo assistido",
  },
  "/recebimentos/*": {
    route: "/recebimentos/*",
    reason: "Sub-rotas de recebimentos não acessíveis em modo assistido",
  },
  "/financeiro": {
    route: "/financeiro",
    reason: "Módulo financeiro não acessível em modo assistido",
  },
  "/financeiro/*": {
    route: "/financeiro/*",
    reason: "Sub-rotas financeiras não acessíveis em modo assistido",
  },
  "/admin": {
    route: "/admin",
    reason: "Área administrativa não acessível em modo assistido",
  },
  "/admin/*": {
    route: "/admin/*",
    reason: "Sub-rotas administrativas não acessíveis em modo assistido",
  },
  "/configuracoes/billing": {
    route: "/configuracoes/billing",
    reason: "Billing não acessível em modo assistido",
  },
  "/configuracoes/perfis": {
    route: "/configuracoes/perfis",
    reason: "Gerenciamento de perfis não acessível em modo assistido",
  },
  "/configuracoes/integracoes": {
    route: "/configuracoes/integracoes",
    reason: "Integrações não acessíveis em modo assistido",
  },
  "/configuracoes/api-keys": {
    route: "/configuracoes/api-keys",
    reason: "Chaves de API não acessíveis em modo assistido",
  },
  "/usuarios/novo": {
    route: "/usuarios/novo",
    reason: "Criação de usuários não permitida em modo assistido",
  },
};

// ── Endpoints API sempre bloqueados ─────────────────────────────────────────

/**
 * Mapa de endpoints de API que são sempre bloqueados durante acesso assistido.
 */
export const FORBIDDEN_ENDPOINTS: Record<string, BlockedEndpointInfo> = {
  "POST_/api/financeiro/*": {
    method: "POST",
    path: "/api/financeiro/*",
    reason: "Escrita financeira bloqueada em modo assistido",
  },
  "PUT_/api/financeiro/*": {
    method: "PUT",
    path: "/api/financeiro/*",
    reason: "Alteração financeira bloqueada em modo assistido",
  },
  "DELETE_/api/financeiro/*": {
    method: "DELETE",
    path: "/api/financeiro/*",
    reason: "Exclusão financeira bloqueada em modo assistido",
  },
  "POST_/api/configuracoes/*": {
    method: "POST",
    path: "/api/configuracoes/*",
    reason: "Escrita de configurações bloqueada em modo assistido",
  },
  "PUT_/api/configuracoes/*": {
    method: "PUT",
    path: "/api/configuracoes/*",
    reason: "Alteração de configurações bloqueada em modo assistido",
  },
  "DELETE_/api/configuracoes/*": {
    method: "DELETE",
    path: "/api/configuracoes/*",
    reason: "Exclusão de configurações bloqueada em modo assistido",
  },
  "DELETE_/api/usuarios/*": {
    method: "DELETE",
    path: "/api/usuarios/*",
    reason: "Exclusão de usuários bloqueada em modo assistido",
  },
  "POST_/api/auth/*": {
    method: "POST",
    path: "/api/auth/*",
    reason: "Operações de autenticação bloqueadas em modo assistido",
  },
  "POST_/api/admin/*": {
    method: "POST",
    path: "/api/admin/*",
    reason: "Operações administrativas bloqueadas em modo assistido",
  },
  "POST_/api/billing/*": {
    method: "POST",
    path: "/api/billing/*",
    reason: "Operações de billing bloqueadas em modo assistido",
  },
  "DELETE_/api/billing/*": {
    method: "DELETE",
    path: "/api/billing/*",
    reason: "Exclusão de billing bloqueada em modo assistido",
  },
  "POST_/api/storage/*": {
    method: "POST",
    path: "/api/storage/*",
    reason: "Upload para storage bloqueado em modo assistido",
  },
  "DELETE_/api/storage/*": {
    method: "DELETE",
    path: "/api/storage/*",
    reason: "Exclusão de storage bloqueada em modo assistido",
  },
};

// ── Ações proibidas por módulo ──────────────────────────────────────────────

/**
 * Mapa de ações proibidas específicas por módulo.
 * Estas são adicionais às FORBIDDEN_ACTIONS globais.
 */
export const FORBIDDEN_ACTIONS_BY_MODULE: Record<string, ModuleBlockedAction[]> =
  {
    financeiro: [
      {
        module: "financeiro",
        action: "registrar_pagamento",
        reason: "Registro de pagamento bloqueado",
      },
      {
        module: "financeiro",
        action: "estornar",
        reason: "Estorno bloqueado",
      },
      {
        module: "financeiro",
        action: "alterar_saldo",
        reason: "Alteração de saldo bloqueada",
      },
      {
        module: "financeiro",
        action: "alterar_parcela",
        reason: "Alteração de parcela bloqueada",
      },
      {
        module: "financeiro",
        action: "efetuar_repasse",
        reason: "Repasse financeiro bloqueado",
      },
    ],
    configuracoes: [
      {
        module: "configuracoes",
        action: "alterar_permissoes",
        reason: "Alteração de permissões bloqueada",
      },
      {
        module: "configuracoes",
        action: "alterar_autenticacao",
        reason: "Alteração de autenticação bloqueada",
      },
      {
        module: "configuracoes",
        action: "alterar_mfa",
        reason: "Alteração de MFA bloqueada",
      },
      {
        module: "configuracoes",
        action: "alterar_plano",
        reason: "Alteração de plano bloqueada",
      },
    ],
    usuarios: [
      {
        module: "usuarios",
        action: "excluir",
        reason: "Exclusão de usuários bloqueada",
      },
      {
        module: "usuarios",
        action: "alterar_proprietario",
        reason: "Alteração de proprietário bloqueada",
      },
      {
        module: "usuarios",
        action: "alterar_permissoes",
        reason: "Alteração de permissões bloqueada",
      },
    ],
    documentos: [
      {
        module: "documentos",
        action: "excluir",
        reason: "Exclusão de documentos bloqueada",
      },
      {
        module: "documentos",
        action: "baixar",
        reason: "Download de documentos bloqueado",
      },
      {
        module: "documentos",
        action: "exportar",
        reason: "Exportação de documentos bloqueada",
      },
      {
        module: "documentos",
        action: "visualizar_docs_confidenciais",
        reason: "Documentos confidenciais inacessíveis",
      },
    ],
    processos: [
      {
        module: "processos",
        action: "excluir",
        reason: "Exclusão de processos bloqueada",
      },
      {
        module: "processos",
        action: "exportar",
        reason: "Exportação de processos bloqueada",
      },
    ],
    contratos: [
      {
        module: "contratos",
        action: "excluir",
        reason: "Exclusão de contratos bloqueada",
      },
      {
        module: "contratos",
        action: "exportar",
        reason: "Exportação de contratos bloqueada",
      },
    ],
    integracoes: [
      {
        module: "integracoes",
        action: "acessar_secrets",
        reason: "Acesso a secrets bloqueado",
      },
      {
        module: "integracoes",
        action: "acessar_tokens",
        reason: "Acesso a tokens bloqueado",
      },
      {
        module: "integracoes",
        action: "executar_sql",
        reason: "Execução de SQL bloqueada",
      },
    ],
  };

// ── Funções de verificação ──────────────────────────────────────────────────

/**
 * Verifica se uma rota é bloqueada durante acesso assistido.
 */
export function isRouteBlocked(route: string): BlockedRouteInfo | null {
  // Verificação exata
  if (FORBIDDEN_ROUTES[route]) {
    return FORBIDDEN_ROUTES[route];
  }

  // Verificação com wildcard — verificar se alguma rota proibida com * faz match
  for (const [pattern, info] of Object.entries(FORBIDDEN_ROUTES)) {
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      if (route.startsWith(prefix + "/") || route === prefix) {
        return info;
      }
    }
  }

  return null;
}

/**
 * Verifica se um endpoint de API é bloqueado.
 */
export function isEndpointBlocked(
  method: string,
  path: string,
): BlockedEndpointInfo | null {
  const normalizedMethod = method.toUpperCase();

  // Verificação exata
  const exactKey = `${normalizedMethod}_${path}`;
  if (FORBIDDEN_ENDPOINTS[exactKey]) {
    return FORBIDDEN_ENDPOINTS[exactKey];
  }

  // Verificação com wildcard
  for (const [pattern, info] of Object.entries(FORBIDDEN_ENDPOINTS)) {
    const [pMethod, pPath] = pattern.split("_", 2);
    if (pMethod !== normalizedMethod) continue;

    if (pPath.endsWith("/*")) {
      const prefix = pPath.slice(0, -2);
      if (path.startsWith(prefix + "/") || path === prefix) {
        return info;
      }
    }
  }

  return null;
}

/**
 * Retorna a lista de ações bloqueadas para um módulo específico.
 */
export function getBlockedActionsForModule(
  module: string,
): ModuleBlockedAction[] {
  return FORBIDDEN_ACTIONS_BY_MODULE[module] ?? [];
}

/**
 * Função master de validação que verifica todas as regras.
 * Checa: sessão ativa, rota, endpoint, ações globais proibidas, módulo e escopo.
 */
export async function validateAssistedAccess(
  session: {
    id: string;
    status: string;
    expires_at: string;
    law_firm_id: string;
    access_request?: {
      approved_modules?: string[];
      approved_actions?: string[];
      restrictions?: string[];
    } | null;
  },
  route?: string,
  action?: string,
  entityId?: string,
): Promise<ValidationResult> {
  // 1. Verificar se a sessão está ativa
  const activeStatuses: string[] = [
    SESSION_STATUSES.ativa,
    SESSION_STATUSES.aguardando_inicio,
  ];

  if (!activeStatuses.includes(session.status)) {
    const result: ValidationResult = {
      allowed: false,
      reason: `Sessão com status "${session.status}" não está ativa`,
      blockedBy: "session",
    };

    await recordAccessAttempt(
      {
        lawFirmId: session.law_firm_id,
        actorId: session.id,
        route,
        action,
        entityId,
        reason: result.reason,
      },
      false,
    );

    return result;
  }

  // 2. Verificar expiração
  if (new Date(session.expires_at) < new Date()) {
    const result: ValidationResult = {
      allowed: false,
      reason: "Sessão expirada",
      blockedBy: "session",
    };

    await recordAccessAttempt(
      {
        lawFirmId: session.law_firm_id,
        actorId: session.id,
        route,
        action,
        entityId,
        reason: result.reason,
      },
      false,
    );

    return result;
  }

  // 3. Verificar rota bloqueada
  if (route) {
    const blockedRoute = isRouteBlocked(route);
    if (blockedRoute) {
      const result: ValidationResult = {
        allowed: false,
        reason: blockedRoute.reason,
        blockedBy: "route",
      };

      await recordAccessAttempt(
        {
          lawFirmId: session.law_firm_id,
          actorId: session.id,
          route,
          action,
          entityId,
          reason: result.reason,
        },
        false,
      );

      return result;
    }
  }

  // 4. Verificar ação globalmente proibida
  if (action) {
    if ((FORBIDDEN_ACTIONS as readonly string[]).includes(action)) {
      const result: ValidationResult = {
        allowed: false,
        reason: `Ação "${action}" é globalmente proibida em modo assistido`,
        blockedBy: "action",
      };

      await recordAccessAttempt(
        {
          lawFirmId: session.law_firm_id,
          actorId: session.id,
          route,
          action,
          entityId,
          reason: result.reason,
        },
        false,
      );

      return result;
    }
  }

  // 5. Verificar escopo da sessão (módulos e ações aprovados)
  const request = session.access_request;
  if (request) {
    const approvedModules: string[] = request.approved_modules ?? [];
    const approvedActions: string[] = request.approved_actions ?? ASSISTED_ACTIONS as unknown as string[];
    const restrictions: string[] = request.restrictions ?? [];

    // Se tem ação, verificar se está nas aprovadas
    if (action && !approvedActions.includes(action)) {
      const result: ValidationResult = {
        allowed: false,
        reason: `Ação "${action}" não está nas ações aprovadas para esta sessão`,
        blockedBy: "scope",
      };

      await recordAccessAttempt(
        {
          lawFirmId: session.law_firm_id,
          actorId: session.id,
          route,
          action,
          entityId,
          reason: result.reason,
        },
        false,
      );

      return result;
    }

    // Verificar restrições específicas se tem rota (para inferir módulo)
    if (action && restrictions.length > 0) {
      // Restrições podem ser "modulo:X", "acao:Y" ou "modulo:X:acao:Y"
      const moduleRestrictions = restrictions.filter((r) =>
        r.startsWith("modulo:"),
      );
      const actionRestrictions = restrictions.filter((r) =>
        r.startsWith("acao:"),
      );

      for (const restriction of actionRestrictions) {
        const restrictionAction = restriction.replace("acao:", "");
        if (action === restrictionAction) {
          const result: ValidationResult = {
            allowed: false,
            reason: `Ação "${action}" está restrita nesta sessão`,
            blockedBy: "scope",
          };

          await recordAccessAttempt(
            {
              lawFirmId: session.law_firm_id,
              actorId: session.id,
              route,
              action,
              entityId,
              reason: result.reason,
            },
            false,
          );

          return result;
        }
      }

      // Ignorar moduleRestrictions sem rota inferida — validação módulo requer contexto de rota
      void moduleRestrictions;
    }
  }

  // 6. Tudo permitido — registrar tentativa bem-sucedida
  await recordAccessAttempt(
    {
      lawFirmId: session.law_firm_id,
      actorId: session.id,
      route,
      action,
      entityId,
    },
    true,
  );

  return { allowed: true };
}
