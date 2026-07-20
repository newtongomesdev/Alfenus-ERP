import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { getAppContext } from "@/lib/auth/context";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function AppShell({
  children,
  memberName,
  isAuthenticated,
}: {
  children: ReactNode;
  memberName: string | null;
  isAuthenticated?: boolean;
}) {
  const context = await getAppContext();
  let logoUrl: string | null = null;
  
  if (context.status === "ready" && context.lawFirm?.logoPath) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data } = await supabase.storage
        .from("branding")
        .createSignedUrl(context.lawFirm.logoPath, 3600);
      logoUrl = data?.signedUrl ?? null;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden lg:block">
        <Sidebar />
      </div>
      <div className="lg:pl-72">
        <Header memberName={memberName} isAuthenticated={isAuthenticated} logoUrl={logoUrl} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
