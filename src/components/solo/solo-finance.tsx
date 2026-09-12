"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { CHARGE_MESSAGE_TEMPLATES } from "@/lib/solo/constants";
import { Copy, Check, MessageSquare } from "lucide-react";

type OverdueInstallment = {
  id: string;
  client_name: string;
  amount_cents: number;
  due_date: string;
  status: string;
};

export function SoloFinance({
  receivedThisMonth,
  expectedThisMonth,
  overdueAmount,
  overdueInstallments,
}: {
  receivedThisMonth: number;
  expectedThisMonth: number;
  overdueAmount: number;
  overdueInstallments: OverdueInstallment[];
}) {
  const [showMessages, setShowMessages] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  function copyMessage(template: string, clientName?: string) {
    const filled = template
      .replace("{nome}", clientName || " cliente")
      .replace("{valor}", formatCurrencyFromCents(0))
      .replace("{servico}", "serviço")
      .replace("{data}", formatDate(new Date().toISOString()))
      .replace("{advogado}", "Dr(a).");
    navigator.clipboard.writeText(filled);
    setCopiedKey(template);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Resumo financeiro */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recebido no mês</p>
            <p className="text-xl font-semibold text-green-600">{formatCurrencyFromCents(receivedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Previsto no mês</p>
            <p className="text-xl font-semibold">{formatCurrencyFromCents(expectedThisMonth)}</p>
          </CardContent>
        </Card>
        <Card className={overdueAmount > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Em atraso</p>
            <p className="text-xl font-semibold text-red-600">{formatCurrencyFromCents(overdueAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Parcelas atrasadas */}
      {overdueInstallments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Parcelas atrasadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdueInstallments.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{inst.client_name}</p>
                  <p className="text-xs text-muted-foreground">Venceu em {formatDate(inst.due_date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrencyFromCents(inst.amount_cents)}
                  </span>
                  <Badge variant="outline" className="text-xs">{inst.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Régua de cobrança - mensagens copiáveis */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="size-4" />
              Mensagens de cobrança
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMessages(!showMessages)}
            >
              {showMessages ? "Ocultar" : "Ver mensagens"}
            </Button>
          </div>
        </CardHeader>
        {showMessages && (
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Copie e envie manualmente. Nenhuma mensagem é enviada automaticamente.
            </p>
            {CHARGE_MESSAGE_TEMPLATES.map((tmpl) => (
              <div key={tmpl.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">{tmpl.name}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyMessage(tmpl.message)}
                  >
                    {copiedKey === tmpl.message ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">{tmpl.message}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
