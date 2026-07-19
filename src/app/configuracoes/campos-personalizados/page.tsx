"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getErrorMessage } from "@/lib/utils";
import {
  type CustomField,
  getCustomFields,
  createCustomField,
  deleteCustomField,
} from "@/lib/custom-fields/actions";

const ENTITY_TYPES = [
  { value: "client", label: "Clientes" },
  { value: "lead", label: "Leads" },
  { value: "legal_case", label: "Processos" },
];

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "number", label: "Número" },
  { value: "date", label: "Data" },
  { value: "select", label: "Seleção" },
  { value: "boolean", label: "Sim/Não" },
];

function NewFieldForm({ entityType, onSubmit, onClose }: { entityType: string; onSubmit: (data: { entityType: string; label: string; fieldType: string; options?: string[]; required: boolean }) => void; onClose: () => void }) {
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [optionsStr, setOptionsStr] = useState("");
  const [required, setRequired] = useState(false);

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nome do campo *</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Numero OAB" />
        </div>
        <div>
          <Label>Tipo</Label>
          <select value={fieldType} onChange={(e) => setFieldType(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            {FIELD_TYPES.map((ft) => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
          </select>
        </div>
        {fieldType === "select" && (
          <div className="sm:col-span-2">
            <Label>Opções (separadas por vírgula)</Label>
            <Input value={optionsStr} onChange={(e) => setOptionsStr(e.target.value)} placeholder="Opção 1, Opção 2, Opção 3" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <input type="checkbox" id="field-required" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
          <Label htmlFor="field-required">Obrigatório</Label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button
          size="sm"
          onClick={() => {
            const options = fieldType === "select" && optionsStr.trim()
              ? optionsStr.split(",").map((o) => o.trim()).filter(Boolean)
              : undefined;
            onSubmit({ entityType, label: label.trim(), fieldType, options, required });
          }}
          disabled={!label.trim()}
        >
          Criar Campo
        </Button>
      </div>
    </div>
  );
}

export default function CamposPersonalizadosPage() {
  const [activeTab, setActiveTab] = useState("client");
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showNewForm, setShowNewForm] = useState(false);

  const loadFields = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCustomFields(activeTab);
      setFields(data);
      setError(null);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleCreate = useCallback((data: any) => {
    startTransition(async () => {
      try {
        await createCustomField({ ...data, sortOrder: fields.length });
        setShowNewForm(false);
        await loadFields();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [fields.length, loadFields]);

  const handleDelete = useCallback((id: string) => {
    if (!confirm("Excluir este campo personalizado? Os valores associados também serão removidos.")) return;
    startTransition(async () => {
      try {
        await deleteCustomField(id);
        await loadFields();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [loadFields]);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Campos Personalizados"
        description="Defina campos adicionais para clientes, leads e processos"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        {ENTITY_TYPES.map((et) => (
          <button
            key={et.value}
            onClick={() => { setActiveTab(et.value); setShowNewForm(false); }}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              activeTab === et.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            }`}
          >
            {et.label}
          </button>
        ))}
      </div>

      {/* Botão novo */}
      <div className="mb-4 flex justify-end">
        <Button size="sm" onClick={() => setShowNewForm(!showNewForm)}>
          {showNewForm ? "Cancelar" : "Novo Campo"}
        </Button>
      </div>

      {showNewForm && (
        <div className="mb-4">
          <NewFieldForm entityType={activeTab} onSubmit={handleCreate} onClose={() => setShowNewForm(false)} />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">Carregando...</div>
      ) : fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum campo personalizado para {ENTITY_TYPES.find((e) => e.value === activeTab)?.label}.
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">Campo</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Obrigatório</th>
                <th className="px-3 py-2 text-left font-medium">Opções</th>
                <th className="px-3 py-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{field.label}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {FIELD_TYPES.find((ft) => ft.value === field.fieldType)?.label ?? field.fieldType}
                  </td>
                  <td className="px-3 py-2">
                    {field.required ? (
                      <span className="text-emerald-600">Sim</span>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {field.options?.join(", ") ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleDelete(field.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-red-600"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
