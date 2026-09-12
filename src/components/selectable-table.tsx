"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { BulkActionsBar } from "@/components/bulk-actions-bar";
import { Checkbox } from "@/components/ui/checkbox";

interface SelectableTableProps {
  entityType: "client" | "lead";
  children: (ctx: { selectedIds: Set<string>; toggleSelect: (id: string) => void; toggleAll: (ids: string[]) => void }) => React.ReactNode;
}

export function SelectableTable({ entityType, children }: SelectableTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        return new Set();
      }
      return new Set(ids);
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkAction = useCallback(
    async (action: string, params?: Record<string, string>) => {
      const response = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          action,
          ids: Array.from(selectedIds),
          params,
        }),
      });

      if (response.ok) {
        clearSelection();
        router.refresh();
      }
    },
    [entityType, selectedIds, clearSelection, router],
  );

  return (
    <div>
      <BulkActionsBar
        selectedCount={selectedIds.size}
        onAction={handleBulkAction}
        onClearSelection={clearSelection}
      />
      {children({ selectedIds, toggleSelect, toggleAll })}
    </div>
  );
}

interface RowCheckboxProps {
  id: string;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}

export function RowCheckbox({ id, selectedIds, onToggle }: RowCheckboxProps) {
  return (
    <Checkbox
      checked={selectedIds.has(id)}
      onCheckedChange={() => onToggle(id)}
      className="translate-y-[1px]"
    />
  );
}

interface HeaderCheckboxProps {
  ids: string[];
  selectedIds: Set<string>;
  onToggleAll: (ids: string[]) => void;
}

export function HeaderCheckbox({ ids, selectedIds, onToggleAll }: HeaderCheckboxProps) {
  const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
  const someSelected = ids.some((id) => selectedIds.has(id)) && !allSelected;

  return (
    <Checkbox
      checked={allSelected || (someSelected ? "indeterminate" : false)}
      onCheckedChange={() => onToggleAll(ids)}
    />
  );
}
