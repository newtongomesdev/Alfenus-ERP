"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/formatters";
import { Copy, Check, FileSearch } from "lucide-react";
import { useState } from "react";

type PendingDocument = {
  id: string;
  client_name: string;
  case_title?: string;
  document_name: string;
  requested_at: string;
  due_date?: string;
  status: string;
  responsible?: string;
};

const STATUS_LABELS: Record<string, string> = {
  nao_solicitado: "Não solicitado",
  solicitado: "Solicitado",
  recebido: "Recebido",
  invalido: "Inválido",
  precisa_atualizacao: "Precisa atualização",
  conferido: "Conferido",
  dispensado: "Dispensado",
};

const STATUS_COLORS: Record<string, string> = {
  nao_solicitado: "bg-gray-100 text-gray-800",
  solicitado: "bg-yellow-100 text-yellow-800",
  recebido: "bg-green-100 text-green-800",
  invalido: "bg-red-100 text-red-800",
  precisa_atualizacao: "bg-orange-100 text-orange-800",
  conferido: "bg-blue-100 text-blue-800",
  dispensado: "bg-gray-100 text-gray-600",
};

export function DocumentTracker({ documents }: { documents: PendingDocument[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyRequestMessage(doc: PendingDocument) {
    const msg = `Olá ${doc.client_name}, gostaria de solicitar o seguinte documento: ${doc.document_name}. Poderia nos enviar quando possível? Obrigado!`;
    navigator.clipboard.writeText(msg);
    setCopied(doc.id);
    setTimeout(() => setCopied(null), 2000);
  }

  const pending = documents.filter((d) => d.status === "solicitado" || d.status === "nao_solicitado");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileSearch className="size-4" />
          Documentos pendentes
          {pending.length > 0 && (
            <Badge variant="secondary" className="text-xs">{pending.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum documento pendente.</p>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{doc.document_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{doc.client_name}</span>
                    {doc.case_title && <span>• {doc.case_title}</span>}
                    {doc.requested_at && <span>• Solicitado em {formatDate(doc.requested_at)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[doc.status] ?? ""}`}>
                    {STATUS_LABELS[doc.status] ?? doc.status}
                  </span>
                  {(doc.status === "solicitado" || doc.status === "nao_solicitado") && (
                    <Button variant="ghost" size="sm" onClick={() => copyRequestMessage(doc)}>
                      {copied === doc.id ? <Check className="size-3 text-green-500" /> : <Copy className="size-3" />}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
