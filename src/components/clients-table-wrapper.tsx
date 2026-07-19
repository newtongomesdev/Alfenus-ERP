"use client";

import Link from "next/link";

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
import { formatDate } from "@/lib/formatters";

type Client = {
  id: string;
  name: string;
  personType: string;
  document: string | null;
  interestArea: string | null;
  source: string | null;
  tags: string[];
  status: string;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
};

export function ClientsTableWrapper({ clients }: { clients: Client[] }) {
  const ids = clients.map((c) => c.id);

  return (
    <SelectableTable entityType="client">
      {({ selectedIds, toggleSelect, toggleAll }) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <HeaderCheckbox ids={ids} selectedIds={selectedIds} onToggleAll={toggleAll} />
              </TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Interesse</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <RowCheckbox id={client.id} selectedIds={selectedIds} onToggle={toggleSelect} />
                </TableCell>
                <TableCell>
                  <Link className="font-medium underline-offset-4 hover:underline" href={`/clientes/${client.id}`}>
                    {client.name}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {client.whatsapp || client.phone || client.email || `Criado em ${formatDate(client.createdAt)}`}
                  </div>
                </TableCell>
                <TableCell>{client.personType === "juridica" ? "Pessoa jurídica" : "Pessoa física"}</TableCell>
                <TableCell>{client.document ?? "Não informado"}</TableCell>
                <TableCell>{client.interestArea ?? "Não informado"}</TableCell>
                <TableCell>{client.source ?? "Não informada"}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {client.tags.length > 0 ? (
                      client.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem tags</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge value={client.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SelectableTable>
  );
}
