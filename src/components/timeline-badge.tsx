import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const timelineBadgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium",
  {
    variants: {
      eventType: {
        created:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        updated:
          "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        status_changed:
          "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        comment:
          "bg-purple-500/10 text-purple-700 dark:text-purple-400",
        document:
          "bg-orange-500/10 text-orange-700 dark:text-orange-400",
        payment:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
        deadline:
          "bg-red-500/10 text-red-700 dark:text-red-400",
        task:
          "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
        mention:
          "bg-pink-500/10 text-pink-700 dark:text-pink-400",
        workflow:
          "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
      },
    },
    defaultVariants: {
      eventType: "created",
    },
  },
);

const labelByEventType: Record<string, string> = {
  created: "Criado",
  updated: "Atualizado",
  status_changed: "Status alterado",
  comment: "Comentário",
  document: "Documento",
  payment: "Pagamento",
  deadline: "Prazo",
  task: "Tarefa",
  mention: "Menção",
  workflow: "Workflow",
  import: "Importação",
  bulk_action: "Ação em lote",
};

type TimelineBadgeProps = {
  eventType: string;
  className?: string;
};

export function TimelineBadge({ eventType, className }: TimelineBadgeProps) {
  const key = (eventType ?? "created") as VariantProps<typeof timelineBadgeVariants>["eventType"];

  return (
    <span
      className={cn(timelineBadgeVariants({ eventType: key }), className)}
    >
      {labelByEventType[eventType] ?? eventType}
    </span>
  );
}
