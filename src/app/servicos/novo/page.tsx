"use server";

/**
 * New Service Page
 * Page for creating a new service - /servicos/novo
 */

import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { NewServiceClient } from "./NewServiceClient";

export default async function NewServicePage() {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) redirect("/entrar");

  return <NewServiceClient />;
}