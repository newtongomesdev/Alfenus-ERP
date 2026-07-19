"use client";

import Link from "next/link";
import { convertLeadToClientAction } from "@/app/leads/actions";

import { HeaderCheckbox, RowCheckbox, SelectableTable } from "@/components/selectable-table";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyFromCents, formatDate, formatDateTime } from "@/lib/formatters";

type Lead = {
  id: string;
  name: string;
  interest: string | null;
  source: string | null;
  funnelStage: string;
  estimatedValueCents: number;
  nextContactAt: string | null;
  status: string;
  convertedClientId: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

export function LeadsTableWrapper({ leads }: { leads: Lead[] }) {
  const ids = leads.map((l) => l.id);

  return (
    <SelectableTable entityType="lead">
      {({ selectedIds, toggleSelect, toggleAll }) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <HeaderCheckbox ids={ids} selectedIds={selectedIds} onToggleAll={toggleAll} />
              </TableHead>
              <TableHead>Lead</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Valor estimado</TableHead>
              <TableHead>Próximo contato</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell>
                  <RowCheckbox id={lead.id} selectedIds={selectedIds} onToggle={toggleSelect} />
                </TableCell>
                <TableCell>
                  <div className="font-medium">{lead.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {lead.whatsapp || lead.phone || lead.email || "Sem contato informado"}
                  </div>
                </TableCell>
                <TableCell>{lead.interest ?? "Não informado"}</TableCell>
                <TableCell>{lead.source ?? "Não informada"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{lead.funnelStage}</Badge>
                </TableCell>
                <TableCell>{formatCurrencyFromCents(lead.estimatedValueCents)}</TableCell>
                <TableCell>
                  {lead.nextContactAt ? formatDateTime(lead.nextContactAt) : `Criado em ${formatDate(lead.createdAt)}`}
                </TableCell>
                <TableCell>
                  <StatusBadge value={lead.status} />
                </TableCell>
                <TableCell className="text-right">
                  {lead.status === "convertido" || lead.convertedClientId ? (
                    <Badge variant="secondary">Convertido</Badge>
                  ) : (
                    <form action={convertLeadToClientAction}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <button
                        type="submit"
                        className="inline-flex h-7 items-center justify-center rounded-lg border border-border px-2.5 text-xs font-medium transition hover:bg-muted"
                      >
                        Converter
                      </button>
                    </form>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SelectableTable>
  );
}
