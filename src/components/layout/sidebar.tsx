import Link from "next/link";

import { navigationSections } from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex h-full w-72 flex-col border-r bg-sidebar text-sidebar-foreground", className)}>
      <div className="border-b px-6 py-5">
        <p className="text-lg font-semibold tracking-tight">Alfenus</p>
        <p className="mt-1 text-xs text-muted-foreground">ERP jurídico</p>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {navigationSections.map((section) => (
          <section key={section.label}>
            <p className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex h-9 items-center gap-3 rounded-md px-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <Icon className="size-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
