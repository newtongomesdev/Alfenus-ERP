"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/formatters";
import { Users, ArrowRight, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

type InactiveClient = {
  id: string;
  name: string;
  reason: string;
  last_contact: string | null;
  days_since_contact?: number;
};

export function InactiveClients({ clients }: { clients: InactiveClient[] }) {
  if (clients.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Todos os clientes estão em dia com o contato.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="size-4" />
          Clientes precisam de atenção
          <Badge variant="secondary" className="text-xs">{clients.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {clients.map((client) => (
          <div key={client.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{client.name}</p>
                <Badge variant="outline" className="text-xs">{client.reason}</Badge>
              </div>
              {client.last_contact && (
                <p className="text-xs text-muted-foreground mt-1">
                  Último contato: {formatDate(client.last_contact)}
                  {client.days_since_contact && ` (${client.days_since_contact} dias)`}
                </p>
              )}
            </div>
            <Link href={`/clientes/${client.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
