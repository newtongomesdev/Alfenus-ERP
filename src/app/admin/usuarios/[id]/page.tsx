import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { changeTenantPlan } from "@/app/admin/planos/actions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const { id } = await params;

  const detail = await getAdminUserDetail(adminClient, id);
  if (!detail) redirect("/admin/usuarios");

  return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/usuarios" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Voltar
          </Link>
        </div>

        <PageHeader title={detail.email} description={`Membro de ${detail.membershipCount} escritório(s)`} />

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Escritórios vinculados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Escritório</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.memberships.map((m) => (
                  <TableRow key={m.lawFirmId}>
                    <TableCell>
                      <Link href={`/admin/escritorios/${m.lawFirmId}`} className="font-medium underline-offset-4 hover:underline">
                        {m.lawFirmName}
                      </Link>
                    </TableCell>
                    <TableCell>{m.role}</TableCell>
                    <TableCell>
                      <form action={changeTenantPlan} className="flex items-center gap-2">
                        <input type="hidden" name="lawFirmId" value={m.lawFirmId} />
                        <input type="hidden" name="userId" value={detail.id} />
                        <select name="plan" defaultValue={m.plan} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
                          <option value="starter">Starter</option>
                          <option value="professional">Professional</option>
                          <option value="business">Business</option>
                        </select>
                        <button type="submit" className="h-8 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground">Aplicar</button>
                      </form>
                    </TableCell>
                    <TableCell><StatusBadge value={m.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
}
