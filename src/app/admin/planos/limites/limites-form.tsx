"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { savePlanLimitAction, deletePlanLimitAction } from "./actions";

export function LimitForm({
  planId,
  limitKey,
  initialValue,
}: {
  planId: string;
  limitKey: string;
  initialValue: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="h-8 w-24 rounded-md border border-input bg-background px-2 text-sm font-normal"
      />
      <button
        disabled={isPending || value === initialValue}
        onClick={() => {
          startTransition(async () => {
            await savePlanLimitAction(planId, limitKey, value);
            router.refresh();
          });
        }}
        className="h-8 rounded-md border border-input bg-background px-3 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
      >
        {isPending ? "..." : "Salvar"}
      </button>
      <button
        disabled={isPending}
        onClick={() => {
          if (!confirm(`Remover o limite "${limitKey}" do plano ${planId}?`)) return;
          startTransition(async () => {
            await deletePlanLimitAction(planId, limitKey);
            router.refresh();
          });
        }}
        className="h-8 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-sm font-medium text-destructive transition hover:bg-destructive/20 disabled:opacity-50"
      >
        {isPending ? "..." : "Remover"}
      </button>
    </div>
  );
}
