import type { Metadata } from "next";
import { LandingPageClient } from "@/components/landing-page-client";

export const metadata: Metadata = {
  title: "Alfenus | Gestão Jurídica Inteligente para Escritórios de Advocacia",
  description: "Otimize a operação do seu escritório de advocacia com o Alfenus. CRM jurídico, controle de processos, prazos automáticos e financeiro completo em uma plataforma integrada.",
};

export default function LandingPage() {
  return <LandingPageClient />;
}
