import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock, Shield, ShieldCheck, ShieldX, Play, XCircle } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { getAccessRequestById, getAccessEvents } from "@/lib/assisted-access/queries";
import { getSessionTimeRemaining } from "@/lib/assisted-access/service";
import { canApproveAccess, ASSISTED_MODULES, ASSISTED_ACTIONS } from "@/lib/assisted-access/constants";
import { AccessApprovalDialog } from "@/components/assisted-access/access-approval-dialog";
import { AccessRejectDialog } from "@/components/assisted-access/access-reject-dialog";

const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  configuracoes: "Configurações",
  usuarios: "Usuários",
  clientes: "Clientes",
  processos: "Processos",
  contratos: "Contratos",
  prazos: "Prazos",
  tarefas: "Tarefas",
  documentos: "Documentos",
  relatorios: "Relatórios",
  suporte: "Suporte",
  onboarding: "Onboarding",
  integracoes: "Integrações",
  financeiro: "Financeiro",
};

const ACTION_LABELS: Record<string, string> = {
  visualizar: "Visualizar",
  diagnosticar: "Diagnosticar",
  editar_configuracao: "Editar configuração",
  criar_registro_tecnico: "Criar registro técnico",
  executar_correcao: "Executar correção",
  visualizar_metadados: "Visualizar metadados",
  visualizar_logs: "Visualizar logs",
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

export default async function AssistedAccessDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getAppContext();
  const { id } = await params;

  if (
    context.status !== "ready" ||
    !context.member ||
    !context.lawFirm
  ) {
    redirect("/entrar");
  }

  const request = await getAccessRequestById(id, context.lawFirm.id);
  if (!request) {
    return (
      <AppShell memberName={context.member.name}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/configuracoes/acesso-assistido" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="size-4" /> Voltar
            </Link>
          </div>
          <PageHeader title="Solicitação não encontrada" description="A solicitação de acesso assistido não foi encontrada." />
        </div>
      </AppShell>
    );
  }

  const events = await getAccessEvents(id);
  const canManage = can(context.member.role, "configuracoes.administrar");
  const isPending = request.status === "pendente" || request.status === "visualizada";
  const isApproved = request.status === "aprovada" || request.status === "aprovada_com_restrições";
  const isOperator = request.operator_id === context.member.id;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/configuracoes/acesso-assistido" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <PageHeader
          title="Detalhe da Solicitação"
          description={`Solicitação de acesso assistido de ${request.operator?.name ?? "—"}`}
          actions={
            isPending && canManage ? (
              <div className="flex gap-2">
                <AccessRejectDialog requestId={request.id} />
                <AccessApprovalDialog request={request} />
              </div>
            ) : isApproved && canManage ? (
              <Badge variant="outline">
                <ShieldCheck className="mr-1 size-3" /> Aprovada — aguardando início
              </Badge>
            ) : null
          }
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-lg">
            <CardHeader>
              <CardTitle>Informações da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <div className="mt-1">
                  <StatusBadge value={request.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Operador</p>
                <p className="mt-1 font-medium">{request.operator?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{request.operator?.email ?? ""}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Motivo</p>
                <p className="mt-1">{request.reason}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Ticket</p>
                <p className="mt-1">
                  {request.ticket ? (
                    <Link href={`/suporte/${request.ticket.id}`} className="text-primary underline-offset-4 hover:underline">
                      {request.ticket.protocol} — {request.ticket.subject}
                    </Link>
                  ) : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Duração solicitada</p>
                <p className="mt-1 font-medium">{request.duration_minutes} minutos</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Aprovado por</p>
                <p className="mt-1">{request.approver?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="mt-1">{formatDateTime(request.created_at)}</p>
              </div>
              {request.approved_at && (
                <div>
                  <p className="text-xs text-muted-foreground">Aprovado em</p>
                  <p className="mt-1">{formatDateTime(request.approved_at)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle>Escopo Solicitado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Módulos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {request.requested_modules.map((mod) => (
                      <Badge key={mod} variant="outline">
                        {MODULE_LABELS[mod] ?? mod}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Ações</p>
                  <div className="flex flex-wrap gap-1.5">
                    {request.requested_actions.map((action) => (
                      <Badge key={action} variant="secondary">
                        {ACTION_LABELS[action] ?? action}
                      </Badge>
                    ))}
                  </div>
                </div>
                {request.restrictions && request.restrictions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-destructive mb-2">Restrições</p>
                    <div className="flex flex-wrap gap-1.5">
                      {request.restrictions.map((restriction) => (
                        <Badge key={restriction} variant="destructive">
                          {restriction}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {request.summary && (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle>Resumo da Sessão</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{request.summary}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Histórico de Eventos</CardTitle>
            <CardDescription>{events.length} evento(s) registrado(s).</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum evento registrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Metadados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EVENT_LABELS[event.event_type] ?? event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {Object.keys(event.metadata).length > 0
                          ? JSON.stringify(event.metadata)
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
