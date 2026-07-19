import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-muted/30 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="text-sm font-semibold text-primary">Alfenus</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Termos de uso</h1>
          <p className="mt-2 text-sm text-muted-foreground">Versão 1.0 · Atualizada em 18/07/2026</p>
        </div>
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle>Uso da plataforma</CardTitle>
            <CardDescription>Regras gerais para utilização do Alfenus por escritórios e suas equipes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6">
            <p>O Alfenus é uma plataforma de apoio à organização operacional de escritórios de advocacia. A ferramenta não substitui a análise, a decisão ou a responsabilidade profissional dos advogados.</p>
            <p>O usuário deve manter suas credenciais protegidas, utilizar a plataforma de acordo com a legislação aplicável e garantir que possui autorização para cadastrar e tratar os dados inseridos no sistema.</p>
            <p>O escritório é responsável pelos dados, documentos, prazos e informações que sua equipe registra. O acesso é organizado por escritório, papéis e permissões configuradas na plataforma.</p>
            <p>O uso indevido, a tentativa de acesso não autorizado, o envio de conteúdo ilícito ou a violação de direitos de terceiros poderá resultar na suspensão do acesso, sem prejuízo das medidas cabíveis.</p>
            <p>Os dados pessoais são tratados conforme a <Link className="font-medium underline" href="/privacidade">Política de Privacidade</Link>. Estes termos devem ser revisados pelo responsável jurídico antes da publicação comercial definitiva.</p>
          </CardContent>
        </Card>
        <Link href="/" className="text-sm underline">Voltar ao Alfenus</Link>
      </div>
    </main>
  );
}
