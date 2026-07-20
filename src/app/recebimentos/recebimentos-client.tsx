"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/status-badge";
import { ReversePaymentButton } from "@/components/reverse-payment-button";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";

import { RegisterPaymentDialog } from "./register-payment-dialog";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RecebimentosClient({ paginatedInstallments, openInstallments, filteredCount, totalCount, canRegister }: any) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInstallmentId, setSelectedInstallmentId] = useState<string | null>(null);

  const handleOpenDialog = (installmentId?: string) => {
    setSelectedInstallmentId(installmentId ?? null);
    setDialogOpen(true);
  };

  return (
    <>
      <Card className="rounded-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Parcelas</CardTitle>
            <CardDescription>
              Vencimentos e saldo por cliente, contrato e parcela. {filteredCount !== totalCount ? `· ${filteredCount} resultado(s) filtrado(s) de ${totalCount}` : ""}
            </CardDescription>
          </div>
          {canRegister && (
            <Button onClick={() => handleOpenDialog()} className="h-8">
              Registrar pagamento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {paginatedInstallments.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="font-medium">Nenhuma parcela encontrada.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {filteredCount === 0 && totalCount > 0 ? "Ajuste os filtros para ver resultados." : "Crie um contrato para gerar parcelas automaticamente."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {paginatedInstallments.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.clientName ?? "Cliente"}</div>
                      <div className="max-w-xs truncate text-xs text-muted-foreground">
                        {item.contractDescription ?? "Contrato"}
                      </div>
                    </TableCell>
                    <TableCell>
                      #{item.number}
                      <div className="text-xs text-muted-foreground">
                        {formatCurrencyFromCents(item.remainingAmountCents)} em aberto
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(`${item.dueDate}T00:00:00`)}</TableCell>
                    <TableCell>
                      {formatCurrencyFromCents(item.finalAmountCents)}
                      <div className="text-xs text-muted-foreground">
                        {formatCurrencyFromCents(item.paidAmountCents)} pago
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge value={item.displayStatus} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.remainingAmountCents > 0 && canRegister && (
                            <DropdownMenuItem onClick={() => handleOpenDialog(item.id)}>
                              Registrar pagamento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem render={<Link href={`/recebimentos/recibo/${item.id}`} />}>
                            Ver recibo
                          </DropdownMenuItem>
                          {(item.status === "pago" || item.status === "paga" || item.paidAmountCents > 0) && canRegister && (
                            <div className="px-2 py-1.5">
                              <ReversePaymentButton installmentId={item.id} />
                            </div>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RegisterPaymentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        openInstallments={openInstallments}
        initialInstallmentId={selectedInstallmentId}
      />
    </>
  );
}
