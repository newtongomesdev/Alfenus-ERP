"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";

import { Input } from "@/components/ui/input";

type EntityOption = { id: string; label: string };

const entityTypeLabels: Record<string, string> = {
  cliente: "Cliente",
  processo: "Processo",
  contrato: "Contrato",
  prazo: "Prazo",
  tarefa: "Tarefa",
};

export function EntitySelect({
  entityType,
  value,
  onChange,
  name,
}: {
  entityType: string;
  value: string;
  onChange: (value: string) => void;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<EntityOption[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EntityOption | null>(null);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset selection when entity type changes
  useEffect(() => {
    const resetId = window.setTimeout(() => {
      setSelected(null);
      onChange("");
      setSearch("");
      setOpen(false);
    }, 0);
    return () => window.clearTimeout(resetId);
  }, [entityType, onChange]);

  // Fetch entities when type changes or search changes
  useEffect(() => {
    if (!entityType || entityType === "outro") return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/entities?type=${entityType}&search=${encodeURIComponent(search)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          setOptions(data.items ?? []);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setOptions([]);
          setLoading(false);
        }
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [entityType, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (option: EntityOption) => {
      setSelected(option);
      onChange(option.id);
      setSearch("");
      setOpen(false);
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setSelected(null);
    onChange("");
    setSearch("");
    inputRef.current?.focus();
  }, [onChange]);

  // If entity type is "outro", don't show the select
  if (entityType === "outro") {
    return (
      <Input
        id="entityId"
        name={name}
        placeholder="ID do registro (opcional)"
      />
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} />
      {selected ? (
        <div className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm">
          <span className="truncate">{selected.label}</span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            ref={inputRef}
            placeholder={`Buscar ${entityTypeLabels[entityType] ?? "entidade"}...`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          <button
            type="button"
            onClick={() => {
              setOpen((prev) => !prev);
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      )}
      {open && !selected && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-background shadow-md">
          {loading ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Buscando...
            </div>
          ) : options.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Nenhum resultado encontrado.
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <Check
                  className={`size-4 shrink-0 ${value === option.id ? "text-primary" : "text-transparent"}`}
                />
                <span className="truncate">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
