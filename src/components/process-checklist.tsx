"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getErrorMessage } from "@/lib/utils";
import {
  type ChecklistItem,
  getProcessChecklist,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  getChecklistTemplates,
  applyChecklistTemplate,
  type ChecklistTemplate,
} from "@/lib/checklists/actions";

function CheckIcon({ checked }: { checked: boolean }) {
  return (
    <svg className={`h-4 w-4 ${checked ? "text-emerald-600" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {checked ? (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" className="opacity-0" />
      )}
    </svg>
  );
}

export function ProcessChecklist({ processId }: { processId: string }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [checklistData, templateData] = await Promise.all([
          getProcessChecklist(processId).catch(() => []),
          getChecklistTemplates().catch(() => []),
        ]);
        setItems(checklistData);
        setTemplates(templateData);
      } catch {
        // Silenciar erros de carregamento
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [processId]);

  const handleAdd = useCallback(() => {
    if (!newItemTitle.trim()) return;
    startTransition(async () => {
      try {
        const newItem = await addChecklistItem(processId, newItemTitle.trim());
        setItems((prev) => [...prev, newItem]);
        setNewItemTitle("");
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [processId, newItemTitle]);

  const handleToggle = useCallback((itemId: string) => {
    startTransition(async () => {
      try {
        const updated = await toggleChecklistItem(processId, itemId);
        setItems(updated);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [processId]);

  const handleRemove = useCallback((itemId: string) => {
    startTransition(async () => {
      try {
        const updated = await removeChecklistItem(processId, itemId);
        setItems(updated);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [processId]);

  const handleApplyTemplate = useCallback((templateId: string) => {
    startTransition(async () => {
      try {
        const updated = await applyChecklistTemplate(processId, templateId);
        setItems(updated);
        setShowTemplates(false);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [processId]);

  const completedCount = items.filter((i) => i.done).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando checklist...</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Barra de progresso */}
      {items.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{completedCount} de {items.length} concluídos</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de itens */}
      <div className="space-y-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <button
              onClick={() => handleToggle(item.id)}
              disabled={isPending}
              className="shrink-0"
            >
              <CheckIcon checked={item.done} />
            </button>
            <span className={`flex-1 ${item.done ? "text-muted-foreground line-through" : ""}`}>
              {item.title}
            </span>
            <button
              onClick={() => handleRemove(item.id)}
              disabled={isPending}
              className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-red-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {items.length === 0 && !error && (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          Nenhum item no checklist. Adicione um item ou aplique um template abaixo.
        </div>
      )}

      {/* Adicionar item */}
      <div className="flex gap-2">
        <Input
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          placeholder="Novo item do checklist..."
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          disabled={isPending}
          className="text-sm"
        />
        <Button
          onClick={handleAdd}
          disabled={isPending || !newItemTitle.trim()}
          size="sm"
        >
          Adicionar
        </Button>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs text-muted-foreground"
          >
            {showTemplates ? "Ocultar templates" : "Aplicar template de checklist"}
          </Button>
          {showTemplates && (
            <div className="mt-2 space-y-1">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleApplyTemplate(tpl.id)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm hover:bg-muted/50"
                >
                  <div>
                    <span className="font-medium">{tpl.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {tpl.items.length} itens
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{tpl.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
