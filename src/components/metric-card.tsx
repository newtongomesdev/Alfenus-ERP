import { ArrowUpRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyFromCents, integerFormatter } from "@/lib/formatters";

export function MetricCard({
  label,
  value,
  format,
  detail,
}: {
  label: string;
  value: number;
  format: "integer" | "currency";
  detail: string;
}) {
  const formattedValue = format === "currency" ? formatCurrencyFromCents(value) : integerFormatter.format(value);

  return (
    <Card className="rounded-lg">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <ArrowUpRight className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{formattedValue}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
