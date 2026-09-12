"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import { saveSetupDiagnosticAnswers, completeSotoSetup } from "@/lib/solo-pro/actions";

const QUESTIONS = [
  {
    key: "practice_areas",
    text: "Em quais áreas atua?",
    options: [
      { value: "trabalhista", label: "Direito Trabalhista" },
      { value: "previdenciario", label: "Direito Previdenciário" },
      { value: "familia", label: "Direito de Família" },
      { value: "consumidor", label: "Direito do Consumidor" },
      { value: "civel", label: "Direito Civil" },
      { value: "criminal", label: "Direito Criminal" },
      { value: "imobiliario", label: "Direito Imobiliário" },
      { value: "empresarial", label: "Direito Empresarial" },
      { value: "tributario", label: "Direito Tributário" },
      { value: "administrativo", label: "Direito Administrativo" },
    ],
    multiSelect: true,
  },
  {
    key: "has_clients",
    text: "Já possui clientes?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }],
    multiSelect: false,
  },
  {
    key: "has_cases",
    text: "Já possui processos?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }],
    multiSelect: false,
  },
  {
    key: "practice_type",
    text: "Trabalha somente com atendimento particular?",
    options: [
      { value: "sim", label: "Sim" },
      { value: "nao", label: "Não" },
      { value: "parcialmente", label: "Parcialmente" },
    ],
    multiSelect: false,
  },
  {
    key: "charging_model",
    text: "Qual modelo de cobrança?",
    options: [
      { value: "fixo", label: "Valor fixo" },
      { value: "parcelas", label: "Parcelas" },
      { value: "exito", label: "Êxito" },
      { value: "mensalidade", label: "Mensalidade" },
      { value: "misto", label: "Misto" },
    ],
    multiSelect: false,
  },
  {
    key: "has_recurring_expenses",
    text: "Possui despesas recorrentes?",
    options: [{ value: "sim", label: "Sim" }, { value: "nao", label: "Não" }],
    multiSelect: false,
  },
  {
    key: "work_location",
    text: "Onde trabalha?",
    options: [
      { value: "casa", label: "Casa" },
      { value: "coworking", label: "Coworking" },
      { value: "escritorio", label: "Escritório" },
    ],
    multiSelect: false,
  },
  {
    key: "hours_per_week",
    text: "Quantas horas por semana pretende trabalhar?",
    options: [
      { value: "20", label: "20h" },
      { value: "30", label: "30h" },
      { value: "40", label: "40h" },
      { value: "50", label: "50h" },
      { value: "60", label: "60h" },
    ],
    multiSelect: false,
  },
  {
    key: "monthly_revenue_goal",
    text: "Qual é sua meta mensal de receita?",
    options: [
      { value: "ate_5000", label: "Até R$ 5.000" },
      { value: "5000_10000", label: "R$ 5.000 – R$ 10.000" },
      { value: "10000_20000", label: "R$ 10.000 – R$ 20.000" },
      { value: "20000_30000", label: "R$ 20.000 – R$ 30.000" },
      { value: "acima_30000", label: "Acima de R$ 30.000" },
    ],
    multiSelect: false,
  },
  {
    key: "biggest_problem",
    text: "Qual é seu maior problema atual?",
    options: [
      { value: "falta_clientes", label: "Falta de clientes" },
      { value: "perda_prazos", label: "Perda de prazos" },
      { value: "falta_cobranca", label: "Falta de cobrança" },
      { value: "desorganizacao", label: "Desorganização" },
      { value: "falta_tempo", label: "Falta de tempo" },
      { value: "falta_documento", label: "Falta de documentos" },
    ],
    multiSelect: false,
  },
];

interface SetupDiagnosticProps {
  onComplete?: () => void;
}

export function SetupDiagnostic({ onComplete }: SetupDiagnosticProps) {
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = QUESTIONS[step];
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100);

  function handleSelect(value: string) {
    if (currentQuestion.multiSelect) {
      const current = (answers[currentQuestion.key] as string[]) ?? [];
      const newValues = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setAnswers({ ...answers, [currentQuestion.key]: newValues });
    } else {
      setAnswers({ ...answers, [currentQuestion.key]: value });
    }
  }

  function handleNext() {
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    }
  }

  function handleBack() {
    if (step > 0) {
      setStep(step - 1);
    }
  }

  function handleFinish() {
    startTransition(async () => {
      setError(null);
      const result = await saveSetupDiagnosticAnswers(answers);
      if (result.ok) {
        await completeSotoSetup();
        if (onComplete) onComplete();
      } else {
        setError(result.error ?? "Erro ao salvar diagnóstico");
      }
    });
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Configuração inicial do escritório</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {step + 1} de {QUESTIONS.length}
          </Badge>
        </div>
        <div className="w-full h-1.5 bg-muted rounded-full mt-2">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">{currentQuestion.text}</h3>

          {currentQuestion.multiSelect ? (
            <div className="flex flex-wrap gap-2">
              {currentQuestion.options.map((option) => {
                const selected = ((answers[currentQuestion.key] as string[]) ?? []).includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted hover:border-primary/50"
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                    {selected && <Check className="inline size-3 ml-1" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.key] === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-muted hover:border-primary/50"
                    }`}
                    onClick={() => handleSelect(option.value)}
                  >
                    {option.label}
                    {selected && <Check className="inline size-3 ml-1" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>

          {step === QUESTIONS.length - 1 ? (
            <Button
              onClick={handleFinish}
              disabled={isPending}
            >
              <Save className="size-4 mr-2" />
              {isPending ? "Salvando..." : "Finalizar configuração"}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Próximo
              <ArrowRight className="size-4 ml-2" />
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}