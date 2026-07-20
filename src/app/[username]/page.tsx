import { notFound } from "next/navigation";
import { Phone, Mail, MessageSquare, MapPin, Scale, Users, FileText, ChevronRight } from "lucide-react";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  role: string;
  avatar_url: string | null;
}

import { BioLinkView } from "@/components/bio-link/bio-link-view";

export default async function LawFirmBioPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);

  if (!decodedUsername.startsWith("@")) {
    notFound();
  }

  const slug = decodedUsername.substring(1);
  const admin = getSupabaseAdminClient();
  if (!admin) {
    notFound();
  }

  // Buscar dados do escritório
  const { data: firm, error: firmError } = await admin
    .from("law_firms")
    .select("id, name, slug, email, phone, document, logo_path, settings, address")
    .eq("slug", slug)
    .eq("status", "ativo")
    .maybeSingle();

  if (firmError || !firm) {
    notFound();
  }

  // Buscar membros ativos
  const { data: members } = await admin
    .from("law_firm_members")
    .select("id, name, email, phone, position, role, avatar_url")
    .eq("law_firm_id", firm.id)
    .eq("status", "ativo")
    .in("role", ["proprietario", "administrador", "advogado"])
    .order("name");

  // Assinar URL da logo se existir (específica da bio ou fallback do escritório)
  let logoUrl: string | null = null;
  const bioLinkSettings = (firm.settings as any)?.bio_link || {};
  const logoToSign = bioLinkSettings.logo_path || firm.logo_path;

  if (logoToSign) {
    const { data: signedData } = await admin.storage
      .from("branding")
      .createSignedUrl(logoToSign, 3600);
    logoUrl = signedData?.signedUrl ?? null;
  }

  return (
    <main className="min-h-screen">
      <BioLinkView firm={firm} members={members || []} logoUrl={logoUrl} />
    </main>
  );
}
