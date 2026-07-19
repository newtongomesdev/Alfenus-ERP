"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Grip, Search, User, Briefcase, Calendar, ListTodo, Handshake, Megaphone } from "lucide-react";

import { Input } from "@/components/ui/input";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  type: "cliente" | "processo" | "prazo" | "tarefa" | "contrato" | "lead";
};

const typeIcon: Record<SearchResult["type"], typeof Search> = {
  cliente: User,
  processo: Briefcase,
  prazo: Calendar,
  tarefa: ListTodo,
  contrato: Handshake,
  lead: Megaphone,
};

const typeLabel: Record<SearchResult["type"], string> = {
  cliente: "Cliente",
  processo: "Processo",
  prazo: "Prazo",
  tarefa: "Tarefa",
  contrato: "Contrato",
  lead: "Lead",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative hidden w-full max-w-md md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        className="pl-9 pr-12"
        placeholder="Buscar clientes, processos ou prazos"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        ⌘K
      </kbd>

      {open && query.length >= 2 && (
        <div className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border bg-background shadow-xl">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum resultado para &ldquo;{query}&rdquo;
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto p-1">
              {results.map((result) => {
                const Icon = typeIcon[result.type];
                return (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                    }}
                    className="flex items-start gap-3 rounded-md px-3 py-2.5 text-sm transition hover:bg-muted"
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{result.title}</div>
                      <div className="truncate text-xs text-muted-foreground">{result.subtitle}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {typeLabel[result.type]}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
