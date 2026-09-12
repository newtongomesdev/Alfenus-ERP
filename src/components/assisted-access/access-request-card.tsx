"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/formatters";
import type { AccessRequest } from "@/lib/assisted-access/queries";
import { canApproveAccess } from "@/lib/assisted-access/constants";

type AccessRequestCardProps = {
  request: AccessRequest;
  baseUrl: string;
  canManage?: boolean;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "outline",
  visualizada: "outline",
  aprovada: "secondary",
  aprovada_com_restrições: "secondary",
  recusada: "destructive",
  cancelada: "destructive",
  expirada: "destructive",
  utilizada: "default",
  encerrada: "secondary",
};

export function AccessRequestCard({
  request,
  baseUrl,
  canManage = false,
}: AccessRequestCardProps) {
  const variant = STATUS_VARIANT[request.status] ?? "outline";
  const isPending = request.status === "pendente" || request.status === "visualizada";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4 transition hover:bg-muted/30">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`${baseUrl}/${request.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {request.operator?.name ?? "Operador desconhecido"}
          </Link>
          <Badge variant={variant}>{request.status}</Badge>
          {request.ticket && (
            <Badge variant="outline">{request.ticket.protocol}</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate max-w-full">
          {request.reason}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span>{request.duration_minutes} min</span>
          <span>{request.requested_modules.length} módulo(s)</span>
          <span>{request.requested_actions.length} ação(ões)</span>
          <span>{formatDateTime(request.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`${baseUrl}/${request.id}`}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted"
        >
          Detalhes
        </Link>
      </div>
    </div>
  );
}
