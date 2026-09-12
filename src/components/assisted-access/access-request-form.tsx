"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ASSISTED_MODULES,
  ASSISTED_ACTIONS,
  DURATION_OPTIONS,
  MAX_DURATION_MINUTES,
} from "@/lib/assisted-access/constants";
import { requestSupportAccessAction } from "@/lib/assisted-access/actions";

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

type AccessRequestFormProps = {
  ticketId: string;
  ticketProtocol?: string;
};

export function AccessRequestForm({ ticketId, ticketProtocol }: AccessRequestFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>(["visualizar"]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [customDuration, setCustomDuration] = useState(false);
  const [reason, setReason] = useState("");
  const [technicalDescription, setTechnicalDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const toggleModule = (mod: string) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    );
  };

  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action],
    );
  };

  const handleSubmit = () => {
    setError(null);

    if (!reason.trim() || reason.trim().length < 5) {
      setError("O motivo deve ter pelo menos 5 caracteres.");
      return;
    }
    if (selectedModules.length === 0) {
      setError("Selecione pelo menos um módulo.");
      return;
    }
    if (selectedActions.length === 0) {
      setError("Selecione pelo menos uma ação.");
      return;
    }
    if (durationMinutes <= 0 || durationMinutes > MAX_DURATION_MINUTES) {
      setError(`A duração deve ser entre 1 e ${MAX_DURATION_MINUTES} minutos.`);
      return;
    }

    startTransition(async () => {
      try {
        await requestSupportAccessAction(
          ticketId,
          reason.trim(),
          selectedModules,
          selectedActions,
          durationMinutes,
        );
      } catch {
        setError("Erro ao enviar solicitação. Tente novamente.");
      }
    });
  };

  return (
    <Card className="rounded-lg">
      <CardHeader>
        <CardTitle>Solicitar Acesso Assistido</CardTitle>
        <CardDescription>
          {ticketProtocol
            ? `Para o ticket ${ticketProtocol} — solicite acesso temporário ao escritório.`
            : "Solicite acesso temporário ao escritório para suporte técnico."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Módulos */}
        <div>
          <p className="text-sm font-semibold mb-2">Módulos solicitados</p>
          <p className="text-xs text-muted-foreground mb-3">
            Selecione os módulos que precisa acessar.
          </p>
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

        {/* Ações */}
        <div>
          <p className="text-sm font-semibold mb-2">Ações solicitadas</p>
          <p className="text-xs text-muted-foreground mb-3">
            Selecione as ações que precisa executar.
          </p>
          <div className="flex flex-wrap gap-2">
            {ASSISTED_ACTIONS.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => toggleAction(action)}
                className={`inline-flex h-7 items-center justify-center rounded-lg border px-2.5 text-xs font-medium transition ${
                  selectedActions.includes(action)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {ACTION_LABELS[action] ?? action}
              </button>
            ))}
          </div>
        </div>

        {/* Duração */}
        <div>
          <p className="text-sm font-semibold mb-2">Duração</p>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-3 text-xs font-medium transition ${
                    !customDuration && durationMinutes === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="duration"
                    value={option.value}
                    checked={!customDuration && durationMinutes === option.value}
                    onChange={() => {
                      setDurationMinutes(option.value);
                      setCustomDuration(false);
                    }}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
              <label
                className={`inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border px-3 text-xs font-medium transition ${
                  customDuration
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="duration"
                  checked={customDuration}
                  onChange={() => setCustomDuration(true)}
                  className="sr-only"
                />
                Personalizar
              </label>
            </div>
            {customDuration && (
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-muted-foreground">
                  minutos (máx. {MAX_DURATION_MINUTES})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Motivo */}
        <div>
          <label htmlFor="reason" className="text-sm font-semibold">
            Motivo da solicitação
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Descreva brevemente por que precisa de acesso.
          </p>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Ex: Preciso diagnosticar um problema de configuração no módulo de clientes..."
          />
        </div>

        {/* Descrição técnica */}
        <div>
          <label htmlFor="technicalDescription" className="text-sm font-semibold">
            Descrição técnica <span className="text-muted-foreground font-normal">(opcional)</span>
          </label>
          <textarea
            id="technicalDescription"
            value={technicalDescription}
            onChange={(e) => setTechnicalDescription(e.target.value)}
            rows={2}
            className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            placeholder="Detalhes técnicos adicionais, se houver..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSubmit}
            disabled={isPending}
          >
            Enviar solicitação
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
