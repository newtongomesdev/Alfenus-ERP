"use client";

/**
 * ServiceForm
 * Formulário de criação/edição de serviços jurídicos
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ServiceStatusBadge } from "./ServiceStatusBadge";
import {
  SERVICE_CHARGING_MODELS,
  SERVICE_PRACTICE_AREAS,
  SERVICE_CATEGORIES,
  DURATION_UNITS,
} from "@/lib/service-catalog/constants";
import type { ServiceFormInput, ServiceStatus } from "@/lib/service-catalog/types";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

interface ServiceFormProps {
  initialData?: Partial<ServiceFormInput> & { id?: string };
  onSubmit: (data: ServiceFormInput) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ServiceForm({ initialData, onSubmit, onCancel, isLoading }: ServiceFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugManual, setSlugManual] = useState(false);
  const [practiceArea, setPracticeArea] = useState(initialData?.practice_area ?? "civel");
  const [category, setCategory] = useState(initialData?.category ?? "servico");
  const [shortDesc, setShortDesc] = useState(initialData?.short_description ?? "");
  const [publicDesc, setPublicDesc] = useState(initialData?.public_description ?? "");
  const [internalDesc, setInternalDesc] = useState(initialData?.internal_description ?? "");
  const [scopeIncluded, setScopeIncluded] = useState(initialData?.scope_included ?? "");
  const [scopeExcluded, setScopeExcluded] = useState(initialData?.scope_excluded ?? "");
  const [estimatedDuration, setEstimatedDuration] = useState(initialData?.estimated_duration ?? "");
  const [durationUnit, setDurationUnit] = useState(initialData?.duration_unit ?? "dias");
  const [estimatedHours, setEstimatedHours] = useState(initialData?.estimated_hours ?? "");
  const [refValue, setRefValue] = useState(initialData?.reference_value_cents ?? "");
  const [minValue, setMinValue] = useState(initialData?.min_value_cents ?? "");
  const [maxValue, setMaxValue] = useState(initialData?.max_value_cents ?? "");
  const [chargingModel, setChargingModel] = useState(initialData?.charging_model ?? "fixo");
  const [defaultUpfront, setDefaultUpfront] = useState(initialData?.default_upfront_cents ?? "");
  const [defaultInstallments, setDefaultInstallments] = useState(initialData?.default_installments ?? "");
  const [successFee, setSuccessFee] = useState(initialData?.success_fee_percentage ?? "");
  const [includedExpenses, setIncludedExpenses] = useState(initialData?.included_expenses ?? "");
  const [excludedExpenses, setExcludedExpenses] = useState(initialData?.excluded_expenses ?? "");
  const [requiredDocs, setRequiredDocs] = useState(initialData?.required_documents ?? "");
  const [suggestedSteps, setSuggestedSteps] = useState(initialData?.suggested_steps ?? "");
  const [estDeadline, setEstDeadline] = useState(initialData?.estimated_deadline ?? "");
  const [deadlineUnit, setDeadlineUnit] = useState(initialData?.deadline_unit ?? "dias");
  const [status, setStatus] = useState<ServiceStatus>(initialData?.status ?? "rascunho");

  const generateSlug = (value: string) => {
    setSlug(toSlug(value));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      slug: slug || toSlug(name),
      practice_area: practiceArea,
      category,
      short_description: shortDesc || undefined,
      public_description: publicDesc || undefined,
      internal_description: internalDesc || undefined,
      scope_included: scopeIncluded || undefined,
      scope_excluded: scopeExcluded || undefined,
      estimated_duration: estimatedDuration ? Number(estimatedDuration) : undefined,
      duration_unit: durationUnit,
      estimated_hours: estimatedHours ? Number(estimatedHours) : undefined,
      reference_value_cents: refValue ? Number(refValue) : undefined,
      min_value_cents: minValue ? Number(minValue) : undefined,
      max_value_cents: maxValue ? Number(maxValue) : undefined,
      currency: "BRL",
      charging_model: chargingModel,
      default_upfront_cents: defaultUpfront ? Number(defaultUpfront) : undefined,
      default_installments: defaultInstallments ? Number(defaultInstallments) : undefined,
      success_fee_percentage: successFee ? Number(successFee) : undefined,
      included_expenses: includedExpenses || undefined,
      excluded_expenses: excludedExpenses || undefined,
      required_documents: requiredDocs || undefined,
      suggested_steps: suggestedSteps || undefined,
      estimated_deadline: estDeadline ? Number(estDeadline) : undefined,
      deadline_unit: deadlineUnit,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold">{initialData?.id ? "Editar Serviço" : "Novo Serviço"}</h2>
            <p className="text-sm text-gray-500">Cadastre um serviço oferecido pelo escritório</p>
          </div>
          {initialData?.id && <ServiceStatusBadge status={status} size="md" />}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Identificação */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Identificação</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Nome do Serviço *</Label>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugManual) generateSlug(e.target.value);
              }}
              placeholder="Ex: Consulta Inicial"
              required
            />
          </div>
          <div>
            <Label>Slug interno</Label>
            <Input
              value={slug}
              onChange={(e) => { setSlug(e.target.value); setSlugManual(true); }}
              placeholder="Ex: consulta-inicial"
            />
          </div>
          <div>
            <Label>Área Jurídica *</Label>
            <select
              value={practiceArea}
              onChange={(e) => setPracticeArea(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              {SERVICE_PRACTICE_AREAS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Categoria</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              {SERVICE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ServiceStatus)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <option value="rascunho">Rascunho</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="arquivado">Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Descrições */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Descrições</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Descrição Curta</Label>
            <Input value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} placeholder="Descrição curta" />
          </div>
          <div>
            <Label>Descrição Pública</Label>
            <Input value={publicDesc} onChange={(e) => setPublicDesc(e.target.value)} placeholder="Descrição pública" />
          </div>
          <div>
            <Label>Descrição Interna</Label>
            <Input value={internalDesc} onChange={(e) => setInternalDesc(e.target.value)} placeholder="Descrição interna" />
          </div>
        </div>
      </div>

      {/* Escopo */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Escopo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Escopo Incluído</Label>
            <Input value={scopeIncluded} onChange={(e) => setScopeIncluded(e.target.value)} placeholder="O que está incluído" />
          </div>
          <div>
            <Label>Escopo Não Incluído</Label>
            <Input value={scopeExcluded} onChange={(e) => setScopeExcluded(e.target.value)} placeholder="O que não está incluído" />
          </div>
        </div>
      </div>

      {/* Duração */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Duração</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Duração Estimada</Label>
            <Input type="number" value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} placeholder="Dias" />
          </div>
          <div>
            <Label>Unidade</Label>
            <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {DURATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Horas Estimadas</Label>
            <Input type="number" value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} placeholder="Horas" />
          </div>
        </div>
      </div>

      {/* Valores */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider"> valores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Valor de Referência (em centavos)</Label>
            <Input type="number" value={refValue} onChange={(e) => setRefValue(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Valor Mínimo (em centavos)</Label>
            <Input type="number" value={minValue} onChange={(e) => setMinValue(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Valor Máximo (em centavos)</Label>
            <Input type="number" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Cobrança */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Cobrança</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Forma de Cobrança</Label>
            <select value={chargingModel} onChange={(e) => setChargingModel(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {SERVICE_CHARGING_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Entrada Padrão (centavos)</Label>
            <Input type="number" value={defaultUpfront} onChange={(e) => setDefaultUpfront(e.target.value)} placeholder="0" />
          </div>
          <div>
            <Label>Parcelas Padrão</Label>
            <Input type="number" value={defaultInstallments} onChange={(e) => setDefaultInstallments(e.target.value)} placeholder="Parcelas" />
          </div>
          <div>
            <Label>% Êxito</Label>
            <Input type="number" value={successFee} onChange={(e) => setSuccessFee(e.target.value)} placeholder="0" />
          </div>
        </div>
      </div>

      {/* Despesas */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Despesas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Despesas Incluídas</Label>
            <Input value={includedExpenses} onChange={(e) => setIncludedExpenses(e.target.value)} placeholder="Despesas inclusas" />
          </div>
          <div>
            <Label>Despesas Não Incluídas</Label>
            <Input value={excludedExpenses} onChange={(e) => setExcludedExpenses(e.target.value)} placeholder="Despesas excluídas" />
          </div>
        </div>
      </div>

      {/* Documentos e Etapas */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Documentos e Etapas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Documentos Necessários</Label>
            <Input value={requiredDocs} onChange={(e) => setRequiredDocs(e.target.value)} placeholder="Documentos" />
          </div>
          <div>
            <Label>Etapas Sugeridas</Label>
            <Input value={suggestedSteps} onChange={(e) => setSuggestedSteps(e.target.value)} placeholder="Etapas" />
          </div>
        </div>
      </div>

      {/* Prazo */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Prazo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Prazo Estimado</Label>
            <Input type="number" value={estDeadline} onChange={(e) => setEstDeadline(e.target.value)} placeholder="Prazo" />
          </div>
          <div>
            <Label>Unidade</Label>
            <select value={deadlineUnit} onChange={(e) => setDeadlineUnit(e.target.value)} className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900">
              {DURATION_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Salvando..." : "Salvar Serviço"}
        </Button>
      </div>
    </form>
  );
}