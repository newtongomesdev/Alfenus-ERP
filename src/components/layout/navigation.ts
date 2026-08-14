import {
  Banknote,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesCombined,
  CircleGauge,
  ClipboardList,
  Clock3,
  Database,
  Download,
  FileDown,
  FileSearch,
  GitBranch,
  FileArchive,
  FileText,
  Handshake,
  Inbox,
  Kanban,
  KeyRound,
  MessageSquare,
  Monitor,
  Receipt,
  Scale,
  ScrollText,
  Settings,
  ShieldCheck,
  Shield,
  SlidersHorizontal,
  Timer,
  Upload,
  UserRoundCog,
  Users,
  Workflow,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: typeof ShieldCheck;
  children?: NavigationItem[];
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export const navigationSections: NavigationSection[] = [
  {
    label: "Visão geral",
    items: [{ label: "Dashboard", href: "/dashboard", icon: CircleGauge }],
  },
  {
    label: "CRM",
    items: [
      { label: "Pipeline", href: "/pipeline", icon: Kanban },
      { label: "Leads", href: "/leads", icon: Handshake },
      { label: "Clientes", href: "/clientes", icon: Users },
      { label: "Importar", href: "/importar", icon: Upload },
      { label: "Deduplicação", href: "/deduplicacao", icon: Workflow },
    ],
  },
  {
    label: "Jurídico",
    items: [
      { label: "Controladoria", href: "/controladoria", icon: Monitor },
      { label: "Processos", href: "/processos", icon: Scale },
      { label: "Solicitações", href: "/solicitacoes", icon: Inbox },
      { label: "Correspondentes", href: "/correspondentes", icon: Users },
      { label: "Conflitos", href: "/conflitos", icon: FileSearch },
      { label: "Prazos", href: "/prazos", icon: CalendarDays },
      { label: "Risco e Valores", href: "/risco", icon: Scale },
      { label: "CLM Contratos", href: "/clm", icon: FileText },
      { label: "Valores Clientes", href: "/valores-clientes", icon: Banknote },
      { label: "Agenda", href: "/agenda", icon: Clock3 },
      { label: "Tarefas", href: "/tarefas", icon: BriefcaseBusiness },
      { label: "Workflows", href: "/workflows", icon: GitBranch },
      { label: "Propostas", href: "/propostas", icon: ScrollText },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Contratos", href: "/contratos", icon: FileText },
      { label: "Recebimentos", href: "/recebimentos", icon: Banknote },
      { label: "Despesas", href: "/despesas", icon: Receipt },
      { label: "Horas", href: "/horas", icon: Timer },
      { label: "Relatórios", href: "/relatorios", icon: ChartNoAxesCombined },
      { label: "Exportar", href: "/exportar", icon: Download },
    ],
  },
  {
    label: "Gestão",
    items: [
      { label: "Notificações", href: "/notificacoes", icon: Bell },
      { label: "Documentos", href: "/documentos", icon: FileArchive },
      { label: "Portal do cliente", href: "/portal-cliente", icon: KeyRound },
      { label: "Equipe", href: "/equipe", icon: UserRoundCog },
      { label: "Campos", href: "/configuracoes/campos-personalizados", icon: SlidersHorizontal },
      { label: "Backup", href: "/backup", icon: Database },
      { label: "Auditoria", href: "/auditoria", icon: ScrollText },
      {
        label: "Segurança",
        href: "/configuracoes/seguranca",
        icon: ShieldCheck,
        children: [
          { label: "MFA", href: "/configuracoes/seguranca/mfa", icon: Shield },
          { label: "Sessões", href: "/configuracoes/seguranca/sessoes", icon: Monitor },
          { label: "Dispositivos", href: "/configuracoes/seguranca/dispositivos", icon: KeyRound },
          { label: "Recuperação", href: "/configuracoes/seguranca/recuperacao", icon: KeyRound },
          { label: "Políticas", href: "/configuracoes/seguranca/politicas", icon: Settings },
          { label: "Usuários", href: "/configuracoes/seguranca/usuarios", icon: Users },
          { label: "Eventos", href: "/configuracoes/seguranca/eventos", icon: ScrollText },
        ],
      },
      { label: "Comunicação", href: "/comunicacao-avancada", icon: MessageSquare },
      { label: "Formulários", href: "/formularios-avancados", icon: ClipboardList },
      { label: "Ferramentas PDF", href: "/ferramentas-pdf", icon: FileDown },
      { label: "LGPD", href: "/lgpd", icon: ShieldCheck },
      { label: "Configurações", href: "/configuracoes", icon: Settings },
      { label: "Assinaturas", href: "/configuracoes/assinaturas", icon: KeyRound },
    ],
  },
];
