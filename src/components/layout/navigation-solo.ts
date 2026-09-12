import {
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  FileArchive,
  FileText,
  Inbox,
  House,
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
    label: "Dia a dia",
    items: [
      { label: "Meu Dia", href: "/meu-dia", icon: House },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Casos", href: "/processos", icon: Scale },
      { label: "Agenda", href: "/agenda", icon: CalendarDays },
    ],
  },
  {
    label: "Atendimento e trabalho",
    items: [
      {
        label: "Novos atendimentos",
        href: "/atendimentos",
        icon: Inbox,
        children: [
          { label: "Leads", href: "/leads", icon: Users },
          { label: "Pipeline", href: "/pipeline", icon: BriefcaseBusiness },
          { label: "Propostas", href: "/propostas", icon: FileText },
          { label: "Serviços", href: "/servicos", icon: Package },
        ],
      },
      { label: "Tarefas", href: "/tarefas", icon: BriefcaseBusiness },
      { label: "Prazos", href: "/prazos", icon: CalendarDays },
      { label: "Retornos", href: "/retornos", icon: MessageSquare },
      { label: "Contratos", href: "/contratos", icon: FileText },
    ],
  },
  {
    label: "Gestão",
    items: [
      {
        label: "Financeiro",
        href: "/recebimentos",
        icon: Banknote,
        children: [
          { label: "Despesas", href: "/despesas", icon: ShoppingCart },
          { label: "Recibos", href: "/recibos", icon: Receipt },
          { label: "Relatórios", href: "/relatorios", icon: Banknote },
        ],
      },
      {
        label: "Documentos",
        href: "/documentos",
        icon: FileArchive,
        children: [
          { label: "Modelos", href: "/documentos/modelos", icon: FileText },
        ],
      },
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
