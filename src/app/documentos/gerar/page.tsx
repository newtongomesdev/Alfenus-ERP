"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileCheck,
  FileText,
  Filter,
  FolderOpen,
  Loader2,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  User,
  Wand2,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getErrorMessage } from "@/lib/utils";
import {
  enhanceDocumentWithAi,
  generateDocument,
  getEntityData,
  getFirmContextAction,
  getTemplatesForGeneration,
  renderDocumentTemplate,
} from "./actions";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: string[];
  isSystem: boolean;
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  all: { label: "Todos", color: "bg-primary/10 text-primary border-primary/20" },
  peticao: { label: "Petição", color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  contrato: { label: "Contrato", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  procuracao: { label: "Procuração", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  notificacao: { label: "Notificação", color: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  relatorio: { label: "Relatório", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  financeiro: { label: "Financeiro", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  declaracao: { label: "Declaração", color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  geral: { label: "Geral", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
};

const FRIENDLY_LABELS: Record<string, string> = {
  "client.name": "Nome do Cliente",
  "client.document": "CPF/CNPJ do Cliente",
  "client.rg": "RG do Cliente",
  "client.address": "Endereço do Cliente",
  "client.email": "E-mail do Cliente",
  "client.nationality": "Nacionalidade do Cliente",
  "client.marital_status": "Estado Civil do Cliente",
  "client.profession": "Profissão do Cliente",
  "client.monthly_income": "Renda Mensal do Cliente",
  "client.supporting_documents": "Documentos Comprobatórios",

  "case.title": "Título/Assunto do Processo",
  "case.number": "Número do Processo",
  "case.court": "Tribunal/Vara",
  "case.opposing_party": "Nome da Parte Contrária",
  "case.opposing_party_document": "CPF/CNPJ da Parte Contrária",
  "case.opposing_party_address": "Endereço da Parte Contrária",
  "case.class": "Classe Processual",

  "firm.name": "Nome do Escritório",
  "firm.document": "CNPJ do Escritório",
  "firm.address": "Endereço do Escritório",
  "firm.oab": "Inscrição da OAB do Escritório",
  "firm.city": "Cidade do Escritório",
  "firm.state": "Estado do Escritório",
  "firm.email": "E-mail do Escritório",
  "firm.phone": "Telefone do Escritório",

  "contract.number": "Número do Contrato",
  "contract.description": "Descrição dos Serviços",
  "contract.value": "Valor do Contrato",
  "contract.value_letter": "Valor por Extenso",
  "contract.payment_terms": "Condições de Pagamento",
  "contract.late_fee": "Multa de Atraso",
  "contract.expense_reimbursement_days": "Reembolso de Despesas (Dias)",
  "contract.duration": "Duração do Contrato",
  "contract.termination_notice": "Aviso Prévio (Dias)",
  "contract.cure_period": "Prazo de Cura (Dias)",
  "contract.document_return_days": "Devolução de Documentos (Dias)",

  "notification.registry": "Cartório/Ofício",
  "notification.fact": "Fatos Motivadores",
  "notification.legal_basis": "Fundamentação Legal",
  "notification.deadline": "Prazo para Cumprimento",
  "notification.request": "Providência Solicitada",

  "receipt.number": "Número do Recibo",
  "receipt.notes": "Observações do Recibo",
  "receipt.installment": "Parcela/Referência do Recibo",
  "receipt.type": "Tipo de Quitação",

  "payment.method": "Meio de Pagamento",
  "payment.details": "Detalhes da Transação",
  "payment.date": "Data de Pagamento",
  "payment.fee_value": "Valor dos Honorários",
  "payment.expense_value": "Valor de Reembolso",
  "payment.taxes_retained": "Retenções Tributárias",

  "report.current_status": "Situação Atual do Caso",
  "report.actions_taken": "Providências Realizadas",
  "report.next_steps": "Próximos Passos",
  "report.client_guidance": "Orientações ao Cliente",
  "report.risks": "Pontos de Atenção e Riscos",

  "petition.purpose": "Fato/Relevância da Petição",
  "petition.document_list": "Relação dos Documentos",

  "proposal.reference": "Referência da Proposta",
  "proposal.scope": "Escopo dos Serviços",
  "proposal.scope_limit": "Limitações do Escopo",
  "proposal.payment_terms": "Condições de Pagamento",
  "proposal.estimated_duration": "Prazo Estimado de Execução",
  "proposal.validity": "Validade da Proposta",

  "attendance.date": "Data do Atendimento",
  "attendance.time": "Horário de Início",
  "attendance.end_time": "Horário de Término",
  "attendance.duration": "Duração do Atendimento",
  "attendance.purpose": "Finalidade do Atendimento",
  "attendance.documents": "Documentos Apresentados",
  "attendance.notes": "Observações",

  "closing.number": "Número do Encerramento",
  "closing.scope": "Objeto do Encerramento",
  "closing.actions_performed": "Providências Cumpridas",
  "closing.final_status": "Situação Final do Caso",
  "closing.pending_items": "Pendências Identificadas",
  "closing.client_guidance": "Orientações Finais ao Cliente",
  "closing.recommendations": "Recomendações Adicionais",
  "closing.payment_status": "Situação Financeira",
  "closing.document_return": "Devolução de Documentos",
  "closing.complaint_deadline": "Prazo para Reclamações (Dias)",

  "substitute.lawyer_name": "Advogado Substabelecido",
  "substitute.oab": "OAB do Substabelecido",
  "substitute.address": "Endereço do Substabelecido",
  "substitute.reservation_clause": "Cláusula de Reserva",

  "agreement.installments": "Parcelas do Acordo",
  "agreement.payment_details": "Detalhes do Pagamento",
  "agreement.penalty": "Multa por Descumprimento (%)",

  "motion.statement": "Conteúdo da Manifestação",
  "today": "Data de Hoje",
};

function getFriendlyLabel(key: string): string {
  if (FRIENDLY_LABELS[key]) return FRIENDLY_LABELS[key];
  return key
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function GerarDocumentoPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Filters & State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [docName, setDocName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMono, setIsMono] = useState(false);
  const [firm, setFirm] = useState<{ name: string; document: string | null; email: string | null; phone: string | null } | null>(null);

  const handleCopyClipboard = useCallback(() => {
    if (!preview) return;
    navigator.clipboard.writeText(preview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [preview]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [data, firmData] = await Promise.all([
          getTemplatesForGeneration(),
          getFirmContextAction(),
        ]);
        setTemplates(data);
        setFirm(firmData);
        if (data.length > 0) {
          handleSelectTemplate(data[0]);
        }
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

  const handleAiEnhance = useCallback(async (instruction: "formalize" | "fix_grammar" | "summarize" | "expand") => {
    if (!preview || !preview.trim()) return;
    startTransition(async () => {
      try {
        setError(null);
        const enhanced = await enhanceDocumentWithAi({ content: preview, instruction });
        setPreview(enhanced);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [preview]);

  const handleGenerate = useCallback(() => {
    if (!selectedTemplate || !preview) return;
    startTransition(async () => {
      try {
        setError(null);
        const result = await generateDocument({
          templateId: selectedTemplate.id,
          name: docName || selectedTemplate.name,
          content: preview,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
        });
        setGenerated({ id: result.id, name: result.name });
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [selectedTemplate, docName, preview, entityType, entityId]);

  const handleDownload = useCallback(() => {
    if (!generated) return;
    window.open(`/api/documentos/${generated.id}`, "_blank", "noopener,noreferrer");
  }, [generated]);

  // Template Search & Filtering
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesCategory = selectedCategory === "all" || t.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // Group variables by prefix for clean accordion-style layout
  const groupedVariables = useMemo(() => {
    const groups: {
      client: [string, string][];
      case: [string, string][];
      firm: [string, string][];
      other: [string, string][];
    } = { client: [], case: [], firm: [], other: [] };

    Object.entries(variables).forEach(([key, val]) => {
      if (key.startsWith("client.")) groups.client.push([key, val]);
      else if (key.startsWith("case.")) groups.case.push([key, val]);
      else if (key.startsWith("firm.")) groups.firm.push([key, val]);
      else groups.other.push([key, val]);
    });

    return groups;
  }, [variables]);

  return (
    <AppShell memberName={null}>
      <PageHeader
        title="Estúdio de Documentos"
        description="Gere, personalize e revise documentos jurídicos com inteligência artificial e layout profissional."
      />

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500 shadow-sm">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="ml-2 font-semibold underline">
            Fechar
          </button>
        </div>
      )}

      {generated && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-600 dark:text-emerald-400 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <FileCheck className="h-5 w-5 text-emerald-500" />
            <span>Documento &quot;{generated.name}&quot; gerado e salvo em PDF com sucesso.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={handleDownload} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Download className="mr-1.5 h-4 w-4" /> Baixar PDF
            </Button>
            <a href="/documentos" className="text-xs font-semibold underline px-2">
              Ver todos os documentos
            </a>
          </div>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Template Selector & Variables Form (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Step 1: Template Selector */}
          <Card className="rounded-xl shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  1. Selecione o Modelo
                </CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {filteredTemplates.length} disponíveis
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Escolha o modelo base para gerar o documento
              </CardDescription>

              {/* Search Bar */}
              <div className="relative mt-3">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar modelo..."
                  className="h-8 pl-8 text-xs rounded-lg"
                />
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 no-scrollbar">
                {Object.entries(CATEGORY_LABELS).map(([catKey, catObj]) => (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setSelectedCategory(catKey)}
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition ${
                      selectedCategory === catKey
                        ? catObj.color
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {catObj.label}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="flex items-center justify-center p-6 text-xs text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando modelos...
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Nenhum modelo encontrado com estes filtros.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredTemplates.map((t) => {
                    const categoryStyle = CATEGORY_LABELS[t.category]?.color || "bg-muted text-muted-foreground";
                    const isSelected = selectedTemplate?.id === t.id;

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelectTemplate(t)}
                        className={`flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-xs transition ${
                          isSelected
                            ? "border-primary bg-primary/5 font-medium shadow-xs"
                            : "border-border/60 hover:bg-muted/50"
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <div className="truncate font-semibold text-foreground">{t.name}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-1">{t.description || "Sem descrição"}</div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold border ${categoryStyle}`}>
                            {t.category}
                          </span>
                          <ChevronRight className={`h-3.5 w-3.5 transition ${isSelected ? "text-primary" : "text-muted-foreground/40"}`} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Variables & Entity Sync */}
          {selectedTemplate && (
            <Card className="rounded-xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    2. Dados e Variáveis
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview()}
                    disabled={isPending}
                    className="h-7 text-[11px] text-muted-foreground"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" /> Atualizar Texto
                  </Button>
                </CardTitle>
                <CardDescription className="text-xs">
                  Preencha os campos ou vincule a um registro para autocompletar
                </CardDescription>

                {/* Auto-fill Bar */}
                <div className="mt-3 rounded-lg border bg-muted/30 p-2.5 space-y-2">
                  <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Preenchimento Automático por Entidade:
                  </Label>
                  <div className="flex gap-2">
                    <select
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value)}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none"
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
                        placeholder="Cole o ID / UUID da entidade"
                        className="h-8 text-xs"
                      />
                    )}
                    {entityType && entityId && (
                      <Button type="button" size="sm" variant="outline" onClick={handleLoadEntityData} className="h-8 text-xs shrink-0">
                        Carregar Dados
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                {/* Form Group: Document Title */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Nome do Documento Gerado</Label>
                  <Input
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="Ex.: Procuração Ad Judicia - João da Silva"
                    className="h-9 text-xs font-medium"
                  />
                </div>

                {/* Form Groups: Categorized Variables */}
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {/* Group 1: Client */}
                  {groupedVariables.client.length > 0 && (
                    <div className="space-y-2 rounded-lg border bg-card p-3">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                        <User className="h-3.5 w-3.5" /> Dados do Cliente
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {groupedVariables.client.map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">{getFriendlyLabel(key)}</Label>
                            <Input
                              value={val}
                              onChange={(e) => {
                                const next = { ...variables, [key]: e.target.value };
                                setVariables(next);
                              }}
                              className="h-8 text-xs"
                              placeholder={key}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group 2: Case */}
                  {groupedVariables.case.length > 0 && (
                    <div className="space-y-2 rounded-lg border bg-card p-3">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-indigo-500">
                        <Scale className="h-3.5 w-3.5" /> Dados do Processo / Parte Contrária
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {groupedVariables.case.map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">{getFriendlyLabel(key)}</Label>
                            <Input
                              value={val}
                              onChange={(e) => {
                                const next = { ...variables, [key]: e.target.value };
                                setVariables(next);
                              }}
                              className="h-8 text-xs"
                              placeholder={key}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group 3: Firm */}
                  {groupedVariables.firm.length > 0 && (
                    <div className="space-y-2 rounded-lg border bg-card p-3">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-emerald-500">
                        <Building2 className="h-3.5 w-3.5" /> Dados do Escritório
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {groupedVariables.firm.map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">{getFriendlyLabel(key)}</Label>
                            <Input
                              value={val}
                              onChange={(e) => {
                                const next = { ...variables, [key]: e.target.value };
                                setVariables(next);
                              }}
                              className="h-8 text-xs"
                              placeholder={key}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Group 4: Other Variables */}
                  {groupedVariables.other.length > 0 && (
                    <div className="space-y-2 rounded-lg border bg-card p-3">
                      <Label className="text-xs font-semibold flex items-center gap-1.5 text-amber-500">
                        <FileText className="h-3.5 w-3.5" /> Campos do Documento
                      </Label>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {groupedVariables.other.map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[10px] font-medium text-muted-foreground">{getFriendlyLabel(key)}</Label>
                            <Input
                              value={val}
                              onChange={(e) => {
                                const next = { ...variables, [key]: e.target.value };
                                setVariables(next);
                              }}
                              className="h-8 text-xs"
                              placeholder={key}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add Manual Variable */}
                <AddVariableForm onAdd={(key, value) => setVariables((prev) => ({ ...prev, [key]: value }))} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Studio Canvas & AI Toolbar (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          {selectedTemplate ? (
            <Card className="rounded-xl shadow-sm border">
              <CardHeader className="pb-3 border-b">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      3. Estúdio de Redação e Visualização Final
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Edite livremente o documento na folha abaixo ou use a Inteligência Artificial
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsMono((prev) => !prev)}
                      className="h-8 text-xs"
                    >
                      {isMono ? "Fonte Sans" : "Fonte Mono"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyClipboard}
                      disabled={!preview?.trim()}
                      className="h-8 text-xs flex items-center gap-1"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* AI Assistant Quick Actions Bar */}
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" /> Ações Rápidas de IA:
                    </span>
                    {isPending && (
                      <span className="flex items-center text-[11px] text-muted-foreground font-normal">
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-amber-500" /> Processando com IA...
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiEnhance("formalize")}
                      disabled={isPending || !preview?.trim()}
                      className="h-7 text-xs bg-background hover:bg-amber-500/10 border-amber-500/20"
                    >
                      <Wand2 className="mr-1 h-3 w-3 text-purple-500" />
                      Formalizar Linguagem
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiEnhance("fix_grammar")}
                      disabled={isPending || !preview?.trim()}
                      className="h-7 text-xs bg-background hover:bg-amber-500/10 border-amber-500/20"
                    >
                      Corrigir Ortografia
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiEnhance("summarize")}
                      disabled={isPending || !preview?.trim()}
                      className="h-7 text-xs bg-background hover:bg-amber-500/10 border-amber-500/20"
                    >
                      Resumir
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAiEnhance("expand")}
                      disabled={isPending || !preview?.trim()}
                      className="h-7 text-xs bg-background hover:bg-amber-500/10 border-amber-500/20"
                    >
                      Expandir
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Textarea editável estilo folha A4 física em tempo real */}
                <div className="relative rounded-xl border border-muted-foreground/20 bg-slate-200/60 dark:bg-zinc-950 p-4 sm:p-8 flex justify-center shadow-inner">
                  <div className="w-full max-w-[620px] bg-white dark:bg-zinc-900 text-slate-800 dark:text-slate-100 rounded-lg border border-slate-300 dark:border-zinc-800 shadow-xl flex flex-col font-sans overflow-hidden transition-all">
                    
                    {/* Cabeçalho espelhado do PDF */}
                    <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between bg-slate-50/50 dark:bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shadow-xs">
                          {firm?.name?.slice(0, 2) || "AL"}
                        </div>
                        <div>
                          <h4 className="text-[11px] font-bold text-slate-800 dark:text-zinc-100 uppercase tracking-tight leading-none">
                            {firm?.name || "Carregando escritório..."}
                          </h4>
                          <p className="text-[9px] text-slate-400 dark:text-zinc-500 mt-1">
                            {[firm?.document && `CNPJ/CPF: ${firm.document}`, firm?.email, firm?.phone].filter(Boolean).join("  •  ")}
                          </p>
                        </div>
                      </div>
                      <div className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                        Canvas A4
                      </div>
                    </div>

                    {/* Banner do Título espelhado do PDF */}
                    <div className="px-6 pt-5">
                      <div className="border-l-4 border-emerald-600 bg-slate-50 dark:bg-zinc-800/40 p-3 rounded-r border border-slate-100 dark:border-zinc-800">
                        <h3 className="text-xs font-bold text-slate-900 dark:text-zinc-100 tracking-wide uppercase">
                          {docName || selectedTemplate.name}
                        </h3>
                        <p className="text-[8.5px] text-slate-400 dark:text-zinc-500 mt-1">
                          Documento emitido em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date())}
                        </p>
                      </div>
                    </div>

                    {/* Corpo do Documento - Textarea estilizada como papel */}
                    <div className="px-6 py-4 flex-1">
                      <textarea
                        value={preview ?? ""}
                        onChange={(e) => setPreview(e.target.value)}
                        rows={22}
                        className={`w-full min-h-[460px] resize-none border-none bg-transparent p-0 text-[11.5px] leading-relaxed text-slate-800 dark:text-zinc-200 outline-none focus:ring-0 focus:outline-none ${
                          isMono ? "font-mono" : "font-sans"
                        }`}
                        placeholder="Comece a digitar o conteúdo do documento..."
                      />
                    </div>

                    {/* Rodapé espelhado do PDF */}
                    <div className="px-6 py-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[8px] text-slate-400 dark:text-zinc-500 bg-slate-50/50 dark:bg-zinc-800/20">
                      <span>Documento Gerado via Alfenus ERP Jurídico</span>
                      <div className="flex items-center gap-4">
                        <span>{preview ? preview.trim().split(/\s+/).filter(Boolean).length : 0} palavras</span>
                        <span>Página 1 de 1</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Primary Actions Bottom Bar */}
                <div className="flex flex-wrap items-center justify-end gap-3 pt-6 border-t mt-6">
                  <Button
                    onClick={handleGenerate}
                    disabled={isPending || !docName.trim() || !preview?.trim()}
                    size="lg"
                    className="w-full sm:w-auto font-semibold shadow-sm"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Gerando PDF...
                      </>
                    ) : (
                      <>
                        <FileCheck className="mr-2 h-4 w-4" /> Gerar Documento PDF
                      </>
                    )}
                  </Button>
                  <Button type="button" variant="outline" size="lg" onClick={handleDownload} disabled={!generated}>
                    <Download className="mr-1.5 h-4 w-4" /> Baixar PDF Gerado
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-xl border-dashed p-12 text-center text-muted-foreground">
              Selecione um modelo no painel da esquerda para iniciar a edição.
            </Card>
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
    <div className="pt-2 border-t mt-2">
      <Label className="text-[10px] font-semibold text-muted-foreground uppercase">Adicionar Variável Personalizada:</Label>
      <div className="flex gap-2 mt-1">
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="ex.: nome.variavel"
          className="text-xs h-8"
        />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Valor"
          className="text-xs h-8"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (key.trim()) {
              onAdd(key.trim(), value);
              setKey("");
              setValue("");
            }
          }}
          disabled={!key.trim()}
          className="h-8 text-xs shrink-0"
        >
          + Adicionar
        </Button>
      </div>
    </div>
  );
}
