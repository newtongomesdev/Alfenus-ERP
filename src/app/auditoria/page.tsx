"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getErrorMessage } from "@/lib/utils";
import { type AuditLogEntry, type AuditFilters, getAuditLogs, getAuditStats } from "./actions";

const EVENT_TYPES = [
  "created", "updated", "deleted", "status_changed", "comment",
  "document", "payment", "deadline", "task", "workflow",
  "mention", "import", "bulk_action", "document_generated", "stage_changed",
];

const ENTITY_TYPES = [
  "client", "lead", "legal_case", "contract", "installment",
  "payment", "task", "deadline", "document", "expense",
  "time_entry", "workflow", "comment", "document_request",
];

const EVENT_LABELS: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  deleted: "Excluído",
  status_changed: "Status alterado",
  comment: "Comentário",
  document: "Documento",
  payment: "Pagamento",
  deadline: "Prazo",
  task: "Tarefa",
  workflow: "Workflow",
  mention: "Menção",
  import: "Importação",
  bulk_action: "Ação em lote",
  document_generated: "Documento gerado",
  stage_changed: "Estágio alterado",
};

const ENTITY_LABELS: Record<string, string> = {
  client: "Cliente",
  lead: "Lead",
  legal_case: "Processo",
  contract: "Contrato",
  installment: "Parcela",
  payment: "Pagamento",
  task: "Tarefa",
  deadline: "Prazo",
  document: "Documento",
  expense: "Despesa",
  time_entry: "Registro de Hora",
  workflow: "Workflow",
  comment: "Comentário",
  document_request: "Solicitação",
};

function EventBadge({ eventType }: { eventType: string }) {
  const colorMap: Record<string, string> = {
    created: "bg-emerald-100 text-emerald-700",
    updated: "bg-blue-100 text-blue-700",
    deleted: "bg-red-100 text-red-700",
    status_changed: "bg-amber-100 text-amber-700",
    comment: "bg-violet-100 text-violet-700",
    payment: "bg-emerald-100 text-emerald-700",
    document_generated: "bg-cyan-100 text-cyan-700",
  };
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${colorMap[eventType] ?? "bg-muted text-muted-foreground"}`}>
      {EVENT_LABELS[eventType] ?? eventType}
    </span>
  );
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<{ totalEvents: number; todayEvents: number; topActions: { action: string; count: number }[] } | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filtros
  const [eventType, setEventType] = useState("");
  const [entityType, setEntityType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async (p?: number) => {
    try {
      setLoading(true);
      const currentPage = p ?? page;
      const filters: AuditFilters = {};
      if (eventType) filters.eventType = eventType;
      if (entityType) filters.entityType = entityType;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (search) filters.search = search;

      const [result, statsData] = await Promise.all([
        getAuditLogs(filters, currentPage, 50),
        currentPage === 1 ? getAuditStats().catch(() => null) : null,
      ]);

      setLogs(result.items);
      setTotal(result.total);
      if (statsData) setStats(statsData);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [page, eventType, entityType, dateFrom, dateTo, search]);

  useEffect(() => { loadData(); }, []);

  const handleFilter = () => {
    setPage(1);
    startTransition(async () => { await loadData(1); });
  };

  const totalPages = Math.max(1, Math.ceil(total / 50));

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Auditoria"
        description={`${total} eventos registrados`}
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded border p-3 text-center">
            <p className="text-lg font-semibold">{stats.totalEvents}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="rounded border p-3 text-center">
            <p className="text-lg font-semibold">{stats.todayEvents}</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="rounded border p-3 text-center sm:col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Ações mais frequentes</p>
            <div className="flex flex-wrap gap-1 justify-center">
              {stats.topActions.slice(0, 5).map((a) => (
                <span key={a.action} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {EVENT_LABELS[a.action] ?? a.action} ({a.count})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 rounded-lg border bg-muted/30 p-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <Label className="text-xs">Buscar</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Título, descrição, ator..." className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Tipo de Evento</Label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="h-8 w-full rounded border bg-transparent px-2 text-sm">
              <option value="">Todos</option>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_LABELS[t] ?? t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Tipo de Entidade</Label>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)} className="h-8 w-full rounded border bg-transparent px-2 text-sm">
              <option value="">Todas</option>
              {ENTITY_TYPES.map((t) => <option key={t} value={t}>{ENTITY_LABELS[t] ?? t}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Data Início</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" />
          </div>
          <div>
            <Label className="text-xs">Data Fim</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleFilter} disabled={isPending} className="w-full">
              Filtrar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum evento encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Ator</th>
                <th className="px-3 py-2 text-left font-medium">Evento</th>
                <th className="px-3 py-2 text-left font-medium">Entidade</th>
                <th className="px-3 py-2 text-left font-medium">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 text-xs whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2">{log.actorName ?? "Sistema"}</td>
                  <td className="px-3 py-2"><EventBadge eventType={log.eventType} /></td>
                  <td className="px-3 py-2">
                    {ENTITY_LABELS[log.entityType] ?? log.entityType}
                    {log.entityTitle && <span className="ml-1 text-muted-foreground">· {log.entityTitle}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                    {log.description ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setPage((p) => Math.max(1, p - 1)); }} disabled={page <= 1}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); }} disabled={page >= totalPages}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
