"use client";

import { FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, Eye, FileText, Pencil, Plus, Save, Tag, Trash2, X } from "lucide-react";

import {
  copySystemTemplateAction,
  createTemplateAction,
  deleteTemplateAction,
  getTemplatesAction,
  previewTemplateAction,
  updateTemplateAction,
} from "./actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: string[];
  createdAt: string;
  isSystem: boolean;
};

type TemplateForm = {
  id?: string;
  name: string;
  description: string;
  category: string;
  content: string;
};

const emptyForm: TemplateForm = {
  name: "",
  description: "",
  category: "geral",
  content: "",
};

const CATEGORIES = [
  { value: "all", label: "Todos" },
  { value: "peticao", label: "Petição" },
  { value: "contrato", label: "Contrato" },
  { value: "procuracao", label: "Procuração" },
  { value: "notificacao", label: "Notificação" },
  { value: "relatorio", label: "Relatório" },
  { value: "financeiro", label: "Financeiro" },
  { value: "declaracao", label: "Declaração" },
  { value: "geral", label: "Geral" },
];

function getCategoryLabel(value: string) {
  return CATEGORIES.find((category) => category.value === value)?.label ?? value;
}

export default function DocumentosModelosPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TemplateForm>(emptyForm);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    const response = await getTemplatesAction();
    if (response.success && response.templates) {
      setTemplates(response.templates);
    } else {
      setError(response.error ?? "Não foi possível carregar os modelos.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadTemplates();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const filtered = useMemo(
    () =>
      selectedCategory === "all"
        ? templates
        : templates.filter((template) => template.category === selectedCategory),
    [selectedCategory, templates],
  );

  const officeTemplates = templates.filter((template) => !template.isSystem).length;

  const openCreateForm = () => {
    setForm(emptyForm);
    setShowForm(true);
    setMessage(null);
    setError(null);
  };

  const openEditForm = (template: Template) => {
    setForm({
      id: template.id,
      name: template.name,
      description: template.description ?? "",
      category: template.category,
      content: template.content,
    });
    setShowForm(true);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        if (form.id) {
          await updateTemplateAction(form as TemplateForm & { id: string });
          setMessage("Modelo atualizado com sucesso.");
        } else {
          await createTemplateAction(form);
          setMessage("Modelo criado com sucesso.");
        }
        setShowForm(false);
        setForm(emptyForm);
        await loadTemplates();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar o modelo.");
      }
    });
  };

  const handlePreview = (template: Template) => {
    setPreviewId(template.id);
    setPreviewResult("");
    const initialVars = Object.fromEntries(template.variables.map((variable) => [variable, ""]));
    setPreviewVars(initialVars);
    startTransition(async () => {
      try {
        const response = await previewTemplateAction(template.id, initialVars);
        if (response.success && response.preview) setPreviewResult(response.preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível gerar o preview.");
      }
    });
  };

  const refreshPreview = (template: Template, values: Record<string, string>) => {
    startTransition(async () => {
      try {
        const response = await previewTemplateAction(template.id, values);
        if (response.success && response.preview) setPreviewResult(response.preview);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível atualizar o preview.");
      }
    });
  };

  const handleCopy = (template: Template) => {
    startTransition(async () => {
      try {
        await copySystemTemplateAction(template.id);
        setMessage("Modelo copiado para os modelos do escritório.");
        await loadTemplates();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível copiar o modelo.");
      }
    });
  };

  const handleDelete = (template: Template) => {
    startTransition(async () => {
      try {
        await deleteTemplateAction(template.id);
        setMessage("Modelo arquivado.");
        if (previewId === template.id) setPreviewId(null);
        await loadTemplates();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível arquivar o modelo.");
      }
    });
  };

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Modelos de Documento"
        description="Crie, edite e reutilize modelos com variáveis para geração automática."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={openCreateForm}>
              <Plus className="mr-2 h-4 w-4" />
              Novo modelo
            </Button>
            <Link href="/documentos">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        {message ? (
          <Card className="rounded-lg border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5">
            <CardContent className="p-4 text-sm">{message}</CardContent>
          </Card>
        ) : null}

        {error ? (
          <Card className="rounded-lg border-destructive/30 bg-destructive/5">
            <CardContent className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
              <span>{error}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setError(null)}>
                Fechar
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Modelos disponíveis</p>
              <p className="mt-2 text-2xl font-semibold">{templates.length}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Modelos do escritório</p>
              <p className="mt-2 text-2xl font-semibold">{officeTemplates}</p>
            </CardContent>
          </Card>
          <Card className="rounded-lg">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Variáveis aceitas</p>
              <p className="mt-2 text-sm font-medium">{"{{client.name}}"}, {"{{case.number}}"}, {"{{firm.name}}"}</p>
            </CardContent>
          </Card>
        </section>

        {showForm ? (
          <Card className="rounded-lg">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>{form.id ? "Editar modelo" : "Novo modelo"}</CardTitle>
                  <CardDescription>
                    Use variáveis entre chaves duplas. Elas aparecerão como campos ao gerar documentos.
                  </CardDescription>
                </div>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowForm(false)} aria-label="Fechar formulário">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Nome do modelo</Label>
                    <Input id="template-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Ex.: Procuração ad judicia" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-category">Categoria</Label>
                    <select
                      id="template-category"
                      value={form.category}
                      onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {CATEGORIES.filter((category) => category.value !== "all").map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-description">Descrição</Label>
                  <Input id="template-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Quando este modelo deve ser usado" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template-content">Conteúdo</Label>
                  <textarea
                    id="template-content"
                    value={form.content}
                    onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                    rows={16}
                    required
                    className="min-h-80 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    placeholder={"PROCURAÇÃO\n\nOUTORGANTE: {{client.name}}\nPROCESSO: {{case.number}}\n\n{{today}}"}
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    {isPending ? "Salvando..." : "Salvar modelo"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <Button
              key={category.value}
              type="button"
              variant={selectedCategory === category.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <Card className="rounded-lg">
            <CardContent className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              Carregando modelos...
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="rounded-lg border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Nenhum modelo encontrado nesta categoria.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filtered.map((template) => (
              <Card key={template.id} className="rounded-lg">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description || "Sem descrição"}</CardDescription>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {template.isSystem ? <Badge variant="secondary">Sistema</Badge> : <Badge variant="outline">Escritório</Badge>}
                      <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {template.variables.length > 0 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      {template.variables.map((variable) => (
                        <Badge key={variable} variant="secondary" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem variáveis detectadas.</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => handlePreview(template)}>
                      <Eye className="mr-1 h-4 w-4" />
                      Preview
                    </Button>
                    {template.isSystem ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => handleCopy(template)} disabled={isPending}>
                        <Copy className="mr-1 h-4 w-4" />
                        Usar como base
                      </Button>
                    ) : (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditForm(template)}>
                          <Pencil className="mr-1 h-4 w-4" />
                          Editar
                        </Button>
                        <Button type="button" size="icon-sm" variant="ghost" onClick={() => handleDelete(template)} disabled={isPending} aria-label="Arquivar modelo">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>

                  {previewId === template.id ? (
                    <div className="space-y-3 rounded-lg border bg-muted/40 p-3">
                      {template.variables.length > 0 ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          {template.variables.map((variable) => (
                            <div key={variable} className="space-y-1">
                              <Label className="text-xs">{`{{${variable}}}`}</Label>
                              <Input
                                value={previewVars[variable] ?? ""}
                                onChange={(event) => {
                                  const next = { ...previewVars, [variable]: event.target.value };
                                  setPreviewVars(next);
                                  refreshPreview(template, next);
                                }}
                                className="h-8 text-xs"
                                placeholder={variable}
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <pre className="max-h-72 overflow-y-auto rounded-lg border bg-background p-3 text-xs whitespace-pre-wrap">
                        {previewResult || "Preencha as variáveis para ver o preview."}
                      </pre>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
