"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  SkipForward,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  advanceOnboardingStepAction,
  skipOnboardingStepAction,
} from "@/lib/onboarding/actions";
import type {
  OnboardingProfile,
  OnboardingStep,
  OnboardingStepKey,
  OnboardingStepGroup,
} from "@/lib/onboarding/constants";

// ── Types ──────────────────────────────────────────────────────────────────

interface SessionData {
  id: string;
  completed_steps: OnboardingStepKey[];
  current_step: OnboardingStepKey | null;
}

interface ProgressData {
  completed_count: number;
  required_completed: number;
  required_total: number;
  total_steps: number;
  percentage: number;
}

interface OnboardingChecklistProps {
  session: SessionData;
  progress: ProgressData;
  profile: OnboardingProfile;
  profileLabel: string;
  groupLabels: Record<OnboardingStepGroup, string>;
  steps: OnboardingStep[];
}

// ── Step status helpers ────────────────────────────────────────────────────

type StepStatus = "completed" | "current" | "pending";

function getStepStatus(
  stepKey: OnboardingStepKey,
  completedSteps: OnboardingStepKey[],
  currentStep: OnboardingStepKey | null,
): StepStatus {
  if (completedSteps.includes(stepKey)) return "completed";
  if (stepKey === currentStep) return "current";
  return "pending";
}

// ── Placeholder content per step ──────────────────────────────────────────

const STEP_PLACEHOLDERS: Partial<Record<OnboardingStepKey, string>> = {
  office_data:
    "Preencha os dados básicos do escritório: nome, CNPJ, endereço e contato. Essas informações serão usadas em documentos e comunicações.",
  branding:
    "Personalize a identidade visual do escritório com logo e cores. Isso aparecerá em relatórios e no portal do cliente.",
  practice_areas:
    "Selecione as áreas de atuação do escritório (ex: Direito Civil, Trabalhista, Penal). Isso ajuda a organizar os processos.",
  professional_oab:
    "Cadastre os dados profissionais e número de inscrição na OAB para cada advogado do escritório.",
  team_setup:
    "Configure a estrutura da equipe, definindo departamentos e hierarquia.",
  invite_users:
    "Convide membros da equipe por e-mail para acessar o sistema. Cada usuário receberá um link de convite.",
  roles_permissions:
    "Defina papéis (advogado, estagiário, secretário) e suas permissões de acesso no sistema.",
  financial_config:
    "Configure as regras financeiras: honorários, tabelas de custas e parâmetros de cobrança.",
  process_types:
    "Cadastre os tipos de processo utilizados pelo escritório (ex: Ação Civil, Mandado de Segurança).",
  deadline_types:
    "Configure os tipos de prazo que o escritório acompanha (ex: prazo recursal, audiência).",
  payment_methods:
    "Registre as formas de pagamento aceitas pelo escritório (PIX, boleto, cartão).",
  data_import:
    "Importe dados de outros sistemas ou planilhas para agilizar a configuração inicial.",
  first_client:
    "Cadastre seu primeiro cliente no sistema para iniciar o uso operacional.",
  first_process:
    "Abra seu primeiro processo vinculado a um cliente para conhecer o fluxo completo.",
  first_contract:
    "Crie seu primeiro modelo de contrato para agilizar a geração de documentos.",
  first_deadline:
    "Registre seu primeiro prazo para testar o sistema de alertas e notificações.",
  client_portal:
    "Ative e configure o portal do cliente para que seus clientes acompanhem os processos.",
  security_config:
    "Revise as configurações de segurança: autenticação, sessões e logs de auditoria.",
};

// ── Component ──────────────────────────────────────────────────────────────

export function OnboardingChecklist({
  session,
  progress,
  profile,
  profileLabel,
  groupLabels,
  steps,
}: OnboardingChecklistProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedStep, setSelectedStep] = useState<OnboardingStepKey | null>(
    session.current_step,
  );

  // Group steps by their group
  const groupedSteps = useMemo(() => {
    const groups: Record<OnboardingStepGroup, OnboardingStep[]> = {
      setup: [],
      team: [],
      financial: [],
      usage: [],
    };
    for (const step of steps) {
      groups[step.group].push(step);
    }
    return groups;
  }, [steps]);

  const activeStep = steps.find((s) => s.key === selectedStep);
  const activeStepIndex = steps.findIndex((s) => s.key === selectedStep);

  const isFirstStep = activeStepIndex <= 0;
  const isLastStep = activeStepIndex >= steps.length - 1;

  function handleAdvance() {
    if (!activeStep) return;
    startTransition(async () => {
      await advanceOnboardingStepAction(profile, activeStep.key);
    });
  }

  function handleSkip() {
    if (!activeStep || activeStep.required) return;
    startTransition(async () => {
      await skipOnboardingStepAction(profile, activeStep.key);
    });
  }

  function handleBack() {
    if (isFirstStep) return;
    setSelectedStep(steps[activeStepIndex - 1].key);
  }

  return (
    <div className="flex min-h-screen">
      {/* ─── Sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden w-80 shrink-0 border-r bg-card/50 p-6 lg:block">
        <div className="mb-6 space-y-1">
          <h2 className="font-heading text-lg font-semibold">
            {profileLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            Configuração do onboarding
          </p>
        </div>

        {/* Barra de progresso */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-medium text-foreground">
              {progress.percentage}%
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {progress.completed_count} de {progress.total_steps} etapas
          </p>
        </div>

        {/* Lista de etapas agrupadas */}
        <nav className="space-y-5">
          {(
            Object.keys(groupedSteps) as OnboardingStepGroup[]
          ).map((groupKey) => {
            const groupSteps = groupedSteps[groupKey];
            if (groupSteps.length === 0) return null;

            return (
              <div key={groupKey}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {groupLabels[groupKey]}
                </h3>
                <ul className="space-y-0.5">
                  {groupSteps.map((step) => {
                    const status = getStepStatus(
                      step.key,
                      session.completed_steps,
                      session.current_step,
                    );
                    const isActive = step.key === selectedStep;

                    return (
                      <li key={step.key}>
                        <button
                          onClick={() => setSelectedStep(step.key)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {/* Ícone de status */}
                          <span className="flex size-5 shrink-0 items-center justify-center">
                            {status === "completed" ? (
                              <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                <Check className="size-3" />
                              </span>
                            ) : status === "current" ? (
                              <span className="size-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
                            ) : (
                              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
                            )}
                          </span>

                          {/* Label */}
                          <span className="flex-1 truncate">{step.label}</span>

                          {/* Badge obrigatório */}
                          {step.required && (
                            <Badge
                              variant="secondary"
                              className="ml-auto shrink-0 text-[0.65rem]"
                            >
                              Obrigatório
                            </Badge>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ─── Conteúdo principal ─────────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Barra de progresso mobile */}
        <div className="border-b bg-card/50 px-6 py-3 lg:hidden">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{profileLabel}</span>
            <span className="font-medium text-foreground">
              {progress.percentage}%
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>

        {/* Área de conteúdo */}
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
          {activeStep ? (
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                      getStepStatus(
                        activeStep.key,
                        session.completed_steps,
                        session.current_step,
                      ) === "completed"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getStepStatus(
                      activeStep.key,
                      session.completed_steps,
                      session.current_step,
                    ) === "completed" ? (
                      <Check className="size-4" />
                    ) : (
                      activeStepIndex + 1
                    )}
                  </span>
                  <div>
                    <CardTitle className="text-xl">
                      {activeStep.label}
                    </CardTitle>
                    {activeStep.required && (
                      <Badge variant="secondary" className="mt-1">
                        Etapa obrigatória
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Conteúdo placeholder */}
                <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
                  {STEP_PLACEHOLDERS[activeStep.key] ??
                    "Configure esta etapa conforme as necessidades do seu escritório."}
                </div>

                {/* Navegação */}
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={isFirstStep || isPending}
                  >
                    <ChevronLeft className="size-4" />
                    Voltar
                  </Button>

                  <div className="flex items-center gap-2">
                    {!activeStep.required && (
                      <Button
                        variant="outline"
                        onClick={handleSkip}
                        disabled={isPending}
                      >
                        <SkipForward className="size-4" />
                        Pular
                      </Button>
                    )}
                    <Button onClick={handleAdvance} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <>
                          Avançar
                          <ChevronRight className="size-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center text-muted-foreground">
              <p>Selecione uma etapa ao lado para começar.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-card/50 px-6 py-3 text-center text-xs text-muted-foreground">
          Etapa {activeStepIndex + 1} de {steps.length}
        </div>
      </div>
    </div>
  );
}
