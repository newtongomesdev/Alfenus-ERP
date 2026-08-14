"use client";

import type { ReactNode } from "react";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { switchInterfaceModeAction } from "@/lib/solo/actions";

export function AppShell({
  children,
  memberName,
  isAuthenticated,
  interfaceMode: interfaceModeProp,
}: {
  children: ReactNode;
  memberName: string | null;
  isAuthenticated?: boolean;
  interfaceMode?: "simples" | "completa" | "personalizada";
}) {
  const router = useRouter();
  const [interfaceMode, setInterfaceMode] = useState<"simples" | "completa" | "personalizada">(
    interfaceModeProp ?? "completa"
  );

  // The server context is authoritative. This also avoids querying optional
  // Solo columns in environments where those migrations are not installed.

  const isSimple = interfaceMode === "simples";

  const handleSwitchMode = useCallback(async () => {
    const newMode = isSimple ? "completa" : "simples";
    const result = await switchInterfaceModeAction(newMode);
    if (result.ok) {
      setInterfaceMode(newMode);
      router.refresh();
    }
  }, [isSimple, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden lg:block">
        <Sidebar
          interfaceMode={isSimple ? "simples" : "completa"}
          onSwitchMode={handleSwitchMode}
        />
      </div>
      <div className="lg:pl-72">
        <Header memberName={memberName} isAuthenticated={isAuthenticated} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
