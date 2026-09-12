"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

interface ScenarioPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

export function ScenarioPagination({
  currentPage,
  totalPages,
  total,
}: ScenarioPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    startTransition(() => {
      router.push(`/simulador?${params.toString()}`);
    });
  }

  if (totalPages <= 1) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {total} cenário{total !== 1 ? "s" : ""}
      </p>
    );
  }

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        Página {currentPage} de {totalPages} — {total} cenário
        {total !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          aria-label="Página anterior"
          className="rounded border px-3 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          aria-label="Próxima página"
          className="rounded border px-3 py-1 text-xs font-medium hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
