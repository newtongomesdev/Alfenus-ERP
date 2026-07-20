"use client";

import { useState, useEffect } from "react";
import { Cookie, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LgpdBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("lgpd-consent");
    if (!consent) {
      // Pequeno delay para a animação ficar suave ao carregar
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("lgpd-consent", "true");
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-background/90 dark:bg-slate-950/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-2xl rounded-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="flex gap-3">
        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Cookie className="h-5 w-5" />
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h4 className="font-semibold text-sm text-foreground">Aviso de Privacidade e Cookies</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mt-1">
              Para melhorar sua experiência jurídica em nosso portal, utilizamos cookies de acordo com a nossa{" "}
              <Link href="/privacidade" className="underline text-primary font-medium hover:text-primary/90">
                Política de Privacidade
              </Link>
              . Ao continuar, você concorda com o tratamento de dados.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBanner(false)}
              className="text-xs h-8"
            >
              Recusar
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="text-xs h-8 font-semibold shadow-sm"
            >
              Aceitar cookies
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
