"use client";

/**
 * ScenarioCompare
 * Comparação lado a lado dos cenários de simulação
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResultCard } from "./ResultCard";
import {
  SCENARIO_COMPARISON_TITLE,
  SCENARIO_COMPARISON_DESCRIPTION,
} from "@/lib/fee-simulator/constants";
import type { SimulatorResult, ScenarioLevel } from "@/lib/fee-simulator/types";

interface ScenarioCompareProps {
  results: SimulatorResult[];
  onSelectScenario?: (level: ScenarioLevel) => void;
}

export function ScenarioCompare({ results, onSelectScenario }: ScenarioCompareProps) {
  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Nenhum cenário para exibir. Preencha o formulário e clique em &quot;Simular&quot;.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CardHeader className="px-0">
        <CardTitle>{SCENARIO_COMPARISON_TITLE}</CardTitle>
        <CardDescription>{SCENARIO_COMPARISON_DESCRIPTION}</CardDescription>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {results.map((result) => (
          <ResultCard
            key={result.scenarioLevel}
            result={result}
            onSelect={
              onSelectScenario
                ? () => onSelectScenario(result.scenarioLevel)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
