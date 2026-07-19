"use client";

import Link from "next/link";

const ACTIONS = [
  { label: "Novo Lead", href: "/leads/novo", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
  { label: "Novo Processo", href: "/processos/novo", color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { label: "Novo Cliente", href: "/clientes/novo", color: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
  { label: "Pipeline", href: "/pipeline", color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
  { label: "Importar", href: "/importar", color: "bg-cyan-50 text-cyan-700 hover:bg-cyan-100" },
  { label: "Solicitações", href: "/solicitacoes", color: "bg-rose-50 text-rose-700 hover:bg-rose-100" },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${action.color}`}
        >
          {action.label}
        </Link>
      ))}
    </div>
  );
}
