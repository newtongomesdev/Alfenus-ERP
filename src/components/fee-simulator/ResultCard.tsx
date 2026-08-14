/**
 * ResultCard
 * Card que exibe o resultado de uma simulação de cenário
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/fee-simulator/engine";
import type { SimulatorResult, ScenarioLevel } from "@/lib/fee-simulator/types";

interface ResultCardProps {
  result: SimulatorResult;
  isSelected?: boolean;
  onSelect?: () => void;
}

const SCENARIO_BORDER: Record<ScenarioLevel, string> = {
  conservador: "border-blue-300",
  padrao: "border-emerald-300",
  agressivo: "border-violet-300",
};

const SCENARIO_BADGE_COLOR: Record<ScenarioLevel, string> = {
  conservador: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  padrao: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  agressivo: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400",
};

export function ResultCard({ result, isSelected, onSelect }: ResultCardProps) {
  const borderColor = SCENARIO_BORDER[result.scenarioLevel];
  const badgeColor = SCENARIO_BADGE_COLOR[result.scenarioLevel];

  return (
    <Card
      className={`${borderColor} ${isSelected ? "ring-2 ring-offset-2 ring-offset-background" : ""} ${
        onSelect ? "cursor-pointer hover:shadow-md transition-shadow" : ""
      }`}
      onClick={onSelect}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{result.scenarioLabel}</CardTitle>
          <Badge
            variant="outline"
            className={`text-xs ${badgeColor}`}
          >
            {result.scenarioLevel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Valor Total */}
        <div className="text-center py-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Honorário Total
          </p>
          <p className="text-2xl font-bold">{formatCents(result.totalFeeCents)}</p>
        </div>

        {/* Breakdown */}
        {result.breakdown.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Detalhamento
            </p>
            <div className="space-y-1.5">
              {result.breakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">
                    {item.valueCents > 0 ? formatCents(item.valueCents) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Parcelamento */}
        {result.numberOfInstallments && result.installmentValueCents && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Parcelamento
            </p>
            {result.upfrontValueCents != null && result.upfrontValueCents > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Entrada</span>
                <span className="font-medium">{formatCents(result.upfrontValueCents)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {result.numberOfInstallments}x parcelas
              </span>
              <span className="font-medium">
                {formatCents(result.installmentValueCents)}
              </span>
            </div>
          </div>
        )}

        {/* Efetivo por hora */}
        {result.hourlyEffectiveCents != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor efetivo/hora</span>
            <span className="font-medium">{formatCents(result.hourlyEffectiveCents)}</span>
          </div>
        )}

        {/* Efetivo mensal */}
        {result.monthlyEffectiveCents != null && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mensalidade efetiva</span>
            <span className="font-medium">{formatCents(result.monthlyEffectiveCents)}</span>
          </div>
        )}

        {/* Notas */}
        {result.notes && (
          <p className="text-xs text-muted-foreground italic pt-2 border-t">
            {result.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
