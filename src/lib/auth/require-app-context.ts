import { redirect } from "next/navigation";

import { getAppContext } from "@/lib/auth/context";

export async function requireAppContext() {
  const context = await getAppContext();

  if (context.status === "signed-out") {
    redirect("/entrar");
  }

  if (context.status === "missing-tenant") {
    redirect("/onboarding");
  }

  if (context.status === "missing-env") {
    throw new Error("Configuração do Supabase ausente");
  }

  if (!context.member || !context.lawFirm) {
    redirect("/entrar");
  }

  return {
    member: context.member,
    lawFirm: context.lawFirm,
  };
}
