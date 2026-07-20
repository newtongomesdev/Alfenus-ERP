"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Eye, Trash2, Plus, Tag } from "lucide-react";

import { copySystemTemplateAction, createTemplateAction, getTemplatesAction, previewTemplateAction, deleteTemplateAction } from "./actions";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

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

const CATEGORIES = [
  { value: "peticao", label: "Petição" },
  { value: "contrato", label: "Contrato" },
  { value: "procuracao", label: "Procuração" },
  { value: "notificacao", label: "Notificação" },
  { value: "relatorio", label: "Relatório" },
  { value: "geral", label: "Geral" },
];

export default function DocumentosModelosPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewVars, setPreviewVars] = useState<Record<string, string>>({});
  const [previewResult, setPreviewResult] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState("");

  const handleLoad = async () => {
    setLoading(true);
    const response = await getTemplatesAction();
    if (response.success && response.templates) {
      setTemplates(response.templates);
    }
    setLoaded(true);
    setLoading(false);
  };

  const handlePreview = async (template: Template) => {
    setPreviewId(template.id);
    setPreviewContent(template.content);
    const initialVars: Record<string, string> = {};
    for (const v of template.variables) {
      initialVars[v] = "";
    }
    setPreviewVars(initialVars);

    const response = await previewTemplateAction(template.id, initialVars);
    if (response.success && response.preview) {
      setPreviewResult(response.preview);
    }
  };

  const handlePreviewUpdate = async (template: Template) => {
    const response = await previewTemplateAction(template.id, previewVars);
    if (response.success && response.preview) {
      setPreviewResult(response.preview);
    }
  };

  const handleDelete = async (templateId: string) => {
    await deleteTemplateAction(templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleCopy = async (template: Template) => {
    await copySystemTemplateAction(template.id);
    await handleLoad();
  };

  const handleCreate = async (formData: FormData) => {
    setCreateError("");
    try {
      await createTemplateAction({ name: String(formData.get("name") ?? ""), description: String(formData.get("description") ?? ""), category: String(formData.get("category") ?? "geral"), content: String(formData.get("content") ?? "") });
      setShowCreate(false);
      await handleLoad();
    } catch (error) { setCreateError(error instanceof Error ? error.message : "Não foi possível salvar o modelo."); }
  };

  const filtered = selectedCategory === "all"
    ? templates
    : templates.filter((t) => t.category === selectedCategory);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Modelos de Documento"
        description="Gerencie templates com variáveis para geração automática"
        actions={
          <div className="flex gap-2"><Button size="sm" onClick={() => setShowCreate((value) => !value)}><Plus className="mr-2 h-4 w-4" />Novo modelo</Button><Link href="/documentos"><Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></Link></div>
        }
      />

      <div className="space-y-6">
        {showCreate ? <Card><CardHeader><CardTitle>Novo modelo</CardTitle><CardDescription>Use variáveis como {"{{client.name}}"}, {"{{case.number}}"} e {"{{firm.name}}"}.</CardDescription></CardHeader><CardContent><form action={handleCreate} className="grid gap-3"><Input name="name" placeholder="Nome do modelo" required /><Input name="description" placeholder="Descrição breve" /><select name="category" defaultValue="geral" className="h-9 rounded-lg border border-input bg-background px-3 text-sm"><option value="geral">Geral</option><option value="peticao">Petição</option><option value="contrato">Contrato</option><option value="procuracao">Procuração</option><option value="notificacao">Notificação</option><option value="relatorio">Relatório</option></select><textarea name="content" rows={12} placeholder="Conteúdo do modelo" required className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />{createError ? <p className="text-sm text-destructive">{createError}</p> : null}<div><Button type="submit">Salvar modelo</Button></div></form></CardContent></Card> : null}
        {!loaded ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Button onClick={handleLoad} disabled={loading}>
                <FileText className="mr-2 h-4 w-4" />
                {loading ? "Carregando..." : "Carregar Modelos"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                Todos
              </Button>
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  Nenhum modelo encontrado nesta categoria.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filtered.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <CardDescription>{template.description || "Sem descrição"}</CardDescription>
                        </div>
                        <Badge variant="outline">
                          {CATEGORIES.find((c) => c.value === template.category)?.label ?? template.category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {template.variables.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          {template.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Preview
                        </Button>
                        {template.isSystem ? <Button size="sm" variant="outline" onClick={() => handleCopy(template)}>Usar como base</Button> : <Button size="sm" variant="ghost" onClick={() => handleDelete(template.id)} aria-label="Arquivar modelo"><Trash2 className="h-4 w-4" /></Button>}
                      </div>

                      {previewId === template.id && (
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/50">
                          <div className="text-xs font-medium text-muted-foreground">Variáveis:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {template.variables.map((v) => (
                              <div key={v}>
                                <Label className="text-xs">{`{{${v}}}`}</Label>
                                <Input
                                  size={1}
                                  value={previewVars[v] || ""}
                                  onChange={(e) => {
                                    setPreviewVars((prev) => ({ ...prev, [v]: e.target.value }));
                                  }}
                                  onBlur={() => handlePreviewUpdate(template)}
                                  className="h-7 text-xs"
                                  placeholder={v}
                                />
                              </div>
                            ))}
                          </div>
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">Preview:</div>
                            <pre className="text-sm whitespace-pre-wrap bg-background p-2 rounded border text-xs max-h-60 overflow-y-auto">
                              {previewResult || "Preencha as variáveis para ver o preview"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
