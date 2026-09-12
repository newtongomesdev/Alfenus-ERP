"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setTenantLimitOverrideAction, removeTenantLimitOverrideAction } from "../../limites-actions";

export function LimitesForm({
  tenantId,
  limitKey,
  currentOverride,
}: {
  tenantId: string;
  limitKey: string;
  currentOverride: number | null;
}) {
  const [value, setValue] = useState(currentOverride != null ? String(currentOverride) : "");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSave() {
    const num = Number(value);
    if (!Number.isFinite(num) || num < 0) return;
    startTransition(async () => {
      await setTenantLimitOverrideAction(tenantId, limitKey, num, reason);
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeTenantLimitOverrideAction(tenantId, limitKey);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={-1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Override"
        className="w-24 h-8 text-xs"
      />
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo"
        className="w-32 h-8 text-xs"
      />
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={isPending || !value}
        onClick={handleSave}
      >
        Salvar
      </Button>
      {currentOverride != null && (
        <Button
          size="sm"
          variant="destructive"
          className="h-8 text-xs"
          disabled={isPending}
          onClick={handleRemove}
        >
          Remover
        </Button>
      )}
    </div>
  );
}
