"use client";

import Link from "next/link";

const ACTIONS = [
  { label: "Novo Lead", href: "/leads/novo", color: "border-blue-500/40 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300" },
  { label: "Novo Processo", href: "/processos/novo", color: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300" },
  { label: "Novo Cliente", href: "/clientes/novo", color: "border-violet-500/40 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20 dark:text-violet-300" },
  { label: "Pipeline", href: "/pipeline", color: "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-300" },
  { label: "Importar", href: "/importar", color: "border-cyan-500/40 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20 dark:text-cyan-300" },
  { label: "Solicitações", href: "/solicitacoes", color: "border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/20 dark:text-rose-300" },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${action.color}`}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
