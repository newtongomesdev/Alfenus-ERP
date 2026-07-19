"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/formatters";

import { getErrorMessage } from "@/lib/utils";
import {
  type DocumentRequest,
  getDocumentRequests,
  createDocumentRequest,
  updateDocumentRequestStatus,
  deleteDocumentRequest,
} from "./actions";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

const DOC_TYPES = [
  "RG", "CPF", "CNPJ", "Comprovante de Residência", "Certidão",
  "Contrato", "Procuração", "Petição", "Sentença", "Outro",
];

const PRIORITY_COLORS: Record<string, string> = {
  baixa: "text-muted-foreground",
  normal: "text-foreground",
  alta: "text-amber-600",
  urgente: "text-red-600 font-semibold",
};

function NewRequestForm({ onSubmit, onClose }: { onSubmit: (data: { title: string; description: string; documentType: string; priority: string; dueDate?: string }) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [documentType, setDocumentType] = useState("outro");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");

  return (
    <div className="rounded-lg border bg-white p-4 shadow-lg space-y-3">
      <h3 className="text-sm font-semibold">Nova Solicitação</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="req-title">Título *</Label>
          <Input id="req-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: RG do cliente" />
        </div>
        <div>
          <Label htmlFor="req-type">Tipo de documento</Label>
          <select id="req-type" value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="req-priority">Prioridade</Label>
          <select id="req-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </div>
        <div>
          <Label htmlFor="req-due">Prazo</Label>
          <Input id="req-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="req-desc">Descrição</Label>
          <textarea id="req-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm" placeholder="Detalhes da solicitação..." />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm" onClick={() => onSubmit({ title, description, documentType, priority, dueDate: dueDate || undefined })} disabled={!title.trim()}>
          Criar Solicitação
        </Button>
      </div>
    </div>
  );
}

export default function SolicitacoesPage() {
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDocumentRequests(statusFilter ? { status: statusFilter } : undefined);
      setRequests(data);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreate = useCallback((data: any) => {
    startTransition(async () => {
      try {
        await createDocumentRequest(data);
        setShowNewForm(false);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const handleStatusChange = useCallback((requestId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateDocumentRequestStatus(requestId, newStatus);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const handleDelete = useCallback((requestId: string) => {
    if (!confirm("Excluir esta solicitação?")) return;
    startTransition(async () => {
      try {
        await deleteDocumentRequest(requestId);
        await loadData();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadData]);

  const stats = {
    total: requests.length,
    pendente: requests.filter((r) => r.status === "pendente").length,
    emAndamento: requests.filter((r) => r.status === "em_andamento").length,
    concluido: requests.filter((r) => r.status === "concluido").length,
  };

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Solicitações de Documentos"
        description={`${stats.total} solicitações • ${stats.pendente} pendentes • ${stats.emAndamento} em andamento`}
        actions={
          <Button size="sm" onClick={() => setShowNewForm(!showNewForm)}>
            {showNewForm ? "Cancelar" : "Nova Solicitação"}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {showNewForm && (
        <div className="mb-4">
          <NewRequestForm onSubmit={handleCreate} onClose={() => setShowNewForm(false)} />
        </div>
      )}

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              statusFilter === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
          Carregando solicitações...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma solicitação encontrada.
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((req) => (
            <div key={req.id} className="rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium">{req.title}</h3>
                    <span className={`text-xs ${PRIORITY_COLORS[req.priority] ?? ""}`}>
                      {req.priority === "urgente" ? "•" : ""} {req.priority}
                    </span>
                  </div>
                  {req.description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{req.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="rounded bg-muted px-1.5 py-0.5">{req.documentType}</span>
                    {req.clientName && <span>Cliente: {req.clientName}</span>}
                    {req.caseName && <span>Processo: {req.caseName}</span>}
                    {req.requestedByName && <span>Solicitado por: {req.requestedByName}</span>}
                    {req.dueDate && <span>Prazo: {formatDate(req.dueDate)}</span>}
                    <span>{formatDate(req.createdAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={req.status} />
                  <select
                    value={req.status}
                    onChange={(e) => handleStatusChange(req.id, e.target.value)}
                    disabled={isPending}
                    className="h-7 rounded border px-1 text-xs"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                  <button
                    onClick={() => handleDelete(req.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-red-600"
                    title="Excluir"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
