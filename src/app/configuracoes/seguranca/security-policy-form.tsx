"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { saveSecurityPolicyAction } from "./actions";
import type { SecurityPolicy } from "@/lib/security/policies";

export function SecurityPolicyForm({ policy }: { policy: SecurityPolicy }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveSecurityPolicyAction(formData);
        toast.success("Politica de seguranca salva.");
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro ao salvar.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* MFA */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Autenticacao de Dois Fatores (MFA)</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="mfaRequired" defaultChecked={policy.mfaRequired} className="size-4 rounded" />
          Exigir MFA para membros com papel igual ou superior a:
        </label>
        <select name="mfaMinRole" defaultValue={policy.mfaMinRole} className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm">
          <option value="visualizador">Visualizador</option>
          <option value="colaborador">Colaborador</option>
          <option value="assistente">Assistente</option>
          <option value="advogado">Advogado</option>
          <option value="administrador">Administrador</option>
          <option value="proprietario">Proprietario</option>
        </select>
      </fieldset>

      {/* Senha */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Politica de Senha</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Tamanho minimo</span>
            <input type="number" name="passwordMinLength" min="6" max="32" defaultValue={policy.passwordMinLength} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
          </label>
          <label className="space-y-1 text-sm">
            <span>Expiracao (dias, 0 = nunca)</span>
            <input type="number" name="passwordExpiryDays" min="0" max="365" defaultValue={policy.passwordExpiryDays} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm" />
          </label>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="passwordRequireUppercase" defaultChecked={policy.passwordRequireUppercase} className="size-4 rounded" />
            Maiuscula
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="passwordRequireNumber" defaultChecked={policy.passwordRequireNumber} className="size-4 rounded" />
            Numero
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="passwordRequireSymbol" defaultChecked={policy.passwordRequireSymbol} className="size-4 rounded" />
            Simbolo
          </label>
        </div>
      </fieldset>

      {/* Sessao */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Sessao</legend>
        <label className="space-y-1 text-sm">
          <span>Timeout da sessao (minutos)</span>
          <input type="number" name="sessionTimeoutMinutes" min="15" max="1440" defaultValue={policy.sessionTimeoutMinutes} className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm" />
        </label>
      </fieldset>

      {/* IP */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">Restricao de IP</legend>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="ipRestrictionEnabled" defaultChecked={policy.ipRestrictionEnabled} className="size-4 rounded" />
          Ativar restricao por lista de IPs permitidos
        </label>
      </fieldset>

      <button
        type="submit"
        disabled={isPending}
        className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar politica"}
      </button>
    </form>
  );
}
