import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/page-header";
import { getAppContext } from "@/lib/auth/context";
import { BioLinkForm } from "./bio-link-form";
import { can } from "@/lib/auth/permissions";

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

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Coluna da Esquerda: Formulário de Configuração */}
          <div className="order-2 lg:order-1">
            <BioLinkForm lawFirm={context.lawFirm} />
          </div>

          {/* Coluna da Direita: Preview Visual */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-24 self-start">
            <div className="bg-slate-100 rounded-[2.5rem] p-4 shadow-xl border-4 border-slate-300 w-full max-w-sm mx-auto relative overflow-hidden h-[800px] max-h-[85vh]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-300 rounded-b-xl z-10"></div>
              <div className="w-full h-full bg-slate-50 rounded-[1.8rem] overflow-hidden border border-slate-200">
                <iframe 
                  src={`/@${context.lawFirm.slug}`} 
                  className="w-full h-full border-0"
                  title="Preview Link da Bio"
                />
              </div>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-4 font-medium">
              Pré-visualização ao vivo
            </p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
