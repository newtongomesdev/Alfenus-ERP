"use client";

import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  AssistedAccessContext,
  DEFAULT_ASSISTED_ACCESS_STATE,
  calculateTimeRemaining,
  isSessionActive,
  isReadOnlyScope,
  type AssistedAccessState,
  type AssistedAccessSessionData,
  type AssistedAccessScope,
} from "@/lib/assisted-access/context";

// ── Props ───────────────────────────────────────────────────────────────────

type AssistedAccessProviderProps = {
  children: ReactNode;
  /** ID do tenant (law_firm_id) para buscar sessões ativas */
  lawFirmId: string;
  /** ID do membro logado */
  memberId: string;
  /** Nome do tenant para exibição no banner do operador */
  tenantName?: string;
};

// ── Intervalo de polling ────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 60_000; // 60 segundos
const TICK_INTERVAL_MS = 1_000; // 1 segundo para o timer

// ── Provider ────────────────────────────────────────────────────────────────

export function AssistedAccessProvider({
  children,
  lawFirmId,
  memberId,
  tenantName,
}: AssistedAccessProviderProps) {
  const [session, setSession] = useState<AssistedAccessSessionData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [loading, setLoading] = useState(true);

  // ── Buscar sessão ativa ─────────────────────────────────────────────────

  const fetchActiveSession = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      // Verificar se o membro logado é o operador de alguma sessão ativa
      const { data: operatorSession } = await supabase
        .from("support_access_sessions")
        .select(
          "*, access_request:support_access_requests(id, reason, requested_modules, requested_actions, approved_modules, approved_actions, restrictions, duration_minutes, ticket:support_tickets(id, protocol, subject))",
        )
        .eq("operator_id", memberId)
        .in("status", ["ativa", "aguardando_inicio"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (operatorSession) {
        setSession(operatorSession as AssistedAccessSessionData);
        setLoading(false);
        return;
      }

      // Verificar se há alguma sessão ativa neste tenant
      // (visão do tenant — o operador está acessando)
      const { data: tenantSession } = await supabase
        .from("support_access_sessions")
        .select(
          "*, access_request:support_access_requests(id, reason, requested_modules, requested_actions, approved_modules, approved_actions, restrictions, duration_minutes, ticket:support_tickets(id, protocol, subject)), operator:law_firm_members!support_access_sessions_operator_id_fkey(id, name, email)",
        )
        .eq("law_firm_id", lawFirmId)
        .in("status", ["ativa", "aguardando_inicio"])
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tenantSession) {
        setSession(tenantSession as AssistedAccessSessionData);
      } else {
        setSession(null);
      }
    } catch {
      // Erro silencioso — sessão será null
    } finally {
      setLoading(false);
    }
  }, [lawFirmId, memberId]);

  // ── Efeito: buscar sessão no mount e a cada 60s ─────────────────────────

  useEffect(() => {
    fetchActiveSession();

    const pollId = setInterval(() => {
      fetchActiveSession();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(pollId);
  }, [fetchActiveSession]);

  // ── Efeito: tick do timer a cada segundo ─────────────────────────────────

  useEffect(() => {
    if (!session) return;

    const tick = () => {
      const remaining = calculateTimeRemaining(session.expires_at);
      setTimeRemaining(remaining);

      // Sessão expirou no client-side
      if (remaining <= 0 && isSessionActive(session)) {
        setSession(null);
      }
    };

    tick(); // Cálculo imediato

    const tickId = setInterval(tick, TICK_INTERVAL_MS);
    return () => clearInterval(tickId);
  }, [session]);

  // ── Valores derivados ───────────────────────────────────────────────────

  const value = useMemo<AssistedAccessState>(() => {
    if (!session) {
      return DEFAULT_ASSISTED_ACCESS_STATE;
    }

    const isActive = isSessionActive(session);
    const request = session.access_request;
    const approvedModules: string[] = request?.approved_modules ?? [];
    const approvedActions: string[] = request?.approved_actions ?? [];
    const restrictions: string[] = request?.restrictions ?? [];
    const readOnly = isReadOnlyScope(approvedActions);

    const scopes: AssistedAccessScope = {
      modules: approvedModules,
      actions: approvedActions,
      restrictions,
    };

    // Operador: quem está fazendo o acesso
    const operator = session.operator ?? null;

    // Ticket: do access_request
    const ticket = request?.ticket ?? null;

    // Tenant: sempre o law_firm_id da sessão
    const tenant = {
      id: lawFirmId,
      name: tenantName ?? "Tenant",
    };

    return {
      session,
      operator,
      tenant,
      ticket,
      scopes,
      timeRemaining,
      isActive,
      readOnly,
      allowedModules: approvedModules,
      allowedActions: approvedActions,
    };
  }, [session, timeRemaining, lawFirmId, tenantName]);

  return (
    <AssistedAccessContext.Provider value={value}>
      {children}
    </AssistedAccessContext.Provider>
  );
}
