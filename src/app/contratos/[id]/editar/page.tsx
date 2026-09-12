import Link from "next/link";
import { redirect } from "next/navigation";

import { ContractEditor } from "@/components/contracts/contract-editor";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth/context";
import { can } from "@/lib/auth/permissions";
import { getContractEditorDetails } from "@/lib/contracts/queries";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member) redirect("/entrar");
  if (!can(context.member.role, "contratos.gerenciar") || !["proprietario", "administrador", "advogado"].includes(context.member.role)) redirect("/contratos?erro=permissao");
  // The RPC repeats this deny-by-default check before returning sensitive data.
  const detail = await getContractEditorDetails(id);
  if (!detail || !detail.contract.canWrite) redirect("/contratos?erro=permissao");
  return <AppShell memberName={context.member.name}><div className="space-y-6"><Link className="text-sm text-muted-foreground hover:text-foreground" href={`/contratos/${id}`}>← Voltar para o contrato</Link><PageHeader title="Editar contrato" description="Cada salvamento cria uma versão imutável para revisão interna."/><ContractEditor detail={detail}/></div></AppShell>;
}
