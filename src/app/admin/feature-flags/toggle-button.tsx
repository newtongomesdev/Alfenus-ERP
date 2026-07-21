"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toggleFeatureFlagAction } from "./actions";

export function ToggleFeatureButton({
  flagId,
  flagKey,
  initialEnabled,
}: {
  flagId: string;
  flagKey: string;
  initialEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const fd = new FormData();
          fd.set("flagId", flagId);
          fd.set("enabled", String(!initialEnabled));
          await toggleFeatureFlagAction(fd);
          router.refresh();
        });
      }}
      className="h-8 rounded-md border border-input bg-background px-3 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
    >
      {isPending ? "..." : initialEnabled ? "Desativar" : "Ativar"}
    </button>
  );
}
