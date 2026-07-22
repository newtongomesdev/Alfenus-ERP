import Link from "next/link";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAppContext, getLawFirmMembers } from "@/lib/auth/context";
import { can, roles, type Role } from "@/lib/auth/permissions";
import { formatDate } from "@/lib/formatters";
import { cancelInvitationAction, resendInvitationAction } from "@/lib/invitations/actions";
import { getSupabaseServerClient } from "@/lib/supabase/server";

import { inviteTeamMemberAction, updateMemberRoleAction } from "./actions";

const labels: Record<Role, string> = { proprietario: "Proprietário", administrador: "Administrador", advogado: "Advogado", assistente: "Assistente", financeiro: "Financeiro", colaborador: "Colaborador", visualizador: "Visualizador" };

const statusLabels: Record<string, string> = { pendente: "Pendente", visualizado: "Visualizado", aceito: "Aceito", expirado: "Expirado", cancelado: "Cancelado", recusado: "Recusado" };

const statusColorClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700",
  visualizado: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700",
  aceito: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700",
  expirado: "bg-gray-100 text-gray-600 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-600",
  cancelado: "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700",
  recusado: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700",
};

async function handleCancelInvitation(formData: FormData) {
  "use server";
  const id = String(formData.get("invitationId") ?? "");
  if (id) await cancelInvitationAction(id);
}

async function handleResendInvitation(formData: FormData) {
  "use server";
  const id = String(formData.get("invitationId") ?? "");
  if (id) await resendInvitationAction(id);
}

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ erro?: string; convidado?: string; atualizado?: string; cancelado?: string; reenviado?: string }> }) {
  const context = await getAppContext();
  if (context.status !== "ready" || !context.member || !context.lawFirm) return <AppShell memberName={null}><PageHeader title="Equipe" description="Convites e papéis do escritório." /><Card className="rounded-lg border-dashed"><CardContent className="p-6 text-sm text-muted-foreground">{context.status === "missing-env" ? "Configure o Supabase para gerenciar a equipe." : <Link className="underline" href={context.status === "missing-tenant" ? "/onboarding" : "/entrar"}>{context.status === "missing-tenant" ? "Criar escritório" : "Entrar"}</Link>}</CardContent></Card></AppShell>;
  const params = await searchParams;
  const members = await getLawFirmMembers(context.lawFirm.id);
  const supabase = await getSupabaseServerClient();
  const { data: invitations } = supabase ? await (supabase as unknown as { from(table: string): { select(columns: string): { eq(column: string, value: string): { order(column: string, options: { ascending: boolean }): { limit(value: number): Promise<{ data: unknown[] | null }> } } } } }).from("team_invitations").select("id, email, role, status, expires_at, created_at, resend_count").eq("law_firm_id", context.lawFirm.id).order("created_at", { ascending: false }).limit(20) : { data: [] as unknown[] };
  const manageable = can(context.member.role, "equipe.gerenciar");
  return <AppShell memberName={context.member.name}><div className="space-y-6"><PageHeader title="Equipe" description="Convide pessoas e ajuste o acesso ao escritório." />{params.erro ? <Card className="border-destructive/30 bg-destructive/5 rounded-lg"><CardContent className="p-4 text-sm text-destructive">Não foi possível concluir a operação. Revise os dados e suas permissões.</CardContent></Card> : null}{params.convidado || params.atualizado ? <Card className="border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5 rounded-lg"><CardContent className="p-4 text-sm">Alteração salva.</CardContent></Card> : null}{params.cancelado ? <Card className="border-yellow-500/30 bg-yellow-500/5 rounded-lg"><CardContent className="p-4 text-sm">Convite cancelado com sucesso.</CardContent></Card> : null}{params.reenviado ? <Card className="border-blue-500/30 bg-blue-500/5 rounded-lg"><CardContent className="p-4 text-sm">Convite reenviado com sucesso.</CardContent></Card> : null}<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"><Card className="rounded-lg"><CardHeader><CardTitle>Membros ativos</CardTitle><CardDescription>O papel define as permissões disponíveis no Alfenus.</CardDescription></CardHeader><CardContent><div className="space-y-3">{members.map((member) => <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="font-medium">{member.name}</p><p className="text-sm text-muted-foreground">{member.email}</p></div>{manageable && member.role !== "proprietario" ? <form action={updateMemberRoleAction} className="flex items-center gap-2"><input type="hidden" name="memberId" value={member.id} /><select name="role" defaultValue={member.role} className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm">{roles.filter((role) => role !== "proprietario").map((role) => <option key={role} value={role}>{labels[role]}</option>)}</select><button className="h-8 rounded-lg border px-2.5 text-sm hover:bg-muted" type="submit">Salvar</button></form> : <StatusBadge value={labels[member.role]} />}</div>)}</div></CardContent></Card>{manageable ? <Card className="rounded-lg"><CardHeader><CardTitle>Convidar membro</CardTitle><CardDescription>O convite fica pendente por sete dias.</CardDescription></CardHeader><CardContent><form action={inviteTeamMemberAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required /></div><div className="space-y-2"><Label htmlFor="role">Papel inicial</Label><select id="role" name="role" defaultValue="colaborador" className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm">{roles.filter((role) => role !== "proprietario").map((role) => <option key={role} value={role}>{labels[role]}</option>)}</select></div><button className="h-9 w-full rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80" type="submit">Criar convite</button></form></CardContent></Card> : null}</div><Card className="rounded-lg"><CardHeader><CardTitle>Convites recentes</CardTitle><CardDescription>Convites ainda não aceitos permanecem registrados para auditoria.</CardDescription></CardHeader><CardContent>{(invitations ?? []).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum convite enviado.</p> : <div className="space-y-3">{(invitations as Array<{ id: string; email: string; role: Role; status: string; expires_at: string; resend_count: number }>).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-0"><div><p className="font-medium">{item.email}</p><p className="text-xs text-muted-foreground">{labels[item.role]} · expira em {formatDate(item.expires_at)}{item.resend_count > 0 ? ` · reenviado ${item.resend_count}x` : ""}</p></div><div className="flex items-center gap-2"><Badge className={statusColorClass[item.status]}>{statusLabels[item.status] ?? item.status}</Badge>{manageable && (item.status === "pendente" || item.status === "visualizado") ? <form action={handleCancelInvitation}><input type="hidden" name="invitationId" value={item.id} /><button className="h-7 rounded-lg border border-destructive/40 px-2 text-xs text-destructive hover:bg-destructive/10" type="submit">Cancelar</button></form> : null}{manageable && (item.status === "pendente" || item.status === "expirado" || item.status === "visualizado") ? <form action={handleResendInvitation}><input type="hidden" name="invitationId" value={item.id} /><button className="h-7 rounded-lg border px-2 text-xs hover:bg-muted" type="submit">Reenviar</button></form> : null}</div></div>)}</div>}</CardContent></Card></div></AppShell>;
}
