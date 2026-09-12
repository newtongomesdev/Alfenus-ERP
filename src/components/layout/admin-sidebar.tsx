"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Flag,
  HeartPulse,
  Bot,
  CreditCard,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const adminNavItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Escritórios", href: "/admin/escritorios", icon: Building2 },
  { label: "Usuários", href: "/admin/usuarios", icon: Users },
  {
    label: "Planos",
    href: "/admin/planos",
    icon: CreditCard,
    children: [
      { label: "Limites", href: "/admin/planos/limites" },
      { label: "Recursos", href: "/admin/planos/recursos" },
    ],
  },
  { label: "Feature Flags", href: "/admin/feature-flags", icon: Flag },
  { label: "Anúncios", href: "/admin/anuncios", icon: Megaphone },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
  { label: "Saúde", href: "/admin/saude", icon: HeartPulse },
  { label: "Uso", href: "/admin/uso", icon: BarChart3 },
  { label: "IA e RAG", href: "/admin/ia", icon: Bot },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-72 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="border-b px-6 py-5">
        <p className="text-lg font-semibold tracking-tight">Alfenus</p>
        <p className="mt-1 text-xs text-muted-foreground">Painel Admin</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-md px-2 text-sm transition",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
              </Link>
              {"children" in item && item.children && isActive && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "flex h-8 items-center gap-3 rounded-md px-2 text-sm transition",
                          childActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="border-t px-4 py-3">
        <Link
          href="/dashboard"
          className="flex h-9 items-center gap-3 rounded-md px-2 text-sm text-sidebar-foreground transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ArrowLeft className="size-4" />
          <span>Voltar ao app</span>
        </Link>
      </div>
    </aside>
  );
}
