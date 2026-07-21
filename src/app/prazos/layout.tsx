import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { isFeatureEnabled } from "@/lib/admin/feature-flags";
import { AppShell } from "@/components/layout/app-shell";

export default async function PrazosAvancadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  const enabled = await isFeatureEnabled(
    "modulo_prazos_avancado",
    context.lawFirm?.id
  );
  if (!enabled) redirect("/dashboard");

  return (
    <AppShell memberName={context.member?.name ?? null}>
      {children}
    </AppShell>
  );
}
