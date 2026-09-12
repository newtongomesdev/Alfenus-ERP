import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

import { PrintButton } from "@/components/print-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAppContext } from "@/lib/auth/context";
import { formatCurrencyFromCents, formatDateTime } from "@/lib/formatters";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAppContext();

  if (context.status !== "ready" || !context.member || !context.lawFirm) {
    return (
      <main className="min-h-screen bg-muted/30 p-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">Entre no Alfenus para acessar este recibo.</p>
          <Link href="/entrar" className="mt-4 inline-flex h-8 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">Entrar</Link>
        </div>
      </main>
    );
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return (
      <main className="min-h-screen bg-muted/30 p-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">Configure o Supabase para acessar este recibo.</p>
        </div>
      </main>
    );
  }

  const { data: installment, error } = await supabase
    .from("installments")
    .select("id, number, final_amount_cents, paid_amount_cents, paid_at, payment_method, discount_cents, fine_cents, interest_cents, notes, client_id, contract_id")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("id", id)
    .maybeSingle();

  if (error || !installment) {
    return (
      <main className="min-h-screen bg-muted/30 p-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">Recibo não encontrado.</p>
          <Link href="/recebimentos" className="mt-4 inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium hover:bg-muted">Voltar para recebimentos</Link>
        </div>
      </main>
    );
  }

  const row = installment as {
    id: string;
    number: number;
    final_amount_cents: number;
    paid_amount_cents: number;
    paid_at: string | null;
    payment_method: string | null;
    discount_cents: number | null;
    fine_cents: number | null;
    interest_cents: number | null;
    notes: string | null;
    client_id: string;
    contract_id: string;
  };

  const [{ data: client }, { data: contract }] = await Promise.all([
    supabase
      .from("clients")
      .select("name, document, email, phone")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("id", row.client_id)
      .maybeSingle(),
    supabase
      .from("contracts")
      .select("service_description, total_amount_cents")
      .eq("law_firm_id", context.lawFirm.id)
      .eq("id", row.contract_id)
      .maybeSingle(),
  ]);

  const clientData = client as { name?: string; document?: string | null; email?: string | null; phone?: string | null } | null;
  const contractData = contract as { service_description?: string; total_amount_cents?: number } | null;

  const hasAdjustments = (row.discount_cents ?? 0) > 0 || (row.fine_cents ?? 0) > 0 || (row.interest_cents ?? 0) > 0;

  return (
    <main className="min-h-screen bg-muted/30 p-6 print:bg-background">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Controls */}
        <div className="flex items-center justify-between print:hidden">
          <Link
            href="/recebimentos"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Voltar para recebimentos
          </Link>
          <div className="flex items-center gap-2">
            {row.paid_at && row.paid_amount_cents > 0 ? (
              <a href={`/api/recebimentos/${row.id}/recibo.pdf`} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium transition hover:bg-muted">
                <Download className="size-4" />
                Baixar PDF
              </a>
            ) : null}
            <PrintButton />
          </div>
        </div>

        <Card className="rounded-lg print:shadow-none print:border-0">
          <CardHeader className="text-center border-b">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{context.lawFirm.name}</p>
            {context.lawFirm.document ? <p className="text-xs text-muted-foreground">{context.lawFirm.document}</p> : null}
            <CardTitle className="text-xl mt-2">Recibo de Pagamento</CardTitle>
            <p className="text-xs text-muted-foreground">Comprovante de recebimento de valores</p>
          </CardHeader>

          <CardContent className="space-y-6 pt-6">
            {/* Receipt Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nº do Recibo</p>
                <p className="font-mono text-sm">{String(row.id).slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data de Emissão</p>
                <p className="text-sm">{row.paid_at ? formatDateTime(row.paid_at) : "Aguardando pagamento"}</p>
              </div>
            </div>

            <Separator />

            {/* Payer Info */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Dados do Pagador</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium">{clientData?.name ?? "Cliente"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium">{clientData?.document ?? "Não informado"}</p>
                </div>
                {clientData?.email ? (
                  <div>
                    <p className="text-xs text-muted-foreground">E-mail</p>
                    <p className="text-sm">{clientData.email}</p>
                  </div>
                ) : null}
                {clientData?.phone ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm">{clientData.phone}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            {/* Service Info */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Referência</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Descrição do serviço</p>
                  <p className="font-medium">{contractData?.service_description ?? "Contrato de honorários"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parcela</p>
                  <p className="font-medium">#{row.number}</p>
                </div>
                {contractData?.total_amount_cents ? (
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total do contrato</p>
                    <p className="font-medium">{formatCurrencyFromCents(contractData.total_amount_cents)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            <Separator />

            {/* Payment Details */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalhes do Pagamento</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor Recebido</p>
                  <p className="text-xl font-bold text-[var(--chart-2)]">{formatCurrencyFromCents(row.paid_amount_cents)}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Forma de Pagamento</p>
                  <p className="font-medium capitalize">{row.payment_method ?? "Não informado"}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-xs text-muted-foreground">Valor Final da Parcela</p>
                  <p className="font-medium">{formatCurrencyFromCents(row.final_amount_cents)}</p>
                </div>
              </div>

              {hasAdjustments ? (
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  {(row.discount_cents ?? 0) > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Desconto aplicado</p>
                      <p className="font-medium text-[var(--chart-2)]">-{formatCurrencyFromCents(row.discount_cents!)}</p>
                    </div>
                  ) : null}
                  {(row.fine_cents ?? 0) > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Multa</p>
                      <p className="font-medium text-destructive">+{formatCurrencyFromCents(row.fine_cents!)}</p>
                    </div>
                  ) : null}
                  {(row.interest_cents ?? 0) > 0 ? (
                    <div>
                      <p className="text-xs text-muted-foreground">Juros</p>
                      <p className="font-medium text-destructive">+{formatCurrencyFromCents(row.interest_cents!)}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {row.notes ? (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p>{row.notes}</p>
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Legal Note */}
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Este recibo comprova o recebimento do valor acima referente ao serviço descrito.
                O pagamento foi registrado no sistema Alfenus em {row.paid_at ? formatDateTime(row.paid_at) : "data não informada"}.
              </p>
              <p className="text-[10px] text-muted-foreground">
                Documento gerado automaticamente pelo Alfenus · {context.lawFirm.name} · {new Date().getFullYear()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
