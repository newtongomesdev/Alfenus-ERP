"use client";

import { useMemo, useState } from "react";

type Model = { id: string; name?: string };

export function ModelCombobox({ models, value }: { models: Model[]; value: string }) {
  const selected = models.find((model) => model.id === value);
  const [query, setQuery] = useState(selected?.name ?? value);
  const [selectedId, setSelectedId] = useState(value);
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return models.slice(0, 30);
    return models.filter((model) => `${model.name ?? ""} ${model.id}`.toLowerCase().includes(term)).slice(0, 30);
  }, [models, query]);

  return <div className="relative">
    <input type="hidden" name="activeModel" value={selectedId} />
    <input
      value={query}
      onChange={(event) => { setQuery(event.target.value); setSelectedId(""); setOpen(true); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setTimeout(() => setOpen(false), 150)}
      placeholder="Digite o nome ou ID do modelo"
      autoComplete="off"
      className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
      aria-label="Buscar modelo OpenRouter"
    />
    {open ? <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
      {filtered.map((model) => <button
        key={model.id}
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => { setSelectedId(model.id); setQuery(model.name ?? model.id); setOpen(false); }}
        className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
      ><span className="block font-medium">{model.name ?? model.id}</span><span className="block text-xs text-muted-foreground">{model.id}</span></button>)}
      {filtered.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhum modelo encontrado.</p> : null}
    </div> : null}
  </div>;
}
