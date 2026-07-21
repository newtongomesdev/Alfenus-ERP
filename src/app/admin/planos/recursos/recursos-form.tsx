"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { togglePlanFeatureAction } from "./actions";

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  business: "Business",
};

const PLAN_ORDER = ["starter", "professional", "business"] as const;

const FEATURE_LABELS: Record<string, string> = {
  hasAiFeatures: "Recursos de IA",
  hasPwa: "PWA",
  hasLgpd: "LGPD",
  hasClm: "CLM",
  hasRiskManagement: "Gestão de Riscos",
  hasLegalRequests: "Requisições Legais",
  hasPublicForms: "Formulários Públicos",
  hasPdfTools: "Ferramentas PDF",
  hasTicketing: "Ticketing",
};

function ToggleButton({
  plan,
  featureKey,
  enabled,
}: {
  plan: string;
  featureKey: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await togglePlanFeatureAction(plan, featureKey, !enabled);
          router.refresh();
        });
      }}
      className={`h-8 min-w-[80px] rounded-md border px-3 text-sm font-medium transition disabled:opacity-50 ${
        enabled
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {isPending ? "..." : enabled ? "Ativo" : "Inativo"}
    </button>
  );
}

export function RecursosForm({
  featureKeys,
  planDefaults,
}: {
  featureKeys: string[];
  planDefaults: Record<string, Record<string, boolean>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <TableRow>
            <TableHead>Recurso</TableHead>
            {PLAN_ORDER.map((plan) => (
              <TableHead key={plan} className="text-center">
                {PLAN_LABELS[plan]}
              </TableHead>
            ))}
          </TableRow>
        </thead>
        <TableBody>
          {featureKeys.map((key) => (
            <TableRow key={key}>
              <TableCell className="font-medium">
                <span className="text-xs">{FEATURE_LABELS[key] ?? key}</span>
                <br />
                <code className="text-[10px] text-muted-foreground bg-muted px-1 py-0.5 rounded">{key}</code>
              </TableCell>
              {PLAN_ORDER.map((plan) => (
                <TableCell key={`${plan}-${key}`} className="text-center">
                  <ToggleButton
                    plan={plan}
                    featureKey={key}
                    enabled={planDefaults[plan]?.[key] ?? false}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </table>
    </div>
  );
}

// Inline table components for the matrix
function TableRow({ children }: { children: React.ReactNode }) {
  return <tr className="border-b transition-colors hover:bg-muted/50">{children}</tr>;
}

function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`h-10 px-3 text-left align-middle font-medium text-muted-foreground ${className ?? ""}`}>{children}</th>;
}

function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

function TableCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className ?? ""}`}>{children}</td>;
}
