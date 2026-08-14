"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PRACTICE_AREAS } from "@/lib/solo/constants";
import { Check, ChevronRight, ChevronLeft } from "lucide-react";

const STEPS = [
  { key: "cliente", label: "Cliente" },
  { key: "caso", label: "Caso/Processo" },
  { key: "contrato", label: "Contrato" },
  { key: "parcelamento", label: "Parcelamento" },
  { key: "prazo", label: "Prazo inicial" },
];

export function NewCaseWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    // Cliente
    client_name: "",
    client_phone: "",
    client_whatsapp: "",
    client_email: "",
    client_document: "",
    client_interest_area: "",
    // Caso
    case_title: "",
    case_kind: "judicial" as "judicial" | "extrajudicial",
    action_type: "",
    case_number: "",
    status: "em_analise",
    priority: "normal",
    opposing_party: "",
    observations: "",
    // Contrato
    service_description: "",
    total_amount_cents: 0,
    upfront_amount_cents: 0,
    installments_count: 1,
    // Prazo
    deadline_title: "",
    deadline_date: "",
    deadline_priority: "normal",
  });

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex size-7 items-center justify-center rounded-full text-xs font-medium ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <Check className="size-3" /> : i + 1}
              </div>
              <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{STEPS[step].label}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome do cliente *</Label>
                  <Input value={form.client_name} onChange={(e) => update("client_name", e.target.value)} placeholder="Nome completo" />
                </div>
                <div>
                  <Label>Telefone/WhatsApp</Label>
                  <Input value={form.client_phone} onChange={(e) => update("client_phone", e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input value={form.client_email} onChange={(e) => update("client_email", e.target.value)} placeholder="email@exemplo.com" />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input value={form.client_document} onChange={(e) => update("client_document", e.target.value)} placeholder="000.000.000-00" />
                </div>
              </div>
              <div>
                <Label>Área jurídica</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.client_interest_area} onChange={(e) => update("client_interest_area", e.target.value)}>
                  <option value="">Selecione...</option>
                  {PRACTICE_AREAS.map((area) => <option key={area.key} value={area.key}>{area.name}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Nome interno do caso *</Label>
                  <Input value={form.case_title} onChange={(e) => update("case_title", e.target.value)} placeholder="Ex: Ação trabalhista - João" />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.case_kind} onChange={(e) => update("case_kind", e.target.value)}>
                    <option value="judicial">Judicial</option>
                    <option value="extrajudicial">Extrajudicial</option>
                  </select>
                </div>
                <div>
                  <Label>Número do processo (opcional)</Label>
                  <Input value={form.case_number} onChange={(e) => update("case_number", e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.priority} onChange={(e) => update("priority", e.target.value)}>
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Parte contrária</Label>
                <Input value={form.opposing_party} onChange={(e) => update("opposing_party", e.target.value)} placeholder="Nome da parte contrária" />
              </div>
              <div>
                <Label>Observações</Label>
                <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={form.observations} onChange={(e) => update("observations", e.target.value)} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label>Descrição do serviço</Label>
                <Input value={form.service_description} onChange={(e) => update("service_description", e.target.value)} placeholder="Ex: Ação trabalhista completa" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Valor total (R$)</Label>
                  <Input type="number" step="0.01" value={(form.total_amount_cents / 100).toFixed(2)} onChange={(e) => update("total_amount_cents", Math.round(parseFloat(e.target.value || "0") * 100))} />
                </div>
                <div>
                  <Label>Entrada (R$)</Label>
                  <Input type="number" step="0.01" value={(form.upfront_amount_cents / 100).toFixed(2)} onChange={(e) => update("upfront_amount_cents", Math.round(parseFloat(e.target.value || "0") * 100))} />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <Label>Quantidade de parcelas</Label>
                <Input type="number" min="1" value={form.installments_count} onChange={(e) => update("installments_count", parseInt(e.target.value || "1"))} />
              </div>
              {form.installments_count > 0 && form.total_amount_cents > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <p className="text-sm text-muted-foreground">Valor da parcela</p>
                  <p className="text-lg font-semibold">
                    R$ {((form.total_amount_cents - form.upfront_amount_cents) / form.installments_count / 100).toFixed(2)}
                  </p>
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <Label>Título do prazo</Label>
                <Input value={form.deadline_title} onChange={(e) => update("deadline_title", e.target.value)} placeholder="Ex: Contestação" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Data</Label>
                  <Input type="date" value={form.deadline_date} onChange={(e) => update("deadline_date", e.target.value)} />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" value={form.deadline_priority} onChange={(e) => update("deadline_priority", e.target.value)}>
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => step > 0 ? setStep(step - 1) : router.back()}>
          <ChevronLeft className="size-4 mr-1" /> Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => router.push("/meu-dia")}>
            Salvar e continuar depois
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>
              Próximo <ChevronRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => router.push("/meu-dia")}>
              Concluir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
