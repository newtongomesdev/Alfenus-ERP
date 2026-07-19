import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
  basePath?: string;
  totalRecords?: number;
}

function buildHref(basePath: string, page: number) {
  const url = new URL(basePath, "http://localhost");
  url.searchParams.set("page", String(page));
  return url.pathname + url.search;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  totalRecords,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav className="flex flex-col items-center gap-3" aria-label="Paginação">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          render={
            basePath ? (
              <Link href={buildHref(basePath, currentPage - 1)} />
            ) : undefined
          }
        >
          <ChevronLeft className="size-4" />
          Anterior
        </Button>

        {pages.map((page, i) =>
          page === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="flex size-8 items-center justify-center text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="icon-sm"
              render={
                basePath ? (
                  <Link href={buildHref(basePath, page)} />
                ) : undefined
              }
              className={cn(page === currentPage && "pointer-events-none")}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          render={
            basePath ? (
              <Link href={buildHref(basePath, currentPage + 1)} />
            ) : undefined
          }
        >
          Próximo
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Página {currentPage} de {totalPages}
        {totalRecords != null && ` (${totalRecords} registros)`}
      </p>
    </nav>
  );
}
