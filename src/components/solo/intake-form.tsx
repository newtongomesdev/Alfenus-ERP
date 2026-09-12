"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PRACTICE_AREAS } from "@/lib/solo/constants";
import { createIntakeFormAction } from "@/lib/solo/actions";
import { useRouter } from "next/navigation";

const URGENCY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export function IntakeForm({ templateQuestions }: { templateQuestions?: string[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    consultation_reason: "",
    practice_area: "",
    problem_summary: "",
    urgency: "normal",
    has_active_process: false,
    process_number: "",
    client_objective: "",
    perceived_risks: "",
    next_steps: "",
    private_notes: "",
  });

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSave() {
    if (!form.consultation_reason.trim()) return;
    setSaving(true);
    const result = await createIntakeFormAction(form);
    setSaving(false);
    if (result.ok && result.id) {
      router.push(`/atendimentos/${result.id}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Aviso */}
      <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
        <strong>Ficha de atendimento inicial.</strong> Preencha as informações da consulta. Você pode converter em cliente ou caso depois.
      </div>

      {/* Motivo e dados básicos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da consulta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Motivo da consulta *</Label>
            <Input
              value={form.consultation_reason}
              onChange={(e) => update("consultation_reason", e.target.value)}
              placeholder="Ex: Demissão sem justa causa, pensão alimentícia..."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Área jurídica</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.practice_area}
                onChange={(e) => update("practice_area", e.target.value)}
              >
                <option value="">Selecione...</option>
                {PRACTICE_AREAS.map((area) => (
                  <option key={area.key} value={area.key}>{area.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Urgência</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.urgency}
                onChange={(e) => update("urgency", e.target.value)}
              >
                {URGENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label>Resumo do problema</Label>
            <textarea
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.problem_summary}
              onChange={(e) => update("problem_summary", e.target.value)}
              placeholder="Descreva brevemente a situação do cliente..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Perguntas do template */}
      {templateQuestions && templateQuestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Perguntas sugeridas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {templateQuestions.map((q, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{q}</Badge>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Use estas perguntas como guia durante a consulta.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Processo e objetivos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Processo e objetivos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="has_active_process"
              checked={form.has_active_process}
              onChange={(e) => update("has_active_process", e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="has_active_process">Já existe processo ativo?</Label>
          </div>

          {form.has_active_process && (
            <div>
              <Label>Número do processo</Label>
              <Input
                value={form.process_number}
                onChange={(e) => update("process_number", e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
              />
            </div>
          )}

          <div>
            <Label>Objetivo do cliente</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.client_objective}
              onChange={(e) => update("client_objective", e.target.value)}
              placeholder="O que o cliente espera conseguir?"
            />
          </div>

          <div>
            <Label>Riscos percebidos</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.perceived_risks}
              onChange={(e) => update("perceived_risks", e.target.value)}
              placeholder="Quais riscos você identifica neste caso?"
            />
          </div>

          <div>
            <Label>Próximos passos</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.next_steps}
              onChange={(e) => update("next_steps", e.target.value)}
              placeholder="O que precisa ser feito agora?"
            />
          </div>

          <Separator />

          <div>
            <Label>Observações privadas</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={form.private_notes}
              onChange={(e) => update("private_notes", e.target.value)}
              placeholder="Anotações internas (não visíveis ao cliente)..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving || !form.consultation_reason.trim()}>
          {saving ? "Salvando..." : "Salvar ficha"}
        </Button>
      </div>
    </div>
  );
}
