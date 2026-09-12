"use server";

/**
 * Service Catalog Page
 * Main page for listing services - /servicos
 */

import { getAppContext } from "@/lib/auth/context";
import { redirect } from "next/navigation";
import { ServiceCatalogClient } from "./ServiceCatalogClient";

export default async function ServiceCatalogPage() {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) redirect("/entrar");

  return <ServiceCatalogClient lawFirmId={ctx.lawFirm.id} />;
}