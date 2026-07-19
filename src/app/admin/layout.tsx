import { getAdminContext } from "@/lib/admin/auth";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { email } = await getAdminContext();

  return <AdminShell email={email}>{children}</AdminShell>;
}
