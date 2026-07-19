"use client";

import Link from "next/link";

type KPICard = {
  label: string;
  value: string;
  subtitle?: string;
  href?: string;
  color: string;
};

const KPI_DATA: KPICard[] = [
  { label: "Pipeline Ativo", value: "-", subtitle: "leads no funil", href: "/pipeline", color: "border-l-amber-500" },
  { label: "Solicitações Pendentes", value: "-", subtitle: "aguardando documentos", href: "/solicitacoes", color: "border-l-rose-500" },
  { label: "Correspondentes Ativos", value: "-", subtitle: "advogados externos", href: "/correspondentes", color: "border-l-blue-500" },
  { label: "Procurações Vigentes", value: "-", subtitle: "poderes ativos", href: "/processos", color: "border-l-violet-500" },
];

export function KPICards({ data }: { data?: { pipelineCount?: number; pendingRequests?: number; activeCorrespondents?: number; activePOA?: number } }) {
  const cards: KPICard[] = [
    { ...KPI_DATA[0], value: String(data?.pipelineCount ?? "-") },
    { ...KPI_DATA[1], value: String(data?.pendingRequests ?? "-") },
    { ...KPI_DATA[2], value: String(data?.activeCorrespondents ?? "-") },
    { ...KPI_DATA[3], value: String(data?.activePOA ?? "-") },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href ?? "#"}
          className={`rounded-lg border bg-white p-3 transition-shadow hover:shadow-sm border-l-4 ${card.color}`}
        >
          <p className="text-xs text-muted-foreground">{card.label}</p>
          <p className="text-2xl font-bold">{card.value}</p>
          {card.subtitle && <p className="text-xs text-muted-foreground">{card.subtitle}</p>}
        </Link>
      ))}
    </div>
  );
}
