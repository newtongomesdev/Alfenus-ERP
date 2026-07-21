"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ASSISTED_MODULES,
  DURATION_OPTIONS,
  MAX_DURATION_MINUTES,
} from "@/lib/assisted-access/constants";
import { approveSupportAccessAction } from "@/lib/assisted-access/actions";
import type { AccessRequest } from "@/lib/assisted-access/queries";

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

type AccessApprovalDialogProps = {
  request: AccessRequest;
};

export function AccessApprovalDialog({ request }: AccessApprovalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [durationMinutes, setDurationMinutes] = useState(request.duration_minutes);
  const [selectedModules, setSelectedModules] = useState<string[]>(request.requested_modules);
  const [restrictions, setRestrictions] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggleModule = (mod: string) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  };

  const handleApprove = () => {
    setError(null);

    if (selectedModules.length === 0) {
      setError("Selecione pelo menos um módulo.");
      return;
    }
    if (durationMinutes <= 0 || durationMinutes > MAX_DURATION_MINUTES) {
      setError(`A duração deve ser entre 1 e ${MAX_DURATION_MINUTES} minutos.`);
      return;
    }

    const restrictionsList = restrictions
      .split("\n")
      .map((r) => r.trim())
      .filter((r) => r.length > 0);

    startTransition(async () => {
      try {
        await approveSupportAccessAction(
          request.id,
          durationMinutes,
          selectedModules,
          restrictionsList.length > 0 ? restrictionsList : undefined,
        );
        setIsOpen(false);
      } catch {
        setError("Erro ao aprovar solicitação. Tente novamente.");
      }
    });
  };

  if (!isOpen) {
    return (
      <Button
        type="button"
        size="sm"
        className="bg-[var(--chart-2)] text-white hover:bg-[var(--chart-2)]/80"
        onClick={() => setIsOpen(true)}
      >
        Aprovar
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="mx-4 w-full max-w-lg rounded-lg">
        <CardHeader>
          <CardTitle>Aprovar Solicitação de Acesso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo da solicitação */}
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Operador:</span>
              <span className="font-medium">{request.operator?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ticket:</span>
              <span className="font-medium">{request.ticket?.protocol ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Motivo:</span>
              <span className="max-w-[60%] text-right">{request.reason}</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Ajuste de duração */}
          <div>
            <p className="text-sm font-semibold mb-2">Duração (minutos)</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDurationMinutes(option.value)}
                  className={`inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition ${
                    durationMinutes === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={MAX_DURATION_MINUTES}
                value={durationMinutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setDurationMinutes(val);
                }}
                className="h-8 w-24 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              />
              <span className="text-xs text-muted-foreground">minutos</span>
            </div>
          </div>

          {/* Ajuste de módulos */}
          <div>
            <p className="text-sm font-semibold mb-2">Módulos aprovados</p>
            <div className="flex flex-wrap gap-2">
              {ASSISTED_MODULES.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleModule(mod)}
                  className={`inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition ${
                    selectedModules.includes(mod)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {MODULE_LABELS[mod] ?? mod}
                </button>
              ))}
            </div>
          </div>

          {/* Restrições */}
          <div>
            <label htmlFor="restrictions" className="text-sm font-semibold">
              Restrições <span className="text-muted-foreground font-normal">(opcional, uma por linha)</span>
            </label>
            <textarea
              id="restrictions"
              value={restrictions}
              onChange={(e) => setRestrictions(e.target.value)}
              rows={3}
              className="mt-1 flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder={"Ex:\nclientes:visualizar\nmodulo:financeiro\nacao:editar_configuracao"}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleApprove}
              disabled={isPending}
              className="bg-[var(--chart-2)] text-white hover:bg-[var(--chart-2)]/80"
            >
              {isPending ? "Aprovando..." : "Confirmar aprovação"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
