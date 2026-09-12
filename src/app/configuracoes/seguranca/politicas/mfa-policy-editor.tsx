"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveMfaPolicyAction } from "@/app/configuracoes/seguranca/actions";
import { Button } from "@/components/ui/button";
import type { MfaPolicy } from "@/lib/security/mfa-policies";

const ROLE_OPTIONS = [
  { value: "proprietario", label: "Proprietario" },
  { value: "administrador", label: "Administrador" },
  { value: "advogado", label: "Advogado" },
  { value: "assistente", label: "Assistente" },
  { value: "financeiro", label: "Financeiro" },
  { value: "colaborador", label: "Colaborador" },
  { value: "visualizador", label: "Visualizador" },
];

const ENFORCEMENT_OPTIONS = [
  { value: "desabilitado", label: "Desabilitado" },
  { value: "obrigatorio_todos", label: "Obrigatorio para todos" },
  { value: "obrigatorio_roles", label: "Obrigatorio por papéis" },
  { value: "obrigatorio_usuarios", label: "Obrigatorio por usuarios" },
];

export function MfaPolicyEditor({ policy }: { policy: MfaPolicy }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    // Collect checked roles into a JSON array
    const checkedRoles = ROLE_OPTIONS.filter(
      (r) => formData.get(`role_${r.value}`) === "on"
    ).map((r) => r.value);
    formData.set("required_roles", JSON.stringify(checkedRoles));

    // Handle checkboxes that send "on"/"off" — convert to "true"/"false" for server
    formData.set(
      "allow_trusted_devices",
      formData.get("allow_trusted_devices") === "on" ? "true" : "false"
    );
    formData.set(
      "require_step_up",
      formData.get("require_step_up") === "on" ? "true" : "false"
    );

    startTransition(async () => {
      try {
        await saveMfaPolicyAction(formData);
        toast.success("Politica MFA salva com sucesso.");
        router.refresh();
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erro ao salvar politica MFA."
        );
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Enforcement Mode */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Modo de enforcement</legend>
        <select
          name="enforcement_mode"
          defaultValue={policy.enforcementMode}
          className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
        >
          {ENFORCEMENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {policy.enforcementMode === "desabilitado" &&
            "MFA nao e exigido para nenhum usuario."}
          {policy.enforcementMode === "obrigatorio_todos" &&
            "Todos os usuarios do escritorio devem configurar MFA."}
          {policy.enforcementMode === "obrigatorio_roles" &&
            "MFA obrigatorio apenas para os papéis selecionados abaixo."}
          {policy.enforcementMode === "obrigatorio_usuarios" &&
            "MFA obrigatorio apenas para usuarios especificos."}
        </p>
      </fieldset>

      {/* Grace Period */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Periodo de carencia</legend>
        <label className="space-y-1 text-sm">
          <span>Dias de carencia apos ativacao da politica</span>
          <input
            type="number"
            name="grace_period_days"
            min="0"
            max="90"
            defaultValue={policy.gracePeriodDays}
            className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Usuarios terao este numero de dias para configurar MFA apos a
          ativacao da politica.
        </p>
      </fieldset>

      {/* Enforcement Start Date */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Data de inicio da enforcement
        </legend>
        <label className="space-y-1 text-sm">
          <span>Data de inicio (deixe vazio para imediato)</span>
          <input
            type="date"
            name="enforcement_start_at"
            defaultValue={
              policy.enforcementStartAt
                ? policy.enforcementStartAt.split("T")[0]
                : ""
            }
            className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
      </fieldset>

      {/* Trusted Devices */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Dispositivos confiaveis
        </legend>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="allow_trusted_devices"
            defaultChecked={policy.allowTrustedDevices}
            className="size-4 rounded"
          />
          Permitir dispositivos confiaveis (pular MFA em dispositivos salvos)
        </label>
        <label className="space-y-1 text-sm">
          <span>Duracao da confianca (dias)</span>
          <input
            type="number"
            name="trusted_device_duration_days"
            min="1"
            max="365"
            defaultValue={policy.trustedDeviceDurationDays}
            className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
          />
        </label>
      </fieldset>

      {/* Step-up Authentication */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Step-up Authentication
        </legend>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="require_step_up"
            defaultChecked={policy.requireStepUpForSensitiveActions}
            className="size-4 rounded"
          />
          Exigir verificacao MFA adicional para acoes sensiveis (financeiro,
          exportacao, alteracao de permissoes)
        </label>
      </fieldset>

      {/* Required Roles (shown only for obrigatorio_roles) */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">
          Papéis com MFA obrigatorio
        </legend>
        <p className="text-xs text-muted-foreground">
          Selecione os papéis que devem obrigatoriamente configurar MFA.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          {ROLE_OPTIONS.map((role) => (
            <label key={role.value} className="flex items-center gap-2">
              <input
                type="checkbox"
                name={`role_${role.value}`}
                defaultChecked={policy.requiredRoles.includes(role.value)}
                className="size-4 rounded"
              />
              {role.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar politica"}
      </Button>
    </form>
  );
}
