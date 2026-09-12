"use client";

import { useState, useCallback } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ASSISTED_MODULES,
  ASSISTED_ACTIONS,
  FORBIDDEN_ACTIONS,
  type AssistedModule,
  type AssistedAction,
} from "@/lib/assisted-access/constants";

// ── Descrições dos módulos ──────────────────────────────────────────────────

const MODULE_DESCRIPTIONS: Record<string, string> = {
  dashboard: "Visão geral e métricas do sistema",
  configuracoes: "Configurações gerais do escritório",
  usuarios: "Gestão de membros e permissões",
  clientes: "Cadastro e dados de clientes",
  processos: "Acompanhamento de processos jurídicos",
  contratos: "Gestão de contratos e documentos",
  prazos: "Controle de prazos e audiências",
  tarefas: "Gestão de tarefas e atividades",
  documentos: "Repositório de documentos",
  relatorios: "Relatórios e analytics",
  suporte: "Central de suporte e tickets",
  onboarding: "Onboarding de novos usuários",
  integracoes: "Integrações com sistemas externos",
  financeiro: "Gestão financeira e cobrança",
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  visualizar: "Visualizar dados e registros",
  diagnosticar: "Diagnosticar problemas técnicos",
  editar_configuracao: "Editar configurações do sistema",
  criar_registro_tecnico: "Criar registros de suporte técnico",
  executar_correcao: "Executar correções e patches",
  visualizar_metadados: "Visualizar metadados do sistema",
  visualizar_logs: "Visualizar logs de auditoria",
};

// ── Tipos ───────────────────────────────────────────────────────────────────

export type ScopeSelection = {
  modules: AssistedModule[];
  actions: AssistedAction[];
  resourceId?: string;
  restrictions: string[];
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatModuleLabel(mod: string): string {
  return mod.charAt(0).toUpperCase() + mod.slice(1).replace(/_/g, " ");
}

function formatActionLabel(action: string): string {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ── Componente principal ─────────────────────────────────────────────────────

interface SupportAccessScopeSelectorProps {
  value: ScopeSelection;
  onChange: (selection: ScopeSelection) => void;
  disabled?: boolean;
  showRestrictions?: boolean;
}

export function SupportAccessScopeSelector({
  value,
  onChange,
  disabled = false,
  showRestrictions = true,
}: SupportAccessScopeSelectorProps) {
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [restrictionInput, setRestrictionInput] = useState("");

  const toggleModule = useCallback(
    (module: AssistedModule) => {
      const newModules = value.modules.includes(module)
        ? value.modules.filter((m) => m !== module)
        : [...value.modules, module];

      // Se o módulo está sendo removido, remover também suas ações exclusivas
      const newActions = [...value.actions];

      onChange({
        ...value,
        modules: newModules as AssistedModule[],
        actions: newActions as AssistedAction[],
      });
    },
    [value, onChange],
  );

  const toggleAction = useCallback(
    (action: AssistedAction) => {
      const newActions = value.actions.includes(action)
        ? value.actions.filter((a) => a !== action)
        : [...value.actions, action];

      onChange({
        ...value,
        actions: newActions as AssistedAction[],
      });
    },
    [value, onChange],
  );

  const toggleModuleExpansion = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  const addRestriction = () => {
    const trimmed = restrictionInput.trim();
    if (trimmed && !value.restrictions.includes(trimmed)) {
      onChange({
        ...value,
        restrictions: [...value.restrictions, trimmed],
      });
      setRestrictionInput("");
    }
  };

  const removeRestriction = (restriction: string) => {
    onChange({
      ...value,
      restrictions: value.restrictions.filter((r) => r !== restriction),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addRestriction();
    }
  };

  const selectedCount = value.modules.length;
  const hasRestrictions = value.restrictions.length > 0;

  return (
    <div className="space-y-4">
      {/* Resumo visual */}
      <Card className={hasRestrictions ? "border-orange-200 dark:border-orange-800" : ""}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasRestrictions ? (
                <ShieldAlert className="size-5 text-orange-600" />
              ) : selectedCount > 0 ? (
                <ShieldCheck className="size-5 text-green-600" />
              ) : (
                <Shield className="size-5 text-muted-foreground" />
              )}
              <div>
                <p className="text-sm font-medium">
                  {selectedCount} módulo(s) selecionado(s)
                </p>
                <p className="text-xs text-muted-foreground">
                  {value.actions.length} ação(ões) habilitada(s)
                  {hasRestrictions && ` · ${value.restrictions.length} restrição(ões)`}
                </p>
              </div>
            </div>
            {selectedCount > 0 && (
              <div className="flex flex-wrap gap-1">
                {value.modules.slice(0, 3).map((mod) => (
                  <Badge key={mod} variant="secondary" className="text-xs">
                    {formatModuleLabel(mod)}
                  </Badge>
                ))}
                {selectedCount > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedCount - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seleção de módulos */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Módulos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pb-3">
          {ASSISTED_MODULES.map((module) => {
            const isSelected = value.modules.includes(module);
            const isExpanded = expandedModules.has(module);

            return (
              <div key={module}>
                <div
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                    isSelected ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleModule(module)}
                    disabled={disabled}
                  />
                  <button
                    type="button"
                    className="flex flex-1 items-center gap-1 text-left text-sm"
                    onClick={() => toggleModuleExpansion(module)}
                    disabled={disabled}
                  >
                    {isExpanded ? (
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                    <span className={isSelected ? "font-medium" : ""}>
                      {formatModuleLabel(module)}
                    </span>
                  </button>
                </div>
                {isExpanded && (
                  <div className="ml-7 border-l-2 border-border pl-3 py-1">
                    <p className="text-xs text-muted-foreground">
                      {MODULE_DESCRIPTIONS[module] ?? "Sem descrição"}
                    </p>
                    <div className="mt-2 space-y-1">
                      {ASSISTED_ACTIONS.map((action) => {
                        const isForbidden = (FORBIDDEN_ACTIONS as readonly string[]).includes(
                          action,
                        );
                        const actionSelected = value.actions.includes(action);

                        return (
                          <div
                            key={action}
                            className="flex items-center gap-2 rounded px-1.5 py-1"
                          >
                            <Checkbox
                              checked={isSelected && actionSelected}
                              onCheckedChange={() => toggleAction(action)}
                              disabled={disabled || isForbidden || !isSelected}
                            />
                            <div className="flex-1">
                              <span
                                className={`text-xs ${
                                  isForbidden
                                    ? "text-muted-foreground line-through"
                                    : ""
                                }`}
                              >
                                {formatActionLabel(action)}
                              </span>
                              {ACTION_DESCRIPTIONS[action] && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  — {ACTION_DESCRIPTIONS[action]}
                                </span>
                              )}
                            </div>
                            {isForbidden && (
                              <Badge variant="destructive" className="text-[10px]">
                                Proibida
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Resource ID (opcional) */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Info className="size-4" />
            ID de Recurso (opcional)
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <Label htmlFor="resource-id" className="text-xs text-muted-foreground">
            Informe o ID de um registro específico (ex: ID de um processo ou cliente)
          </Label>
          <Input
            id="resource-id"
            placeholder="Ex: proc-abc123 ou cli-xyz789"
            value={value.resourceId ?? ""}
            onChange={(e) =>
              onChange({ ...value, resourceId: e.target.value || undefined })
            }
            disabled={disabled}
            className="mt-1.5"
          />
        </CardContent>
      </Card>

      {/* Restrições */}
      {showRestrictions && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldAlert className="size-4" />
              Restrições
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            <Label htmlFor="restriction-input" className="text-xs text-muted-foreground">
              Adicione restrições no formato: <code className="text-xs">modulo:acao</code> ou{" "}
              <code className="text-xs">modulo:nome</code>
            </Label>
            <div className="flex gap-2">
              <Input
                id="restriction-input"
                placeholder="Ex: clientes:visualizar ou modulo:financeiro"
                value={restrictionInput}
                onChange={(e) => setRestrictionInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRestriction}
                disabled={disabled || !restrictionInput.trim()}
              >
                Adicionar
              </Button>
            </div>
            {value.restrictions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {value.restrictions.map((restriction) => (
                  <Badge
                    key={restriction}
                    variant="secondary"
                    className="inline-flex items-center gap-1 text-xs"
                  >
                    {restriction}
                    <button
                      type="button"
                      onClick={() => removeRestriction(restriction)}
                      disabled={disabled}
                      className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                      aria-label={`Remover restrição ${restriction}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
