"use client";

import { useState } from "react";
import {
  User,
  Clock,
  FileText,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Ban,
  Play,
  Square,
  AlertTriangle,
  Tag,
  Lock,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { AccessRequest, AccessEvent } from "@/lib/assisted-access/queries";
import type { AccessRequestStatus } from "@/lib/assisted-access/constants";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }
> = {
  pendente: {
    label: "Pendente",
    variant: "secondary",
    icon: <Clock className="size-3" />,
  },
  visualizada: {
    label: "Visualizada",
    variant: "outline",
    icon: <FileText className="size-3" />,
  },
  aprovada: {
    label: "Aprovada",
    variant: "default",
    icon: <CheckCircle2 className="size-3" />,
  },
  aprovada_com_restrições: {
    label: "Aprovada c/ Restrições",
    variant: "secondary",
    icon: <ShieldAlert className="size-3" />,
  },
  recusada: {
    label: "Recusada",
    variant: "destructive",
    icon: <XCircle className="size-3" />,
  },
  cancelada: {
    label: "Cancelada",
    variant: "outline",
    icon: <Ban className="size-3" />,
  },
  expirada: {
    label: "Expirada",
    variant: "destructive",
    icon: <AlertTriangle className="size-3" />,
  },
  utilizada: {
    label: "Em uso",
    variant: "default",
    icon: <Activity className="size-3" />,
  },
  encerrada: {
    label: "Encerrada",
    variant: "secondary",
    icon: <CheckCircle2 className="size-3" />,
  },
};

const EVENT_LABELS: Record<string, string> = {
  solicitacao_criada: "Solicitação criada",
  solicitacao_visualizada: "Solicitação visualizada",
  escopo_solicitado: "Escopo solicitado",
  escopo_alterado: "Escopo alterado",
  solicitacao_aprovada: "Solicitação aprovada",
  solicitacao_recusada: "Solicitação recusada",
  sessao_iniciada: "Sessão iniciada",
  rota_acessada: "Rota acessada",
  registro_visualizado: "Registro visualizado",
  configuracao_alterada: "Configuração alterada",
  tentativa_permitida: "Tentativa permitida",
  tentativa_bloqueada: "Tentativa bloqueada",
  documento_visualizado: "Documento visualizado",
  sessao_revogada: "Sessão revogada",
  sessao_expirada: "Sessão expirada",
  sessao_encerrada: "Sessão encerrada",
  resumo_enviado: "Resumo enviado",
  solicitacao_cancelada: "Solicitação cancelada",
};

const EVENT_ICONS: Record<string, React.ReactNode> = {
  solicitacao_criada: <FileText className="size-4" />,
  solicitacao_aprovada: <CheckCircle2 className="size-4 text-green-600" />,
  solicitacao_recusada: <XCircle className="size-4 text-red-600" />,
  sessao_iniciada: <Play className="size-4 text-blue-600" />,
  sessao_encerrada: <Square className="size-4 text-muted-foreground" />,
  sessao_revogada: <Ban className="size-4 text-orange-600" />,
  sessao_expirada: <AlertTriangle className="size-4 text-red-600" />,
  tentativa_bloqueada: <Lock className="size-4 text-red-500" />,
  solicitacao_cancelada: <Ban className="size-4 text-muted-foreground" />,
};

// ── Sub-componentes ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    variant: "outline" as const,
    icon: <AlertTriangle className="size-3" />,
  };
  return (
    <Badge variant={config.variant} className="inline-flex items-center gap-1">
      {config.icon}
      {config.label}
    </Badge>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-1.5">
      <span className="min-w-[120px] text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm">{children}</span>
    </div>
  );
}

function ScopeTagList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (items.length === 0) {
    return <span className="text-xs text-muted-foreground italic">{emptyText}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <Badge key={item} variant="outline" className="text-xs">
          {item}
        </Badge>
      ))}
    </div>
  );
}

function Timeline({ events }: { events: AccessEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        Nenhum evento registrado.
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border" />
      {events.map((event) => (
        <div key={event.id} className="relative flex gap-3 py-2">
          <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
            {EVENT_ICONS[event.event_type] ?? <Activity className="size-4 text-muted-foreground" />}
          </div>
          <div className="flex-1 pt-0.5">
            <p className="text-sm font-medium">
              {EVENT_LABELS[event.event_type] ?? event.event_type}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDate(event.created_at)}
              {event.actor_id && ` · Operador: ${event.actor_id.slice(0, 8)}`}
            </p>
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-muted-foreground/70">
                  Detalhes
                </summary>
                <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export interface SupportAccessRequestDetailProps {
  request: AccessRequest;
  events: AccessEvent[];
  currentUserRole?: string;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onStartSession?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  onBack?: () => void;
}

export function SupportAccessRequestDetail({
  request,
  events,
  currentUserRole,
  onApprove,
  onReject,
  onStartSession,
  onCancel,
  onBack,
}: SupportAccessRequestDetailProps) {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const canApprove = currentUserRole === "proprietario" || currentUserRole === "administrador";
  const isPending = request.status === "pendente" || request.status === "visualizada";
  const isApproved =
    request.status === "aprovada" || request.status === "aprovada_com_restrições";
  const isOperator = true; // Lógica real viria do contexto de sessão

  const handleApprove = () => {
    if (confirmAction === "approve") {
      onApprove?.(request.id);
      setConfirmAction(null);
    } else {
      setConfirmAction("approve");
    }
  };

  const handleReject = () => {
    if (confirmAction === "reject") {
      onReject?.(request.id);
      setConfirmAction(null);
    } else {
      setConfirmAction("reject");
    }
  };

  const handleCancel = () => {
    if (confirmAction === "cancel") {
      onCancel?.(request.id);
      setConfirmAction(null);
    } else {
      setConfirmAction("cancel");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon-sm" onClick={onBack} aria-label="Voltar">
              ←
            </Button>
          )}
          <div>
            <h2 className="text-lg font-semibold">
              Solicitação de Acesso Assistido
            </h2>
            <p className="text-xs text-muted-foreground">
              Ticket #{request.ticket?.protocol ?? request.ticket_id.slice(0, 8)}
            </p>
          </div>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {/* Informações do operador */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <User className="size-4" />
            Operador
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <InfoRow label="Nome">{request.operator?.name ?? "—"}</InfoRow>
          <InfoRow label="E-mail">{request.operator?.email ?? "—"}</InfoRow>
          <InfoRow label="Data da solicitação">
            {formatDate(request.created_at)}
          </InfoRow>
          {request.approved_by && request.approver && (
            <>
              <InfoRow label="Aprovado por">{request.approver.name}</InfoRow>
              <InfoRow label="Data da aprovação">
                {request.approved_at ? formatDate(request.approved_at) : "—"}
              </InfoRow>
            </>
          )}
        </CardContent>
      </Card>

      {/* Referência do ticket */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4" />
            Referência do Ticket
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <InfoRow label="Protocolo">
            {request.ticket?.protocol ?? "—"}
          </InfoRow>
          <InfoRow label="Assunto">
            {request.ticket?.subject ?? "—"}
          </InfoRow>
          <InfoRow label="Duração solicitada">
            {formatDuration(request.duration_minutes)}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Motivo */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FileText className="size-4" />
            Motivo da Solicitação
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
        </CardContent>
      </Card>

      {/* Escopo solicitado */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Tag className="size-4" />
            Escopo Solicitado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          <div>
            <Label className="text-xs text-muted-foreground">Módulos</Label>
            <div className="mt-1">
              <ScopeTagList
                items={request.requested_modules}
                emptyText="Nenhum módulo selecionado"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Ações</Label>
            <div className="mt-1">
              <ScopeTagList
                items={request.requested_actions}
                emptyText="Nenhuma ação selecionada"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Escopo aprovado (se aplicável) */}
      {request.approved_modules && request.approved_modules.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="size-4" />
              Escopo Aprovado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            <div>
              <Label className="text-xs text-muted-foreground">Módulos aprovados</Label>
              <div className="mt-1">
                <ScopeTagList
                  items={request.approved_modules}
                  emptyText="Nenhum módulo aprovado"
                />
              </div>
            </div>
            {request.approved_actions && request.approved_actions.length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Ações aprovadas</Label>
                <div className="mt-1">
                  <ScopeTagList
                    items={request.approved_actions}
                    emptyText="Nenhuma ação aprovada"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Restrições (se aplicável) */}
      {request.restrictions && request.restrictions.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-400">
              <Lock className="size-4" />
              Restrições
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <ul className="space-y-1">
              {request.restrictions.map((restriction, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-orange-500">•</span>
                  <span>{restriction}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Resumo (se encerrada) */}
      {request.summary && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4" />
              Resumo do Atendimento
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-sm whitespace-pre-wrap">{request.summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4" />
            Linha do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <Timeline events={events} />
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap gap-2">
            {canApprove && isPending && (
              <>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApprove}
                  className={
                    confirmAction === "approve"
                      ? "bg-green-600 hover:bg-green-700"
                      : ""
                  }
                >
                  <CheckCircle2 className="size-3.5" />
                  {confirmAction === "approve" ? "Confirmar Aprovação" : "Aprovar"}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleReject}
                >
                  <XCircle className="size-3.5" />
                  {confirmAction === "reject" ? "Confirmar Recusa" : "Recusar"}
                </Button>
              </>
            )}

            {isApproved && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onStartSession?.(request.id)}
              >
                <Play className="size-3.5" />
                Iniciar Sessão
              </Button>
            )}

            {isPending && isOperator && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className={
                  confirmAction === "cancel"
                    ? "border-orange-500 text-orange-600"
                    : ""
                }
              >
                <Ban className="size-3.5" />
                {confirmAction === "cancel" ? "Confirmar Cancelamento" : "Cancelar Solicitação"}
              </Button>
            )}
          </div>
          {confirmAction && (
            <p className="mt-2 text-xs text-muted-foreground">
              Clique novamente para confirmar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
