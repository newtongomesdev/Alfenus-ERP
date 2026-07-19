"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationPref = {
  notificationType: string;
  enabled: boolean;
};

type NotificationPreferencesProps = {
  lawFirmId: string;
  memberId: string;
  preferences: NotificationPref[];
};

// ---------------------------------------------------------------------------
// Notification type metadata
// ---------------------------------------------------------------------------

const notificationTypes: Record<
  string,
  { label: string; description: string }
> = {
  deadline_reminder: {
    label: "Lembrete de prazo",
    description:
      "Receba lembretes antes do vencimento de prazos jurídicos importantes.",
  },
  deadline_overdue: {
    label: "Prazo vencido",
    description:
      "Seja notificado quando um prazo jurídico passar da data de vencimento.",
  },
  task_assigned: {
    label: "Tarefa atribuída",
    description:
      "Receba notificação quando uma nova tarefa for atribuída a você.",
  },
  task_overdue: {
    label: "Tarefa atrasada",
    description:
      "Alerta quando uma tarefa atribuída a você estiver atrasada.",
  },
  payment_received: {
    label: "Pagamento recebido",
    description:
      "Notificação quando um pagamento for registrado no sistema.",
  },
  payment_overdue: {
    label: "Pagamento atrasado",
    description:
      "Alerta quando uma parcela ou pagamento estiver em atraso.",
  },
  document_received: {
    label: "Documento recebido",
    description:
      "Notificação quando um novo documento for adicionado a uma entidade.",
  },
  mention: {
    label: "Menção",
    description:
      "Receba notificação quando alguém mencionar você em um comentário.",
  },
  workflow_update: {
    label: "Atualização de workflow",
    description:
      "Notificação quando um workflow do qual você participa for atualizado.",
  },
  client_portal_access: {
    label: "Acesso do portal do cliente",
    description:
      "Alerta quando um cliente acessar o portal ou baixar documentos.",
  },
};

// ---------------------------------------------------------------------------
// Toggle Switch
// ---------------------------------------------------------------------------

function Toggle({
  checked,
  onCheckedChange,
  disabled,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "pointer-events-none block size-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function NotificationPreferences({
  lawFirmId,
  memberId,
  preferences,
}: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<NotificationPref[]>(preferences);
  const [updatingType, setUpdatingType] = useState<string | null>(null);

  // Sync with server props
  useEffect(() => {
    setPrefs(preferences);
  }, [preferences]);

  const handleToggle = useCallback(
    async (notificationType: string, newEnabled: boolean) => {
      // Optimistic update
      setPrefs((prev) =>
        prev.map((p) =>
          p.notificationType === notificationType
            ? { ...p, enabled: newEnabled }
            : p,
        ),
      );

      setUpdatingType(notificationType);

      try {
        const res = await fetch("/api/notification-preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lawFirmId,
            memberId,
            notificationType,
            enabled: newEnabled,
          }),
        });

        if (res.ok) {
          toast.success(
            `${notificationTypes[notificationType]?.label ?? notificationType} ${newEnabled ? "ativado" : "desativado"}`,
          );
        } else {
          // Revert
          setPrefs((prev) =>
            prev.map((p) =>
              p.notificationType === notificationType
                ? { ...p, enabled: !newEnabled }
                : p,
            ),
          );
          toast.error("Erro ao atualizar preferência");
        }
      } catch {
        // Revert
        setPrefs((prev) =>
          prev.map((p) =>
            p.notificationType === notificationType
              ? { ...p, enabled: !newEnabled }
              : p,
          ),
        );
        toast.error("Erro ao atualizar preferência");
      } finally {
        setUpdatingType(null);
      }
    },
    [lawFirmId, memberId],
  );

  return (
    <div className="space-y-1">
      {Object.entries(notificationTypes).map(
        ([type, { label, description }]) => {
          const pref = prefs.find((p) => p.notificationType === type);
          const enabled = pref?.enabled ?? true;
          const isUpdating = updatingType === type;

          return (
            <div
              key={type}
              className="flex items-center justify-between gap-4 rounded-lg px-4 py-3 hover:bg-muted/50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>

              <div className="shrink-0">
                {isUpdating ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <Toggle
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      handleToggle(type, checked)
                    }
                    label={`Ativar ${label}`}
                  />
                )}
              </div>
            </div>
          );
        },
      )}
    </div>
  );
}
