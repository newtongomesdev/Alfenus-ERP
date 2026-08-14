"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecommendationCard } from "./recommendation-card";
import { dismissRecommendation, completeRecommendation } from "@/lib/solo-pro/actions";
import type { OperationalRecommendation } from "@/lib/solo-pro/types";
import { Bell } from "lucide-react";

interface RecommendationListProps {
  recommendations: OperationalRecommendation[];
  onRefresh?: () => void;
}

export function RecommendationList({ recommendations, onRefresh }: RecommendationListProps) {
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? recommendations
    : recommendations.filter((r) => r.priority === filter);

  const pending = filtered.filter((r) => r.status === "ativa");
  const criticalCount = recommendations.filter((r) => r.priority === "critica" && r.status === "ativa").length;
  const importantCount = recommendations.filter((r) => r.priority === "importante" && r.status === "ativa").length;
  const attentionCount = recommendations.filter((r) => r.priority === "atencao" && r.status === "ativa").length;
  const informativeCount = recommendations.filter((r) => r.priority === "informativa" && r.status === "ativa").length;

  function handleDismiss(id: string) {
    startTransition(async () => {
      await dismissRecommendation(id, "Dispensado pelo usuário");
      if (onRefresh) onRefresh();
    });
  }

  function handleComplete(id: string) {
    startTransition(async () => {
      await completeRecommendation(id);
      if (onRefresh) onRefresh();
    });
  }

  function handleOpen(recommendation: OperationalRecommendation) {
    if (recommendation.action_url) {
      window.location.href = recommendation.action_url;
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            Recomendações operacionais
          </CardTitle>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} crítica{criticalCount > 1 ? "s" : ""}
              </Badge>
            )}
            {importantCount > 0 && (
              <Badge className="text-xs bg-orange-500 hover:bg-orange-600">
                {importantCount} importante{importantCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          <Button
            variant={filter === "critica" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("critica")}
          >
            Crítica{criticalCount > 0 ? ` (${criticalCount})` : ""}
          </Button>
          <Button
            variant={filter === "importante" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("importante")}
          >
            Importante{importantCount > 0 ? ` (${importantCount})` : ""}
          </Button>
          <Button
            variant={filter === "atencao" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("atencao")}
          >
            Atenção{attentionCount > 0 ? ` (${attentionCount})` : ""}
          </Button>
          <Button
            variant={filter === "informativa" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter("informativa")}
          >
            Informativa{informativeCount > 0 ? ` (${informativeCount})` : ""}
          </Button>
        </div>

        {/* Recommendations */}
        {pending.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma recomendação ativa no momento.</p>
            <p className="text-xs">Continue trabalhando e o sistema irá gerar novas recomendações.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((recommendation) => (
              <RecommendationCard
                key={recommendation.id}
                recommendation={recommendation}
                onDismiss={handleDismiss}
                onComplete={handleComplete}
                onOpen={handleOpen}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}