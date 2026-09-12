"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";

import { createSoloCaseAction } from "@/lib/solo/actions";
import type { SoloCaseInput } from "@/lib/solo/schemas";
import { archiveSoloCaseDraftAction, saveSoloCaseDraftAction, searchSoloClientsAction } from "@/app/solo/novo-caso/actions";
import { PRACTICE_AREAS } from "@/lib/solo/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientOption = { id: string; name: string; document?: string | null; email?: string | null; phone?: string | null };
type WizardForm = SoloCaseInput;

const steps = [
  { key: "cliente", label: "Cliente" },
  { key: "caso", label: "Caso" },
  { key: "contrato", label: "Cobrança" },
  { key: "prazo", label: "Prazo" },
] as const;

const initialForm: WizardForm = {
  existingClientId: null, clientName: "", clientPhone: "", clientEmail: "", clientDocument: "", clientInterestArea: "",
  caseTitle: "", caseKind: "extrajudicial", caseNumber: "", actionType: "", opposingParty: "", notes: "",
  createContract: false, contractServiceDescription: "", contractTotalAmountCents: 0, contractUpfrontAmountCents: 0,
  contractInstallmentsCount: 1, contractFirstDueDate: null, contractPaymentMethod: "pix",
  createDeadline: false, deadlineTitle: "", deadlineDate: null, deadlinePriority: "normal",
};

function toCents(value: string) {
  const normalized = value.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.max(0, Math.round(number * 100)) : 0;
}

export function NewCaseWizard({ clients: initialClients, initialDraft, draftId }: { clients: ClientOption[]; initialDraft: Partial<SoloCaseInput> | null; draftId: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(initialDraft?.createDeadline ? 3 : initialDraft?.createContract ? 2 : initialDraft?.caseTitle ? 1 : 0);
  const [form, setForm] = useState<WizardForm>({ ...initialForm, ...(initialDraft ?? {}) });
  const [clients, setClients] = useState(initialClients);
  const [clientSearch, setClientSearch] = useState("");
  const [isSearchingClients, startClientSearch] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const searchSequence = useRef(0);
  const createIdempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => {
    const term = clientSearch.trim();
    const sequence = ++searchSequence.current;
    if (!term) {
      setClients(initialClients);
      return;
    }
    const timer = window.setTimeout(() => {
      startClientSearch(async () => {
        const result = await searchSoloClientsAction(term);
        if (sequence === searchSequence.current && result.ok) setClients(result.items);
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [clientSearch, initialClients]);

  const canContinue = useMemo(() => {
    if (step === 0) return Boolean(form.existingClientId || form.clientName.trim().length >= 2);
    if (step === 1) return form.caseTitle.trim().length >= 2 && form.actionType.trim().length >= 2 && (form.caseKind === "extrajudicial" || form.caseNumber.trim().length > 0);
    if (step === 2 && form.createContract) return form.contractServiceDescription.trim().length >= 5 && form.contractTotalAmountCents > 0 && form.contractUpfrontAmountCents <= form.contractTotalAmountCents && Boolean(form.contractFirstDueDate) && form.contractPaymentMethod.trim().length >= 2;
    if (step === 3 && form.createDeadline) return form.deadlineTitle.trim().length >= 3 && Boolean(form.deadlineDate);
    return true;
  }, [form, step]);

  const update = <K extends keyof WizardForm>(field: K, value: WizardForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  };

  const next = () => {
    if (!canContinue) return setError("Preencha os campos obrigatórios para continuar.");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const save = (includeOptionalItems: boolean) => {
    if (includeOptionalItems && !canContinue) {
      return setError("Preencha os campos obrigatórios para concluir o caso.");
    }
    startTransition(async () => {
      if (!includeOptionalItems) {
        const result = await saveSoloCaseDraftAction(form, draftId);
        if (!result.ok) return setError(result.error);
        router.push(`/solo/novo-caso?draft=${result.draftId}`);
        return;
      }
      const input = form;
      const result = await createSoloCaseAction(input, createIdempotencyKey.current);
      if (!result.ok) return setError(result.error);
      if (draftId) await archiveSoloCaseDraftAction(draftId);
      router.push(`/processos/${result.legalCaseId}?criado=1`);
      router.refresh();
    });
  };

  const balance = Math.max(0, form.contractTotalAmountCents - form.contractUpfrontAmountCents);
  const installmentValue = form.contractInstallmentsCount ? balance / form.contractInstallmentsCount : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ol className="grid grid-cols-4 gap-2" aria-label="Etapas do cadastro">
        {steps.map((item, index) => <li key={item.key} className="min-w-0" aria-current={index === step ? "step" : undefined}><div className="flex items-center gap-2"><span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${index < step ? "bg-emerald-600 text-white" : index === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{index < step ? <Check className="size-3.5" /> : index + 1}</span><span className={`truncate text-xs sm:text-sm ${index === step ? "font-medium" : "text-muted-foreground"}`}>{item.label}</span></div></li>)}
      </ol>

      <Card>
        <CardHeader>
          <CardTitle>{steps[step].label}</CardTitle>
          <CardDescription>
            {step === 0 && "Use um cliente já cadastrado ou crie um novo em poucos campos."}
            {step === 1 && "O caso é obrigatório. Cobrança e prazo podem ser adicionados depois."}
            {step === 2 && "Crie a cobrança de honorários agora somente se ela já estiver definida."}
            {step === 3 && "Registre o primeiro prazo somente se ele já estiver definido."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {step === 0 && <>
            <div className="space-y-2"><Label htmlFor="client-search">Buscar cliente já cadastrado</Label><Input id="client-search" value={clientSearch} onChange={(event) => setClientSearch(event.target.value)} placeholder="Nome, CPF/CNPJ, e-mail ou telefone" aria-describedby="client-search-help" aria-busy={isSearchingClients} /><p id="client-search-help" aria-live="polite" className="text-xs text-muted-foreground">{isSearchingClients ? "Buscando..." : clientSearch.trim() && clients.length === 0 ? "Nenhum cliente encontrado." : "Mostrando até 20 resultados por busca."}</p><select id="existing-client" aria-label="Cliente já cadastrado" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.existingClientId ?? ""} onChange={(event) => update("existingClientId", event.target.value || null)}><option value="">Cadastrar novo cliente</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}{client.document ? ` · ${client.document}` : ""}</option>)}</select></div>
            {!form.existingClientId && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="client-name">Nome do cliente *</Label><Input id="client-name" value={form.clientName} onChange={(event) => update("clientName", event.target.value)} autoComplete="name" /></div>
              <div className="space-y-2"><Label htmlFor="client-phone">WhatsApp ou telefone</Label><Input id="client-phone" value={form.clientPhone} onChange={(event) => update("clientPhone", event.target.value)} inputMode="tel" autoComplete="tel" /></div>
              <div className="space-y-2"><Label htmlFor="client-email">E-mail</Label><Input id="client-email" value={form.clientEmail} onChange={(event) => update("clientEmail", event.target.value)} type="email" autoComplete="email" /></div>
              <div className="space-y-2"><Label htmlFor="client-document">CPF ou CNPJ</Label><Input id="client-document" value={form.clientDocument} onChange={(event) => update("clientDocument", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="practice-area">Área de atuação</Label><select id="practice-area" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.clientInterestArea} onChange={(event) => update("clientInterestArea", event.target.value)}><option value="">Não informada</option>{PRACTICE_AREAS.map((area) => <option key={area.key} value={area.key}>{area.name}</option>)}</select></div>
            </div>}
          </>}

          {step === 1 && <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="case-title">Nome do caso *</Label><Input id="case-title" value={form.caseTitle} onChange={(event) => update("caseTitle", event.target.value)} placeholder="Ex.: Revisão de aposentadoria - Maria" /></div>
            <div className="space-y-2"><Label htmlFor="case-kind">Tipo</Label><select id="case-kind" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.caseKind} onChange={(event) => update("caseKind", event.target.value as WizardForm["caseKind"])}><option value="extrajudicial">Caso extrajudicial</option><option value="judicial">Processo judicial</option></select></div>
            <div className="space-y-2"><Label htmlFor="action-type">Assunto ou tipo de ação *</Label><Input id="action-type" value={form.actionType} onChange={(event) => update("actionType", event.target.value)} placeholder="Ex.: Direito previdenciário" /></div>
            {form.caseKind === "judicial" && <div className="space-y-2 sm:col-span-2"><Label htmlFor="case-number">Número do processo *</Label><Input id="case-number" value={form.caseNumber} onChange={(event) => update("caseNumber", event.target.value)} placeholder="0000000-00.0000.0.00.0000" /></div>}
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="opposing-party">Parte contrária</Label><Input id="opposing-party" value={form.opposingParty} onChange={(event) => update("opposingParty", event.target.value)} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="case-notes">Anotações iniciais</Label><textarea id="case-notes" className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></div>
          </div>}

          {step === 2 && <>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm"><input type="checkbox" checked={form.createContract} onChange={(event) => update("createContract", event.target.checked)} /><span><span className="block font-medium">Criar cobrança de honorários</span><span className="text-muted-foreground">Opcional. Você poderá criar ou ajustar depois.</span></span></label>
            {form.createContract && <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="service-description">Serviço contratado *</Label><Input id="service-description" value={form.contractServiceDescription} onChange={(event) => update("contractServiceDescription", event.target.value)} placeholder="Ex.: Acompanhamento administrativo" /></div>
              <div className="space-y-2"><Label htmlFor="contract-total">Valor total *</Label><Input id="contract-total" value={form.contractTotalAmountCents ? String(form.contractTotalAmountCents / 100) : ""} onChange={(event) => update("contractTotalAmountCents", toCents(event.target.value))} inputMode="decimal" placeholder="0,00" /></div>
              <div className="space-y-2"><Label htmlFor="contract-upfront">Entrada</Label><Input id="contract-upfront" value={form.contractUpfrontAmountCents ? String(form.contractUpfrontAmountCents / 100) : ""} onChange={(event) => update("contractUpfrontAmountCents", toCents(event.target.value))} inputMode="decimal" placeholder="0,00" /></div>
              <div className="space-y-2"><Label htmlFor="contract-installments">Parcelas</Label><Input id="contract-installments" type="number" min="1" max="60" value={form.contractInstallmentsCount} onChange={(event) => update("contractInstallmentsCount", Math.max(1, Number(event.target.value) || 1))} /></div>
              <div className="space-y-2"><Label htmlFor="first-due-date">Primeiro vencimento *</Label><Input id="first-due-date" type="date" value={form.contractFirstDueDate ?? ""} onChange={(event) => update("contractFirstDueDate", event.target.value || null)} /></div>
              <div className="space-y-2"><Label htmlFor="payment-method">Forma de pagamento *</Label><select id="payment-method" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.contractPaymentMethod} onChange={(event) => update("contractPaymentMethod", event.target.value)}><option value="pix">PIX</option><option value="boleto">Boleto</option><option value="transferencia">Transferência</option><option value="cartao">Cartão</option><option value="dinheiro">Dinheiro</option></select></div>
              <div className="rounded-lg bg-muted p-4 sm:col-span-2"><p className="text-xs text-muted-foreground">Valor por parcela</p><p className="text-lg font-semibold">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(installmentValue / 100)}</p><p className="mt-1 text-xs text-muted-foreground">A entrada será registrada como valor a receber na data do primeiro vencimento. Depois, registre o pagamento em Recebimentos.</p></div>
            </div>}
          </>}

          {step === 3 && <>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 text-sm"><input type="checkbox" checked={form.createDeadline} onChange={(event) => update("createDeadline", event.target.checked)} /><span><span className="block font-medium">Cadastrar o primeiro prazo</span><span className="text-muted-foreground">Opcional. Você pode cadastrar prazos quando precisar.</span></span></label>
            {form.createDeadline && <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="deadline-title">Título *</Label><Input id="deadline-title" value={form.deadlineTitle} onChange={(event) => update("deadlineTitle", event.target.value)} placeholder="Ex.: Enviar documentos" /></div><div className="space-y-2"><Label htmlFor="deadline-date">Data *</Label><Input id="deadline-date" type="date" value={form.deadlineDate ?? ""} onChange={(event) => update("deadlineDate", event.target.value || null)} /></div><div className="space-y-2"><Label htmlFor="deadline-priority">Prioridade</Label><select id="deadline-priority" className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" value={form.deadlinePriority} onChange={(event) => update("deadlinePriority", event.target.value as WizardForm["deadlinePriority"])}><option value="baixa">Baixa</option><option value="normal">Normal</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></div></div>}
          </>}

          {error && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" onClick={() => step === 0 ? router.back() : setStep((current) => current - 1)} disabled={isPending}><ChevronLeft className="size-4" /> Voltar</Button><div className="flex flex-wrap gap-2"><Button variant="ghost" onClick={() => save(false)} disabled={isPending}>Salvar rascunho</Button>{step < steps.length - 1 ? <Button onClick={next} disabled={isPending}>Próximo <ChevronRight className="size-4" /></Button> : <Button onClick={() => save(true)} disabled={isPending}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}Concluir e salvar caso</Button>}</div></div>
    </div>
  );
}
