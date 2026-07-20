"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getErrorMessage } from "@/lib/utils";
import { generateDocument, getEntityData, getTemplatesForGeneration, renderDocumentTemplate } from "./actions";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: string[];
  isSystem: boolean;
};

export default function GerarDocumentoPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [docName, setDocName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getTemplatesForGeneration();
        setTemplates(data);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSelectTemplate = useCallback((template: Template) => {
    const initialVariables = Object.fromEntries(template.variables.map((variable) => [variable, ""]));
    setSelectedTemplate(template);
    setDocName(template.name);
    setPreview(template.content);
    setGenerated(null);
    setVariables(initialVariables);
  }, []);

  const handlePreview = useCallback(async (template = selectedTemplate, nextVariables = variables) => {
    if (!template) return;
    try {
      setError(null);
      const rendered = await renderDocumentTemplate(template.id, nextVariables);
      setPreview(rendered);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }, [selectedTemplate, variables]);

  const handleLoadEntityData = useCallback(async () => {
    if (!entityType || !entityId) return;
    try {
      const data = await getEntityData(entityType, entityId);
      const nextVariables = { ...variables, ...data };
      setVariables(nextVariables);
      await handlePreview(selectedTemplate, nextVariables);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    }
  }, [entityType, entityId, handlePreview, selectedTemplate, variables]);

  const handleGenerate = useCallback(() => {
    if (!selectedTemplate) return;
    startTransition(async () => {
      try {
        setError(null);
        const rendered = await renderDocumentTemplate(selectedTemplate.id, variables);
        setPreview(rendered);
        const result = await generateDocument({
          templateId: selectedTemplate.id,
          name: docName || selectedTemplate.name,
          content: rendered,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
        });
        setGenerated({ id: result.id, name: result.name });
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [selectedTemplate, docName, variables, entityType, entityId]);

  const handleDownload = useCallback(() => {
    if (!preview) return;
    const blob = new Blob([preview], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${docName || "documento"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [preview, docName]);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Gerar Documento"
        description="Selecione um template, preencha as variáveis e gere o documento"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {generated && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Documento &quot;{generated.name}&quot; gerado com sucesso!
          <a href={`/documentos`} className="ml-2 underline">Ver documentos</a>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Seleção de template */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">1. Selecione o Template</h3>
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando templates...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Nenhum template encontrado. Crie templates em Documentos &gt; Modelos.
            </div>
          ) : (
            <div className="space-y-1">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTemplate(t)}
                  className={`flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm transition ${
                    selectedTemplate?.id === t.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div>
                    <span className="font-medium">{t.name}</span>
                    <span className="ml-2 rounded bg-muted px-1 text-xs">{t.category}</span>
                    {t.isSystem ? <span className="ml-2 rounded bg-secondary px-1 text-xs">sistema</span> : null}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Preenchimento */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">2. Preencha as Variáveis</h3>

          {selectedTemplate && (
            <div className="space-y-3">
              <div>
                <Label>Nome do documento</Label>
                <Input value={docName} onChange={(e) => setDocName(e.target.value)} />
              </div>

              {/* Vincular entidade */}
              <div className="rounded border bg-muted/30 p-3 space-y-2">
                <Label className="text-xs font-medium">Preencher com dados de (opcional)</Label>
                <div className="flex gap-2">
                  <select
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="h-8 rounded border bg-transparent px-2 text-sm"
                  >
                    <option value="">Nenhuma</option>
                    <option value="client">Cliente</option>
                    <option value="case">Processo</option>
                    <option value="contract">Contrato</option>
                  </select>
                  {entityType && (
                    <Input
                      value={entityId}
                      onChange={(e) => setEntityId(e.target.value)}
                      placeholder="ID da entidade"
                      className="text-sm"
                    />
                  )}
                  {entityType && entityId && (
                    <Button size="sm" variant="outline" onClick={handleLoadEntityData}>
                      Carregar
                    </Button>
                  )}
                </div>
              </div>

              {/* Variáveis */}
              <div className="space-y-2">
                {Object.keys(variables).length > 0 ? (
                  Object.entries(variables).map(([key, value]) => (
                    <div key={key}>
                      <Label className="text-xs">{key}</Label>
                      <Input
                        value={value}
                        onChange={(e) => setVariables((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="text-sm"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma variável disponível. Vincule uma entidade ou adicione variáveis manualmente.
                  </p>
                )}

                {/* Adicionar variável manual */}
                <AddVariableForm onAdd={(key, value) => setVariables((prev) => ({ ...prev, [key]: value }))} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => handlePreview()} disabled={isPending}>
                  Atualizar preview
                </Button>
                <Button onClick={handleGenerate} disabled={isPending || !docName.trim()}>
                  {isPending ? "Gerando..." : "Gerar Documento"}
                </Button>
                <Button type="button" variant="outline" onClick={handleDownload} disabled={!preview}>
                  Baixar TXT
                </Button>
              </div>
            </div>
          )}

          {selectedTemplate && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <Label className="text-xs font-medium">Preview</Label>
              <pre className="mt-2 max-h-96 overflow-y-auto rounded border bg-background p-3 text-xs whitespace-pre-wrap">
                {preview || "Atualize o preview para ver o documento renderizado."}
              </pre>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function AddVariableForm({ onAdd }: { onAdd: (key: string, value: string) => void }) {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  return (
    <div className="flex gap-2">
      <Input
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="nome.variavel"
        className="text-xs"
      />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valor"
        className="text-xs"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => { if (key.trim()) { onAdd(key.trim(), value); setKey(""); setValue(""); } }}
        disabled={!key.trim()}
      >
        +
      </Button>
    </div>
  );
}
