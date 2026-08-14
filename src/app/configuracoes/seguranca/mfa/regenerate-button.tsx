"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  regenerateRecoveryCodesAction,
} from "@/app/configuracoes/seguranca/actions";

export function RegenerateRecoveryCodesButton({
  disabled,
}: {
  disabled?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const result = await regenerateRecoveryCodesAction();
        if (result.success) {
          toast.success(
            `${result.codes.length} codigos de recuperacao gerados com sucesso!`
          );
          router.refresh();
        }
      } catch (e) {
        toast.error(
          e instanceof Error
            ? e.message
            : "Erro ao regenerar codigos de recuperacao."
        );
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRegenerate}
      disabled={disabled || isPending}
    >
      <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Regenerando..." : "Regenerar"}
    </Button>
  );
}
