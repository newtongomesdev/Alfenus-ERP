import {
  Banknote,
  Bell,
  Briefcase,
  BriefcaseBusiness,
  CalendarDays,
  FileArchive,
  FileText,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Package,
  Receipt,
  Scale,
  Settings,
  ShoppingCart,
  Users,
} from "lucide-react";
import type { NavigationItem, NavigationSection } from "./navigation";

export const soloNavigationSections: NavigationSection[] = [
  {
    label: "Principal",
    items: [
      { label: "Meu dia", href: "/meu-dia", icon: LayoutDashboard },
      { label: "Meu Escritório", href: "/meu-escritorio", icon: LayoutDashboard },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Processos", href: "/processos", icon: Scale },
      { label: "Agenda", href: "/agenda", icon: CalendarDays },
      { label: "Financeiro", href: "/recebimentos", icon: Banknote },
      { label: "Despesas", href: "/despesas", icon: ShoppingCart },
      { label: "Documentos", href: "/documentos", icon: FileArchive },
    ],
  },
  {
    label: "Comercial",
    items: [
      { label: "Contatos", href: "/leads", icon: Users },
      { label: "Pipeline", href: "/pipeline", icon: BriefcaseBusiness },
      { label: "Consultas", href: "/atendimentos", icon: Inbox },
      { label: "Propostas", href: "/propostas", icon: FileText },
      { label: "Serviços", href: "/servicos", icon: Package },
    ],
  },
  {
    label: "Organização",
    items: [
      { label: "Tarefas", href: "/tarefas", icon: BriefcaseBusiness },
      { label: "Prazos", href: "/prazos", icon: CalendarDays },
      { label: "Recibos", href: "/recibos", icon: Receipt },
      { label: "Retornos", href: "/retornos", icon: MessageSquare },
      { label: "Modelos", href: "/documentos/modelos", icon: FileText },
      { label: "Relatórios", href: "/relatorios", icon: Briefcase },
    ],
  },
  {
    label: "Sistema",
    items: [
      { label: "Notificações", href: "/notificacoes", icon: Bell },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
    ],
  },
];

export function getSoloNavigationItem(href: string): NavigationItem | undefined {
  for (const section of soloNavigationSections) {
    for (const item of section.items) {
      if (item.href === href) return item;
      if (item.children) {
        const found = item.children.find((c) => c.href === href);
        if (found) return found;
      }
    }
  }
  return undefined;
}
