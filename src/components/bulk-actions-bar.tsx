"use client";

import { useState } from "react";
import { Trash2, Tag, UserPlus, Archive, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type BulkActionType = "delete" | "update_status" | "assign_responsible" | "add_tag" | "remove_tag" | "archive";

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: BulkActionType, params?: Record<string, string>) => void;
  onClearSelection: () => void;
  availableActions?: BulkActionType[];
}

const DEFAULT_ACTIONS: BulkActionType[] = ["delete", "update_status", "assign_responsible", "add_tag", "archive"];

const ACTION_LABELS: Record<BulkActionType, string> = {
  delete: "Excluir",
  update_status: "Alterar Status",
  assign_responsible: "Atribuir Responsável",
  add_tag: "Adicionar Tag",
  remove_tag: "Remover Tag",
  archive: "Arquivar",
};

const ACTION_ICONS: Record<BulkActionType, React.ReactNode> = {
  delete: <Trash2 className="h-4 w-4" />,
  update_status: <ArrowUpDown className="h-4 w-4" />,
  assign_responsible: <UserPlus className="h-4 w-4" />,
  add_tag: <Tag className="h-4 w-4" />,
  remove_tag: <Tag className="h-4 w-4" />,
  archive: <Archive className="h-4 w-4" />,
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "inadimplente", label: "Inadimplente" },
];

export function BulkActionsBar({
  selectedCount,
  onAction,
  onClearSelection,
  availableActions = DEFAULT_ACTIONS,
}: BulkActionsBarProps) {
  const [tagInput, setTagInput] = useState("");

  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-10 bg-background border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{selectedCount} selecionados</Badge>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Limpar seleção
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {availableActions.includes("update_status") && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                {ACTION_ICONS.update_status}
                <span className="ml-1">Status</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {STATUS_OPTIONS.map((opt) => (
                <DropdownMenuItem
                  key={opt.value}
                  onClick={() => onAction("update_status", { status: opt.value })}
                >
                  {opt.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {availableActions.includes("add_tag") && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
                {ACTION_ICONS.add_tag}
                <span className="ml-1">Tag</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Nome da tag"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                />
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  disabled={!tagInput.trim()}
                  onClick={() => {
                    onAction("add_tag", { tag: tagInput.trim() });
                    setTagInput("");
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {availableActions.includes("archive") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction("archive")}
          >
            {ACTION_ICONS.archive}
            <span className="ml-1">Arquivar</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="destructive" size="sm" />}>
              {ACTION_ICONS.delete}
              <span className="ml-1">Excluir</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onAction("delete")}
            >
              Confirmar exclusão de {selectedCount} registro(s)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClearSelection}>
              Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
