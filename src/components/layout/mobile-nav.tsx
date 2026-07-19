"use client";

import { Menu } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir navegação">
            <Menu className="size-4" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-80 p-0">
        <SheetTitle className="sr-only">Navegação principal</SheetTitle>
        <Sidebar className="w-full border-r-0" />
      </SheetContent>
    </Sheet>
  );
}
