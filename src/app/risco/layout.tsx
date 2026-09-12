import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { AppShell } from "@/components/layout/app-shell";

export default async function RiscoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getAppContext();
  if (context.status !== "ready") redirect("/entrar");

  return (
    <AppShell memberName={context.member?.name ?? null}>
      {children}
    </AppShell>
  );
}
