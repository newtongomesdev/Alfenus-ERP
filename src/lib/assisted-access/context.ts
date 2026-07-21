"use client";

import { createContext, useContext } from "react";
import type { AccessSession, AccessRequest } from "./queries";

// ── Tipos ───────────────────────────────────────────────────────────────────

export type AssistedAccessSessionData = AccessSession;

export type AssistedAccessOperator = {
  id: string;
  name: string;
  email: string;
};

export type AssistedAccessTenant = {
  id: string;
  name: string;
};

export type AssistedAccessTicket = {
  id: string;
  protocol: string;
  subject: string;
};

export type AssistedAccessScope = {
  modules: string[];
  actions: string[];
  restrictions: string[];
};

export type AssistedAccessState = {
  /** Dados da sessão ativa ou null se não houver sessão */
  session: AssistedAccessSessionData | null;
  /** Informações do operador que está acessando */
  operator: AssistedAccessOperator | null;
  /** Tenant sendo acessado (apenas na visualização do tenant) */
  tenant: AssistedAccessTenant | null;
  /** Ticket de suporte relacionado */
  ticket: AssistedAccessTicket | null;
  /** Escopos aprovados para a sessão */
  scopes: AssistedAccessScope;
  /** Minutos restantes até expiração */
  timeRemaining: number;
  /** Se a sessão está ativa */
  isActive: boolean;
  /** Se o escopo é somente leitura (apenas ação visualizar) */
  readOnly: boolean;
  /** Módulos que o operador pode acessar */
  allowedModules: string[];
  /** Ações que o operador pode executar */
  allowedActions: string[];
};

// ── Estado padrão ───────────────────────────────────────────────────────────

export const DEFAULT_ASSISTED_ACCESS_STATE: AssistedAccessState = {
  session: null,
  operator: null,
  tenant: null,
  ticket: null,
  scopes: {
    modules: [],
    actions: [],
    restrictions: [],
  },
  timeRemaining: 0,
  isActive: false,
  readOnly: true,
  allowedModules: [],
  allowedActions: [],
};

// ── Context ─────────────────────────────────────────────────────────────────

export const AssistedAccessContext = createContext<AssistedAccessState>(
  DEFAULT_ASSISTED_ACCESS_STATE,
);

// ── Hook de acesso ──────────────────────────────────────────────────────────

export function useAssistedAccess(): AssistedAccessState {
  const context = useContext(AssistedAccessContext);
  return context;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calcula os minutos restantes a partir de um timestamp de expiração.
 */
export function calculateTimeRemaining(expiresAt: string): number {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60));
}

/**
 * Verifica se uma sessão está ativa considerando status e expiração.
 */
export function isSessionActive(
  session: { status: string; expires_at: string } | null,
): boolean {
  if (!session) return false;

  const activeStatuses = ["ativa", "aguardando_inicio"];
  if (!activeStatuses.includes(session.status)) return false;

  return calculateTimeRemaining(session.expires_at) > 0;
}

/**
 * Verifica se o escopo é somente leitura (apenas ação "visualizar" aprovada).
 */
export function isReadOnlyScope(actions: string[]): boolean {
  return actions.length === 1 && actions[0] === "visualizar";
}

/**
 * Verifica se um módulo está autorizado.
 */
export function isModuleAuthorized(
  module: string,
  allowedModules: string[],
): boolean {
  return allowedModules.includes(module);
}

/**
 * Verifica se uma ação está autorizada.
 */
export function isActionAuthorized(
  action: string,
  allowedActions: string[],
): boolean {
  return allowedActions.includes(action);
}
