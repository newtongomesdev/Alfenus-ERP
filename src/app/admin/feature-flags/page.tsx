import { getAdminContext } from "@/lib/admin/auth";
import { getAllFeatureFlags } from "@/lib/admin/feature-flags";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleFeatureButton } from "./toggle-button";
import { createFeatureFlagAction } from "./actions";

export default async function AdminFeatureFlagsPage() {
  const { adminClient } = await getAdminContext();
  const flags = await getAllFeatureFlags();

  return (
    <div className="space-y-6">
      <PageHeader title="Feature Flags" description="Controle quais funcionalidades estao disponiveis na plataforma." />

      <Card className="rounded-lg">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead>Global</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((flag) => (
                <TableRow key={flag.id}>
                  <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{flag.key}</code></TableCell>
                  <TableCell className="font-medium">{flag.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">{flag.description ?? "—"}</TableCell>
                  <TableCell>{flag.isGlobal ? <Badge variant="secondary">Global</Badge> : <Badge variant="outline">Tenant</Badge>}</TableCell>
                  <TableCell>
                    {flag.enabledByDefault ? (
                      <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">Ativo</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ToggleFeatureButton flagId={flag.id} flagKey={flag.key} initialEnabled={flag.enabledByDefault} />
                  </TableCell>
                </TableRow>
              ))}
              {flags.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma feature flag encontrada. Execute a migration 0022 primeiro.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
