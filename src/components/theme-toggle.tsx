"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button variant="outline" size="icon" aria-label="Alternar tema" onClick={() => setTheme(nextTheme)}>
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
