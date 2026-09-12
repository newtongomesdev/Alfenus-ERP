"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, ArrowLeftRight } from "lucide-react";

import { navigationSections, type NavigationItem } from "@/components/layout/navigation";
import { soloNavigationSections } from "@/components/layout/navigation-solo";
import { cn } from "@/lib/utils";
import { isNavigationItemActive } from "@/lib/solo/ux";

function NavItem({
  item,
  depth = 0,
  onNavigate,
}: {
  item: NavigationItem;
  depth?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;
  const isActive = isNavigationItemActive(pathname, item.href, item.children ?? []);
  const isExpanded = hasChildren && isActive;
  const [open, setOpen] = useState(isExpanded);

  // Keep grouped destinations discoverable after client-side navigation.
  useEffect(() => {
    if (isExpanded) setOpen(true);
  }, [isExpanded]);

  const Icon = item.icon;

  if (hasChildren) {
    return (
      <div>
        <div className={cn(
          "flex h-9 items-center rounded-md text-sm transition",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}>
          <Link href={item.href} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 px-2">
            <Icon className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
          <button
            type="button"
            aria-label={`${open ? "Recolher" : "Expandir"} ${item.label}`}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="flex h-full w-9 shrink-0 items-center justify-center rounded-r-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown
            className={cn(
              "size-3.5 shrink-0 transition-transform",
              open && "rotate-180"
            )}
            />
          </button>
        </div>
        {open && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l pl-3">
            {item.children!.map((child) => (
              <NavItem key={child.href} item={child} depth={depth + 1} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex h-9 items-center gap-3 rounded-md px-2 text-sm transition",
        depth > 0 ? "text-xs h-7" : "",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  className,
  interfaceMode,
  onSwitchMode,
  onNavigate,
  modeError,
}: {
  className?: string;
  interfaceMode?: "simples" | "completa";
  onSwitchMode?: () => void;
  onNavigate?: () => void;
  modeError?: string | null;
}) {
  const isSimple = interfaceMode === "simples";
  const sections = isSimple ? soloNavigationSections : navigationSections;

  return (
    <aside className={cn("flex h-full w-72 flex-col border-r bg-sidebar text-sidebar-foreground", className)}>
      <div className="border-b px-6 py-5">
        <p className="text-lg font-semibold tracking-tight">Alfenus</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {isSimple ? "Modo solo" : "ERP jurídico"}
        </p>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
        {sections.map((section) => (
          <section key={section.label}>
            <p className="mb-2 px-2 text-xs font-medium uppercase text-muted-foreground">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.href} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </section>
        ))}
      </nav>
      {onSwitchMode && (
        <div className="border-t px-4 py-3">
          <button
            onClick={() => {
              onSwitchMode?.();
              onNavigate?.();
            }}
            className="flex h-9 w-full items-center gap-3 rounded-md px-2 text-sm text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <ArrowLeftRight className="size-4 shrink-0" />
            <span>{isSimple ? "Modo completo" : "Modo simples"}</span>
          </button>
          {modeError && <p role="alert" className="mt-2 px-2 text-xs text-destructive">{modeError}</p>}
        </div>
      )}
    </aside>
  );
}
