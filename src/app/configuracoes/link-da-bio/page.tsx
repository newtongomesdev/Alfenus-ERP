import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth/context";
import { BioLinkForm } from "./bio-link-form";
import { can } from "@/lib/auth/permissions";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export default async function BioLinkSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
}) {
  const context = await getAppContext();
  const params = await searchParams;

  if (context.status !== "ready" || !context.lawFirm || !context.member) {
    redirect("/configuracoes");
  }

  const canEdit = can(context.member.role, "configuracoes.administrar");
  if (!canEdit) {
    redirect("/configuracoes?erro=permissao");
  }

  const admin = getSupabaseAdminClient();
  if (!admin) {
    redirect("/configuracoes?erro=ambiente");
  }
  
  // Buscar membros ativos
  const { data: members } = await admin
    .from("law_firm_members")
    .select("id, name, email, phone, position, role, avatar_url")
    .eq("law_firm_id", context.lawFirm.id)
    .eq("status", "ativo")
    .in("role", ["proprietario", "administrador", "advogado"])
    .order("name");

  let logoUrl: string | null = null;
  const lawFirmAny = context.lawFirm as any;
  if (lawFirmAny.logo_path) {
    const { data: signedData } = await admin.storage
      .from("branding")
      .createSignedUrl(lawFirmAny.logo_path, 3600);
    logoUrl = signedData?.signedUrl ?? null;
  }

  const successMessage = params.mensagem === "salvo" ? "Configurações do Link da Bio salvas com sucesso!" : null;
  const errorMessage = params.erro
    ? {
        autenticacao: "Faça login para acessar as configurações.",
        permissao: "Você não tem permissão para editar estas configurações.",
        validacao: "O nome de usuário deve ter pelo menos 3 caracteres.",
        slug_invalido: "O nome de usuário só pode conter letras minúsculas, números e hifens.",
        slug_em_uso: "Este nome de usuário já está em uso por outro escritório. Escolha outro.",
        ambiente: "Erro de ambiente.",
        salvar: "Não foi possível salvar as configurações. Tente novamente.",
      }[params.erro]
    : null;

  return (
    <AppShell memberName={context.member.name}>
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <PageHeader
          title="Link da Bio"
          description="Personalize a página pública do seu escritório para compartilhar nas redes sociais."
        />

        {successMessage && (
          <div className="rounded-lg border border-[var(--chart-2)]/30 bg-[var(--chart-2)]/5 p-4 text-sm font-medium">
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive font-medium">
            {errorMessage}
          </div>
        )}

        <BioLinkForm 
          lawFirm={context.lawFirm} 
          members={members || []} 
          logoUrl={logoUrl} 
        />
      </div>
    </AppShell>
  );
}
