"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked?: boolean | "indeterminate";
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

function Checkbox({ checked = false, onCheckedChange, className, disabled }: CheckboxProps) {
  const isChecked = checked === true;
  const isIndeterminate = checked === "indeterminate";

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={isIndeterminate ? "mixed" : isChecked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!isChecked)}
      className={cn(
        "peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        isChecked && "bg-primary text-primary-foreground",
        isIndeterminate && "bg-primary text-primary-foreground",
        className,
      )}
    >
      {isChecked && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {isIndeterminate && (
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
          <path d="M3 6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export { Checkbox };
