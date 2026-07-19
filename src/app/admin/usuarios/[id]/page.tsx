import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminUserDetail } from "@/lib/admin/queries";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
