import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <FileQuestion className="size-16 text-muted-foreground/40" />
      <h1 className="mt-6 text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">Página não encontrada</p>
      <p className="mt-1 text-sm text-muted-foreground">
        O endereço que você acessou não existe ou foi movido.
      </p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
      >
        Ir para o Dashboard
      </Link>
    </main>
  );
}
