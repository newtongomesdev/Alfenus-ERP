"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Check, Copy, Loader2, Sparkles, Wand2 } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { getErrorMessage } from "@/lib/utils";
import { enhanceDocumentWithAi, generateDocument, getEntityData, getTemplatesForGeneration, renderDocumentTemplate } from "./actions";

type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  content: string;
  variables: string[];
  isSystem: boolean;
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
  "client.supporting_documents": "Documentos Comprobatórios do Cliente",

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
  "contract.expense_reimbursement_days": "Dias para Reembolso de Despesa",
  "contract.duration": "Duração do Contrato",
  "contract.termination_notice": "Aviso Prévio de Rescisão (Dias)",
  "contract.cure_period": "Prazo de Cura da Inadimplência (Dias)",
  "contract.document_return_days": "Dias para Devolução de Documentos",

  "notification.registry": "Cartório/Ofício",
  "notification.fact": "Descrição dos Fatos (Notificação)",
  "notification.legal_basis": "Base Legal (Notificação)",
  "notification.deadline": "Prazo para Cumprimento",
  "notification.request": "Providência Solicitada",

  "receipt.number": "Número do Recibo",
  "receipt.notes": "Observações do Recibo",
  "receipt.installment": "Parcela/Referência do Recibo",
  "receipt.type": "Tipo de Quitação (ex: plena, geral e irrevogável)",

  "payment.method": "Meio de Pagamento",
  "payment.details": "Detalhes do Pagamento",
  "payment.date": "Data de Pagamento",
  "payment.fee_value": "Valor dos Honorários",
  "payment.expense_value": "Valor de Despesas/Reembolso",
  "payment.taxes_retained": "Impostos/Retenções na Fonte",

  "report.current_status": "Situação Atual do Caso (Relatório)",
  "report.actions_taken": "Providências Realizadas (Relatório)",
  "report.next_steps": "Próximos Passos e Cronograma (Relatório)",
  "report.client_guidance": "Orientações ao Cliente (Relatório)",
  "report.risks": "Pontos de Atenção e Riscos (Relatório)",

  "petition.purpose": "Objetivo/Fato Jurídico Relevante (Petição)",
  "petition.document_list": "Relação de Documentos (Petição)",

  "proposal.reference": "Referência da Proposta",
  "proposal.scope": "Escopo dos Serviços (Proposta)",
  "proposal.scope_limit": "Limitações do Escopo (Proposta)",
  "proposal.payment_terms": "Condições de Pagamento da Proposta",
  "proposal.estimated_duration": "Prazo Estimado de Execução",
  "proposal.validity": "Prazo de Validade da Proposta",

  "attendance.date": "Data do Atendimento",
  "attendance.time": "Horário de Início",
  "attendance.end_time": "Horário de Término",
  "attendance.duration": "Duração do Atendimento",
  "attendance.purpose": "Finalidade do Atendimento",
  "attendance.documents": "Documentos Apresentados",
  "attendance.notes": "Observações do Atendimento",

  "closing.number": "Número do Termo de Encerramento",
  "closing.scope": "Escopo do Atendimento (Encerramento)",
  "closing.actions_performed": "Providências Cumpridas (Encerramento)",
  "closing.final_status": "Situação Final do Caso (Encerramento)",
  "closing.pending_items": "Pendências Identificadas (Encerramento)",
  "closing.client_guidance": "Orientações Finais ao Cliente",
  "closing.recommendations": "Recomendações Adicionais (Encerramento)",
  "closing.payment_status": "Situação Financeira de Honorários/Despesas",
  "closing.document_return": "Entrega de Documentos (Encerramento)",
  "closing.complaint_deadline": "Prazo para Reclamações (Dias)",

  "substitute.lawyer_name": "Nome do Advogado Substabelecido",
  "substitute.oab": "OAB do Advogado Substabelecido",
  "substitute.address": "Endereço Profissional Substabelecido",
  "substitute.reservation_clause": "Cláusula de Reserva (com ou sem reserva)",

  "agreement.installments": "Número de Parcelas do Acordo",
  "agreement.payment_details": "Detalhes de Pagamento do Acordo",
  "agreement.penalty": "Multa por Descumprimento (%)",

  "motion.statement": "Conteúdo/Motivo da Manifestação (Petição)",

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

  // State
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [docName, setDocName] = useState("");
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [generated, setGenerated] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isMono, setIsMono] = useState(true);

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
        <div className="mb-4 rounded-lg border border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5 p-3 text-sm text-foreground">
          Documento &quot;{generated.name}&quot; gerado em PDF com sucesso.
          <button type="button" onClick={handleDownload} className="ml-2 underline">Baixar PDF</button>
          <a href="/documentos" className="ml-2 underline">Ver documentos</a>
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
                      <Label className="text-xs">{getFriendlyLabel(key)}</Label>
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
                  Atualizar das Variáveis
                </Button>
                <Button onClick={handleGenerate} disabled={isPending || !docName.trim() || !preview?.trim()}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    "Gerar Documento (PDF)"
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={handleDownload} disabled={!generated}>
                  Baixar PDF
                </Button>
              </div>
            </div>
          )}

          {selectedTemplate && (
            <div className="space-y-3 rounded-xl border border-muted bg-card p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Conteúdo do Documento (Editável)</Label>
                  <p className="text-[11px] text-muted-foreground">Você pode editar o texto livremente abaixo antes de gerar o PDF.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsMono((prev) => !prev)}
                    className="h-7 text-[10px]"
                  >
                    {isMono ? "Usar Fonte Sans" : "Usar Fonte Mono"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyClipboard}
                    disabled={!preview?.trim()}
                    className="h-7 text-xs flex items-center gap-1"
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

              {/* Botões do Assistente de IA */}
              <div className="rounded-lg border bg-muted/40 p-2.5 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Assistente de IA:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiEnhance("formalize")}
                    disabled={isPending || !preview?.trim()}
                    className="h-7 text-xs bg-background"
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
                    className="h-7 text-xs bg-background"
                  >
                    Corrigir Ortografia
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiEnhance("summarize")}
                    disabled={isPending || !preview?.trim()}
                    className="h-7 text-xs bg-background"
                  >
                    Resumir
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAiEnhance("expand")}
                    disabled={isPending || !preview?.trim()}
                    className="h-7 text-xs bg-background"
                  >
                    Expandir
                  </Button>
                </div>
              </div>

              {/* Textarea editável estilo página de folha branca */}
              <div className="relative rounded-lg border bg-slate-50 dark:bg-zinc-900/40 p-2.5">
                <textarea
                  value={preview ?? ""}
                  onChange={(e) => setPreview(e.target.value)}
                  rows={20}
                  className={`w-full min-h-[380px] rounded-md border border-input/60 bg-background p-4 text-xs leading-relaxed text-foreground shadow-inner outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 ${
                    isMono ? "font-mono" : "font-sans"
                  }`}
                  placeholder="Selecione um template ou clique em 'Atualizar das Variáveis' para visualizar e editar o documento..."
                />
                <div className="mt-1.5 flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
                  <span>{preview ? preview.trim().split(/\s+/).filter(Boolean).length : 0} palavras</span>
                  <span>•</span>
                  <span>{preview?.length || 0} caracteres</span>
                </div>
              </div>
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
