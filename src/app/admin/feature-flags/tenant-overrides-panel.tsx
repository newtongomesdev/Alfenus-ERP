"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { setFlagOverrideAction, removeFlagOverrideAction } from "./actions";

type Tenant = {
  id: string;
  name: string;
};

type Override = {
  lawFirmId: string;
  enabled: boolean;
};

export function TenantOverridesPanel({
  flagId,
  flagKey,
  tenants,
  overrides,
}: {
  flagId: string;
  flagKey: string;
  tenants: Tenant[];
  overrides: Override[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  const overrideMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const o of overrides) map.set(o.lawFirmId, o.enabled);
    return map;
  }, [overrides]);

  const filtered = useMemo(() => {
    if (!search) return tenants;
    const q = search.toLowerCase();
    return tenants.filter((t) => t.name.toLowerCase().includes(q));
  }, [tenants, search]);

  function handleToggle(lawFirmId: string, currentOverride: boolean | undefined) {
    startTransition(async () => {
      if (currentOverride === undefined) {
        await setFlagOverrideAction(flagId, lawFirmId, true);
      } else if (currentOverride === true) {
        await setFlagOverrideAction(flagId, lawFirmId, false);
      } else {
        await removeFlagOverrideAction(flagId, lawFirmId);
      }
      router.refresh();
    });
  }

  return (
    <div className="ml-4 mb-2 rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Overrides por tenant — <code>{flagKey}</code>
        </span>
        {isPending && <span className="text-xs text-muted-foreground">Salvando...</span>}
      </div>
      <Input
        placeholder="Buscar escritório..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-xs max-w-xs"
      />
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum escritório encontrado.</p>
      ) : (
        <div className="space-y-1">
          {filtered.map((tenant) => {
            const current = overrideMap.get(tenant.id);
            let label: string;
            let variant: "default" | "secondary" | "outline";
            let actionLabel: string;
            let nextValue: boolean | undefined;

            if (current === undefined) {
              label = "Sem override";
              variant = "outline";
              actionLabel = "Ativar";
              nextValue = undefined;
            } else if (current) {
              label = "Ativado";
              variant = "default" as const;
              actionLabel = "Desativar";
              nextValue = true;
            } else {
              label = "Desativado";
              variant = "secondary";
              actionLabel = "Remover override";
              nextValue = false;
            }

            return (
              <div key={tenant.id} className="flex items-center justify-between rounded bg-background px-2 py-1">
                <span className="text-sm">{tenant.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={variant} className="text-[10px]">{label}</Badge>
                  <button
                    disabled={isPending}
                    onClick={() => handleToggle(tenant.id, nextValue)}
                    className="text-xs h-6 rounded border border-input bg-background px-2 font-medium transition hover:bg-accent disabled:opacity-50"
                  >
                    {actionLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
