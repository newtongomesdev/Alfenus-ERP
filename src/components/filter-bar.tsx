"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterBarProps {
  children: ReactNode;
  onReset?: () => void;
}

export function FilterBar({ children, onReset }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {children}
      {onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="size-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
