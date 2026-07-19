import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Alfenus",
    template: "%s | Alfenus",
  },
  description: "ERP jurídico SaaS completo para escritórios de advocacia. Gestão de processos, clientes, contratos, financeiro e equipe em um só lugar.",
  keywords: ["ERP jurídico", "escritório de advocacia", "gestão de processos", "software jurídico", "Alfenus"],
  openGraph: {
    title: "Alfenus",
    description: "ERP jurídico SaaS para escritórios de advocacia.",
    type: "website",
    locale: "pt_BR",
    siteName: "Alfenus",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
