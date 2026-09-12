"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { PRICING_STATUS_CONFIG } from "@/lib/pricing/constants";
import type { PricingScenarioStatus } from "@/lib/pricing/types";

interface ScenarioFiltersProps {
  currentStatus?: PricingScenarioStatus;
  currentSearch?: string;
  includeArchived: boolean;
}

export function ScenarioFilters({
  currentStatus,
  currentSearch,
  includeArchived,
}: ScenarioFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentSearch ?? "");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    startTransition(() => {
      router.push(`/simulador?${params.toString()}`);
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search || null);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Busca */}
      <form onSubmit={handleSearch} className="flex-1">
        <input
          type="text"
          placeholder="Buscar cenários..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Buscar cenários"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>

      {/* Filtro de status */}
      <select
        value={currentStatus ?? ""}
        onChange={(e) => updateParam("status", e.target.value || null)}
        aria-label="Filtrar por status"
        className="rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Todos os status</option>
        {(Object.entries(PRICING_STATUS_CONFIG) as [PricingScenarioStatus, { label: string }][]).map(
          ([value, config]) => (
            <option key={value} value={value}>
              {config.label}
            </option>
          )
        )}
      </select>

      {/* Toggle arquivados */}
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => updateParam("include_archived", e.target.checked ? "true" : null)}
          className="rounded border-gray-300"
        />
        Arquivados
      </label>

      {isPending && (
        <span className="text-xs text-muted-foreground">Carregando...</span>
      )}
    </div>
  );
}
