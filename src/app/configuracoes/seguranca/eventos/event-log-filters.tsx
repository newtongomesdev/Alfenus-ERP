"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  LogIn,
  LogOut,
  Key,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

type AuditEvent = {
  id: string;
  action: string;
  actorName: string;
  actorEmail: string;
  ipAddress: string | null;
  result: string;
  metadata: Record<string, any> | null;
  createdAt: string;
};

const SECURITY_EVENT_TYPES = [
  "sign_in",
  "sign_in_mfa",
  "sign_out",
  "mfa_challenge_success",
  "mfa_challenge_failure",
  "password_changed",
  "session_revoked",
  "admin_mfa_reset",
] as const;

const eventLabel: Record<string, string> = {
  sign_in: "Login",
  sign_in_mfa: "Login com MFA",
  sign_out: "Logout",
  mfa_challenge_success: "MFA - Sucesso",
  mfa_challenge_failure: "MFA - Falha",
  password_changed: "Senha alterada",
  session_revoked: "Sessao revogada",
  admin_mfa_reset: "MFA resetado (admin)",
};

const eventIcon: Record<string, typeof Shield> = {
  sign_in: LogIn,
  sign_in_mfa: ShieldCheck,
  sign_out: LogOut,
  mfa_challenge_success: ShieldCheck,
  mfa_challenge_failure: ShieldOff,
  password_changed: Key,
  session_revoked: AlertTriangle,
  admin_mfa_reset: RotateCcw,
};

const eventBadgeStyle: Record<string, string> = {
  sign_in:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  sign_in_mfa:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  sign_out:
    "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  mfa_challenge_success:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  mfa_challenge_failure:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  password_changed:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  session_revoked:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  admin_mfa_reset:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export function EventLogFilters({ events }: { events: AuditEvent[] }) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filtered = activeFilter
    ? events.filter((e) => e.action === activeFilter)
    : events;

  const filterCounts = events.reduce(
    (acc, e) => {
      acc[e.action] = (acc[e.action] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            activeFilter === null
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:bg-muted/50"
          }`}
        >
          Todos ({events.length})
        </button>
        {SECURITY_EVENT_TYPES.map((type) => {
          const count = filterCounts[type] ?? 0;
          if (count === 0) return null;
          const Icon = eventIcon[type] ?? Shield;
          return (
            <button
              key={type}
              onClick={() => setActiveFilter(activeFilter === type ? null : type)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === type
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="size-3" />
              {eventLabel[type] ?? type} ({count})
            </button>
          );
        })}
      </div>

      {/* Events Table */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nenhum evento de seguranca encontrado.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>Resultado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((event) => {
              const Icon = eventIcon[event.action] ?? Shield;
              return (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`border-0 ${eventBadgeStyle[event.action] ?? ""}`}
                    >
                      <Icon className="size-3" />
                      {eventLabel[event.action] ?? event.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {event.actorName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {event.actorEmail}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {event.ipAddress ?? "—"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs font-medium ${
                        event.result === "sucesso"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : event.result === "falha"
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground"
                      }`}
                    >
                      {event.result.charAt(0).toUpperCase() + event.result.slice(1)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
