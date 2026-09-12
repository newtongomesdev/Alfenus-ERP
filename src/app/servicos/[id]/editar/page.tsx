"use server";

/**
 * Edit Service Page
 * Page for editing an existing service - /servicos/[id]/editar
 */

import { redirect } from "next/navigation";
import { getAppContext } from "@/lib/auth/context";
import { getServiceDetail } from "@/lib/service-catalog/queries";
import { EditServiceClient } from "./EditServiceClient";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAppContext();
  if (ctx.status !== "ready" || !ctx.lawFirm) redirect("/entrar");

  const { id } = await params;
  const service = await getServiceDetail(id, ctx.lawFirm.id);

  if (!service) redirect("/servicos");

  return <EditServiceClient service={service} lawFirmId={ctx.lawFirm.id} />;
}