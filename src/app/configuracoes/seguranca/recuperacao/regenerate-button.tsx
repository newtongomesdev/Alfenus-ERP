"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RecoveryCodesDisplay } from "@/components/security/recovery-codes-display";
import { regenerateRecoveryCodesAction } from "../actions";

export function RegenerateButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [generatedCodes, setGeneratedCodes] = useState<{
    codes: string[];
    batchId: string;
  } | null>(null);

  function handleRegenerate() {
    startTransition(async () => {
      try {
        const result = await regenerateRecoveryCodesAction();
        if (result.success && result.codes.length > 0) {
          setGeneratedCodes({
            codes: result.codes,
            batchId: crypto.randomUUID(),
          });
          toast.success("Novos codigos de recuperacao gerados!");
          router.refresh();
        }
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Erro ao gerar codigos de recuperacao."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <Button
        variant="destructive"
        onClick={handleRegenerate}
        disabled={isPending}
      >
        <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
        {isPending ? "Gerando..." : "Gerar novos codigos"}
      </Button>

      {generatedCodes && (
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Novos Codigos Gerados</CardTitle>
            <CardDescription>
              Guarde estes codigos em local seguro. Eles nao serao exibidos novamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RecoveryCodesDisplay
              codes={generatedCodes.codes}
              batchId={generatedCodes.batchId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
