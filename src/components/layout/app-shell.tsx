"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import {
  getCurrentInterfaceModeAction,
  switchInterfaceModeAction,
} from "@/lib/solo/actions";

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
  const [interfaceMode, setInterfaceMode] = useState<"simples" | "completa" | "personalizada">(interfaceModeProp ?? "completa");
  const [modeError, setModeError] = useState<string | null>(null);

  // The server context is authoritative. This also avoids querying optional
  // Solo columns in environments where those migrations are not installed.

  const shouldResolveMode = isAuthenticated ?? Boolean(memberName);
  const navigationReady = Boolean(interfaceModeProp) || !shouldResolveMode;
  const isSimple = interfaceMode === "simples";

  useEffect(() => {
    if (interfaceModeProp) {
      setInterfaceMode(interfaceModeProp);
      return;
    }
    if (!shouldResolveMode) {
      setInterfaceMode("completa");
      return;
    }

    let active = true;
    getCurrentInterfaceModeAction().then((mode) => {
      if (active) setInterfaceMode(mode);
    });
    return () => {
      active = false;
    };
  }, [interfaceModeProp, shouldResolveMode]);

  const handleSwitchMode = useCallback(async () => {
    setModeError(null);
    const newMode = isSimple ? "completa" : "simples";
    const result = await switchInterfaceModeAction(newMode);
    if (result.ok) {
      setInterfaceMode(newMode);
      router.refresh();
    } else {
      setModeError(result.error ?? "Não foi possível alterar o modo da interface.");
    }
  }, [isSimple, router]);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden lg:block">
        {navigationReady ? (
          <Sidebar interfaceMode={isSimple ? "simples" : "completa"} onSwitchMode={handleSwitchMode} modeError={modeError} />
        ) : (
          <aside className="h-full w-72 border-r bg-sidebar" aria-label="Carregando navegação" />
        )}
      </div>
      <div className="lg:pl-72">
        <Header
          memberName={memberName}
          isAuthenticated={isAuthenticated}
          interfaceMode={isSimple ? "simples" : "completa"}
          onSwitchMode={handleSwitchMode}
          modeError={modeError}
          navigationReady={navigationReady}
        />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
