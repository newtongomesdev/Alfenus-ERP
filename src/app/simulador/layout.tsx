import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { AppShell } from "@/components/layout/app-shell";

export default async function SimuladorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAppContext();
  if (ctx.status !== "ready") redirect("/entrar");

  return <AppShell memberName={ctx.member?.name ?? null}>{children}</AppShell>;
}
