"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  if (dismissed || !visible || !deferredPrompt) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="rounded-lg border border-border bg-card p-4 shadow-lg">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium">Instalar Juris ERP</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Instale o aplicativo para acesso rapido e uso offline.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleInstall}
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/80"
          >
            Instalar App
          </button>
          <button
            onClick={handleDismiss}
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-4 text-xs font-medium hover:bg-muted"
          >
            Agora nao
          </button>
        </div>
      </div>
    </div>
  );
}
