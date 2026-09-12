import { Search } from "lucide-react";
import Link from "next/link";

import { getAdminContext } from "@/lib/admin/auth";
import { getAdminUsers } from "@/lib/admin/queries";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { adminClient } = await getAdminContext();
  const params = await searchParams;
  const PAGE_SIZE = 20;
  const page = Math.max(1, Number(params.page ?? 1));

  const result = await getAdminUsers(adminClient, page, PAGE_SIZE, params.q);
  const totalPages = Math.max(1, Math.ceil(result.totalCount / PAGE_SIZE));

  const basePath = params.q ? `/admin/usuarios?q=${encodeURIComponent(params.q)}` : "/admin/usuarios";

  return (
      <div className="space-y-6">
        <PageHeader title="Usuários" description="Todos os usuários da plataforma, cross-tenant." />

        <Card className="rounded-lg">
          <CardContent className="space-y-4 pt-6">
            <form method="get" className="flex flex-wrap items-end gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-9" name="q" placeholder="Email ou nome do escritório" defaultValue={params.q ?? ""} />
                </div>
              </div>
              <button type="submit" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:bg-primary/80">
                Buscar
              </button>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Escritórios</TableHead>
                  <TableHead>Papéis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link href={`/admin/usuarios/${user.id}`} className="font-medium underline-offset-4 hover:underline">
                        {user.email}
                      </Link>
                    </TableCell>
                    <TableCell>{user.membershipCount}</TableCell>
                    <TableCell>{user.memberships.length > 0 ? user.memberships.map((m) => m.role).join(", ") : "Sem escritório"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <Pagination currentPage={page} totalPages={totalPages} basePath={basePath} />
            )}
          </CardContent>
        </Card>
      </div>
  );
}
