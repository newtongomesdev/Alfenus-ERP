"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrencyFromCents, formatDate } from "@/lib/formatters";
import { getErrorMessage } from "@/lib/utils";

import { getAppContext } from "@/lib/auth/context";

export type CaseCost = {
  id: string;
  description: string;
  category: string | null;
  amountCents: number;
  status: string;
  supplier: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
};

function AddCostForm({ onSubmit, onCancel }: { onSubmit: (data: { description: string; amountCents: number; category: string; supplier: string; dueDate: string }) => void; onCancel: () => void }) {
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("custas_judiciais");
  const [supplier, setSupplier] = useState("");
  const [dueDate, setDueDate] = useState("");

  const CATEGORIES = [
    { value: "custas_judiciais", label: "Custas Judiciais" },
    { value: "honorarios", label: "Honorários" },
    { value: "pericia", label: "Perícia" },
    { value: "cartorio", label: "Cartório" },
    { value: "postagem", label: "Postagem/Correios" },
    { value: "traducao", label: "Tradução" },
    { value: "consultoria", label: "Consultoria" },
    { value: "outro", label: "Outro" },
  ];

  const handleSubmit = () => {
    const amountCents = Math.round(parseFloat(amountStr.replace(",", ".")) * 100);
    if (!description.trim() || isNaN(amountCents) || amountCents <= 0) return;
    onSubmit({ description: description.trim(), amountCents, category, supplier, dueDate });
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Descrição *</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Custas iniciais da ação" />
        </div>
        <div>
          <Label>Valor (R$) *</Label>
          <Input type="number" step="0.01" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="0,00" />
        </div>
        <div>
          <Label>Categoria</Label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <Label>Fornecedor</Label>
          <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex.: Fórum Estadual" />
        </div>
        <div>
          <Label>Vencimento</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={handleSubmit} disabled={!description.trim() || !amountStr}>Adicionar</Button>
      </div>
    </div>
  );
}

export function CaseCosts({ processId }: { processId: string }) {
  const [costs, setCosts] = useState<CaseCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  const loadCosts = useCallback(async () => {
    try {
      setLoading(true);
      // Buscar despesas vinculadas ao processo
      const res = await fetch(`/api/entities?type=legal_case&id=${processId}&module=expenses`);
      if (res.ok) {
        const data = await res.json();
        setCosts(data.items ?? []);
      }
    } catch {
      // Fallback: buscar via server action não disponível, usar estado vazio
    } finally {
      setLoading(false);
    }
  }, [processId]);

  useEffect(() => { loadCosts(); }, [loadCosts]);

  const handleAdd = useCallback((data: { description: string; amountCents: number; category: string; supplier: string; dueDate: string }) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/entities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            module: "expenses",
            data: {
              legal_case_id: processId,
              description: data.description,
              amount_cents: data.amountCents,
              category: data.category,
              supplier: data.supplier || null,
              due_date: data.dueDate || null,
              status: "pendente",
            },
          }),
        });
        if (!res.ok) throw new Error("Erro ao adicionar custo");
        setShowAddForm(false);
        await loadCosts();
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    });
  }, [processId, loadCosts]);

  const totalCents = costs.reduce((sum, c) => sum + c.amountCents, 0);
  const paidCents = costs.filter((c) => c.status === "pago" || c.paidAt).reduce((sum, c) => sum + c.amountCents, 0);
  const pendingCents = totalCents - paidCents;

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando custos...</div>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      {/* Resumo */}
      {costs.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded border p-2">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-semibold">{formatCurrencyFromCents(totalCents)}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-sm font-semibold text-emerald-600">{formatCurrencyFromCents(paidCents)}</p>
          </div>
          <div className="rounded border p-2">
            <p className="text-xs text-muted-foreground">Pendente</p>
            <p className="text-sm font-semibold text-amber-600">{formatCurrencyFromCents(pendingCents)}</p>
          </div>
        </div>
      )}

      {/* Lista */}
      {costs.length === 0 ? (
        <div className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
          Nenhum custo registrado para este processo.
        </div>
      ) : (
        <div className="space-y-1">
          {costs.map((cost) => (
            <div key={cost.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{cost.description}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {cost.category && <span className="rounded bg-muted px-1">{cost.category}</span>}
                  {cost.supplier && <span>{cost.supplier}</span>}
                  {cost.dueDate && <span>Vence: {formatDate(cost.dueDate)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrencyFromCents(cost.amountCents)}</span>
                <StatusBadge value={cost.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Adicionar */}
      {showAddForm ? (
        <AddCostForm onSubmit={handleAdd} onCancel={() => setShowAddForm(false)} />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          Adicionar Custo
        </Button>
      )}
    </div>
  );
}
