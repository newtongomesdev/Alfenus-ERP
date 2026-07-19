"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <AlertTriangle className="size-16 text-destructive/60" />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Algo deu errado</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte se o problema persistir.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Erro: {error.digest}</p>
      ) : null}
      <button
        onClick={() => reset()}
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
      >
        Tentar novamente
      </button>
    </main>
  );
}
